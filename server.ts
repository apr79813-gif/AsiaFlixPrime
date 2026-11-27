import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
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
  'en-US-AndrewNeural',
  'en-US-AriaNeural',
  'en-US-GuyNeural',
  'en-US-JennyNeural',
  'ko-KR-InJoonNeural',
  'ko-KR-SunHiNeural',
  'ko-KR-HyunsuNeural',
  'ur-PK-AsadNeural',
  'ur-PK-UzmaNeural',
  'ur-IN-SalmanNeural',
  'ur-IN-GulNeural',
  'bn-IN-BashkarNeural',
  'bn-IN-TanishaaNeural',
  'bn-BD-PradeepNeural',
  'bn-BD-NabanitaNeural',
  'mr-IN-ManoharNeural',
  'mr-IN-AarohiNeural',
  'ta-IN-ValluvarNeural',
  'ta-IN-PallaviNeural',
  'te-IN-MohanNeural',
  'te-IN-ShrutiNeural',
  'gu-IN-NiranjanNeural',
  'gu-IN-DhwaniNeural',
  'ne-NP-SagarNeural',
  'ne-NP-HemkalaNeural',
  'zh-CN-YunxiNeural',
  'zh-CN-XiaoxiaoNeural',
  'zh-CN-YunjianNeural',
  'zh-CN-XiaoyiNeural',
  'ja-JP-KeitaNeural',
  'ja-JP-NanamiNeural',
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
      const voiceParts = voice.split('-');
      const lang = voiceParts.length >= 2 ? `${voiceParts[0]}-${voiceParts[1]}` : 'hi-IN';
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
  const cleanLang = (lang || 'hi').trim();
  const tl = cleanLang.toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : cleanLang.split('-')[0] || 'hi';
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
      const requestedLang =
        typeof body.lang === 'string' && body.lang.trim()
          ? body.lang.trim()
          : requestedVoice.split('-').slice(0, 2).join('-');
      const rate = clampPercentDelta(body.rate, '+0%');
      const pitch = clampPitchHz(body.pitch, '+0Hz');

      let audioBuffer: Buffer | null = null;
      try {
        audioBuffer = await synthesizeEdgeNeuralTts(cleanText, requestedVoice, rate, pitch);
      } catch {
        // Fallback to Google GTX TTS
        try {
          audioBuffer = await synthesizeGoogleGtxTts(cleanText, requestedLang);
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

  // 2B. OK.ru & VK Native Video Extractor (/api/okru-stream)
  const OKRU_DESKTOP_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const ALLOWED_VIDEO_PROXY_HOSTS = [
    'ok.ru',
    'okcdn.ru',
    'mycdn.me',
    'mail.ru',
    'vk.com',
    'vkvideo.ru',
    'vkuser.net',
    'vkuservideo.net',
    'vk-cdn.net',
    'userapi.com',
    'vk.me',
    'archive.org',
  ];

  const isAllowedMediaProxyHost = (hostname: string): boolean => {
    const h = hostname.toLowerCase();
    return ALLOWED_VIDEO_PROXY_HOSTS.some((suffix) => h === suffix || h.endsWith(`.${suffix}`));
  };

  const decodeEntities = (str: string): string =>
    str
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

  const collectCookiePairsFromHeaders = (headers: Headers): string => {
    const anyH = headers as unknown as { getSetCookie?: () => string[] };
    const list: string[] =
      typeof anyH.getSetCookie === 'function'
        ? anyH.getSetCookie()
        : headers.get('set-cookie')
          ? [headers.get('set-cookie') as string]
          : [];
    const pairs: string[] = [];
    for (const raw of list) {
      const segments = raw.split(/,(?=\s*[A-Za-z0-9_.-]+=)/g);
      for (const seg of segments) {
        const nv = seg.split(';')[0]?.trim();
        if (nv && nv.includes('=')) pairs.push(nv);
      }
    }
    return pairs.join('; ');
  };

  const buildVideoProxyUrl = (targetUrl: string, ckToken: string, ref?: string): string => {
    const qs = new URLSearchParams();
    qs.set('url', targetUrl);
    if (ckToken) qs.set('ck', ckToken);
    if (ref) qs.set('ref', ref);
    return `/api/okru-proxy?${qs.toString()}`;
  };

  const okruExtractionCache = new Map<string, { expiresAt: number; payload: Record<string, unknown> }>();

  const mapOkStreamQuality = (name: string): { quality: string; label: string; height: number; mbPerMin: number } => {
    const n = (name || '').toLowerCase();
    if (n === 'ultra') return { quality: 'ultra', label: '2160p 4K (Ultra)', height: 2160, mbPerMin: 35 };
    if (n === 'quad') return { quality: 'quad', label: '1440p QHD', height: 1440, mbPerMin: 22 };
    if (n === 'full' || n === '1080') return { quality: 'full', label: '1080p FHD', height: 1080, mbPerMin: 15 };
    if (n === 'hd' || n === '720') return { quality: 'hd', label: '720p HD', height: 720, mbPerMin: 8 };
    if (n === 'sd' || n === '480') return { quality: 'sd', label: '480p Saver', height: 480, mbPerMin: 3.5 };
    if (n === 'low' || n === '360') return { quality: 'low', label: '360p Saver', height: 360, mbPerMin: 2.2 };
    if (n === 'lowest' || n === 'mobile' || n === '240' || n === '144') {
      return { quality: 'lowest', label: '240p Mobile', height: 240, mbPerMin: 1.4 };
    }
    return { quality: n || 'sd', label: n.toUpperCase() || 'HD', height: 480, mbPerMin: 3.5 };
  };

  app.get('/api/okru-stream', async (req: Request, res: Response) => {
    try {
      const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
      const rawId = typeof req.query.id === 'string' ? req.query.id.trim() : '';

      const cacheKey = rawId || rawUrl;
      if (cacheKey) {
        const hit = okruExtractionCache.get(cacheKey);
        if (hit && hit.expiresAt > Date.now()) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.json(hit.payload);
          return;
        }
      }

      let okId = rawId && /^\d+$/.test(rawId) ? rawId : '';
      if (!okId && rawUrl) {
        const okMatch = rawUrl.match(/(?:ok\.ru|odnoklassniki\.ru)\/(?:video|videoembed|live)\/(\d+)/i);
        if (okMatch) okId = okMatch[1];
      }

      if (okId) {
        const embedUrl = `https://ok.ru/videoembed/${okId}`;
        const upstream = await fetch(embedUrl, {
          headers: {
            'User-Agent': OKRU_DESKTOP_UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://ok.ru/',
          },
        });
        if (!upstream.ok) {
          res.status(502).json({ ok: false, error: `OK.ru returned status ${upstream.status}` });
          return;
        }
        const cookieStr = collectCookiePairsFromHeaders(upstream.headers);
        const ckToken = cookieStr ? Buffer.from(cookieStr, 'utf8').toString('base64url') : '';
        const html = await upstream.text();
        const optMatch = html.match(/data-options="([^"]+)"/i) || html.match(/data-options='([^']+)'/i);
        if (!optMatch) {
          res.status(404).json({ ok: false, error: 'OK.ru player metadata not found' });
          return;
        }
        const optionsObj = JSON.parse(decodeEntities(optMatch[1])) as Record<string, unknown>;
        const flashvars = (optionsObj.flashvars as Record<string, unknown> | undefined) || {};
        let metadata: Record<string, unknown> | null = null;
        if (typeof flashvars.metadata === 'string' && flashvars.metadata.trim()) {
          metadata = JSON.parse(flashvars.metadata) as Record<string, unknown>;
        } else if (flashvars.metadata && typeof flashvars.metadata === 'object') {
          metadata = flashvars.metadata as Record<string, unknown>;
        }
        if (!metadata && typeof flashvars.metadataUrl === 'string' && flashvars.metadataUrl.startsWith('http')) {
          const metaResp = await fetch(flashvars.metadataUrl, {
            method: 'POST',
            headers: {
              'User-Agent': OKRU_DESKTOP_UA,
              Referer: embedUrl,
              ...(cookieStr ? { Cookie: cookieStr } : {}),
            },
          });
          if (metaResp.ok) {
            metadata = (await metaResp.json()) as Record<string, unknown>;
          }
        }
        if (!metadata) {
          res.status(404).json({ ok: false, error: 'OK.ru flashvars metadata unavailable' });
          return;
        }

        const hlsManifestUrl =
          (typeof metadata.hlsManifestUrl === 'string' && metadata.hlsManifestUrl) ||
          (typeof metadata.ondemandHls === 'string' && metadata.ondemandHls) ||
          (typeof metadata.hlsMasterPlaylistUrl === 'string' && metadata.hlsMasterPlaylistUrl) ||
          '';

        const rawVideos = Array.isArray(metadata.videos) ? metadata.videos : [];
        const streams: Array<{ quality: string; label: string; height: number; mbPerMin: number; url: string; proxiedUrl: string }> = [];
        const seenQ = new Set<string>();
        for (const item of rawVideos) {
          if (!item || typeof item !== 'object') continue;
          const rec = item as Record<string, unknown>;
          const u = typeof rec.url === 'string' ? rec.url.trim() : '';
          const nm = typeof rec.name === 'string' ? rec.name.trim() : '';
          if (!u || !/^https?:\/\//i.test(u)) continue;
          const mapped = mapOkStreamQuality(nm);
          if (seenQ.has(mapped.quality)) continue;
          seenQ.add(mapped.quality);
          streams.push({
            quality: mapped.quality,
            label: mapped.label,
            height: mapped.height,
            mbPerMin: mapped.mbPerMin,
            url: u,
            proxiedUrl: buildVideoProxyUrl(u, ckToken, 'https://ok.ru/'),
          });
        }
        streams.sort((a, b) => b.height - a.height);

        if (streams.length === 0 && !hlsManifestUrl) {
          res.status(404).json({ ok: false, error: 'No playable MP4 or HLS stream found on OK.ru' });
          return;
        }

        const movieObj = (metadata.movie as Record<string, unknown> | undefined) || {};
        const payload = {
          ok: true,
          provider: 'okru',
          id: okId,
          title: typeof movieObj.title === 'string' ? movieObj.title : '',
          hlsUrl: hlsManifestUrl || undefined,
          proxiedHlsUrl: hlsManifestUrl ? buildVideoProxyUrl(hlsManifestUrl, ckToken, 'https://ok.ru/') : undefined,
          streams,
        };
        if (cacheKey) {
          okruExtractionCache.set(cacheKey, { expiresAt: Date.now() + 300_000, payload });
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(payload);
        return;
      }

      const vkMatch = rawUrl.match(/(?:vk\.com|vkvideo\.ru)\/video(-?\d+)_(\d+)/i);
      if (vkMatch) {
        const embedUrl = `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&hd=2`;
        const upstream = await fetch(embedUrl, {
          headers: {
            'User-Agent': OKRU_DESKTOP_UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://vk.com/',
          },
        });
        if (!upstream.ok) {
          res.status(502).json({ ok: false, error: `VK returned status ${upstream.status}` });
          return;
        }
        const cookieStr = collectCookiePairsFromHeaders(upstream.headers);
        const ckToken = cookieStr ? Buffer.from(cookieStr, 'utf8').toString('base64url') : '';
        const html = await upstream.text();

        const qpList = [
          { key: 'url2160', quality: 'full', label: '2160p 4K', height: 2160 },
          { key: 'url1440', quality: 'full', label: '1440p QHD', height: 1440 },
          { key: 'url1080', quality: 'full', label: '1080p FHD', height: 1080 },
          { key: 'url720', quality: 'hd', label: '720p HD', height: 720 },
          { key: 'url480', quality: 'sd', label: '480p Saver', height: 480 },
          { key: 'url360', quality: 'low', label: '360p', height: 360 },
          { key: 'url240', quality: 'lowest', label: '240p', height: 240 },
        ];
        const streams: Array<{ quality: string; label: string; height: number; url: string; proxiedUrl: string }> = [];
        const seenQ = new Set<string>();
        for (const qp of qpList) {
          const m = html.match(new RegExp(`"${qp.key}"\\s*:\\s*"([^"]+)"`, 'i'));
          if (m?.[1]) {
            const cleanUrl = m[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
            if (/^https?:\/\//i.test(cleanUrl) && !seenQ.has(qp.quality)) {
              seenQ.add(qp.quality);
              streams.push({
                quality: qp.quality,
                label: qp.label,
                height: qp.height,
                url: cleanUrl,
                proxiedUrl: buildVideoProxyUrl(cleanUrl, ckToken, 'https://vk.com/'),
              });
            }
          }
        }
        const hlsMatch =
          html.match(/"hls(?:_ondemand)?"\s*:\s*"([^"]+\.m3u8[^"]*)"/i) ||
          html.match(/"hls_live"\s*:\s*"([^"]+\.m3u8[^"]*)"/i);
        const hlsUrl = hlsMatch?.[1] ? hlsMatch[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&') : '';

        if (streams.length === 0 && !hlsUrl) {
          res.status(404).json({ ok: false, error: 'No direct MP4/HLS streams exposed on VK' });
          return;
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json({
          ok: true,
          provider: 'vk',
          id: `${vkMatch[1]}_${vkMatch[2]}`,
          hlsUrl: hlsUrl || undefined,
          proxiedHlsUrl: hlsUrl ? buildVideoProxyUrl(hlsUrl, ckToken, 'https://vk.com/') : undefined,
          streams,
        });
        return;
      }

      res.status(400).json({ ok: false, error: 'Unsupported OK.ru or VK video URL' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Extractor error' });
    }
  });

  // 2C. OK.ru / VK CORS + Byte-Range + HLS Video Proxy (/api/okru-proxy)
  app.options('/api/okru-proxy', (_req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
    res.status(204).end();
  });

  app.get('/api/okru-proxy', async (req: Request, res: Response) => {
    const rawTarget = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const ckToken = typeof req.query.ck === 'string' ? req.query.ck.trim() : '';
    const refParam = typeof req.query.ref === 'string' && req.query.ref.trim() ? req.query.ref.trim() : 'https://ok.ru/';

    if (!rawTarget || rawTarget.length > 2500) {
      res.status(400).send('Invalid url');
      return;
    }

    try {
      const parsed = await assertSafePublicUrl(rawTarget);
      if (!isAllowedMediaProxyHost(parsed.hostname)) {
        res.status(403).send('Forbidden media host');
        return;
      }

      const headers: Record<string, string> = {
        'User-Agent': OKRU_DESKTOP_UA,
        Accept: '*/*',
        Referer: refParam,
      };
      const rangeHeader = req.headers.range;
      if (rangeHeader) headers.Range = rangeHeader;
      if (ckToken) {
        try {
          const decodedCk = Buffer.from(ckToken, 'base64url').toString('utf8');
          if (decodedCk) headers.Cookie = decodedCk;
        } catch {
          // ignore invalid cookie token
        }
      }

      const upstream = await fetch(parsed.toString(), { headers, redirect: 'follow' });
      if (!upstream.ok && upstream.status !== 206) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(upstream.status).send(`Upstream error (${upstream.status})`);
        return;
      }

      const ct = upstream.headers.get('content-type') || 'application/octet-stream';
      const isHlsPlaylist =
        ct.toLowerCase().includes('mpegurl') || parsed.pathname.toLowerCase().endsWith('.m3u8');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
      res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');

      if (isHlsPlaylist) {
        const text = await upstream.text();
        const wrapUrl = (target: string): string => {
          const resolved = new URL(target, parsed).toString();
          return buildVideoProxyUrl(resolved, ckToken, refParam);
        };
        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              return line.replace(/URI="([^"]+)"/gi, (_m, uri) => {
                try {
                  return `URI="${wrapUrl(uri)}"`;
                } catch {
                  return `URI="${uri}"`;
                }
              });
            }
            try {
              return wrapUrl(trimmed);
            } catch {
              return line;
            }
          })
          .join('\n');
        res.status(200);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(rewritten);
        return;
      }

      res.status(upstream.status);
      res.setHeader('Content-Type', ct);
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Cache-Control', 'private, max-age=300');
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      res.flushHeaders?.();
      if (upstream.body) {
        const nodeStream = Readable.fromWeb(upstream.body as unknown as WebReadableStream<Uint8Array>);
        req.on('close', () => {
          nodeStream.destroy();
        });
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(502).send('Blocked or unreachable media stream');
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
