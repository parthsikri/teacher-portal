import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

function getDriveClient() {
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
    const auth = new google.auth.JWT({
      email: clientEmail.trim(),
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const drive = getDriveClient();
  return res.status(200).json({
    status: 'ok',
    driveConfigured: !!drive,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
  });
}
