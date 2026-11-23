import { DramaItem } from '../types/drama';

export function createDramaSlug(drama: Pick<DramaItem, 'title'> & { id?: string }): string {
  const cleaned = (drama.title || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || drama.id || 'drama';
}

export interface ParsedWatchDeepLink {
  slug: string;
  epNum: number | null;
}

export function parseDeepLinkFromLocation(
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  search: string = typeof window !== 'undefined' ? window.location.search : ''
): ParsedWatchDeepLink | null {
  const pathMatch = pathname.match(/^\/watch\/([^/?#]+)(?:\/ep-(\d+))?\/?$/i);
  if (pathMatch) {
    const slug = decodeURIComponent(pathMatch[1]).toLowerCase().trim();
    const epNum = pathMatch[2] ? parseInt(pathMatch[2], 10) : null;
    if (slug) {
      return {
        slug,
        epNum: epNum && !Number.isNaN(epNum) ? epNum : null,
      };
    }
  }

  if (search) {
    const params = new URLSearchParams(search);
    const dramaParam = params.get('drama') || params.get('watch');
    if (dramaParam && dramaParam.trim()) {
      const epRaw = params.get('ep');
      const epParsed = epRaw ? parseInt(epRaw, 10) : null;
      return {
        slug: dramaParam.trim().toLowerCase(),
        epNum: epParsed && !Number.isNaN(epParsed) ? epParsed : null,
      };
    }
  }

  return null;
}
