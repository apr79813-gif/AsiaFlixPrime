import { DramaItem, AudioType } from '../types/drama';

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
  t?: number | null;
  party?: string | null;
  track?: AudioType | null;
}

function parseTrackQuery(raw: string | null): AudioType | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 't1' || v === 'hindi' || v.includes('hindi dubbed')) return 'Hindi Dubbed';
  if (v === 't2' || v === 'fandub' || v.includes('fan')) return 'Hindi Fan Dubbed';
  if (v === 't3' || v === 'orig' || v.includes('original') || v.includes('eng')) return 'Original / Eng Sub';
  return null;
}

export function parseDeepLinkFromLocation(
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  search: string = typeof window !== 'undefined' ? window.location.search : ''
): ParsedWatchDeepLink | null {
  const params = search ? new URLSearchParams(search) : null;
  const tRaw = params?.get('t');
  const tParsed = tRaw ? parseInt(tRaw, 10) : NaN;
  const t = !Number.isNaN(tParsed) && tParsed > 0 ? tParsed : null;
  const partyRaw = params?.get('party')?.trim() || null;
  const track = parseTrackQuery(params?.get('track') || null);

  const pathMatch = pathname.match(/^\/watch\/([^/?#]+)(?:\/ep-(\d+))?\/?$/i);
  if (pathMatch) {
    const slug = decodeURIComponent(pathMatch[1]).toLowerCase().trim();
    const epNum = pathMatch[2] ? parseInt(pathMatch[2], 10) : null;
    if (slug) {
      return {
        slug,
        epNum: epNum && !Number.isNaN(epNum) ? epNum : null,
        t,
        party: partyRaw,
        track,
      };
    }
  }

  if (params) {
    const dramaParam = params.get('drama') || params.get('watch');
    if (dramaParam && dramaParam.trim()) {
      const epRaw = params.get('ep');
      const epParsed = epRaw ? parseInt(epRaw, 10) : null;
      return {
        slug: dramaParam.trim().toLowerCase(),
        epNum: epParsed && !Number.isNaN(epParsed) ? epParsed : null,
        t,
        party: partyRaw,
        track,
      };
    }
  }

  return null;
}
