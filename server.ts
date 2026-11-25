import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import { WebSocket } from 'ws';
import { createServer as createViteServer, ViteDevServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const DEFAULT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1uz-4QI_K5VGhWeqgx32jZnZffaB0oTGCpbS9hmxEN8U/export?format=csv&gid=0';
const DEFAULT_LOGO_URL = 'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png';
const SITE_BASE_URL = 'https://asiaflixprime.pages.dev';

// Edge Neural TTS constants
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '130.0.2849.68';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const EDGE_WS_BASE =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

const ALLOWED_VOICES = new Set([
  'hi-IN-MadhurNeural',
  'hi-IN-SwaraNeural',
  'en-IN-PrabhatNeural',
  'en-IN-NeerjaNeural',
]);

// --- Security Helpers ---
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isPrivateOrBlockedIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/i, '');
  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIPv6(normalized)) {
    const low = normalized.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe80')) return true;
    return false;
  }
  return true;
}

async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Invalid protocol');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    throw new Error('Blocked internal host');
  }
  if (net.isIP(host)) {
    if (isPrivateOrBlockedIp(host)) throw new Error('Blocked IP');
    return parsed;
  }
  const records = await dns.lookup(host, { all: true });
  if (!records || records.length === 0) throw new Error('Host resolution failed');
  for (const rec of records) {
    if (isPrivateOrBlockedIp(rec.address)) {
      throw new Error('Blocked resolved private IP');
    }
  }
  return parsed;
}

