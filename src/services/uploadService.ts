// uploadService.ts
// Handles real file uploads to the Express backend which then pushes to Google Drive.

const SERVER_URL = 'http://localhost:3001';

export interface UploadResult {
  success: boolean;
  driveLink?: string;       // View link (use for PDFs and videos)
  downloadLink?: string;    // Direct download link
  fileName?: string;
  error?: string;
  isConfigured?: boolean;
}

/**
 * Check whether the backend is running and Drive is configured.
 */
export async function checkServerHealth(): Promise<{ running: boolean; driveConfigured: boolean }> {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return { running: true, driveConfigured: data.driveConfigured };
  } catch {
    return { running: false, driveConfigured: false };
  }
}

/**
 * Upload a file to Google Drive via the backend server.
 * Calls onProgress(0-100) as the upload streams.
 */
export async function uploadFileToDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  onProgress?.(5);

  // Check server health first
  const health = await checkServerHealth();
  if (!health.running) {
    return {
      success: false,
      error: 'Upload server is not running. Start it with: cd server && node index.js',
    };
  }
  if (!health.driveConfigured) {
    return {
      success: false,
      error: 'Google Drive credentials are not configured in server/.env yet.',
      isConfigured: false,
    };
  }

  onProgress?.(15);

  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 80) + 15;
        onProgress?.(Math.min(percent, 95));
      }
    });

    xhr.addEventListener('load', () => {
      onProgress?.(100);
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success) {
          resolve({
            success: true,
            driveLink: data.driveLink,
            downloadLink: data.downloadLink,
            fileName: data.fileName,
          });
        } else {
          resolve({ success: false, error: data.error || 'Upload failed.' });
        }
      } catch {
        resolve({ success: false, error: 'Invalid response from server.' });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({ success: false, error: 'Network error. Is the server running?' });
    });

    xhr.open('POST', `${SERVER_URL}/api/upload`);
    xhr.send(formData);
  });
}
