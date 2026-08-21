import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import Busboy from 'busboy';
import { Readable, PassThrough } from 'stream';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive) {
    return res.status(503).json({
      success: false,
      error: 'Google Drive is not configured. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in environment variables.',
    });
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ success: false, error: 'Expected multipart/form-data' });
  }

  return new Promise<void>((resolve) => {
    try {
      const busboy = Busboy({ headers: req.headers });
      let fileProcessed = false;

      busboy.on('file', async (_fieldname, fileStream, fileInfo) => {
        const { filename, mimeType } = fileInfo;
        fileProcessed = true;

        try {
          const chunks: Buffer[] = [];
          fileStream.on('data', (chunk) => {
            chunks.push(chunk);
          });

          fileStream.on('end', async () => {
            try {
              const fileBuffer = Buffer.concat(chunks);
              const bufferStream = new Readable();
              bufferStream.push(fileBuffer);
              bufferStream.push(null);

              const requestBody: any = {
                name: filename,
              };

              if (folderId && folderId.trim() !== '') {
                requestBody.parents = [folderId.trim()];
              }

              // Upload to Google Drive
              const driveResponse = await drive.files.create({
                requestBody,
                media: {
                  mimeType: mimeType || 'application/octet-stream',
                  body: bufferStream,
                },
                fields: 'id, name, webViewLink, webContentLink',
              });

              const fileId = driveResponse.data.id;
              if (!fileId) {
                res.status(500).json({ success: false, error: 'Drive did not return a file ID.' });
                return resolve();
              }

              // Make file shareable
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

              // Get webViewLink
              const fileData = await drive.files.get({
                fileId,
                fields: 'id, name, webViewLink, webContentLink',
              });

              const viewLink =
                fileData.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

              res.status(200).json({
                success: true,
                driveFileId: fileId,
                driveLink: viewLink,
                downloadLink: fileData.data.webContentLink,
                fileName: fileData.data.name || filename,
              });
              return resolve();
            } catch (uploadErr: any) {
              res.status(500).json({
                success: false,
                error: uploadErr?.message || 'Failed to upload to Google Drive.',
              });
              return resolve();
            }
          });
        } catch (err: any) {
          res.status(500).json({
            success: false,
            error: err?.message || 'Error processing file stream.',
          });
          return resolve();
        }
      });

      busboy.on('finish', () => {
        if (!fileProcessed) {
          res.status(400).json({ success: false, error: 'No file received in upload.' });
          return resolve();
        }
      });

      busboy.on('error', (err: any) => {
        res.status(500).json({ success: false, error: err?.message || 'Busboy parsing error.' });
        return resolve();
      });

      req.pipe(busboy);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'Failed to initialize parser.' });
      return resolve();
    }
  });
}
