const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');

const {
  isOriginAllowed,
  checkRateLimit,
  getClientIp,
  hashPassword,
  verifyPassword,
  createSessionToken,
  authenticateRequest,
  requireAuth,
  sanitizeUser,
  sanitizePortalState,
} = require('./auth-utils');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// ─── Multer (memory storage — streamed directly to Drive) ────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

// ─── Google Drive Auth via Service Account ───────────────────────────────────
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey  = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey || privateKey.trim() === '' || privateKey === '\n') {
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail.trim(),
    key: privateKey.trim().replace(/^"|"$/g, ''),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

// ─── Cloud Sync Persistence Config ───────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yczcnpsdmhftvpwdenoy.supabase.co').trim();
const SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemNucHNkbWhmdHZwd2Rlbm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODMwNjQsImV4cCI6MjEwMjk1OTA2NH0.H_qomZFkVTfIsvmSkS9UUWn5hNjP9h1kGB3YEpPA3Vk').trim();

let inMemoryStateCache = null;

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
  extensions: [],
  walletTransactions: [],
  dayOffGrants: [],
  emailConfig: {
    provider: 'smtp',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    senderName: 'AEW Academic Operations',
  },
  emailLogs: [],
};

async function getLatestPortalState() {
  try {
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state?id=eq.aew_portal_master&select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
    });

    if (dbRes.ok) {
      const rows = await dbRes.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
        inMemoryStateCache = rows[0].data;
        return rows[0].data;
      }
    }
  } catch (err) {
    console.warn('[server] Error fetching Supabase portal state:', err?.message);
  }

  return inMemoryStateCache || DEFAULT_STATE;
}

async function persistPortalState(mergedData) {
  inMemoryStateCache = mergedData;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: 'aew_portal_master',
        version: 2,
        data: mergedData,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (upstreamErr) {
    console.warn('[server] Failed to update Supabase, saved to local cache:', upstreamErr?.message);
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const drive = getDriveClient();
  res.json({
    status: 'ok',
    driveConfigured: !!drive,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
  });
});

// ─── Authentication Endpoints ────────────────────────────────────────────────
app.get('/api/auth', requireAuth, async (req, res) => {
  const state = await getLatestPortalState();
  const users = Array.isArray(state.users) ? state.users : [];
  const freshUser = users.find((u) => u.id === req.user.sub || u.teacherId?.toUpperCase() === req.user.teacherId?.toUpperCase());
  return res.json({
    success: true,
    user: sanitizeUser(freshUser || req.user),
  });
});

app.post('/api/auth', async (req, res) => {
  const body = req.body || {};
  const action = body.action || 'login';

  // LOGIN
  if (action === 'login') {
    const rawIdentifier = String(body.username || body.identifier || '').trim();
    const inputPass = String(body.password || '').trim();

    if (!rawIdentifier || !inputPass) {
      return res.status(400).json({ success: false, error: 'Username/Teacher ID and password are required.' });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(`login:${ip}:${rawIdentifier.toLowerCase()}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many login attempts. Please try again in ${Math.ceil(rl.resetMs / 60000)} minutes.`,
      });
    }

    const state = await getLatestPortalState();
    const users = Array.isArray(state.users) ? state.users : [];
    const query = rawIdentifier.toLowerCase();

    const matchedUser = users.find((u) => {
      const uTeacherId = (u.teacherId || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uTeacherId === query || uUsername === query || uEmail === query;
    });

    if (!matchedUser) {
      return res.status(401).json({ success: false, error: 'Account not found. Please verify your credentials or contact Admin.' });
    }

    const storedPassword = (matchedUser.password || (matchedUser.role === 'admin' ? 'admin123' : 'teach123')).trim();
    const verifyResult = verifyPassword(inputPass, storedPassword);

    if (!verifyResult.valid) {
      return res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
    }

    if (verifyResult.needsRehash) {
      try {
        matchedUser.password = hashPassword(inputPass);
        state.updatedAt = new Date().toISOString();
        await persistPortalState(state);
      } catch (err) {
        console.warn('[auth] Failed to persist migrated password hash:', err?.message);
      }
    }

    const token = createSessionToken(matchedUser);
    return res.json({
      success: true,
      token,
      user: sanitizeUser(matchedUser),
    });
  }

  // ME
  if (action === 'me') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return res.status(401).json({ success: false, error: auth.error || 'Unauthorized' });
    }

    const state = await getLatestPortalState();
    const users = Array.isArray(state.users) ? state.users : [];
    const freshUser = users.find((u) => u.id === auth.user.sub || u.teacherId?.toUpperCase() === auth.user.teacherId?.toUpperCase());

    return res.json({
      success: true,
      user: sanitizeUser(freshUser || auth.user),
    });
  }

  // LOGOUT
  if (action === 'logout') {
    return res.json({ success: true, message: 'Logged out successfully' });
  }

  // CHANGE PASSWORD
  if (action === 'change_password') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return res.status(401).json({ success: false, error: auth.error || 'Unauthorized' });
    }

    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both current password and new password are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const state = await getLatestPortalState();
    const users = Array.isArray(state.users) ? state.users : [];
    const targetUser = users.find((u) => u.id === auth.user.sub || u.teacherId?.toUpperCase() === auth.user.teacherId?.toUpperCase());

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const storedPassword = (targetUser.password || (targetUser.role === 'admin' ? 'admin123' : 'teach123')).trim();
    const verifyResult = verifyPassword(String(currentPassword).trim(), storedPassword);

    if (!verifyResult.valid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }

    targetUser.password = hashPassword(String(newPassword).trim());
    state.updatedAt = new Date().toISOString();
    await persistPortalState(state);

    return res.json({ success: true, message: 'Password changed successfully.' });
  }

  return res.status(400).json({ success: false, error: `Unsupported auth action: ${action}` });
});

