/**
 * Extracts YouTube Video ID from standard, unlisted, shorts, live, or mobile URLs:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0`;
  }
  return null;
}

/**
 * Transforms Google Drive view/open/uc URLs into iframe preview URL:
 * https://drive.google.com/file/d/FILE_ID/view -> https://drive.google.com/file/d/FILE_ID/preview
 * https://drive.google.com/open?id=FILE_ID -> https://drive.google.com/file/d/FILE_ID/preview
 */
export function getDriveEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const fileMatch = trimmed.match(/\/file\/d\/([^/?]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }
  const idMatch = trimmed.match(/[?&]id=([^&]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }
  if (trimmed.includes('drive.google.com')) {
    return trimmed;
  }
  return null;
}

/**
 * Validates if string is a URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

