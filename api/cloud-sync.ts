import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  authenticateRequest,
  checkRateLimit,
  getClientIp,
  hashPassword,
  sanitizePortalState,
  SUPABASE_URL,
  SUPABASE_KEY,
  DEFAULT_STATE,
} from './auth-utils';

// In-memory fallback cache
let inMemoryStateCache: any = null;

function mergeMasterStates(current: any, incoming: any, callerRole: string = 'admin'): any {
  if (!current) current = DEFAULT_STATE;
  if (!incoming) return current || DEFAULT_STATE;

  const deletedIds = new Set<string>([
    ...(Array.isArray(current.deletedIds) ? current.deletedIds.map((id: string) => id.toUpperCase()) : []),
    ...(Array.isArray(incoming.deletedIds) ? incoming.deletedIds.map((id: string) => id.toUpperCase()) : []),
  ]);

  // 1. Merge Users — PRIVILEGED: ONLY ADMIN CAN MUTATE USERS
  const userMap = new Map<string, any>();
  if (Array.isArray(current.users)) {
    current.users.forEach((u: any) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
        userMap.set(u.teacherId.toUpperCase(), u);
      }
    });
  }

  if (callerRole === 'admin' && Array.isArray(incoming.users)) {
    incoming.users.forEach((u: any) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
        const existing = userMap.get(u.teacherId.toUpperCase());
        const isExistingRealEmail = existing?.email && !String(existing.email).endsWith('@aew.com');
        const isIncomingRealEmail = u?.email && !String(u.email).endsWith('@aew.com');
        const resolvedEmail = isIncomingRealEmail ? u.email : (isExistingRealEmail ? existing?.email : (u.email || existing?.email));

        let passwordToStore = existing?.password;
        if (u.password && typeof u.password === 'string' && u.password.trim() !== '') {
          // If a new password is provided by admin, hash it if not already scrypt
          passwordToStore = u.password.startsWith('scrypt:') ? u.password : hashPassword(u.password.trim());
        }

        userMap.set(u.teacherId.toUpperCase(), {
          ...existing,
          ...u,
          password: passwordToStore,
          email: resolvedEmail,
        });
      }
    });
  }

  // Ensure Admin always exists
  const hasAdmin = Array.from(userMap.values()).some((u) => u.role === 'admin');
  if (!hasAdmin) {
    userMap.set('ADMIN-01', DEFAULT_STATE.users[0]);
  }

  // 2. Merge Assigned Topics
  const topicMap = new Map<string, any>();
  if (Array.isArray(current.assignedTopics)) {
    current.assignedTopics.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) topicMap.set(t.id, t);
    });
  }
  if (Array.isArray(incoming.assignedTopics)) {
    incoming.assignedTopics.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) {
        const existing = topicMap.get(t.id);
        if (!existing) {
          topicMap.set(t.id, t);
        } else {
          const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const incomingTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;

          if (incomingTime >= existingTime) {
            topicMap.set(t.id, {
              ...existing,
              ...t,
              subtopics: (t.subtopics && t.subtopics.length > 0) ? t.subtopics : (existing.subtopics || []),
              subtopicItems: (t.subtopicItems && t.subtopicItems.length > 0) ? t.subtopicItems : (existing.subtopicItems || []),
              proposedSubtopics: (t.proposedSubtopics && t.proposedSubtopics.length > 0) ? t.proposedSubtopics : (existing.proposedSubtopics || []),
              subtopicsApprovalState: t.subtopicsApprovalState || existing.subtopicsApprovalState || 'pending_teacher_input',
              adminApprovalComment: t.adminApprovalComment !== undefined ? t.adminApprovalComment : existing.adminApprovalComment,
              updatedAt: t.updatedAt || new Date().toISOString(),
            });
          } else {
            topicMap.set(t.id, {
              ...t,
              ...existing,
            });
          }
        }
      }
    });
  }

  // 3. Merge Lectures & Remarks Smartly
  const lectureMap = new Map<string, any>();
  if (Array.isArray(current.lectures)) {
    current.lectures.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) lectureMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.lectures)) {
    incoming.lectures.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) {
        const existing = lectureMap.get(l.id);
        if (!existing) {
          lectureMap.set(l.id, l);
        } else {
          const remarkMap = new Map<string, any>();
          (existing.adminRemarks || []).forEach((r: any) => {
            if (r && r.id) remarkMap.set(r.id, r);
          });
          (l.adminRemarks || []).forEach((r: any) => {
            if (r && r.id) {
              const exRemark = remarkMap.get(r.id);
              if (!exRemark) {
                remarkMap.set(r.id, r);
              } else {
                const isAck = Boolean(r.isAcknowledged || exRemark.isAcknowledged);
                remarkMap.set(r.id, {
                  ...exRemark,
                  ...r,
                  isAcknowledged: isAck,
                  acknowledgedAt: isAck ? (r.acknowledgedAt || exRemark.acknowledgedAt || new Date().toISOString()) : undefined,
                  acknowledgedByName: isAck ? (r.acknowledgedByName || exRemark.acknowledgedByName) : undefined,
                  isNewAckForAdmin: isAck ? (r.isNewAckForAdmin ?? exRemark.isNewAckForAdmin ?? true) : false,
                });
              }
            }
          });

          lectureMap.set(l.id, {
            ...existing,
            ...l,
            adminRemarks: Array.from(remarkMap.values()),
          });
        }
      }
    });
  }

  // 4. Merge Subject References
  const refMap = new Map<string, any>();
  if (Array.isArray(current.subjectReferences)) {
    current.subjectReferences.forEach((r: any) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has((r.id || '').toUpperCase())) {
        refMap.set(r.id || r.subjectName.toLowerCase(), r);
      }
    });
  }
  if (Array.isArray(incoming.subjectReferences)) {
    incoming.subjectReferences.forEach((r: any) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has((r.id || '').toUpperCase())) {
        refMap.set(r.id || r.subjectName.toLowerCase(), {
          ...refMap.get(r.id || r.subjectName.toLowerCase()),
          ...r,
        });
      }
    });
  }

  // 5. Merge Daily Commitments
  const commitmentMap = new Map<string, any>();
  if (Array.isArray(current.dailyCommitments)) {
    current.dailyCommitments.forEach((c: any) => {
      if (c && c.teacherId && c.date) {
        commitmentMap.set(`${c.teacherId.toUpperCase()}_${c.date}`, c);
      }
    });
  }
  if (Array.isArray(incoming.dailyCommitments)) {
    incoming.dailyCommitments.forEach((c: any) => {
      if (c && c.teacherId && c.date) {
        commitmentMap.set(`${c.teacherId.toUpperCase()}_${c.date}`, {
          ...commitmentMap.get(`${c.teacherId.toUpperCase()}_${c.date}`),
          ...c,
        });
      }
    });
  }

  // 6. Merge PPT Requests
  const pptMap = new Map<string, any>();
  if (Array.isArray(current.pptRequests)) {
    current.pptRequests.forEach((p: any) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) pptMap.set(p.id, p);
    });
  }
  if (Array.isArray(incoming.pptRequests)) {
    incoming.pptRequests.forEach((p: any) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) {
        pptMap.set(p.id, {
          ...pptMap.get(p.id),
          ...p,
        });
      }
    });
  }

  // 7. Merge Extensions
  const extMap = new Map<string, any>();
  if (Array.isArray(current.extensions)) {
    current.extensions.forEach((e: any) => {
      if (e && e.id && !deletedIds.has(e.id.toUpperCase())) extMap.set(e.id, e);
    });
  }
  if (Array.isArray(incoming.extensions)) {
    incoming.extensions.forEach((e: any) => {
      if (e && e.id && !deletedIds.has(e.id.toUpperCase())) {
        extMap.set(e.id, {
          ...extMap.get(e.id),
          ...e,
        });
      }
    });
  }

  // 8. Merge Wallet Transactions
  const walletMap = new Map<string, any>();
  if (Array.isArray(current.walletTransactions)) {
    current.walletTransactions.forEach((w: any) => {
      if (w && w.id && !deletedIds.has(w.id.toUpperCase())) walletMap.set(w.id, w);
    });
  }
  if (Array.isArray(incoming.walletTransactions)) {
    incoming.walletTransactions.forEach((w: any) => {
      if (w && w.id && !deletedIds.has(w.id.toUpperCase())) {
        walletMap.set(w.id, {
          ...walletMap.get(w.id),
          ...w,
        });
      }
    });
  }

  // 9. Merge Day Off Grants (Leaves)
  const dayOffMap = new Map<string, any>();
  if (Array.isArray(current.dayOffGrants)) {
    current.dayOffGrants.forEach((g: any) => {
      if (g && g.id && !deletedIds.has(g.id.toUpperCase())) dayOffMap.set(g.id, g);
    });
  }
  if (Array.isArray(incoming.dayOffGrants)) {
    incoming.dayOffGrants.forEach((g: any) => {
      if (g && g.id && !deletedIds.has(g.id.toUpperCase())) {
        dayOffMap.set(g.id, {
          ...dayOffMap.get(g.id),
          ...g,
        });
      }
    });
  }

  // 10. Merge Email Configuration — PRIVILEGED: ONLY ADMIN CAN MUTATE
  const curConfig = current.emailConfig || {};
  let mergedEmailConfig = curConfig;
  if (callerRole === 'admin') {
    const incConfig = incoming.emailConfig || {};
    const curHasCreds = Boolean(curConfig.smtpPass || curConfig.smtpUser || curConfig.resendApiKey);
    const incHasCreds = Boolean(incConfig.smtpPass || incConfig.smtpUser || incConfig.resendApiKey);

    if (incHasCreds) {
      mergedEmailConfig = {
        ...curConfig,
        ...incConfig,
        updatedAt: new Date().toISOString(),
      };
    } else if (curHasCreds) {
      mergedEmailConfig = {
        ...incConfig,
        ...curConfig,
      };
    } else {
      mergedEmailConfig = {
        provider: 'smtp',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        senderName: 'AEW Academic Operations',
        ...curConfig,
        ...incConfig,
      };
    }
  }

  // 11. Merge Sent Email Logs
  const logMap = new Map<string, any>();
  if (Array.isArray(current.emailLogs)) {
    current.emailLogs.forEach((l: any) => {
      if (l && l.id) logMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.emailLogs)) {
    incoming.emailLogs.forEach((l: any) => {
      if (l && l.id) {
        const ex = logMap.get(l.id);
        logMap.set(l.id, ex ? { ...ex, ...l } : l);
      }
    });
  }
  const mergedEmailLogs = Array.from(logMap.values())
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 200);

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    deletedIds: Array.from(deletedIds),
    users: Array.from(userMap.values()),
    assignedTopics: Array.from(topicMap.values()),
    lectures: Array.from(lectureMap.values()),
    subjectReferences: Array.from(refMap.values()),
    dailyCommitments: Array.from(commitmentMap.values()),
    pptRequests: Array.from(pptMap.values()),
    extensions: Array.from(extMap.values()),
    walletTransactions: Array.from(walletMap.values()),
    dayOffGrants: Array.from(dayOffMap.values()),
    emailConfig: mergedEmailConfig,
    emailLogs: mergedEmailLogs,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply strict dynamic CORS
  if (applyCors(req, res)) {
    return;
  }

  // ─── AUTHENTICATION CHECK ──────────────────────────────────────────────────
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return res.status(401).json({
      success: false,
      error: auth.error || 'Authentication required to access cloud sync.',
    });
  }

  const callerRole = auth.user.role;
  const ip = getClientIp(req);

  // ─── GET: FETCH PORTAL STATE ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const rl = checkRateLimit(`sync_get:${auth.user.sub}:${ip}`, 120, 60 * 1000); // 120 requests/min
    if (!rl.allowed) {
      return res.status(429).json({ success: false, error: 'Too many sync requests. Please wait a moment.' });
    }

    try {
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state?id=eq.aew_portal_master&select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (dbRes.ok) {
        const rows = await dbRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
          inMemoryStateCache = rows[0].data;
          return res.status(200).json({
            success: true,
            source: 'supabase',
            data: sanitizePortalState(rows[0].data, callerRole),
          });
        }
      }

      return res.status(200).json({
        success: true,
        source: inMemoryStateCache ? 'memory' : 'default',
        data: sanitizePortalState(inMemoryStateCache || DEFAULT_STATE, callerRole),
      });
    } catch {
      return res.status(200).json({
        success: true,
        source: inMemoryStateCache ? 'memory' : 'default',
        data: sanitizePortalState(inMemoryStateCache || DEFAULT_STATE, callerRole),
      });
    }
  }

  // ─── POST: SYNC/SAVE PORTAL STATE ──────────────────────────────────────────
  if (req.method === 'POST') {
    const rl = checkRateLimit(`sync_post:${auth.user.sub}:${ip}`, 60, 60 * 1000); // 60 updates/min
    if (!rl.allowed) {
      return res.status(429).json({ success: false, error: 'Too many update requests. Please wait a moment.' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const incomingData = body?.data || body;

      if (!incomingData || typeof incomingData !== 'object') {
        return res.status(400).json({ success: false, error: 'Missing data payload' });
      }

      // Fetch latest cloud state from Supabase
      let currentCloudData = inMemoryStateCache;
      try {
        const fetchCurrent = await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state?id=eq.aew_portal_master&select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Accept': 'application/json',
          },
        });
        if (fetchCurrent.ok) {
          const rows = await fetchCurrent.json();
          if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
            currentCloudData = rows[0].data;
          }
        }
      } catch {
        // fallback to memory cache
      }

      const mergedData = mergeMasterStates(currentCloudData, incomingData, callerRole);
      inMemoryStateCache = mergedData;

      // Update Supabase PostgreSQL table
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: 'aew_portal_master',
            version: 2,
            data: mergedData,
            updated_at: new Date().toISOString(),
          }),
        });
      } catch (upstreamErr) {
        console.warn('Failed to update Supabase, saved to cache:', upstreamErr);
      }

      return res.status(200).json({
        success: true,
        source: 'supabase',
        updatedAt: mergedData.updatedAt,
        data: sanitizePortalState(mergedData, callerRole),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to save cloud sync' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
