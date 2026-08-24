import type { VercelRequest, VercelResponse } from '@vercel/node';

// Supabase credentials — stored as Vercel env vars, trimmed to handle whitespace issues
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yczcnpsdmhftvpwdenoy.supabase.co').trim();
const SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemNucHNkbWhmdHZwd2Rlbm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODMwNjQsImV4cCI6MjEwMjk1OTA2NH0.H_qomZFkVTfIsvmSkS9UUWn5hNjP9h1kGB3YEpPA3Vk').trim();

// In-memory fallback cache
let inMemoryStateCache: any = null;

const DEFAULT_STATE = {
  version: 2,
  updatedAt: new Date().toISOString(),
  deletedIds: [],
  users: [
    {
      id: 'u-admin',
      teacherId: 'ADMIN-01',
      username: 'admin',
      password: 'admin123',
      name: 'Academic Operations Admin',
      email: 'admin@aew.com',
      role: 'admin',
      department: 'Academic Operations',
      subject: 'Management',
      dailyTargetMinutes: 9999,
      dailyLimit: 999,
    },
  ],
  assignedTopics: [],
  lectures: [],
  subjectReferences: [],
  dailyCommitments: [],
  pptRequests: [],
};

function mergeMasterStates(current: any, incoming: any): any {
  if (!current) return incoming || DEFAULT_STATE;
  if (!incoming) return current || DEFAULT_STATE;

  const deletedIds = new Set<string>([
    ...(Array.isArray(current.deletedIds) ? current.deletedIds : []),
    ...(Array.isArray(incoming.deletedIds) ? incoming.deletedIds : []),
  ]);

  // Merge Users
  const userMap = new Map<string, any>();
  if (Array.isArray(current.users)) {
    current.users.forEach((u: any) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id)) {
        userMap.set(u.teacherId.toUpperCase(), u);
      }
    });
  }
  if (Array.isArray(incoming.users)) {
    incoming.users.forEach((u: any) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id)) {
        const existing = userMap.get(u.teacherId.toUpperCase());
        userMap.set(u.teacherId.toUpperCase(), {
          ...existing,
          ...u,
        });
      }
    });
  }

  // Ensure Admin always exists
  const hasAdmin = Array.from(userMap.values()).some((u) => u.role === 'admin');
  if (!hasAdmin) {
    userMap.set('ADMIN-01', DEFAULT_STATE.users[0]);
  }

  // Merge Assigned Topics
  const topicMap = new Map<string, any>();
  if (Array.isArray(current.assignedTopics)) {
    current.assignedTopics.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id)) topicMap.set(t.id, t);
    });
  }
  if (Array.isArray(incoming.assignedTopics)) {
    incoming.assignedTopics.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id)) {
        const existing = topicMap.get(t.id);
        if (!existing) {
          topicMap.set(t.id, t);
        } else {
          const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const incomingTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;

          // Incoming wins when it's genuinely newer OR when both timestamps are missing/equal
          // (equal timestamps = fresh push from client should always be merged in)
          if (incomingTime >= existingTime) {
            topicMap.set(t.id, {
              ...existing,
              ...t,
              subtopics: (t.subtopics && t.subtopics.length > 0) ? t.subtopics : (existing.subtopics || []),
              subtopicItems: (t.subtopicItems && t.subtopicItems.length > 0) ? t.subtopicItems : (existing.subtopicItems || []),
              proposedSubtopics: (t.proposedSubtopics && t.proposedSubtopics.length > 0) ? t.proposedSubtopics : (existing.proposedSubtopics || []),
              subtopicsApprovalState: (t.subtopicsApprovalState === 'approved' || existing.subtopicsApprovalState === 'approved')
                ? 'approved'
                : (t.subtopicsApprovalState || existing.subtopicsApprovalState || 'pending_teacher_input'),
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

  // Merge Lectures & Remarks Smartly
  const lectureMap = new Map<string, any>();
  if (Array.isArray(current.lectures)) {
    current.lectures.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id)) lectureMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.lectures)) {
    incoming.lectures.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id)) {
        const existing = lectureMap.get(l.id);
        if (!existing) {
          lectureMap.set(l.id, l);
        } else {
          // Merge adminRemarks remark-by-remark
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
                // If either has isAcknowledged: true, acknowledge state is preserved
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

  // Merge Subject References
  const refMap = new Map<string, any>();
  if (Array.isArray(current.subjectReferences)) {
    current.subjectReferences.forEach((r: any) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has(r.id)) {
        refMap.set(r.id || r.subjectName.toLowerCase(), r);
      }
    });
  }
  if (Array.isArray(incoming.subjectReferences)) {
    incoming.subjectReferences.forEach((r: any) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has(r.id)) {
        refMap.set(r.id || r.subjectName.toLowerCase(), {
          ...refMap.get(r.id || r.subjectName.toLowerCase()),
          ...r,
        });
      }
    });
  }

  // Merge Daily Commitments
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

  // Merge PPT Requests
  const pptMap = new Map<string, any>();
  if (Array.isArray(current.pptRequests)) {
    current.pptRequests.forEach((p: any) => {
      if (p && p.id && !deletedIds.has(p.id)) pptMap.set(p.id, p);
    });
  }
  if (Array.isArray(incoming.pptRequests)) {
    incoming.pptRequests.forEach((p: any) => {
      if (p && p.id && !deletedIds.has(p.id)) {
        pptMap.set(p.id, {
          ...pptMap.get(p.id),
          ...p,
        });
      }
    });
  }

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
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch the latest shared portal state from Supabase PostgreSQL
  if (req.method === 'GET') {
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
            data: rows[0].data,
          });
        }
      }

      return res.status(200).json({
        success: true,
        source: inMemoryStateCache ? 'memory' : 'default',
        data: inMemoryStateCache || DEFAULT_STATE,
      });
    } catch {
      return res.status(200).json({
        success: true,
        source: inMemoryStateCache ? 'memory' : 'default',
        data: inMemoryStateCache || DEFAULT_STATE,
      });
    }
  }

  // POST: Sync/Save the latest portal state across all devices to Supabase
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const incomingData = body.data || body;

      if (!incomingData || typeof incomingData !== 'object') {
        return res.status(400).json({ error: 'Missing data payload' });
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

      const mergedData = mergeMasterStates(currentCloudData, incomingData);
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
        data: mergedData,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save cloud sync' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