// ─── Direct Resumable Google Drive Endpoint ──────────────────────────────────
app.post('/api/drive-resumable', requireAuth, async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`drive_resumable:${req.user.sub}:${ip}`, 40, 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'Upload rate limit exceeded. Please wait a moment.' });
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey  = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey || privateKey.trim() === '') {
    return res.status(503).json({
      success: false,
      error: 'Google Drive is not configured. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in .env',
    });
  }

  const auth = new google.auth.JWT({
    email: clientEmail.trim(),
    key: privateKey.trim().replace(/^"|"$/g, ''),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const { action, fileName, mimeType, fileSize, fileId } = req.body || {};

  if (action === 'create_session') {
    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    try {
      const tokenResponse = await auth.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) {
        return res.status(500).json({ success: false, error: 'Failed to obtain Google Drive access token' });
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const metadata = {
        name: fileName,
        mimeType: mimeType || 'application/octet-stream',
      };

      if (folderId && folderId.trim() !== '') {
        metadata.parents = [folderId.trim()];
      }

      const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType || 'application/octet-stream',
          ...(fileSize ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
        },
        body: JSON.stringify(metadata),
      });

      if (!initResponse.ok) {
        const errText = await initResponse.text();
        return res.status(initResponse.status).json({
          success: false,
          error: `Google Drive session initialization failed: ${errText}`,
        });
      }

      const uploadUrl = initResponse.headers.get('location');
      if (!uploadUrl) {
        return res.status(500).json({ success: false, error: 'No resumable upload URL returned by Google Drive' });
      }

      return res.status(200).json({
        success: true,
        uploadUrl,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Error initiating resumable upload session',
      });
    }
  }

  if (action === 'make_public') {
    if (!fileId) {
      return res.status(400).json({ success: false, error: 'fileId is required' });
    }

    try {
      const drive = google.drive({ version: 'v3', auth });

      try {
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permErr) {
        console.warn('[Drive Permission Warning]', permErr?.message);
      }

      const fileData = await drive.files.get({
        fileId,
        fields: 'id, name, webViewLink, webContentLink',
      });

      const viewLink = fileData.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      return res.status(200).json({
        success: true,
        driveFileId: fileId,
        driveLink: viewLink,
        downloadLink: fileData.data.webContentLink,
        fileName: fileData.data.name,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to set public permissions on file',
      });
    }
  }

  return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
});

