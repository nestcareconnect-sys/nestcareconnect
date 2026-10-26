/**
 * Generates an optimized, version-aware image URL for products, hampers, boxes, and banners.
 * If the image is updated in the database, the updatedAt timestamp provides stable cache-busting
 * so browsers and CDNs fetch the fresh image without requiring manual cache purges.
 */
function getBackendOrigin(): string {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    ''
  ).trim();
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }
  return '';
}

export function getProductImageUrl(
  url?: string | null,
  updatedAt?: string | Date | number | null
): string {
  const fallback =
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80';

  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  let trimmedUrl = url.trim();

  // If URL is a relative uploaded file and backend origin is configured, resolve it
  if (trimmedUrl.startsWith('/uploads/')) {
    const backendOrigin = getBackendOrigin();
    if (backendOrigin) {
      trimmedUrl = `${backendOrigin}${trimmedUrl}`;
    }
  }

  // Data URLs, Blob URLs or SVG inline strings should not be modified
  if (
    trimmedUrl.startsWith('data:') ||
    trimmedUrl.startsWith('blob:') ||
    trimmedUrl.startsWith('<svg')
  ) {
    return trimmedUrl;
  }

  // If a valid updatedAt is supplied, append or update the stable ?v= parameter
  if (updatedAt) {
    const timestamp =
      typeof updatedAt === 'number'
        ? updatedAt
        : new Date(updatedAt).getTime();

    if (!isNaN(timestamp) && timestamp > 0) {
      try {
        if (trimmedUrl.includes('v=')) {
          return trimmedUrl.replace(/([?&])v=[^&]*/, `$1v=${timestamp}`);
        }
        const separator = trimmedUrl.includes('?') ? '&' : '?';
        return `${trimmedUrl}${separator}v=${timestamp}`;
      } catch {
        return trimmedUrl;
      }
    }
  }

  return trimmedUrl;
}

export function getHamperImageUrl(
  url?: string | null,
  updatedAt?: string | Date | number | null
): string {
  const fallback =
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80';

  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  return getProductImageUrl(url, updatedAt);
}

export function getBoxImageUrl(
  url?: string | null,
  updatedAt?: string | Date | number | null
): string {
  const fallback =
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80';

  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  return getProductImageUrl(url, updatedAt);
}
