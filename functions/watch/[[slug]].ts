// Cloudflare Pages Function: Dynamic OG/Twitter Link Preview per /watch/<slug> URL

interface PagesAssetsFetcher {
  fetch(input: Request | string): Promise<Response>;
}

interface PagesFunctionEnv {
  ASSETS: PagesAssetsFetcher;
  VITE_GOOGLE_SHEET_URL?: string;
}

interface PagesContext {
  request: Request;
  env: PagesFunctionEnv;
  params: { slug?: string | string[] };
}

interface DramaPreviewMeta {
  slug: string;
  title: string;
  description: string;
  image: string;
  audio: string;
}

const DEFAULT_SHEET_CSV =
  'https://docs.google.com/spreadsheets/d/1uz-4QI_K5VGhWeqgx32jZnZffaB0oTGCpbS9hmxEN8U/export?format=csv&gid=0';
const DEFAULT_LOGO = 'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png';

const BUILTIN_FALLBACKS: DramaPreviewMeta[] = [
  {
    slug: 'family-matters-2026',
    title: 'Family Matters (2026)',
    description:
      'Watch Family Matters (2026) in Clean Hindi Audio & 1080p FHD on AsiaFlix Prime.',
    image: DEFAULT_LOGO,
    audio: 'Hindi Dubbed',
  },
];

function createSlug(title: string): string {
  const cleaned = (title || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'drama';
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(current);
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((c) => c.trim().length > 0)) rows.push(row);
  }
  return rows;
}

async function resolveDramaMeta(slug: string, sheetUrl: string): Promise<DramaPreviewMeta | null> {
  try {
    const resp = await fetch(sheetUrl, {
      headers: { Accept: 'text/csv' },
    });
    if (resp.ok) {
      const csvText = await resp.text();
      const rows = parseCsvRows(csvText);
      if (rows.length >= 2) {
        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const idxTitle = headers.findIndex((h) => h === 'title' || h.includes('title'));
        const idxThumb = headers.findIndex((h) => h.includes('thumb') || h.includes('banner'));
        const idxPoster = headers.findIndex((h) => h.includes('poster') || h.includes('image'));
        const idxAudio = headers.findIndex((h) => h.includes('audio'));
        const idxDesc = headers.findIndex((h) => h.includes('desc') || h.includes('synop'));

        const parsed: DramaPreviewMeta[] = [];
        for (let r = 1; r < rows.length; r++) {
          const cols = rows[r];
          const title = (idxTitle >= 0 ? cols[idxTitle] : cols[0] || '').trim();
          if (!title) continue;
          const thumb = idxThumb >= 0 ? (cols[idxThumb] || '').trim() : '';
          const poster = idxPoster >= 0 ? (cols[idxPoster] || '').trim() : '';
          const audio = idxAudio >= 0 ? (cols[idxAudio] || '').trim() : 'Hindi Dubbed';
          const desc = idxDesc >= 0 ? (cols[idxDesc] || '').trim() : '';
          const image = /^https?:\/\//i.test(thumb)
            ? thumb
            : /^https?:\/\//i.test(poster)
              ? poster
              : DEFAULT_LOGO;
          parsed.push({
            slug: createSlug(title),
            title,
            description:
              desc.slice(0, 175) ||
              `Watch ${title} in ${audio || 'Clean Hindi Audio'} & 1080p HD on AsiaFlix Prime.`,
            image,
            audio: audio || 'Hindi Dubbed',
          });
        }

        const exact = parsed.find((item) => item.slug === slug);
        if (exact) return exact;
        const partial = parsed.find(
          (item) => item.slug.includes(slug) || slug.includes(item.slug)
        );
        if (partial) return partial;
      }
    }
  } catch {
    // Fallback below
  }

  return BUILTIN_FALLBACKS.find((item) => item.slug === slug) || null;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const rawSegments = Array.isArray(context.params.slug)
    ? context.params.slug
    : context.params.slug
      ? [context.params.slug]
      : [];

  const seriesSlug = decodeURIComponent(rawSegments[0] || '').toLowerCase().trim();
  const epSegment = rawSegments[1] || '';
  const epMatch = epSegment.match(/ep-(\d+)/i);
  const epLabel = epMatch ? ` • Episode ${epMatch[1]}` : '';

  const assetUrl = new URL('/index.html', url.origin);
  const assetResp = await context.env.ASSETS.fetch(new Request(assetUrl.toString()));
  const contentType = assetResp.headers.get('content-type') || '';

  if (!seriesSlug || !contentType.includes('text/html')) {
    return assetResp;
  }

  const sheetUrl = context.env.VITE_GOOGLE_SHEET_URL || DEFAULT_SHEET_CSV;
  const meta = await resolveDramaMeta(seriesSlug, sheetUrl);
  if (!meta) {
    return assetResp;
  }

  const finalTitle = `${meta.title}${epLabel} — Watch in ${meta.audio} | AsiaFlix Prime`;
  const finalDesc = meta.description;
  const finalImage = meta.image;
  const canonicalUrl = url.toString();

  let html = await assetResp.text();
  const t = escapeAttr(finalTitle);
  const d = escapeAttr(finalDesc);
  const img = escapeAttr(finalImage);
  const u = escapeAttr(canonicalUrl);

  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${d}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${t}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${d}" />`
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${img}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${u}" />`
    )
    .replace(
      /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:card" content="summary_large_image" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${t}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${d}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${img}" />`
    );

  const headers = new Headers(assetResp.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=120');
  return new Response(html, { status: 200, headers });
}