// ─── Cloud Sync Merging Logic ────────────────────────────────────────────────
function mergeMasterStates(current, incoming, callerRole = 'admin') {
  if (!current) current = DEFAULT_STATE;
  if (!incoming) return current || DEFAULT_STATE;

  const deletedIds = new Set([
    ...(Array.isArray(current.deletedIds) ? current.deletedIds.map((id) => id.toUpperCase()) : []),
    ...(Array.isArray(incoming.deletedIds) ? incoming.deletedIds.map((id) => id.toUpperCase()) : []),
  ]);

  // 1. Users — ONLY ADMIN CAN MUTATE
  const userMap = new Map();
  if (Array.isArray(current.users)) {
    current.users.forEach((u) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
        userMap.set(u.teacherId.toUpperCase(), u);
      }
    });
  }

  if (callerRole === 'admin' && Array.isArray(incoming.users)) {
    incoming.users.forEach((u) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
        const existing = userMap.get(u.teacherId.toUpperCase());
        const isExistingRealEmail = existing?.email && !String(existing.email).endsWith('@aew.com');
        const isIncomingRealEmail = u?.email && !String(u.email).endsWith('@aew.com');
        const resolvedEmail = isIncomingRealEmail ? u.email : (isExistingRealEmail ? existing.email : (u.email || existing?.email));

        let passwordToStore = existing?.password;
        if (u.password && typeof u.password === 'string' && u.password.trim() !== '') {
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

  const hasAdmin = Array.from(userMap.values()).some((u) => u.role === 'admin');
  if (!hasAdmin) {
    userMap.set('ADMIN-01', DEFAULT_STATE.users[0]);
  }

  // 2. Topics
  const topicMap = new Map();
  if (Array.isArray(current.assignedTopics)) {
    current.assignedTopics.forEach((t) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) topicMap.set(t.id, t);
    });
  }
  if (Array.isArray(incoming.assignedTopics)) {
    incoming.assignedTopics.forEach((t) => {
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

  // 3. Lectures
  const lectureMap = new Map();
  if (Array.isArray(current.lectures)) {
    current.lectures.forEach((l) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) lectureMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.lectures)) {
    incoming.lectures.forEach((l) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) {
        const existing = lectureMap.get(l.id);
        if (!existing) {
          lectureMap.set(l.id, l);
        } else {
          const remarkMap = new Map();
          (existing.adminRemarks || []).forEach((r) => {
            if (r && r.id) remarkMap.set(r.id, r);
          });
          (l.adminRemarks || []).forEach((r) => {
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

  // 4. References
  const refMap = new Map();
  const getRefKey = (r) => {
    if (r && r.id) return String(r.id);
    const dept = (r?.department || 'general').trim().toLowerCase().replace(/\s+/g, ' ');
    const subj = (r?.subjectName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const title = (r?.title || '').trim().toLowerCase();
    return `${dept}::${subj}::${title}`;
  };

  if (Array.isArray(current.subjectReferences)) {
    current.subjectReferences.forEach((r) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has((r.id || '').toUpperCase())) {
        refMap.set(getRefKey(r), r);
      }
    });
  }
  if (Array.isArray(incoming.subjectReferences)) {
    incoming.subjectReferences.forEach((r) => {
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

  // 5. Commitments
  const commitmentMap = new Map();
  if (Array.isArray(current.dailyCommitments)) {
    current.dailyCommitments.forEach((c) => {
      if (c && c.teacherId && c.date) {
        commitmentMap.set(`${c.teacherId.toUpperCase()}_${c.date}`, c);
      }
    });
  }
  if (Array.isArray(incoming.dailyCommitments)) {
    incoming.dailyCommitments.forEach((c) => {
      if (c && c.teacherId && c.date) {
        commitmentMap.set(`${c.teacherId.toUpperCase()}_${c.date}`, {
          ...commitmentMap.get(`${c.teacherId.toUpperCase()}_${c.date}`),
          ...c,
        });
      }
    });
  }

  // 6. PPT Requests
  const pptMap = new Map();
  if (Array.isArray(current.pptRequests)) {
    current.pptRequests.forEach((p) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) pptMap.set(p.id, p);
    });
  }
  if (Array.isArray(incoming.pptRequests)) {
    incoming.pptRequests.forEach((p) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) {
        pptMap.set(p.id, {
          ...pptMap.get(p.id),
          ...p,
        });
      }
    });
  }

  // 7. Extensions
  const extMap = new Map();
  if (Array.isArray(current.extensions)) {
    current.extensions.forEach((e) => {
      if (e && e.id && !deletedIds.has(e.id.toUpperCase())) extMap.set(e.id, e);
    });
  }
  if (Array.isArray(incoming.extensions)) {
    incoming.extensions.forEach((e) => {
      if (e && e.id && !deletedIds.has(e.id.toUpperCase())) {
        extMap.set(e.id, {
          ...extMap.get(e.id),
          ...e,
        });
      }
    });
  }

  // 8. Wallet Transactions
  const walletMap = new Map();
  if (Array.isArray(current.walletTransactions)) {
    current.walletTransactions.forEach((w) => {
      if (w && w.id && !deletedIds.has(w.id.toUpperCase())) walletMap.set(w.id, w);
    });
  }
  if (Array.isArray(incoming.walletTransactions)) {
    incoming.walletTransactions.forEach((w) => {
      if (w && w.id && !deletedIds.has(w.id.toUpperCase())) {
        walletMap.set(w.id, {
          ...walletMap.get(w.id),
          ...w,
        });
      }
    });
  }

  // 9. Day Off Grants
  const dayOffMap = new Map();
  if (Array.isArray(current.dayOffGrants)) {
    current.dayOffGrants.forEach((g) => {
      if (g && g.id && !deletedIds.has(g.id.toUpperCase())) dayOffMap.set(g.id, g);
    });
  }
  if (Array.isArray(incoming.dayOffGrants)) {
    incoming.dayOffGrants.forEach((g) => {
      if (g && g.id && !deletedIds.has(g.id.toUpperCase())) {
        dayOffMap.set(g.id, {
          ...dayOffMap.get(g.id),
          ...g,
        });
      }
    });
  }

  // 10. Email Configuration — ONLY ADMIN CAN MUTATE
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

  // 11. Email Logs
  const logMap = new Map();
  if (Array.isArray(current.emailLogs)) {
    current.emailLogs.forEach((l) => {
      if (l && l.id) logMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.emailLogs)) {
    incoming.emailLogs.forEach((l) => {
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

// ─── Cloud Sync Endpoints ─────────────────────────────────────────────────────
app.get('/api/cloud-sync', requireAuth, async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`sync_get:${req.user.sub}:${ip}`, 120, 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'Too many sync requests.' });
  }

  const state = await getLatestPortalState();
  return res.status(200).json({
    success: true,
    source: inMemoryStateCache ? 'memory' : 'default',
    data: sanitizePortalState(state, req.user.role),
  });
});

app.post('/api/cloud-sync', requireAuth, async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`sync_post:${req.user.sub}:${ip}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'Too many update requests.' });
  }

  try {
    const incomingData = req.body?.data || req.body;
    if (!incomingData || typeof incomingData !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing data payload' });
    }

    const currentCloudData = await getLatestPortalState();
    const mergedData = mergeMasterStates(currentCloudData, incomingData, req.user.role);
    await persistPortalState(mergedData);

    return res.status(200).json({
      success: true,
      source: 'supabase',
      updatedAt: mergedData.updatedAt,
      data: sanitizePortalState(mergedData, req.user.role),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to save cloud sync' });
  }
});

// ─── DeepSeek PPT Generator Endpoint ──────────────────────────────────────────
app.post('/api/deepseek-generate-ppt', requireAuth, async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai_ppt:${req.user.sub}:${ip}`, 20, 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'AI generation rate limit exceeded.' });
  }

  const {
    subject = 'Engineering',
    unit = 'UNIT 1',
    topicTitle,
    pyqList = [],
    customInstructions = '',
    targetAudience = 'zero_knowledge',
    slideCount = 10,
    apiKey: userApiKey,
  } = req.body || {};

  if (!topicTitle || typeof topicTitle !== 'string' || topicTitle.trim() === '') {
    return res.status(400).json({ success: false, error: 'topicTitle is required.' });
  }

  const apiKey = (userApiKey && userApiKey.trim() !== '') ? userApiKey.trim() : process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'DeepSeek API Key is not configured. Please enter your DeepSeek API key in settings or set DEEPSEEK_API_KEY.',
      needsApiKey: true,
    });
  }

  let rawPyqSection = 'No user PYQs provided. Generate 2 to 3 standard university/GATE examination problems matching this exact topic.';
  if (Array.isArray(pyqList) && pyqList.length > 0) {
    rawPyqSection = pyqList
      .slice(0, 20)
      .map(
        (q, i) =>
          `[Question #${i + 1}] ${q.mappedTopic ? `Topic: ${q.mappedTopic} | ` : ''}${q.unitNumber ? `Unit: ${q.unitNumber} | ` : ''}${q.yearExam ? `Exam: ${q.yearExam} | ` : ''}Text: ${q.questionText}${q.marks ? ` [${q.marks}]` : ''}`
      )
      .join('\n\n');
  }

  const systemPrompt = `You are a distinguished Engineering Professor and Master Pedagogical Presentation Designer.
Your task is to generate a comprehensive, highly engaging, visually structured 16:9 presentation slide deck for a specific university syllabus topic. Ensure the deck has between ${Math.max(6, Math.min(15, slideCount))} high-quality slides. Return ONLY the valid JSON object with NO markdown code fences.`;

  const userPrompt = `Generate a master first-principles slide deck for:
Subject: ${subject}
Unit: ${unit}
Topic: ${topicTitle}
Target Audience Pedagogy: ${targetAudience} (Zero-knowledge first principles + Gap analysis on PYQs)
Custom Instructions: ${customInstructions || 'Provide accurate engineering analogies, complete subtopic roadmap, and solve relevant PYQs step-by-step.'}

Candidate Previous Year Questions (Filter strictly for "${topicTitle}"):
${rawPyqSection}

Please generate the complete JSON slide deck now.`;

  try {
    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!deepSeekResponse.ok) {
      const errText = await deepSeekResponse.text();
      let parsedErr = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedErr = errJson.error?.message || errText;
      } catch {
        // ignore
      }

      return res.status(deepSeekResponse.status).json({
        success: false,
        error: `DeepSeek API returned error (${deepSeekResponse.status}): ${parsedErr}`,
      });
    }

    const data = await deepSeekResponse.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return res.status(500).json({ success: false, error: 'DeepSeek returned an empty response.' });
    }

    let parsedDeck;
    try {
      const cleanJsonStr = messageContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsedDeck = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
      return res.status(500).json({
        success: false,
        error: `Failed to parse DeepSeek response into JSON: ${parseErr?.message}`,
        rawContent: messageContent,
      });
    }

    return res.status(200).json({
      success: true,
      deck: parsedDeck,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Network error communicating with DeepSeek API.',
    });
  }
});

