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

export const HERO_SLIDE_FALLBACKS: Record<string, string> = {
  'slide-1':
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1920&q=85',
  'slide-2':
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1920&q=85',
  'slide-3':
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1920&q=85',
  'slide-4':
    'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1920&q=85',
  default:
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1920&q=85',
};

export function getHeroSlideImageUrl(
  url?: string | null,
  slideKey?: string | number | null,
  updatedAt?: string | Date | number | null
): string {
  const key = String(slideKey || '').toLowerCase();
  const fallback =
    HERO_SLIDE_FALLBACKS[key] ||
    (key.includes('1') || key.includes('love')
      ? HERO_SLIDE_FALLBACKS['slide-1']
      : key.includes('2') || key.includes('mum') || key.includes('dad')
      ? HERO_SLIDE_FALLBACKS['slide-2']
      : key.includes('3') || key.includes('celebrat')
      ? HERO_SLIDE_FALLBACKS['slide-3']
      : key.includes('4') || key.includes('build')
      ? HERO_SLIDE_FALLBACKS['slide-4']
      : HERO_SLIDE_FALLBACKS.default);

  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  return getProductImageUrl(url, updatedAt);
}

