// uploadService.ts
// Direct Resumable Google Drive uploads: Streams 100MB-5GB+ files directly to Google Drive CDN

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  if (window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:3001';
  }
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
 * Upload a file (any size: 10MB to 5GB+) to Google Drive via Direct Resumable Session.
 * Completely bypasses serverless payload limits by streaming directly from browser to Google Drive CDN.
 */
export async function uploadFileToDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  onProgress?.(5);
  const baseUrl = getApiBaseUrl();

  try {
    // 1. Request a Direct Resumable Upload Session URL from our serverless endpoint
    const sessionRes = await fetch(`${baseUrl}/api/drive-resumable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_session',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });

    if (!sessionRes.ok) {
      const errData = await sessionRes.json().catch(() => null);
      const errorMsg = errData?.error || `Session creation failed with status ${sessionRes.status}`;
      return {
        success: false,
        error: errorMsg,
        isConfigured: errorMsg.includes('not configured') ? false : undefined,
      };
    }

    const { uploadUrl } = await sessionRes.json();
    if (!uploadUrl) {
      return { success: false, error: 'Failed to obtain Google Drive upload URL.' };
    }

    onProgress?.(10);

    // 2. Stream the raw file DIRECTLY from the browser to Google Drive CDN
    const uploadResult = await new Promise<{ success: boolean; fileId?: string; error?: string }>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 80) + 10;
          onProgress?.(Math.min(percent, 92));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ success: true, fileId: data.id });
          } catch {
            resolve({ success: false, error: 'Invalid response from Google Drive.' });
          }
        } else {
          resolve({
            success: false,
            error: `Google Drive returned HTTP ${xhr.status}: ${xhr.statusText}`,
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Network error streaming to Google Drive.' });
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });

    if (!uploadResult.success || !uploadResult.fileId) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload video to Google Drive.',
      };
    }

    onProgress?.(95);

    // 3. Set public permissions & obtain shareable webViewLink
    const pubRes = await fetch(`${baseUrl}/api/drive-resumable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'make_public',
        fileId: uploadResult.fileId,
      }),
    });

    onProgress?.(100);

    if (!pubRes.ok) {
      // Return the standard drive URL even if permission call had a delay
      const fallbackLink = `https://drive.google.com/file/d/${uploadResult.fileId}/view`;
      return {
        success: true,
        driveLink: fallbackLink,
        fileName: file.name,
      };
    }

    const pubData = await pubRes.json();
    return {
      success: true,
      driveLink: pubData.driveLink || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
      downloadLink: pubData.downloadLink,
      fileName: pubData.fileName || file.name,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error during direct Google Drive upload.',
    };
  }
}