// ─── DeepSeek Answer Pointers Endpoint ───────────────────────────────────────
app.post('/api/deepseek-generate-pointers', requireAuth, async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai_pointers:${req.user.sub}:${ip}`, 20, 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'AI pointer generation rate limit exceeded.' });
  }

  const {
    subject = 'Engineering',
    questions = [],
    apiKey: userApiKey,
  } = req.body || {};

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'No questions provided for pointer generation.' });
  }

  const apiKey = (userApiKey && typeof userApiKey === 'string' && userApiKey.trim() !== '')
    ? userApiKey.trim()
    : process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'DeepSeek API Key is not configured. Please enter your DeepSeek API key in settings or set DEEPSEEK_API_KEY.',
      needsApiKey: true,
    });
  }

  const formattedQuestions = questions
    .map(
      (q, idx) =>
        `[Question #${idx + 1}] ID: ${q.id || idx + 1} | Year: ${q.examYear || 'N/A'} | Marks: ${q.marks || 'N/A'} | Topic: ${q.topic || 'General'}\nProblem Statement: ${q.questionText}${q.solution ? `\nReference Note: ${q.solution}` : ''}`
    )
    .join('\n\n');

  const systemPrompt = `You are a distinguished Engineering Professor creating high-yield answer pointer cards for university students. Return valid JSON containing a "pointersList" array.`;
  const userPrompt = `Generate answer pointer cards for:
Subject: ${subject}
Questions:
${formattedQuestions}`;

  try {
    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!deepSeekResponse.ok) {
      const errText = await deepSeekResponse.text();
      return res.status(deepSeekResponse.status).json({
        success: false,
        error: `DeepSeek API returned error (${deepSeekResponse.status}): ${errText}`,
      });
    }

    const data = await deepSeekResponse.json();
    const messageContent = data.choices?.[0]?.message?.content;
    const cleanJson = messageContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      pointersMap: parsed.pointersList || parsed,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error communicating with DeepSeek API',
    });
  }
});

