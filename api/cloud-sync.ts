import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  authenticateRequest,
  checkRateLimit,
  getClientIp,
  hashPassword,
  isHardcodedMockUser,
  sanitizePortalState,
  SUPABASE_URL,
  SUPABASE_KEY,
  DEFAULT_STATE,
} from './auth-utils.js';

// In-memory fallback cache
let inMemoryStateCache: any = null;

function mergeMasterStates(current: any, incoming: any, callerRole: string = 'admin'): any {
  if (!current) current = DEFAULT_STATE;
  if (!incoming) return current || DEFAULT_STATE;

  const deletedIds = new Set<string>([
    ...(Array.isArray(current.deletedIds) ? current.deletedIds.map((id: string) => id.toUpperCase()) : []),
    ...(Array.isArray(incoming.deletedIds) ? incoming.deletedIds.map((id: string) => id.toUpperCase()) : []),
  ]);

  // Active users already in the current database must never be deleted by stale incoming tombstones
  if (Array.isArray(current.users)) {
    current.users.forEach((u: any) => {
      if (u && !isHardcodedMockUser(u)) {
        if (u.teacherId) deletedIds.delete(u.teacherId.toUpperCase());
        if (u.id) deletedIds.delete(u.id.toUpperCase());
      }
    });
  }

  // If incoming contains active users being added or updated by authorized callers,
  // ensure their IDs are not blocked by stale deletedIds in state.
  const canMutateUsers = callerRole === 'admin' || callerRole === 'web_dev_manager' || callerRole === 'pr_head';
  if (canMutateUsers && Array.isArray(incoming.users)) {
    incoming.users.forEach((u: any) => {
      if (u) {
        const canMutateThisRole =
          callerRole === 'admin' ||
          (callerRole === 'web_dev_manager' && (u.role === 'web_developer' || u.role === 'web_dev_manager')) ||
          (callerRole === 'pr_head' && (u.role === 'pr_intern' || u.role === 'pr_head'));
        if (canMutateThisRole) {
          if (u.teacherId) deletedIds.delete(u.teacherId.toUpperCase());
          if (u.id) deletedIds.delete(u.id.toUpperCase());
        }
      }
    });
  }

  // 1. Merge Users — AUTHORIZED: Admin, Web Dev Lead, PR Head
  const userMap = new Map<string, any>();
  if (Array.isArray(current.users)) {
    current.users.forEach((u: any) => {
      if (u && u.teacherId && !isHardcodedMockUser(u) && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id?.toUpperCase())) {
        userMap.set(u.teacherId.toUpperCase(), u);
      }
    });
  }

  if (canMutateUsers && Array.isArray(incoming.users)) {
    incoming.users.forEach((u: any) => {
      if (u && u.teacherId && !isHardcodedMockUser(u) && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id?.toUpperCase())) {
        const allowed =
          callerRole === 'admin' ||
          (callerRole === 'web_dev_manager' && (u.role === 'web_developer' || u.role === 'web_dev_manager')) ||
          (callerRole === 'pr_head' && (u.role === 'pr_intern' || u.role === 'pr_head'));

        if (!allowed) return;

        const existing = userMap.get(u.teacherId.toUpperCase());
        const isExistingRealEmail = existing?.email && !String(existing.email).endsWith('@aew.com');
        const isIncomingRealEmail = u?.email && !String(u.email).endsWith('@aew.com');
        const resolvedEmail = isIncomingRealEmail ? u.email : (isExistingRealEmail ? existing?.email : (u.email || existing?.email));

        let passwordToStore = existing?.password;
        if (u.password && typeof u.password === 'string' && u.password.trim() !== '') {
          // If a new password is provided, hash it if not already scrypt
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
  const getRefKey = (r: any): string => {
    if (r && r.id) return String(r.id);
    const dept = (r?.department || 'general').trim().toLowerCase().replace(/\s+/g, ' ');
    const subj = (r?.subjectName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const title = (r?.title || '').trim().toLowerCase();
    return `${dept}::${subj}::${title}`;
  };

  if (Array.isArray(current.subjectReferences)) {
    current.subjectReferences.forEach((r: any) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has((r.id || '').toUpperCase())) {
        refMap.set(getRefKey(r), r);
      }
    });
  }
  if (Array.isArray(incoming.subjectReferences)) {
    incoming.subjectReferences.forEach((r: any) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has((r.id || '').toUpperCase())) {
        const key = getRefKey(r);
        const existing = refMap.get(key);
        if (!existing) {
          refMap.set(key, r);
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const inTime = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
          refMap.set(key, inTime >= exTime ? { ...existing, ...r } : { ...r, ...existing });
        }
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

  // 11. Merge Email Logs
  const emailLogMap = new Map<string, any>();
  if (Array.isArray(current.emailLogs)) {
    current.emailLogs.forEach((log: any) => {
      if (log && log.id && !deletedIds.has(log.id.toUpperCase())) emailLogMap.set(log.id, log);
    });
  }
  if (Array.isArray(incoming.emailLogs)) {
    incoming.emailLogs.forEach((log: any) => {
      if (log && log.id && !deletedIds.has(log.id.toUpperCase())) {
        emailLogMap.set(log.id, {
          ...emailLogMap.get(log.id),
          ...log,
        });
      }
    });
  }
  const mergedEmailLogs = Array.from(emailLogMap.values()).slice(-200);

  // 12. Merge PR Tasks
  const prTaskMap = new Map<string, any>();
  if (Array.isArray(current.prTasks)) {
    current.prTasks.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) prTaskMap.set(t.id, t);
    });
  }
  if (Array.isArray(incoming.prTasks)) {
    incoming.prTasks.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) {
        prTaskMap.set(t.id, {
          ...prTaskMap.get(t.id),
          ...t,
        });
      }
    });
  }

  // 13. Merge PR Leads
  const prLeadMap = new Map<string, any>();
  if (Array.isArray(current.prLeads)) {
    current.prLeads.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) prLeadMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.prLeads)) {
    incoming.prLeads.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) {
        prLeadMap.set(l.id, {
          ...prLeadMap.get(l.id),
          ...l,
        });
      }
    });
  }

  // 14. Merge PR MOUs
  const prMouMap = new Map<string, any>();
  if (Array.isArray(current.prMous)) {
    current.prMous.forEach((m: any) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) prMouMap.set(m.id, m);
    });
  }
  if (Array.isArray(incoming.prMous)) {
    incoming.prMous.forEach((m: any) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) {
        prMouMap.set(m.id, {
          ...prMouMap.get(m.id),
          ...m,
        });
      }
    });
  }

  // 15. Merge PR Colleges
  const prCollegeMap = new Map<string, any>();
  if (Array.isArray(current.prColleges)) {
    current.prColleges.forEach((c: any) => {
      if (c && c.id && !deletedIds.has(c.id.toUpperCase())) prCollegeMap.set(c.id, c);
    });
  }
  if (Array.isArray(incoming.prColleges)) {
    incoming.prColleges.forEach((c: any) => {
      if (c && c.id && !deletedIds.has(c.id.toUpperCase())) {
        prCollegeMap.set(c.id, {
          ...prCollegeMap.get(c.id),
          ...c,
        });
      }
    });
  }

  // 16. Merge Sales Leads
  const salesLeadMap = new Map<string, any>();
  if (Array.isArray(current.salesLeads)) {
    current.salesLeads.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) salesLeadMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.salesLeads)) {
    incoming.salesLeads.forEach((l: any) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) {
        const existing = salesLeadMap.get(l.id);
        if (!existing) {
          salesLeadMap.set(l.id, l);
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const inTime = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
          salesLeadMap.set(l.id, inTime >= exTime ? { ...existing, ...l } : { ...l, ...existing });
        }
      }
    });
  }

  // 17. Merge Web Dev Projects
  const webDevProjectMap = new Map<string, any>();
  if (Array.isArray(current.webDevProjects)) {
    current.webDevProjects.forEach((p: any) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) webDevProjectMap.set(p.id, p);
    });
  }
  if (Array.isArray(incoming.webDevProjects)) {
    incoming.webDevProjects.forEach((p: any) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) {
        const existing = webDevProjectMap.get(p.id);
        if (!existing) {
          webDevProjectMap.set(p.id, p);
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const inTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
          webDevProjectMap.set(p.id, inTime >= exTime ? { ...existing, ...p } : { ...p, ...existing });
        }
      }
    });
  }

  // 18. Merge Web Dev Milestones
  const webDevMilestoneMap = new Map<string, any>();
  if (Array.isArray(current.webDevMilestones)) {
    current.webDevMilestones.forEach((m: any) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) webDevMilestoneMap.set(m.id, m);
    });
  }
  if (Array.isArray(incoming.webDevMilestones)) {
    incoming.webDevMilestones.forEach((m: any) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) {
        webDevMilestoneMap.set(m.id, {
          ...webDevMilestoneMap.get(m.id),
          ...m,
        });
      }
    });
  }

  // 19. Merge Web Dev Tasks (All deliverables: Admin, Manager & Dev)
  const webDevTaskMap = new Map<string, any>();
  if (Array.isArray(current.webDevTasks)) {
    current.webDevTasks.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) webDevTaskMap.set(t.id, t);
    });
  }
  if (Array.isArray(incoming.webDevTasks)) {
    incoming.webDevTasks.forEach((t: any) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) {
        const existing = webDevTaskMap.get(t.id);
        if (!existing) {
          webDevTaskMap.set(t.id, t);
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const inTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;

          const base = inTime >= exTime ? { ...existing, ...t } : { ...t, ...existing };
          const mergedSubtasks = (t.subtasks && t.subtasks.length > 0)
            ? t.subtasks
            : (existing.subtasks || []);

          const exComments = existing.comments || [];
          const inComments = t.comments || [];
          const commentMap = new Map<string, any>();
          exComments.forEach((c: any) => c && c.id && commentMap.set(c.id, c));
          inComments.forEach((c: any) => c && c.id && commentMap.set(c.id, { ...commentMap.get(c.id), ...c }));

          webDevTaskMap.set(t.id, {
            ...base,
            subtasks: mergedSubtasks,
            comments: Array.from(commentMap.values()),
          });
        }
      }
    });
  }

  // 20. Merge Web Dev Bounties
  const webDevBountyMap = new Map<string, any>();
  if (Array.isArray(current.webDevBounties)) {
    current.webDevBounties.forEach((b: any) => {
      if (b && b.id && !deletedIds.has(b.id.toUpperCase())) webDevBountyMap.set(b.id, b);
    });
  }
  if (Array.isArray(incoming.webDevBounties)) {
    incoming.webDevBounties.forEach((b: any) => {
      if (b && b.id && !deletedIds.has(b.id.toUpperCase())) {
        webDevBountyMap.set(b.id, {
          ...webDevBountyMap.get(b.id),
          ...b,
        });
      }
    });
  }

  // 21. Merge Web Dev XP Ledger
  const webDevXpLedgerMap = new Map<string, any>();
  if (Array.isArray(current.webDevXpLedger)) {
    current.webDevXpLedger.forEach((tx: any) => {
      if (tx && tx.id) webDevXpLedgerMap.set(tx.id, tx);
    });
  }
  if (Array.isArray(incoming.webDevXpLedger)) {
    incoming.webDevXpLedger.forEach((tx: any) => {
      if (tx && tx.id) {
        webDevXpLedgerMap.set(tx.id, tx);
      }
    });
  }

  // 22. Merge Web Dev Fulfillments
  const webDevFulfillmentMap = new Map<string, any>();
  if (Array.isArray(current.webDevFulfillments)) {
    current.webDevFulfillments.forEach((f: any) => {
      if (f && f.id && !deletedIds.has(f.id.toUpperCase())) webDevFulfillmentMap.set(f.id, f);
    });
  }
  if (Array.isArray(incoming.webDevFulfillments)) {
    incoming.webDevFulfillments.forEach((f: any) => {
      if (f && f.id && !deletedIds.has(f.id.toUpperCase())) {
        webDevFulfillmentMap.set(f.id, {
          ...webDevFulfillmentMap.get(f.id),
          ...f,
        });
      }
    });
  }

  // 23. Merge Web Dev Kudos
  const webDevKudosMap = new Map<string, any>();
  if (Array.isArray(current.webDevKudos)) {
    current.webDevKudos.forEach((k: any) => {
      if (k && k.id) webDevKudosMap.set(k.id, k);
    });
  }
  if (Array.isArray(incoming.webDevKudos)) {
    incoming.webDevKudos.forEach((k: any) => {
      if (k && k.id) {
        webDevKudosMap.set(k.id, k);
      }
    });
  }

  // 24. Merge Web Dev Audit Logs
  const webDevAuditLogMap = new Map<string, any>();
  if (Array.isArray(current.webDevAuditLogs)) {
    current.webDevAuditLogs.forEach((log: any) => {
      if (log && log.id) webDevAuditLogMap.set(log.id, log);
    });
  }
  if (Array.isArray(incoming.webDevAuditLogs)) {
    incoming.webDevAuditLogs.forEach((log: any) => {
      if (log && log.id) {
        webDevAuditLogMap.set(log.id, log);
      }
    });
  }

  // 25. Merge Offer Letters
  const offerLetterMap = new Map<string, any>();
  if (Array.isArray(current.offerLetters)) {
    current.offerLetters.forEach((ol: any) => {
      if (ol && ol.id && !deletedIds.has(ol.id.toUpperCase())) offerLetterMap.set(ol.id, ol);
    });
  }
  if (Array.isArray(incoming.offerLetters)) {
    incoming.offerLetters.forEach((ol: any) => {
      if (ol && ol.id && !deletedIds.has(ol.id.toUpperCase())) {
        const existing = offerLetterMap.get(ol.id);
        if (!existing) {
          offerLetterMap.set(ol.id, ol);
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const inTime = ol.updatedAt ? new Date(ol.updatedAt).getTime() : 0;
          offerLetterMap.set(ol.id, inTime >= exTime ? { ...existing, ...ol } : { ...ol, ...existing });
        }
      }
    });
  }

  // 26. Merge Web Dev Rewards
  const rewardMap = new Map<string, any>();
  if (Array.isArray(current.webDevRewards)) {
    current.webDevRewards.forEach((r: any) => {
      if (r && r.id && !deletedIds.has(r.id.toUpperCase())) rewardMap.set(r.id, r);
    });
  }
  if (Array.isArray(incoming.webDevRewards)) {
    incoming.webDevRewards.forEach((r: any) => {
      if (r && r.id && !deletedIds.has(r.id.toUpperCase())) {
        const existing = rewardMap.get(r.id);
        if (!existing) {
          rewardMap.set(r.id, r);
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const inTime = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
          rewardMap.set(r.id, inTime >= exTime ? { ...existing, ...r } : { ...r, ...existing });
        }
      }
    });
  }

  // 27. Merge Web Dev User Achievements
  const userAchMap = new Map<string, any>();
  if (Array.isArray(current.webDevUserAchievements)) {
    current.webDevUserAchievements.forEach((ua: any) => {
      if (ua && ua.id) userAchMap.set(ua.id, ua);
    });
  }
  if (Array.isArray(incoming.webDevUserAchievements)) {
    incoming.webDevUserAchievements.forEach((ua: any) => {
      if (ua && ua.id) {
        userAchMap.set(ua.id, ua);
      }
    });
  }

  // 28. Merge Web Dev Notifications
  const notifMap = new Map<string, any>();
  if (Array.isArray(current.webDevNotifications)) {
    current.webDevNotifications.forEach((n: any) => {
      if (n && n.id) notifMap.set(n.id, n);
    });
  }
  if (Array.isArray(incoming.webDevNotifications)) {
    incoming.webDevNotifications.forEach((n: any) => {
      if (n && n.id) {
        const existing = notifMap.get(n.id);
        const isRead = Boolean(existing?.read || n.read);
        notifMap.set(n.id, {
          ...existing,
          ...n,
          read: isRead,
        });
      }
    });
  }

  // 29. Merge Web Dev Challenges
  const challengeMap = new Map<string, any>();
  if (Array.isArray(current.webDevChallenges)) {
    current.webDevChallenges.forEach((c: any) => {
      if (c && c.id && !deletedIds.has(c.id.toUpperCase())) challengeMap.set(c.id, c);
    });
  }
  if (Array.isArray(incoming.webDevChallenges)) {
    incoming.webDevChallenges.forEach((c: any) => {
      if (c && c.id && !deletedIds.has(c.id.toUpperCase())) {
        const existing = challengeMap.get(c.id);
        if (!existing) {
          challengeMap.set(c.id, c);
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const inTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
          challengeMap.set(c.id, inTime >= exTime ? { ...existing, ...c } : { ...c, ...existing });
        }
      }
    });
  }

  // 30. CRM Access Permissions
  const mergedCrmPermissions = {
    ...(current.crmPermissions || {}),
    ...(incoming.crmPermissions || {}),
  };

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
    prTasks: Array.from(prTaskMap.values()),
    prLeads: Array.from(prLeadMap.values()),
    prMous: Array.from(prMouMap.values()),
    prColleges: Array.from(prCollegeMap.values()),
    salesLeads: Array.from(salesLeadMap.values()),
    crmPermissions: mergedCrmPermissions,
    webDevProjects: Array.from(webDevProjectMap.values()),
    webDevMilestones: Array.from(webDevMilestoneMap.values()),
    webDevTasks: Array.from(webDevTaskMap.values()),
    webDevBounties: Array.from(webDevBountyMap.values()),
    webDevXpLedger: Array.from(webDevXpLedgerMap.values()),
    webDevFulfillments: Array.from(webDevFulfillmentMap.values()),
    webDevKudos: Array.from(webDevKudosMap.values()),
    webDevAuditLogs: Array.from(webDevAuditLogMap.values()).slice(-500),
    webDevRewards: Array.from(rewardMap.values()),
    webDevUserAchievements: Array.from(userAchMap.values()),
    webDevNotifications: Array.from(notifMap.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 200),
    webDevChallenges: Array.from(challengeMap.values()),
    offerLetters: Array.from(offerLetterMap.values()),
    emailConfig: mergedEmailConfig,
    emailLogs: Array.from(emailLogMap.values()).slice(-500),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const writeResult = await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state`, {
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
        if (!writeResult.ok) {
          const detail = await writeResult.text().catch(() => '');
          throw new Error(`Cloud database rejected the update (${writeResult.status})${detail ? `: ${detail}` : ''}`);
        }
      } catch (upstreamErr) {
        console.warn('Failed to update Supabase:', upstreamErr);
        throw upstreamErr;
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
