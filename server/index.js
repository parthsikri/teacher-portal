require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// ─── Multer (memory storage — we stream directly to Drive) ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

// ─── Google Drive Auth via Service Account ───────────────────────────────────
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey  = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey || privateKey === '\n') {
    return null; // credentials not configured
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
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

// ─── Upload Endpoint ──────────────────────────────────────────────────────────
// POST /api/upload
// Body: multipart/form-data with field "file"
// Returns: { success, driveFileId, driveLink, fileName }
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file received.' });
  }

  const drive = getDriveClient();

  if (!drive) {
    return res.status(503).json({
      success: false,
      error: 'Google Drive is not configured on this server. Add GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY to server/.env',
    });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    const { Readable } = require('stream');

    // Convert buffer to readable stream for Drive API
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    const requestBody = {
      name: req.file.originalname,
    };

    if (folderId && folderId.trim() !== '') {
      requestBody.parents = [folderId.trim()];
    }

    // Upload to Drive
    const driveResponse = await drive.files.create({
      requestBody,
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = driveResponse.data.id;

    // Make file publicly readable so the link works for anyone
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

    // Get the final shareable link
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

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const drive = getDriveClient();
  console.log(`\n🚀 AEW Upload Server running on http://localhost:${PORT}`);
  console.log(`📂 Google Drive: ${drive ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📁 Folder ID  : ${process.env.GOOGLE_DRIVE_FOLDER_ID || '(optional / root)'}\n`);
});