// --- Edge Neural TTS Helpers ---
function generateSecMsGec(): string {
  // Windows file time ticks since 1601-01-01 in 100-ns intervals
  const WIN_EPOCH_DIFF_SEC = 11644473600n;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  let ticks = (nowSec + WIN_EPOCH_DIFF_SEC) * 10000000n;
  // Round down to nearest 5 minutes (300 seconds = 3_000_000_000 ticks)
  ticks -= ticks % 3000000000n;
  const toHash = `${ticks.toString()}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash('sha256').update(toHash, 'ascii').digest('hex').toUpperCase();
}

function clampPercentDelta(raw: unknown, fallback = '+0%'): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const pct = Math.max(-40, Math.min(50, Math.round((raw - 1) * 100)));
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  }
  if (typeof raw === 'string') {
    const m = raw.trim().match(/^([+-]?\d{1,2})%$/);
    if (m) {
      const n = Math.max(-40, Math.min(50, parseInt(m[1], 10)));
      return `${n >= 0 ? '+' : ''}${n}%`;
    }
  }
  return fallback;
}

function clampPitchHz(raw: unknown, fallback = '+0Hz'): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const hz = Math.max(-45, Math.min(45, Math.round((raw - 1) * 90)));
    return `${hz >= 0 ? '+' : ''}${hz}Hz`;
  }
  if (typeof raw === 'string') {
    const m = raw.trim().match(/^([+-]?\d{1,2})(Hz|%)$/i);
    if (m) {
      const n = Math.max(-45, Math.min(45, parseInt(m[1], 10)));
      return `${n >= 0 ? '+' : ''}${n}${m[2].toLowerCase() === 'hz' ? 'Hz' : '%'}`;
    }
  }
  return fallback;
}

function synthesizeEdgeNeuralTts(
  text: string,
  voice: string,
  rate: string,
  pitch: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomBytes(16).toString('hex');
    const secMsGec = generateSecMsGec();
    const wsUrl = `${EDGE_WS_BASE}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${requestId}`;

    const ws = new WebSocket(wsUrl, {
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const audioChunks: Buffer[] = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          ws.terminate();
        } catch {}
        reject(new Error('Edge TTS timeout'));
      }
    }, 6500);

    const finishError = (err: Error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        try {
          ws.terminate();
        } catch {}
        reject(err);
      }
    };

    ws.on('open', () => {
      const timestamp = new Date().toUTCString();
      const configMsg =
        `X-Timestamp:${timestamp}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: 'false',
                  wordBoundaryEnabled: 'false',
                },
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
              },
            },
          },
        });
      ws.send(configMsg);

      const safeText = escapeXml(text);
      const lang = voice.startsWith('hi-IN') ? 'hi-IN' : 'en-IN';
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${safeText}</prosody>` +
        `</voice></speak>`;

      const ssmlMsg =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${timestamp}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;
      ws.send(ssmlMsg);
    });

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        const str = data.toString('utf8');
        if (str.includes('Path:turn.end')) {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            try {
              ws.close();
            } catch {}
            const combined = Buffer.concat(audioChunks);
            if (combined.length > 0) {
              resolve(combined);
            } else {
              reject(new Error('Edge TTS returned empty audio'));
            }
          }
        }
        return;
      }

      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (buf.length < 2) return;
      const headerLength = buf.readUInt16BE(0);
      const headerEnd = 2 + headerLength;
      if (headerEnd >= buf.length) return;
      const headerText = buf.subarray(2, headerEnd).toString('utf8');
      if (headerText.includes('Path:audio')) {
        audioChunks.push(buf.subarray(headerEnd));
      }
    });

    ws.on('error', (err) => {
      finishError(err instanceof Error ? err : new Error('Edge WS error'));
    });

    ws.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        const combined = Buffer.concat(audioChunks);
        if (combined.length > 0) resolve(combined);
        else reject(new Error('Edge WS closed without audio'));
      }
    });
  });
}

async function synthesizeGoogleGtxTts(text: string, lang: string): Promise<Buffer> {
  const tl = lang.startsWith('hi') ? 'hi' : 'en-IN';
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
    tl
  )}&q=${encodeURIComponent(text.slice(0, 200))}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
    },
  });
  if (!resp.ok) {
    throw new Error(`GTX TTS failed with ${resp.status}`);
  }
  const arr = await resp.arrayBuffer();
  return Buffer.from(arr);
}

// --- Catalog CSV & Watch OG Metadata Helpers ---
interface WatchMetaItem {
  slug: string;
  title: string;
  description: string;
  image: string;
  audio: string;
  year: string;
  episodes: string;
}

const BUILTIN_WATCH_FALLBACKS: WatchMetaItem[] = [
  {
    slug: 'family-matters-2026',
    title: 'Family Matters (2026)',
    description:
      'Stream Family Matters (2026) in Clean Hindi Audio & 1080p FHD on AsiaFlix Prime.',
    image:
      'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png',
    audio: 'Hindi Dubbed',
    year: '2026',
    episodes: '6',
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

let cachedCatalogMeta: { fetchedAt: number; items: WatchMetaItem[] } = {
  fetchedAt: 0,
  items: [...BUILTIN_WATCH_FALLBACKS],
};

async function getWatchCatalogMeta(): Promise<WatchMetaItem[]> {
  const now = Date.now();
  if (now - cachedCatalogMeta.fetchedAt < 120_000 && cachedCatalogMeta.items.length > 1) {
    return cachedCatalogMeta.items;
  }
  try {
    const sheetUrl = process.env.VITE_GOOGLE_SHEET_URL || DEFAULT_SHEET_CSV_URL;
    const resp = await fetch(sheetUrl, { headers: { Accept: 'text/csv' } });
    if (!resp.ok) return cachedCatalogMeta.items;
    const csvText = await resp.text();
    const rows = parseCsvRows(csvText);
    if (rows.length < 2) return cachedCatalogMeta.items;

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const idxTitle = headers.findIndex((h) => h === 'title' || h.includes('title'));
    const idxThumb = headers.findIndex((h) => h.includes('thumb') || h.includes('banner'));
    const idxPoster = headers.findIndex((h) => h.includes('poster') || h.includes('image'));
    const idxAudio = headers.findIndex((h) => h.includes('audio'));
    const idxYear = headers.findIndex((h) => h.includes('year'));
    const idxEps = headers.findIndex((h) => h.includes('episode'));
    const idxDesc = headers.findIndex((h) => h.includes('desc') || h.includes('synop'));

    const items: WatchMetaItem[] = [];
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r];
      const title = (idxTitle >= 0 ? cols[idxTitle] : cols[0] || '').trim();
      if (!title) continue;
      const thumb = idxThumb >= 0 ? (cols[idxThumb] || '').trim() : '';
      const poster = idxPoster >= 0 ? (cols[idxPoster] || '').trim() : '';
      const audio = idxAudio >= 0 ? (cols[idxAudio] || '').trim() : 'Hindi Dubbed';
      const year = idxYear >= 0 ? (cols[idxYear] || '').trim() : '2026';
      const episodes = idxEps >= 0 ? (cols[idxEps] || '').trim() : '';
      const rawDesc = idxDesc >= 0 ? (cols[idxDesc] || '').trim() : '';

      const image = /^https?:\/\//i.test(thumb)
        ? thumb
        : /^https?:\/\//i.test(poster)
          ? poster
          : DEFAULT_LOGO_URL;

      items.push({
        slug: createSlug(title),
        title,
        description:
          rawDesc.slice(0, 175) ||
          `Watch ${title} in ${audio || 'Clean Hindi Audio'} & 1080p HD on AsiaFlix Prime.`,
        image,
        audio: audio || 'Hindi Dubbed',
        year,
        episodes,
      });
    }
    if (items.length > 0) {
      cachedCatalogMeta = { fetchedAt: now, items: [...items, ...BUILTIN_WATCH_FALLBACKS] };
    }
  } catch {
    // Keep existing cache
  }
  return cachedCatalogMeta.items;
}

function injectWatchOgMeta(
  html: string,
  meta: { title: string; description: string; image: string; url: string }
): string {
  const t = escapeHtmlAttr(meta.title);
  const d = escapeHtmlAttr(meta.description);
  const img = escapeHtmlAttr(meta.image);
  const u = escapeHtmlAttr(meta.url);

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);
  const replacements: Array<[RegExp, string]> = [
    [
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${d}" />`,
    ],
    [
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${t}" />`,
    ],
    [
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${d}" />`,
    ],
    [
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${img}" />`,
    ],
    [
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${u}" />`,
    ],
    [
      /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ],
    [
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${t}" />`,
    ],
    [
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${d}" />`,
    ],
    [
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${img}" />`,
    ],
  ];
  for (const [regex, tag] of replacements) {
    out = out.replace(regex, tag);
  }
  return out;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // 1. Keyless Neural TTS endpoint (Microsoft Edge Neural TTS + Google GTX fallback)
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const rawText = typeof body.text === 'string' ? body.text.trim() : '';
      if (!rawText) {
        res.status(400).json({ error: 'Missing text' });
        return;
      }
      const cleanText = rawText
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);

      const requestedVoice =
        typeof body.voice === 'string' && ALLOWED_VOICES.has(body.voice)
          ? body.voice
          : 'hi-IN-SwaraNeural';
      const rate = clampPercentDelta(body.rate, '+0%');
      const pitch = clampPitchHz(body.pitch, '+0Hz');

      let audioBuffer: Buffer | null = null;
      try {
        audioBuffer = await synthesizeEdgeNeuralTts(cleanText, requestedVoice, rate, pitch);
      } catch {
        // Fallback to Google GTX TTS
        try {
          const lang = requestedVoice.startsWith('hi') ? 'hi' : 'en-IN';
          audioBuffer = await synthesizeGoogleGtxTts(cleanText, lang);
        } catch {
          audioBuffer = null;
        }
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        res.status(502).json({ error: 'TTS providers unavailable' });
        return;
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(audioBuffer);
    } catch {
      res.status(500).json({ error: 'Internal TTS error' });
    }
  });

  // 2. SSRF-safe CORS Image Proxy for HTML5 Canvas Branded Telegram Banner generation
  app.get('/api/image-proxy', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl || rawUrl.length > 1000) {
      res.status(400).send('Invalid url');
      return;
    }

    try {
      const parsed = await assertSafePublicUrl(rawUrl);
      const upstream = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'AsiaFlixPrimeBot/1.0',
          Accept: 'image/*,*/*;q=0.8',
        },
      });
      if (!upstream.ok) {
        res.status(upstream.status).send('Upstream image failed');
        return;
      }
      const ct = upstream.headers.get('content-type') || '';
      if (!ct.toLowerCase().startsWith('image/')) {
        res.status(415).send('Non-image content');
        return;
      }
      const len = Number(upstream.headers.get('content-length') || 0);
      if (len > 8 * 1024 * 1024) {
        res.status(413).send('Image too large');
        return;
      }
      const arr = await upstream.arrayBuffer();
      if (arr.byteLength > 8 * 1024 * 1024) {
        res.status(413).send('Image too large');
        return;
      }
      res.setHeader('Content-Type', ct);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(arr));
    } catch {
      res.status(400).send('Blocked or unreachable image URL');
    }
  });

  let vite: ViteDevServer | null = null;
  if (!IS_PROD) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // 3. Dynamic Series Thumbnail/Poster OG Link Preview on /watch/:slug
  app.get(['/watch/:slug', '/watch/:slug/*'], async (req: Request, res: Response, next) => {
    try {
      const slug = decodeURIComponent(String(req.params.slug || ''))
        .toLowerCase()
        .trim();
      const items = await getWatchCatalogMeta();
      const matched =
        items.find((d) => d.slug === slug) ||
        items.find((d) => d.slug.includes(slug) || slug.includes(d.slug));

      const templatePath = IS_PROD
        ? path.resolve(process.cwd(), 'dist', 'index.html')
        : path.resolve(process.cwd(), 'index.html');

      if (!fs.existsSync(templatePath)) {
        next();
        return;
      }

      let html = fs.readFileSync(templatePath, 'utf-8');
      if (vite) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      if (matched) {
        const epMatch = req.originalUrl.match(/\/ep-(\d+)/i);
        const epText = epMatch ? ` • Episode ${epMatch[1]}` : '';
        html = injectWatchOgMeta(html, {
          title: `${matched.title}${epText} — Watch in ${matched.audio} | AsiaFlix Prime`,
          description: matched.description,
          image: matched.image,
          url: `${SITE_BASE_URL}${req.originalUrl}`,
        });
      }

      res.status(200).setHeader('Content-Type', 'text/html').send(html);
    } catch {
      next();
    }
  });

  if (vite) {
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AsiaFlix Prime server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
