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
  isHardcodedMockUser,
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
  prTasks: [],
  prLeads: [],
  prMous: [],
  prColleges: [],
  salesLeads: [],
  crmPermissions: {},
  webDevProjects: [],
  webDevMilestones: [],
  webDevTasks: [],
  webDevBounties: [],
  webDevXpLedger: [],
  webDevFulfillments: [],
  webDevKudos: [],
  webDevAuditLogs: [],
  webDevRewards: [],
  webDevUserAchievements: [],
  webDevNotifications: [],
  offerLetters: [],
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
        const data = rows[0].data;
        if (Array.isArray(data.users)) {
          data.users = data.users.filter(u => !isHardcodedMockUser(u));
        }
        inMemoryStateCache = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('[server] Error fetching Supabase portal state:', err?.message);
  }

  const fallback = inMemoryStateCache || DEFAULT_STATE;
  if (Array.isArray(fallback.users)) {
    fallback.users = fallback.users.filter(u => !isHardcodedMockUser(u));
  }
  return fallback;
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

    // Strict user lookup by registered username, teacher/employee ID, or email address
    const matchedUser = users.find((u) => {
      if (isHardcodedMockUser(u)) return false;
      const uTeacherId = (u.teacherId || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uTeacherId === query || uUsername === query || uEmail === query;
    });

    if (!matchedUser || isHardcodedMockUser(matchedUser)) {
      return res.status(401).json({ success: false, error: 'Invalid username or password. Please verify your credentials.' });
    }

    if (matchedUser.isOffboarded) {
      return res.status(403).json({
        success: false,
        error: `Account has been offboarded (${matchedUser.offboardReason || 'Departure'}). Access is disabled. Please contact HR administration.`,
      });
    }

    // Determine the user's authentic password (user-defined or default initial assigned password)
    const storedPassword = (
      matchedUser.password ||
      (matchedUser.role === 'admin'
        ? 'admin123'
        : matchedUser.role === 'pr_head'
        ? 'head123'
        : matchedUser.role === 'pr_intern'
        ? 'intern123'
        : matchedUser.role === 'sales'
        ? 'sales123'
        : matchedUser.role === 'web_dev_manager' || matchedUser.role === 'web_developer'
        ? 'dev123'
        : 'teach123')
    ).trim();

    // Strict cryptographic password verification — no master bypass passwords permitted
    const verifyResult = verifyPassword(inputPass, storedPassword);

    if (!verifyResult.valid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password. Please verify your credentials.' });
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
    targetUser.mustChangePassword = false;
    targetUser.lastPasswordChangedAt = new Date().toISOString();
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

  // If incoming contains active users being added or updated by authorized callers,
  // ensure their IDs are not blocked by stale deletedIds in state.
  const canMutateUsers = callerRole === 'admin' || callerRole === 'web_dev_manager' || callerRole === 'pr_head';
  if (canMutateUsers && Array.isArray(incoming.users)) {
    incoming.users.forEach((u) => {
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
  const userMap = new Map();
  if (Array.isArray(current.users)) {
    current.users.forEach((u) => {
      if (u && u.teacherId && !isHardcodedMockUser(u) && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id?.toUpperCase())) {
        userMap.set(u.teacherId.toUpperCase(), u);
      }
    });
  }

  if (canMutateUsers && Array.isArray(incoming.users)) {
    incoming.users.forEach((u) => {
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

  // 2. Merge Assigned Topics
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

  // 3. Merge Lectures
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

  // 4. Merge Subject References
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

  // 5. Merge Daily Commitments
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

  // 6. Merge PPT Requests
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

  // 7. Merge Extensions
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

  // 8. Merge Wallet Transactions
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

  // 9. Merge Day Off Grants
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
  const emailLogMap = new Map();
  if (Array.isArray(current.emailLogs)) {
    current.emailLogs.forEach((log) => {
      if (log && log.id && !deletedIds.has(log.id.toUpperCase())) emailLogMap.set(log.id, log);
    });
  }
  if (Array.isArray(incoming.emailLogs)) {
    incoming.emailLogs.forEach((log) => {
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
  const prTaskMap = new Map();
  if (Array.isArray(current.prTasks)) {
    current.prTasks.forEach((t) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) prTaskMap.set(t.id, t);
    });
  }
  if (Array.isArray(incoming.prTasks)) {
    incoming.prTasks.forEach((t) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) {
        prTaskMap.set(t.id, {
          ...prTaskMap.get(t.id),
          ...t,
        });
      }
    });
  }

  // 13. Merge PR Leads
  const prLeadMap = new Map();
  if (Array.isArray(current.prLeads)) {
    current.prLeads.forEach((l) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) prLeadMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.prLeads)) {
    incoming.prLeads.forEach((l) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) {
        prLeadMap.set(l.id, {
          ...prLeadMap.get(l.id),
          ...l,
        });
      }
    });
  }

  // 14. Merge PR MOUs
  const prMouMap = new Map();
  if (Array.isArray(current.prMous)) {
    current.prMous.forEach((m) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) prMouMap.set(m.id, m);
    });
  }
  if (Array.isArray(incoming.prMous)) {
    incoming.prMous.forEach((m) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) {
        prMouMap.set(m.id, {
          ...prMouMap.get(m.id),
          ...m,
        });
      }
    });
  }

  // 15. Merge PR Colleges
  const prCollegeMap = new Map();
  if (Array.isArray(current.prColleges)) {
    current.prColleges.forEach((c) => {
      if (c && c.id && !deletedIds.has(c.id.toUpperCase())) prCollegeMap.set(c.id, c);
    });
  }
  if (Array.isArray(incoming.prColleges)) {
    incoming.prColleges.forEach((c) => {
      if (c && c.id && !deletedIds.has(c.id.toUpperCase())) {
        prCollegeMap.set(c.id, {
          ...prCollegeMap.get(c.id),
          ...c,
        });
      }
    });
  }

  // 16. Merge Sales Leads
  const salesLeadMap = new Map();
  if (Array.isArray(current.salesLeads)) {
    current.salesLeads.forEach((l) => {
      if (l && l.id && !deletedIds.has(l.id.toUpperCase())) salesLeadMap.set(l.id, l);
    });
  }
  if (Array.isArray(incoming.salesLeads)) {
    incoming.salesLeads.forEach((l) => {
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
  const webDevProjectMap = new Map();
  if (Array.isArray(current.webDevProjects)) {
    current.webDevProjects.forEach((p) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) webDevProjectMap.set(p.id, p);
    });
  }
  if (Array.isArray(incoming.webDevProjects)) {
    incoming.webDevProjects.forEach((p) => {
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
  const webDevMilestoneMap = new Map();
  if (Array.isArray(current.webDevMilestones)) {
    current.webDevMilestones.forEach((m) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) webDevMilestoneMap.set(m.id, m);
    });
  }
  if (Array.isArray(incoming.webDevMilestones)) {
    incoming.webDevMilestones.forEach((m) => {
      if (m && m.id && !deletedIds.has(m.id.toUpperCase())) {
        webDevMilestoneMap.set(m.id, {
          ...webDevMilestoneMap.get(m.id),
          ...m,
        });
      }
    });
  }

  // 19. Merge Web Dev Tasks
  const webDevTaskMap = new Map();
  if (Array.isArray(current.webDevTasks)) {
    current.webDevTasks.forEach((t) => {
      if (t && t.id && !deletedIds.has(t.id.toUpperCase())) webDevTaskMap.set(t.id, t);
    });
  }
  if (Array.isArray(incoming.webDevTasks)) {
    incoming.webDevTasks.forEach((t) => {
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
          const commentMap = new Map();
          exComments.forEach((c) => c && c.id && commentMap.set(c.id, c));
          inComments.forEach((c) => c && c.id && commentMap.set(c.id, { ...commentMap.get(c.id), ...c }));

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
  const webDevBountyMap = new Map();
  if (Array.isArray(current.webDevBounties)) {
    current.webDevBounties.forEach((b) => {
      if (b && b.id && !deletedIds.has(b.id.toUpperCase())) webDevBountyMap.set(b.id, b);
    });
  }
  if (Array.isArray(incoming.webDevBounties)) {
    incoming.webDevBounties.forEach((b) => {
      if (b && b.id && !deletedIds.has(b.id.toUpperCase())) {
        webDevBountyMap.set(b.id, {
          ...webDevBountyMap.get(b.id),
          ...b,
        });
      }
    });
  }

  // 21. Merge Web Dev XP Ledger
  const webDevXpLedgerMap = new Map();
  if (Array.isArray(current.webDevXpLedger)) {
    current.webDevXpLedger.forEach((tx) => {
      if (tx && tx.id) webDevXpLedgerMap.set(tx.id, tx);
    });
  }
  if (Array.isArray(incoming.webDevXpLedger)) {
    incoming.webDevXpLedger.forEach((tx) => {
      if (tx && tx.id) {
        webDevXpLedgerMap.set(tx.id, tx);
      }
    });
  }

  // 22. Merge Web Dev Fulfillments
  const webDevFulfillmentMap = new Map();
  if (Array.isArray(current.webDevFulfillments)) {
    current.webDevFulfillments.forEach((f) => {
      if (f && f.id && !deletedIds.has(f.id.toUpperCase())) webDevFulfillmentMap.set(f.id, f);
    });
  }
  if (Array.isArray(incoming.webDevFulfillments)) {
    incoming.webDevFulfillments.forEach((f) => {
      if (f && f.id && !deletedIds.has(f.id.toUpperCase())) {
        webDevFulfillmentMap.set(f.id, {
          ...webDevFulfillmentMap.get(f.id),
          ...f,
        });
      }
    });
  }

  // 23. Merge Web Dev Kudos
  const webDevKudosMap = new Map();
  if (Array.isArray(current.webDevKudos)) {
    current.webDevKudos.forEach((k) => {
      if (k && k.id) webDevKudosMap.set(k.id, k);
    });
  }
  if (Array.isArray(incoming.webDevKudos)) {
    incoming.webDevKudos.forEach((k) => {
      if (k && k.id) {
        webDevKudosMap.set(k.id, k);
      }
    });
  }

  // 24. Merge Web Dev Audit Logs
  const webDevAuditLogMap = new Map();
  if (Array.isArray(current.webDevAuditLogs)) {
    current.webDevAuditLogs.forEach((log) => {
      if (log && log.id) webDevAuditLogMap.set(log.id, log);
    });
  }
  if (Array.isArray(incoming.webDevAuditLogs)) {
    incoming.webDevAuditLogs.forEach((log) => {
      if (log && log.id) {
        webDevAuditLogMap.set(log.id, log);
      }
    });
  }

  // 25. Merge Offer Letters
  const offerLetterMap = new Map();
  if (Array.isArray(current.offerLetters)) {
    current.offerLetters.forEach((ol) => {
      if (ol && ol.id && !deletedIds.has(ol.id.toUpperCase())) offerLetterMap.set(ol.id, ol);
    });
  }
  if (Array.isArray(incoming.offerLetters)) {
    incoming.offerLetters.forEach((ol) => {
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
  const rewardMap = new Map();
  if (Array.isArray(current.webDevRewards)) {
    current.webDevRewards.forEach((r) => {
      if (r && r.id && !deletedIds.has(r.id.toUpperCase())) rewardMap.set(r.id, r);
    });
  }
  if (Array.isArray(incoming.webDevRewards)) {
    incoming.webDevRewards.forEach((r) => {
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
  const userAchMap = new Map();
  if (Array.isArray(current.webDevUserAchievements)) {
    current.webDevUserAchievements.forEach((ua) => {
      if (ua && ua.id) userAchMap.set(ua.id, ua);
    });
  }
  if (Array.isArray(incoming.webDevUserAchievements)) {
    incoming.webDevUserAchievements.forEach((ua) => {
      if (ua && ua.id) {
        userAchMap.set(ua.id, ua);
      }
    });
  }

  // 28. Merge Web Dev Notifications
  const notifMap = new Map();
  if (Array.isArray(current.webDevNotifications)) {
    current.webDevNotifications.forEach((n) => {
      if (n && n.id) notifMap.set(n.id, n);
    });
  }
  if (Array.isArray(incoming.webDevNotifications)) {
    incoming.webDevNotifications.forEach((n) => {
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

  // 29. CRM Access Permissions
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
    offerLetters: Array.from(offerLetterMap.values()),
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

// ─── Sales CRM Endpoints ──────────────────────────────────────────────────────
app.get('/api/sales/leads', requireAuth, async (req, res) => {
  try {
    const state = await getLatestPortalState();
    const leads = Array.isArray(state.salesLeads) ? state.salesLeads : [];
    const permissions = state.crmPermissions || {};
    const userPerm = permissions[req.user.sub] || permissions[req.user.teacherId] || {};

    const isAuthorizedManager = req.user.role === 'admin' || userPerm.crmRole === 'sales_manager';
    if (isAuthorizedManager) {
      return res.status(200).json({ success: true, leads });
    }

    // Filter strictly to entries assigned to this employee
    const userIds = [req.user.sub, req.user.teacherId].filter(Boolean).map(id => String(id).toUpperCase());
    const filtered = leads.filter(l => l.assignedToEmployeeId && userIds.includes(String(l.assignedToEmployeeId).toUpperCase()));

    return res.status(200).json({ success: true, leads: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sales/leads', requireAuth, async (req, res) => {
  try {
    const state = await getLatestPortalState();
    const leads = Array.isArray(state.salesLeads) ? [...state.salesLeads] : [];
    const incoming = req.body?.lead || req.body?.leads;

    if (!incoming) {
      return res.status(400).json({ success: false, error: 'Missing lead payload.' });
    }

    const itemsToAdd = Array.isArray(incoming) ? incoming : [incoming];
    const now = new Date().toISOString();

    const prepared = itemsToAdd.map(item => ({
      id: item.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: item.name || 'Unnamed Lead',
      phoneNumber: item.phoneNumber || '',
      altPhoneNumber: item.altPhoneNumber || undefined,
      email: item.email || undefined,
      organization: item.organization || undefined,
      designation: item.designation || undefined,
      programOfInterest: item.programOfInterest || undefined,
      city: item.city || undefined,
      state: item.state || undefined,
      status: item.status || 'new',
      priority: item.priority || 'medium',
      dealValue: Number(item.dealValue) || 0,
      assignedToEmployeeId: item.assignedToEmployeeId || undefined,
      assignedToEmployeeName: item.assignedToEmployeeName || undefined,
      source: item.source || 'Admin Entry',
      tags: Array.isArray(item.tags) ? item.tags : [],
      notes: item.notes || '',
      createdAt: item.createdAt || now,
      updatedAt: now,
      lastContactedAt: item.lastContactedAt || undefined,
      lastCallPicked: item.lastCallPicked !== undefined ? item.lastCallPicked : undefined,
      lastDisposition: item.lastDisposition || undefined,
      lastFeedback: item.lastFeedback || undefined,
      nextFollowUpDate: item.nextFollowUpDate || undefined,
      nextFollowUpTime: item.nextFollowUpTime || undefined,
      activityLogs: Array.isArray(item.activityLogs) ? item.activityLogs : [],
    }));

    if (req.body?.replace) {
      state.salesLeads = prepared;
    } else {
      const leadMap = new Map();
      leads.forEach(l => { if (l && l.id) leadMap.set(l.id, l); });
      prepared.forEach(item => {
        const existing = leadMap.get(item.id);
        if (existing) {
          const cleanItem = {};
          Object.keys(item).forEach(key => {
            if (item[key] !== undefined && key !== 'activityLogs') {
              // Don't overwrite existing valid fields with default placeholders
              if ((key === 'name' && item.name === 'Unnamed Lead') || (key === 'phoneNumber' && !item.phoneNumber)) {
                return;
              }
              cleanItem[key] = item[key];
            }
          });

          // Merge activity logs
          const existingLogs = Array.isArray(existing.activityLogs) ? existing.activityLogs : [];
          const incomingLogs = Array.isArray(item.activityLogs) ? item.activityLogs : [];
          const logMap = new Map();
          existingLogs.forEach(log => { if (log && log.id) logMap.set(log.id, log); });
          incomingLogs.forEach(log => { if (log && log.id) logMap.set(log.id, log); else if (log) logMap.set(`log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, log); });

          leadMap.set(item.id, {
            ...existing,
            ...cleanItem,
            activityLogs: Array.from(logMap.values()),
            updatedAt: now,
          });
        } else {
          leadMap.set(item.id, item);
        }
      });
      state.salesLeads = Array.from(leadMap.values());
    }

    state.updatedAt = now;
    await persistPortalState(state);

    return res.status(201).json({ success: true, addedCount: prepared.length, leads: state.salesLeads });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sales/permissions', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can modify CRM visibility.' });
    }

    const { employeeId, hasCrmAccess, crmRole, permissions: bulkPerms } = req.body || {};
    const state = await getLatestPortalState();
    const permissions = state.crmPermissions || {};

    if (bulkPerms && typeof bulkPerms === 'object') {
      Object.entries(bulkPerms).forEach(([empId, p]) => {
        permissions[empId] = {
          hasCrmAccess: Boolean(p.hasCrmAccess),
          crmRole: p.crmRole || 'sales_rep',
          updatedAt: new Date().toISOString(),
        };
      });
    } else if (employeeId) {
      permissions[employeeId] = {
        hasCrmAccess: Boolean(hasCrmAccess),
        crmRole: crmRole || 'sales_rep',
        updatedAt: new Date().toISOString(),
      };
    } else {
      return res.status(400).json({ success: false, error: 'Missing employeeId or permissions object.' });
    }

    state.crmPermissions = permissions;

    // Also update matching user records in state.users
    if (Array.isArray(state.users)) {
      state.users = state.users.map(u => {
        const p = permissions[u.id] || permissions[u.teacherId];
        if (p) {
          return {
            ...u,
            hasCrmAccess: Boolean(p.hasCrmAccess),
            crmRole: p.crmRole || u.crmRole || 'sales_rep',
          };
        }
        return u;
      });
    }

    state.updatedAt = new Date().toISOString();
    await persistPortalState(state);

    return res.status(200).json({ success: true, permissions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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

// ─── Safe JSON Repair Helper for Truncated LLM Outputs ───────────────────────
function safeParseJsonWithRepair(rawStr) {
  if (!rawStr || typeof rawStr !== 'string') {
    return { success: false, error: 'Empty input string' };
  }

  const clean = rawStr
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 1. Direct parse
  try {
    const parsed = JSON.parse(clean);
    return { success: true, data: parsed };
  } catch (e1) {}

  // 2. Control characters sanitation
  try {
    const sanitized = clean.replace(/[\u0000-\u001F]+/g, (match) => {
      if (match === '\n') return '\\n';
      if (match === '\r') return '\\r';
      if (match === '\t') return '\\t';
      return '';
    });
    const parsed = JSON.parse(sanitized);
    return { success: true, data: parsed };
  } catch (e2) {}

  // 3. Backward scan for truncated arrays/objects
  let endPos = clean.length;
  while (endPos > 0) {
    const lastCloseBrace = clean.lastIndexOf('}', endPos - 1);
    if (lastCloseBrace === -1) break;

    const sub = clean.slice(0, lastCloseBrace + 1);
    const candidates = [sub + ']}', sub + ']', sub + '}'];

    for (const cand of candidates) {
      try {
        const parsed = JSON.parse(cand);
        if (parsed && (Array.isArray(parsed) || Array.isArray(parsed.results) || typeof parsed === 'object')) {
          return { success: true, data: parsed, repaired: true };
        }
      } catch (candErr) {}
    }

    endPos = lastCloseBrace;
  }

  // 4. Regex extraction of individual question objects
  try {
    const extractedResults = [];
    const objectRegex = /\{\s*"questionIndex"\s*:\s*\d+[\s\S]*?\n\s*\}/g;
    let match;
    while ((match = objectRegex.exec(clean)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj && typeof obj.questionIndex === 'number') {
          extractedResults.push(obj);
        }
      } catch (objErr) {}
    }

    if (extractedResults.length > 0) {
      return { success: true, data: { results: extractedResults }, repaired: true };
    }
  } catch (regexErr) {}

  return { success: false, error: 'Could not parse or repair JSON' };
}

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
        `[QUESTION ITEM #${idx + 1}]
ID: ${q.id !== undefined ? q.id : `q-${idx}`}
QUESTION: ${q.questionText}
${q.examYear ? `EXAM: ${q.examYear}` : ''}
${q.marks ? `MARKS: ${q.marks}` : ''}
${q.solution ? `REFERENCE_SOLUTION: ${q.solution.slice(0, 300)}` : ''}`
    )
    .join('\n\n');

  const systemPrompt = `You are an expert university professor for ${subject}.
Write authentic, human-crafted lecture slide answers for previous year university examination questions.
NO AI TEMPLATES, NO ROBOTIC LABELS, NO GENERIC ROADMAPS.
Each slide must contain pure, high-yield, authoritative bullet pointers directly answering the question.

Rules for Pointers:
1. Every pointer MUST start with a **Bold Anchor** (e.g. "**Core Definition:** ...", "**Layer Invariant:** ...", "**State Transitions:** ...", "**Hardware Boundary:** ...", "**Key Formula:** ...", "**Professor Exam Tip:** ...").
2. Answer the EXACT specific question asked. Do not wander or mix answers between questions.
3. For each question, divide the answer across 1 or 2 clean slides (4-6 pointers per slide) so text is spacious, readable, and never crowded.
4. Slide 1 starts with the direct, authoritative core answer/definition pointer, followed by technical mechanisms.
5. Slide 2 (if needed) covers working invariants, trade-offs, governing mathematical expressions/formulas, and practical examination tips.
6. CRITICAL: You MUST return the exact "id" from the input for each question in your output object so questions and answers are mapped 100% accurately without any shifting or mismatch.

RETURN ONLY VALID JSON:
{"results": [{"id": "<exact ID from question input>", "questionText": "<exact question statement>", "coreConcept": "...", "isTheory": true, "slides": [{"part": 1, "bullets": ["**Anchor:** detail"]}]}]}`;
  const userPrompt = `Generate structured professor lecture notes and solutions for:
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
        temperature: 0.25,
        max_tokens: 8192,
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
    const parsedRes = safeParseJsonWithRepair(messageContent);

    if (!parsedRes.success || !parsedRes.data) {
      return res.status(500).json({
        success: false,
        error: parsedRes.error || 'Failed to parse DeepSeek response into JSON.',
        rawContent: messageContent,
      });
    }

    const parsed = parsedRes.data;
    return res.status(200).json({
      success: true,
      pointersMap: parsed.results || parsed.pointersList || parsed,
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
  } else if (type === 'welcome_employee') {
    const role = data?.role || 'teacher';
    const roleTitleMap = {
      teacher: 'Faculty / Subject Matter Expert',
      pr_intern: 'PR & Campus Outreach Intern',
      web_developer: data?.webDevTitle || 'Software Engineer (Web Development)',
      web_dev_manager: data?.webDevTitle || 'Lead Software Architect & Manager',
      sales: data?.crmRole === 'sales_manager' ? 'Sales Manager (Course Admissions)' : 'Sales Representative (Admissions)',
      admin: data?.adminTier ? `Operations Admin (${String(data.adminTier).replace('_', ' ').toUpperCase()})` : 'Operations Administrator',
    };
    const roleTitle = data?.roleTitle || roleTitleMap[role] || 'Team Member';
    subject = `🎉 Welcome to AEW Academic Operations! Your Account Credentials (${data?.name || 'Team Member'})`;
    bodyText = `Welcome to the AEW Team, ${data?.name || 'Team Member'}! Your official team profile has been provisioned as ${roleTitle} in the ${data?.department || 'Academic Operations'} department.`;
  }

  const isWelcome = type === 'welcome_employee';
  const roleTitle = data?.roleTitle || (data?.role ? data.role.toUpperCase() : 'Team Member');

  const html = isWelcome ? `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #e2e8f0; padding: 24px; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #334155;">
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">🎓 AEW Academic Studio</h1>
        <p style="color: #c7d2fe; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Official Team Onboarding</p>
      </div>

      <div style="padding: 0 8px;">
        <p style="font-size: 15px; color: #f8fafc;">Hello <strong>${data?.name || 'Team Member'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          Welcome to <strong>AEW Academic Studio & Operations</strong>! Your official team account has been provisioned as <strong>${roleTitle}</strong> in <strong>${data?.department || 'Academic Operations'}</strong>.
        </p>

        <div style="background-color: #0b1120; border: 1px solid #38bdf8; border-radius: 10px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
            🔑 Official Portal Credentials
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="padding: 6px 0; color: #94a3b8; width: 130px;">Portal URL:</td><td><a href="${PORTAL_URL}" style="color: #38bdf8; font-weight: bold;">${PORTAL_URL}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Employee ID:</td><td style="color: #f8fafc; font-family: monospace; font-weight: bold;">${data?.employeeId || 'AEW-STAFF'}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Username:</td><td style="color: #818cf8; font-family: monospace; font-weight: bold;">${data?.username || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Password:</td><td><span style="color: #34d399; font-family: monospace; font-weight: bold; background: rgba(52, 211, 153, 0.15); padding: 2px 8px; border-radius: 4px;">${data?.password || '-'}</span></td></tr>
            <tr><td style="padding: 6px 0; color: #94a3b8;">Department:</td><td style="color: #e2e8f0;">${data?.department || '-'}</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin: 26px 0;">
          <a href="${PORTAL_URL}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 800; text-decoration: none; font-size: 13px;">
            🚀 Sign In to Your Account →
          </a>
        </div>

        <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px; border-top: 1px solid #1e293b; padding-top: 12px;">
          Strictly confidential onboarding dispatch • AEW Academic Operations
        </p>
      </div>
    </div>
  ` : `
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