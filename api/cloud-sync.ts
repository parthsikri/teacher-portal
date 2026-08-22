import type { VercelRequest, VercelResponse } from '@vercel/node';

// Master Cloud Persistence Record ID
const MASTER_CLOUD_ID = 'ff8081819ff5b11001a0283fe6f0742c';
const RESTFUL_API_BASE = 'https://api.restful-api.dev/objects';

// In-memory fallback cache in case of upstream network delay
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

  // Ensure Admin user always exists
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
        topicMap.set(t.id, {
          ...existing,
          ...t,
          subtopicsApprovalState: (t.subtopicsApprovalState === 'approved' || existing?.subtopicsApprovalState === 'approved')
            ? 'approved'
            : (t.subtopicsApprovalState || existing?.subtopicsApprovalState || 'pending_teacher_input'),
          subtopics: (t.subtopics && t.subtopics.length > 0) ? t.subtopics : (existing?.subtopics || []),
        });
      }
    });
  }

  // Merge Lectures
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
        lectureMap.set(l.id, {
          ...existing,
          ...l,
          adminRemarks: [
            ...(existing?.adminRemarks || []),
            ...(l.adminRemarks || []).filter((r: any) => !(existing?.adminRemarks || []).some((er: any) => er.id === r.id)),
          ],
        });
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

  // GET: Fetch the latest shared portal state
  if (req.method === 'GET') {
    try {
      const upstreamRes = await fetch(`${RESTFUL_API_BASE}/${MASTER_CLOUD_ID}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (upstreamRes.ok) {
        const json = await upstreamRes.json();
        if (json && json.data) {
          inMemoryStateCache = json.data;
          return res.status(200).json({
            success: true,
            source: 'cloud',
            data: json.data,
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

  // POST: Sync/Save the latest portal state across all devices with smart merging
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const incomingData = body.data || body;

      if (!incomingData || typeof incomingData !== 'object') {
        return res.status(400).json({ error: 'Missing data payload' });
      }

      // Fetch latest cloud state to merge against
      let currentCloudData = inMemoryStateCache;
      try {
        const fetchCurrent = await fetch(`${RESTFUL_API_BASE}/${MASTER_CLOUD_ID}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (fetchCurrent.ok) {
          const cJson = await fetchCurrent.json();
          if (cJson && cJson.data) {
            currentCloudData = cJson.data;
          }
        }
      } catch {
        // use memory cache
      }

      const mergedData = mergeMasterStates(currentCloudData, incomingData);
      inMemoryStateCache = mergedData;

      // Update cloud store asynchronously
      try {
        await fetch(`${RESTFUL_API_BASE}/${MASTER_CLOUD_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'aew_portal_master_state',
            data: mergedData,
          }),
        });
      } catch (upstreamErr) {
        console.warn('Failed to update remote cloud store, saved to cache:', upstreamErr);
      }

      return res.status(200).json({
        success: true,
        updatedAt: mergedData.updatedAt,
        data: mergedData,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save cloud sync' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
