// Cloudflare Pages Function: CORS & Range-forwarding Video/HLS Proxy for OK.ru / VK direct streams

interface PagesContext {
  request: Request;
}

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ALLOWED_HOST_SUFFIXES = [
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
  'catbox.moe',
  'huggingface.co',
  'hf.co',
  'cdn-lfs.huggingface.co',
  'cdn-lfs-us-1.huggingface.co',
  'raw.githubusercontent.com',
  'github.com',
  'objects.githubusercontent.com',
  'drive.google.com',
  'googleusercontent.com',
];

function isAllowedMediaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h) ||
    h === '::1'
  ) {
    return false;
  }
  return ALLOWED_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith(`.${suffix}`));
}

function fromBase64Url(token: string): string {
  if (!token) return '';
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function rewriteHlsPlaylist(playlist: string, baseUrl: URL, ckToken: string, ref: string): string {
  const wrapUrl = (target: string): string => {
    const resolved = new URL(target, baseUrl).toString();
    const qs = new URLSearchParams();
    qs.set('url', resolved);
    if (ckToken) qs.set('ck', ckToken);
    if (ref) qs.set('ref', ref);
    return `/api/okru-proxy?${qs.toString()}`;
  };

  return playlist
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
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
    },
  });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  try {
    const reqUrl = new URL(context.request.url);
    const rawTarget = (reqUrl.searchParams.get('url') || '').trim();
    const ckToken = (reqUrl.searchParams.get('ck') || '').trim();
    const refParam = (reqUrl.searchParams.get('ref') || 'https://ok.ru/').trim();

    if (!rawTarget || rawTarget.length > 2500) {
      return new Response('Invalid url', { status: 400 });
    }

    const parsedTarget = new URL(rawTarget);
    if ((parsedTarget.protocol !== 'https:' && parsedTarget.protocol !== 'http:') || !isAllowedMediaHost(parsedTarget.hostname)) {
      return new Response('Forbidden media host', { status: 403 });
    }

    const headers: Record<string, string> = {
      'User-Agent': DESKTOP_UA,
      Accept: '*/*',
      Referer: refParam,
    };

    const rangeHeader = context.request.headers.get('Range');
    if (rangeHeader) {
      headers.Range = rangeHeader;
    }

    const cookieHeader = fromBase64Url(ckToken);
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const upstream = await fetch(parsedTarget.toString(), {
      method: context.request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
      redirect: 'follow',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Upstream error (${upstream.status})`, {
        status: upstream.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    const isHlsPlaylist =
      ct.toLowerCase().includes('mpegurl') || parsedTarget.pathname.toLowerCase().endsWith('.m3u8');

    const respHeaders = new Headers();
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
    respHeaders.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');

    if (isHlsPlaylist && context.request.method !== 'HEAD') {
      const text = await upstream.text();
      const rewritten = rewriteHlsPlaylist(text, parsedTarget, ckToken, refParam);
      respHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      respHeaders.set('Cache-Control', 'no-store');
      return new Response(rewritten, { status: 200, headers: respHeaders });
    }

    respHeaders.set('Content-Type', ct);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) respHeaders.set('Content-Range', contentRange);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) respHeaders.set('Content-Length', contentLength);

    return new Response(context.request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch {
    return new Response('Proxy request failed', {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export const onRequestHead = onRequestGet;
