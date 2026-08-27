const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ─── Multer (memory storage — we stream directly to Drive) ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

// ─── Google Drive Auth via Service Account ───────────────────────────────────
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey  = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey || privateKey.trim() === '' || privateKey === '\n') {
    return null; // credentials not configured
  }

  const auth = new google.auth.JWT({
    email: clientEmail.trim(),
    key: privateKey.trim().replace(/^"|"$/g, ''),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
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

// ─── Direct Resumable Google Drive Endpoint ──────────────────────────────────
app.post('/api/drive-resumable', async (req, res) => {
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

// ─── Cloud Sync Endpoint ──────────────────────────────────────────────────────
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
};

function mergeMasterStates(current, incoming) {
  if (!current) return incoming || DEFAULT_STATE;
  if (!incoming) return current || DEFAULT_STATE;

  const deletedIds = new Set([
    ...(Array.isArray(current.deletedIds) ? current.deletedIds.map((id) => id.toUpperCase()) : []),
    ...(Array.isArray(incoming.deletedIds) ? incoming.deletedIds.map((id) => id.toUpperCase()) : []),
  ]);

  const userMap = new Map();
  if (Array.isArray(current.users)) {
    current.users.forEach((u) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
        userMap.set(u.teacherId.toUpperCase(), u);
      }
    });
  }
  if (Array.isArray(incoming.users)) {
    incoming.users.forEach((u) => {
      if (u && u.teacherId && !deletedIds.has(u.teacherId.toUpperCase()) && !deletedIds.has(u.id.toUpperCase())) {
        const existing = userMap.get(u.teacherId.toUpperCase());
        userMap.set(u.teacherId.toUpperCase(), { ...existing, ...u });
      }
    });
  }

  const hasAdmin = Array.from(userMap.values()).some((u) => u.role === 'admin');
  if (!hasAdmin) {
    userMap.set('ADMIN-01', DEFAULT_STATE.users[0]);
  }

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
            topicMap.set(t.id, { ...t, ...existing });
          }
        }
      }
    });
  }

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

  const refMap = new Map();
  if (Array.isArray(current.subjectReferences)) {
    current.subjectReferences.forEach((r) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has((r.id || '').toUpperCase())) {
        refMap.set(r.id || r.subjectName.toLowerCase(), r);
      }
    });
  }
  if (Array.isArray(incoming.subjectReferences)) {
    incoming.subjectReferences.forEach((r) => {
      if (r && (r.id || r.subjectName) && !deletedIds.has((r.id || '').toUpperCase())) {
        refMap.set(r.id || r.subjectName.toLowerCase(), {
          ...refMap.get(r.id || r.subjectName.toLowerCase()),
          ...r,
        });
      }
    });
  }

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

  const pptMap = new Map();
  if (Array.isArray(current.pptRequests)) {
    current.pptRequests.forEach((p) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) pptMap.set(p.id, p);
    });
  }
  if (Array.isArray(incoming.pptRequests)) {
    incoming.pptRequests.forEach((p) => {
      if (p && p.id && !deletedIds.has(p.id.toUpperCase())) {
        pptMap.set(p.id, { ...pptMap.get(p.id), ...p });
      }
    });
  }

  const extMap = new Map();
  if (Array.isArray(current.extensions)) {
    current.extensions.forEach((e) => {
      if (e && e.id && !deletedIds.has(e.id.toUpperCase())) extMap.set(e.id, e);
    });
  }
  if (Array.isArray(incoming.extensions)) {
    incoming.extensions.forEach((e) => {
      if (e && e.id && !deletedIds.has(e.id.toUpperCase())) {
        extMap.set(e.id, { ...extMap.get(e.id), ...e });
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
    extensions: Array.from(extMap.values()),
  };
}

app.get('/api/cloud-sync', async (_req, res) => {
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
        return res.status(200).json({ success: true, source: 'supabase', data: rows[0].data });
      }
    }

    return res.status(200).json({ success: true, source: inMemoryStateCache ? 'memory' : 'default', data: inMemoryStateCache || DEFAULT_STATE });
  } catch {
    return res.status(200).json({ success: true, source: inMemoryStateCache ? 'memory' : 'default', data: inMemoryStateCache || DEFAULT_STATE });
  }
});

app.post('/api/cloud-sync', async (req, res) => {
  try {
    const incomingData = req.body.data || req.body;
    if (!incomingData || typeof incomingData !== 'object') {
      return res.status(400).json({ error: 'Missing data payload' });
    }

    let currentCloudData = inMemoryStateCache;
    try {
      const fetchCurrent = await fetch(`${SUPABASE_URL}/rest/v1/portal_master_state?id=eq.aew_portal_master&select=*`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: 'application/json',
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
      console.warn('Failed to update Supabase, saved to local cache:', upstreamErr?.message);
    }

    return res.status(200).json({
      success: true,
      source: 'supabase',
      updatedAt: mergedData.updatedAt,
      data: mergedData,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to save cloud sync' });
  }
});

// ─── DeepSeek PPT Generator Endpoint ──────────────────────────────────────────
app.post('/api/deepseek-generate-ppt', async (req, res) => {
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
      error: 'DeepSeek API Key is not configured. Please enter your DeepSeek API key in the studio settings or set DEEPSEEK_API_KEY in environment variables.',
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

// ─── Upload Endpoint ──────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
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

// ─── Operational Notification Email Endpoint (SMTP / Gmail & Resend) ─────────
app.post('/api/send-email', async (req, res) => {
  const { to, type, data } = req.body || {};
  const SMTP_USER = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const SMTP_PASS = (process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
  const SMTP_HOST = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
  const SMTP_FROM = (process.env.SMTP_FROM || `AEW Academic Operations <${SMTP_USER}>`).trim();

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

  // 1. Dispatch via SMTP (e.g. Gmail) — ZERO DOMAIN NEEDED
  if (SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: validRecipients.join(', '),
        subject,
        html,
      });

      console.log(`[Dev SendEmail] SMTP (Gmail) sent "${type}" to:`, validRecipients);
      return res.json({ success: true, provider: 'smtp', messageId: info.messageId });
    } catch (err) {
      console.error('[SendEmail SMTP Local Error]', err.message);
      return res.status(500).json({ success: false, error: err.message, provider: 'smtp' });
    }
  }

  // 2. Dispatch via Resend API
  if (RESEND_API_KEY) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: validRecipients,
          subject,
          html,
        }),
      });

      const resendResult = await resendResponse.json();
      return res.status(resendResponse.status).json(resendResult);
    } catch (err) {
      console.error('[SendEmail Resend Local Error]', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 3. Fallback
  console.log(`[Dev SendEmail] No credentials configured. Simulating email "${type}" to:`, validRecipients);
  return res.json({
    success: true,
    simulated: true,
    message: 'No SMTP or Resend credentials in .env. Email logged to console.',
    recipients: validRecipients,
    type,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const drive = getDriveClient();
  console.log(`\n🚀 AEW API Server running on http://localhost:${PORT}`);
  console.log(`📂 Google Drive: ${drive ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📁 Folder ID  : ${process.env.GOOGLE_DRIVE_FOLDER_ID || '(optional / root)'}\n`);
});