// ─── Upload Endpoint (Multipart fallback) ────────────────────────────────────
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`upload:${req.user.sub}:${ip}`, 40, 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'Upload rate limit exceeded.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file received.' });
  }

  const drive = getDriveClient();
  if (!drive) {
    return res.status(503).json({
      success: false,
      error: 'Google Drive is not configured on this server. Add GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY to .env',
    });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    const { Readable } = require('stream');

    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    const requestBody = {
      name: req.file.originalname,
    };

    if (folderId && folderId.trim() !== '') {
      requestBody.parents = [folderId.trim()];
    }

    const driveResponse = await drive.files.create({
      requestBody,
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = driveResponse.data.id;

    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn('[Drive Permission Warning]', permErr.message);
    }

    const fileData = await drive.files.get({
      fileId,
      fields: 'id, name, webViewLink, webContentLink',
    });

    const viewLink = fileData.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return res.json({
      success: true,
      driveFileId: fileId,
      driveLink: viewLink,
      downloadLink: fileData.data.webContentLink,
      fileName: fileData.data.name,
    });
  } catch (err) {
    console.error('[Drive Upload Error]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Upload to Google Drive failed.',
    });
  }
});

// ─── Operational Notification Email Endpoint ─────────────────────────────────
app.post('/api/send-email', requireAuth, async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`email:${req.user.sub}:${ip}`, 20, 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'Email dispatch rate limit exceeded.' });
  }

  const { to, type, data } = req.body || {};
  const SMTP_USER = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const SMTP_PASS = (process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
  const SMTP_HOST = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);

  const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
  const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'Academic Operations <onboarding@resend.dev>').trim();
  const PORTAL_URL = process.env.PORTAL_URL || 'https://teacher-portal-mu-nine.vercel.app';

  if (!to || !type) {
    return res.status(400).json({ error: 'Missing required parameters: "to" and "type".' });
  }

  const recipientList = Array.isArray(to) ? to : [to];
  const validRecipients = recipientList.filter((email) => typeof email === 'string' && email.includes('@'));

  if (validRecipients.length === 0) {
    return res.status(400).json({ error: 'No valid recipient email addresses provided.' });
  }

  let subject = `AEW Portal Operational Notification: ${type}`;
  let bodyText = `Operational update in Teacher Portal for ${type}`;

  if (type === 'topic_assigned') {
    subject = `📌 New Syllabus Topic Assigned: "${data?.topicTitle}" (${data?.subject || 'Subject'})`;
  } else if (type === 'admin_directive') {
    subject = `💬 Quality Directive: Feedback on "${data?.lectureTitle || 'Delivered Lecture'}"`;
  } else if (type === 'directive_acknowledged') {
    subject = `✓ Directive Acknowledged: ${data?.teacherName} (${data?.teacherId})`;
  } else if (type === 'extension_granted') {
    subject = `⏱️ Extension Window Granted: ${data?.subject || 'Academic Work'} (${data?.allowedMinutes} min)`;
  } else if (type === 'subtopics_submitted') {
    subject = `📑 Subtopics Proposed: ${data?.teacherName} — "${data?.topicTitle}"`;
  } else if (type === 'subtopics_reviewed') {
    subject = data?.status === 'approved' 
      ? `✅ Subtopics Approved: "${data?.topicTitle}" (${data?.subject})`
      : `⚠️ Revision Requested: "${data?.topicTitle}" (${data?.subject})`;
  } else if (type === 'ppt_requested') {
    subject = `📊 PYQ PPT Requested: ${data?.teacherName} — "${data?.topicTitle}"`;
  } else if (type === 'ppt_ready') {
    subject = `🎉 PYQ Deck Ready: "${data?.topicTitle}" (${data?.subject})`;
  }

  const html = `
    <div style="font-family: sans-serif; background-color: #020617; color: #e2e8f0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #ffffff;">🎓 AEW Academic Studio</h2>
      <div style="background-color: #0f172a; border: 1px solid #334155; padding: 18px; border-radius: 8px; margin: 16px 0;">
        <h3 style="color: #6366f1; margin-top: 0;">${subject}</h3>
        <p>${bodyText}</p>
        <div style="margin-top: 18px;">
          <a href="${PORTAL_URL}" style="background: #4f46e5; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">Open Teacher Portal →</a>
        </div>
      </div>
    </div>
  `;

  // For security, only admins may supply custom SMTP config in body
  const bodyConfig = (req.user.role === 'admin' ? (req.body?.config || {}) : {});
  const activeSmtpUser = (bodyConfig.smtpUser || SMTP_USER).trim();
  const activeSmtpPass = (bodyConfig.smtpPass ? String(bodyConfig.smtpPass).trim().replace(/\s+/g, '') : SMTP_PASS);
  const activeSmtpHost = (bodyConfig.smtpHost || SMTP_HOST || 'smtp.gmail.com').trim();
  const activeSmtpPort = parseInt(bodyConfig.smtpPort || SMTP_PORT || '465', 10);
  const activeSenderName = (bodyConfig.senderName || 'AEW Academic Operations').replace(/["\r\n]/g, '').trim();
  const activeSmtpFrom = `"${activeSenderName}" <${activeSmtpUser}>`;
  const activeResendKey = (bodyConfig.resendApiKey || RESEND_API_KEY).trim();
  const activeResendFrom = (bodyConfig.fromEmail || RESEND_FROM_EMAIL).trim();

  // 1. Dispatch via SMTP
  if (activeSmtpUser && activeSmtpPass) {
    try {
      const isSecure = activeSmtpPort === 465;
      const transporter = nodemailer.createTransport({
        host: activeSmtpHost,
        port: activeSmtpPort,
        secure: isSecure,
        requireTLS: !isSecure && activeSmtpPort === 587,
        auth: {
          user: activeSmtpUser,
          pass: activeSmtpPass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });

      const info = await transporter.sendMail({
        from: activeSmtpFrom,
        to: validRecipients.join(', '),
        subject,
        html,
      });

      console.log(`[SendEmail] SMTP sent "${type}" to:`, validRecipients);
      return res.json({ success: true, status: 'delivered', provider: 'smtp', messageId: info.messageId, subject });
    } catch (err) {
      console.error('[SendEmail SMTP Error]', err.message);
      let friendlyError = err.message || 'Failed to dispatch email via SMTP.';
      if (err.code === 'EAUTH' || friendlyError.includes('535-5.7.8')) {
        friendlyError = 'Google SMTP Authentication Failed (535-5.7.8). Ensure 2-Step Verification is enabled and you generated a 16-character Google App Password.';
      }
      return res.status(500).json({ success: false, status: 'failed', error: friendlyError, provider: 'smtp', subject });
    }
  }

  // 2. Dispatch via Resend API
  if (activeResendKey) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeResendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: activeResendFrom,
          to: validRecipients,
          subject,
          html,
        }),
      });

      const resendResult = await resendResponse.json();
      return res.status(resendResponse.status).json({
        ...resendResult,
        status: resendResponse.ok ? 'delivered' : 'failed',
        subject,
      });
    } catch (err) {
      console.error('[SendEmail Resend Error]', err.message);
      return res.status(500).json({ success: false, status: 'failed', error: err.message, subject });
    }
  }

  // 3. Fallback
  console.log(`[SendEmail] Simulating email "${type}" to:`, validRecipients);
  return res.json({
    success: true,
    simulated: true,
    status: 'simulated',
    message: 'No email credentials (SMTP_USER/SMTP_PASS or RESEND_API_KEY) found. Email logged in simulated mode.',
    recipients: validRecipients,
    subject,
    type,
  });
});

// ─── START LOCAL SERVER LISTENER ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Teacher Portal Server] Running on http://localhost:${PORT}`);
  console.log(`[Teacher Portal Server] Health check available at http://localhost:${PORT}/api/health`);
});