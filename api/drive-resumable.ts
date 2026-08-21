import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

function getAuthClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  privateKey = privateKey.trim().replace(/^"|"$/g, '');

  if (!clientEmail || !privateKey || privateKey.trim() === '') {
    return null;
  }

  try {
    return new google.auth.JWT({
      email: clientEmail.trim(),
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = getAuthClient();
  if (!auth) {
    return res.status(503).json({
      success: false,
      error: 'Google Drive is not configured. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel environment variables.',
    });
  }

  const { action, fileName, mimeType, fileSize, fileId } = req.body || {};

  // ─── ACTION 1: CREATE DIRECT RESUMABLE UPLOAD SESSION ────────────────────────
  if (action === 'create_session') {
    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    try {
      // Get OAuth access token
      const tokenResponse = await auth.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) {
        return res.status(500).json({ success: false, error: 'Failed to obtain Google Drive access token' });
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const metadata: any = {
        name: fileName,
        mimeType: mimeType || 'application/octet-stream',
      };

      if (folderId && folderId.trim() !== '') {
        metadata.parents = [folderId.trim()];
      }

      // Initiate Resumable Upload Session with Google Drive API
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
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Error initiating resumable upload session',
      });
    }
  }

  // ─── ACTION 2: MAKE UPLOADED FILE PUBLIC & GET SHAREABLE LINK ────────────────
  if (action === 'make_public') {
    if (!fileId) {
      return res.status(400).json({ success: false, error: 'fileId is required' });
    }

    try {
      const drive = google.drive({ version: 'v3', auth });

      // Make file readable by anyone with the link
      try {
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permErr: any) {
        console.warn('[Drive Permission Warning]', permErr?.message);
      }

      // Fetch file webViewLink and download link
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
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to set public permissions on file',
      });
    }
  }

  return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
}
