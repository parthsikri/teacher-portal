// uploadService.ts
// Handles file uploads to Vercel Serverless Functions (/api/upload) or local Express backend

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  // If running locally on Vite port 5173 without proxy, point to 3001
  if (window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:3001';
  }
  // Otherwise on Vercel production or custom domain, use relative path
  return '';
};

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
export async function checkServerHealth(): Promise<{ running: boolean; driveConfigured: boolean; folderId?: string | null }> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      return { running: false, driveConfigured: false };
    }
    const data = await res.json();
    return { running: true, driveConfigured: Boolean(data.driveConfigured), folderId: data.folderId };
  } catch {
    return { running: false, driveConfigured: false };
  }
}

/**
 * Upload a file to Google Drive via the serverless or local upload endpoint.
 * Calls onProgress(0-100) as the upload streams.
 */
export async function uploadFileToDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  onProgress?.(5);
  const baseUrl = getApiBaseUrl();

  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 85) + 10;
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
          resolve({
            success: false,
            error: data.error || 'Upload failed.',
            isConfigured: data.error?.includes('not configured') ? false : undefined,
          });
        }
      } catch {
        if (xhr.status === 413) {
          resolve({
            success: false,
            error: 'File size exceeds serverless limit (max 50MB). Please paste Drive or YouTube link for large videos.',
          });
        } else if (xhr.status >= 500) {
          resolve({
            success: false,
            error: 'Server error during upload. Please verify Google Drive environment variables in Vercel settings.',
          });
        } else {
          resolve({
            success: false,
            error: `Server responded with status ${xhr.status}. Please check Vercel Google Drive credentials.`,
          });
        }
      }
    });

    xhr.addEventListener('error', () => {
      resolve({ success: false, error: 'Network error during upload.' });
    });

    xhr.open('POST', `${baseUrl}/api/upload`);
    xhr.send(formData);
  });
}
