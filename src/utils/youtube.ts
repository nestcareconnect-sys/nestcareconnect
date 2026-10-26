export interface YouTubeValidationResult {
  isValid: boolean;
  videoId?: string;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates and extracts 11-char video ID from standard YouTube URLs:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function parseAndValidateYouTubeUrl(rawUrl: string): YouTubeValidationResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'YouTube video URL is required.',
    };
  }

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = 'https://' + fullUrl;
  }

  try {
    const parsed = new URL(fullUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      const pathPart = parsed.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
      if (pathPart && /^[a-zA-Z0-9_-]{11}$/.test(pathPart)) {
        videoId = pathPart;
      }
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com'
    ) {
      if (parsed.searchParams.has('v')) {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
          videoId = v;
        }
      }

      if (!videoId) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(parts[0].toLowerCase())) {
          const candidate = parts[1];
          if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
            videoId = candidate;
          }
        }
      }
    }

    if (!videoId) {
      return {
        isValid: false,
        error:
          'Invalid YouTube video link. Please enter a valid YouTube video address (e.g. https://www.youtube.com/watch?v=..., https://youtu.be/..., or https://www.youtube.com/shorts/...).',
      };
    }

    return {
      isValid: true,
      videoId,
      normalizedUrl: fullUrl,
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format. Please enter a valid web address.',
    };
  }
}
