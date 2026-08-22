import type { VercelRequest, VercelResponse } from '@vercel/node';

// Master Cloud Persistence Record ID
const MASTER_CLOUD_ID = 'ff8081819ff5b11001a0283fe6f0742c';
const RESTFUL_API_BASE = 'https://api.restful-api.dev/objects';

// In-memory fallback cache in case of upstream network delay
let inMemoryStateCache: any = null;

const DEFAULT_STATE = {
  version: 2,
  updatedAt: new Date().toISOString(),
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

      // If upstream failed or empty, fallback to in-memory or default
      return res.status(200).json({
        success: true,
        source: inMemoryStateCache ? 'memory' : 'default',
        data: inMemoryStateCache || DEFAULT_STATE,
      });
    } catch (err: any) {
      return res.status(200).json({
        success: true,
        source: inMemoryStateCache ? 'memory' : 'default',
        data: inMemoryStateCache || DEFAULT_STATE,
      });
    }
  }

  // POST: Sync/Save the latest portal state across all devices
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const incomingData = body.data || body;

      if (!incomingData || typeof incomingData !== 'object') {
        return res.status(400).json({ error: 'Missing data payload' });
      }

      const mergedData = {
        version: 2,
        updatedAt: new Date().toISOString(),
        users: Array.isArray(incomingData.users) && incomingData.users.length > 0 ? incomingData.users : (inMemoryStateCache?.users || DEFAULT_STATE.users),
        assignedTopics: Array.isArray(incomingData.assignedTopics) ? incomingData.assignedTopics : (inMemoryStateCache?.assignedTopics || []),
        lectures: Array.isArray(incomingData.lectures) ? incomingData.lectures : (inMemoryStateCache?.lectures || []),
        subjectReferences: Array.isArray(incomingData.subjectReferences) ? incomingData.subjectReferences : (inMemoryStateCache?.subjectReferences || []),
        dailyCommitments: Array.isArray(incomingData.dailyCommitments) ? incomingData.dailyCommitments : (inMemoryStateCache?.dailyCommitments || []),
        pptRequests: Array.isArray(incomingData.pptRequests) ? incomingData.pptRequests : (inMemoryStateCache?.pptRequests || []),
      };

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
