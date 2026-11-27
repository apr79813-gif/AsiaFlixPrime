// Cloudflare Pages Function: Extract direct native MP4 & HLS (.m3u8) streams from OK.ru / VK URLs

interface PagesContext {
  request: Request;
}

interface ExtractedStreamItem {
  quality: string;
  label: string;
  height: number;
  url: string;
  proxiedUrl: string;
}

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function toBase64Url(str: string): string {
  if (!str) return '';
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function collectCookiePairs(headers: Headers): string {
  const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
  const rawList: string[] =
    typeof anyHeaders.getSetCookie === 'function'
      ? anyHeaders.getSetCookie()
      : headers.get('set-cookie')
        ? [headers.get('set-cookie') as string]
        : [];
  const pairs: string[] = [];
  for (const raw of rawList) {
    // Handle comma-joined cookies safely when getSetCookie isn't available
    const segments = raw.split(/,(?=\s*[A-Za-z0-9_.-]+=)/g);
    for (const seg of segments) {
      const nv = seg.split(';')[0]?.trim();
      if (nv && nv.includes('=')) {
        pairs.push(nv);
      }
    }
  }
  return pairs.join('; ');
}

function mapOkQuality(name: string): { quality: string; label: string; height: number; mbPerMin: number } {
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
}

function buildProxyUrl(targetUrl: string, ckToken: string, referer?: string): string {
  const qs = new URLSearchParams();
  qs.set('url', targetUrl);
  if (ckToken) qs.set('ck', ckToken);
  if (referer) qs.set('ref', referer);
  return `/api/okru-proxy?${qs.toString()}`;
}

async function extractOkRu(videoId: string): Promise<Response> {
  const embedUrl = `https://ok.ru/videoembed/${videoId}`;
  const resp = await fetch(embedUrl, {
    headers: {
      'User-Agent': DESKTOP_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://ok.ru/',
    },
  });

  if (!resp.ok) {
    return jsonResponse({ ok: false, error: `OK.ru returned status ${resp.status}` }, 502);
  }

  const cookieStr = collectCookiePairs(resp.headers);
  const ckToken = toBase64Url(cookieStr);
  const html = await resp.text();

  const optMatch = html.match(/data-options="([^"]+)"/i) || html.match(/data-options='([^']+)'/i);
  if (!optMatch) {
    return jsonResponse({ ok: false, error: 'OK.ru player metadata not found (video may be private or removed)' }, 404);
  }

  let optionsObj: Record<string, unknown>;
  try {
    optionsObj = JSON.parse(decodeHtmlEntities(optMatch[1]));
  } catch {
    return jsonResponse({ ok: false, error: 'Failed to parse OK.ru data-options JSON' }, 502);
  }

  const flashvars = (optionsObj.flashvars as Record<string, unknown> | undefined) || {};
  let metadata: Record<string, unknown> | null = null;

  if (typeof flashvars.metadata === 'string' && flashvars.metadata.trim()) {
    try {
      metadata = JSON.parse(flashvars.metadata) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  } else if (flashvars.metadata && typeof flashvars.metadata === 'object') {
    metadata = flashvars.metadata as Record<string, unknown>;
  }

  if (!metadata && typeof flashvars.metadataUrl === 'string' && flashvars.metadataUrl.startsWith('http')) {
    const metaResp = await fetch(flashvars.metadataUrl, {
      method: 'POST',
      headers: {
        'User-Agent': DESKTOP_UA,
        Referer: embedUrl,
        ...(cookieStr ? { Cookie: cookieStr } : {}),
      },
    });
    if (metaResp.ok) {
      metadata = (await metaResp.json()) as Record<string, unknown>;
    }
  }

  if (!metadata) {
    return jsonResponse({ ok: false, error: 'OK.ru flashvars metadata unavailable' }, 404);
  }

  const hlsManifestUrl =
    (typeof metadata.hlsManifestUrl === 'string' && metadata.hlsManifestUrl) ||
    (typeof metadata.ondemandHls === 'string' && metadata.ondemandHls) ||
    (typeof metadata.hlsMasterPlaylistUrl === 'string' && metadata.hlsMasterPlaylistUrl) ||
    '';

  const rawVideos = Array.isArray(metadata.videos) ? metadata.videos : [];
  const streams: Array<ExtractedStreamItem & { mbPerMin?: number }> = [];
  const seenQuality = new Set<string>();

  for (const item of rawVideos) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const url = typeof rec.url === 'string' ? rec.url.trim() : '';
    const name = typeof rec.name === 'string' ? rec.name.trim() : '';
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const mapped = mapOkQuality(name);
    if (seenQuality.has(mapped.quality)) continue;
    seenQuality.add(mapped.quality);
    streams.push({
      quality: mapped.quality,
      label: mapped.label,
      height: mapped.height,
      mbPerMin: mapped.mbPerMin,
      url,
      proxiedUrl: buildProxyUrl(url, ckToken, 'https://ok.ru/'),
    });
  }

  streams.sort((a, b) => b.height - a.height);

  if (streams.length === 0 && !hlsManifestUrl) {
    return jsonResponse({ ok: false, error: 'No playable MP4 or HLS stream found on OK.ru' }, 404);
  }

  const movieObj = (metadata.movie as Record<string, unknown> | undefined) || {};
  return jsonResponse({
    ok: true,
    provider: 'okru',
    id: videoId,
    title: typeof movieObj.title === 'string' ? movieObj.title : '',
    hlsUrl: hlsManifestUrl || undefined,
    proxiedHlsUrl: hlsManifestUrl ? buildProxyUrl(hlsManifestUrl, ckToken, 'https://ok.ru/') : undefined,
    streams,
  });
}

async function extractVkVideo(oid: string, id: string): Promise<Response> {
  const embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`;
  const resp = await fetch(embedUrl, {
    headers: {
      'User-Agent': DESKTOP_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://vk.com/',
    },
  });

  if (!resp.ok) {
    return jsonResponse({ ok: false, error: `VK returned status ${resp.status}` }, 502);
  }

  const cookieStr = collectCookiePairs(resp.headers);
  const ckToken = toBase64Url(cookieStr);
  const html = await resp.text();

  const qualityPatterns: Array<{ key: string; quality: string; label: string; height: number }> = [
    { key: 'url2160', quality: 'full', label: '2160p 4K', height: 2160 },
    { key: 'url1440', quality: 'full', label: '1440p QHD', height: 1440 },
    { key: 'url1080', quality: 'full', label: '1080p FHD', height: 1080 },
    { key: 'url720', quality: 'hd', label: '720p HD', height: 720 },
    { key: 'url480', quality: 'sd', label: '480p Saver', height: 480 },
    { key: 'url360', quality: 'low', label: '360p', height: 360 },
    { key: 'url240', quality: 'lowest', label: '240p', height: 240 },
  ];

  const streams: ExtractedStreamItem[] = [];
  const seenQuality = new Set<string>();

  for (const qp of qualityPatterns) {
    const regex = new RegExp(`"${qp.key}"\\s*:\\s*"([^"]+)"`, 'i');
    const m = html.match(regex);
    if (m && m[1]) {
      const cleanUrl = m[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
      if (/^https?:\/\//i.test(cleanUrl) && !seenQuality.has(qp.quality)) {
        seenQuality.add(qp.quality);
        streams.push({
          quality: qp.quality,
          label: qp.label,
          height: qp.height,
          url: cleanUrl,
          proxiedUrl: buildProxyUrl(cleanUrl, ckToken, 'https://vk.com/'),
        });
      }
    }
  }

  const hlsMatch =
    html.match(/"hls(?:_ondemand)?"\s*:\s*"([^"]+\.m3u8[^"]*)"/i) ||
    html.match(/"hls_live"\s*:\s*"([^"]+\.m3u8[^"]*)"/i);
  const hlsUrl = hlsMatch?.[1] ? hlsMatch[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&') : '';

  if (streams.length === 0 && !hlsUrl) {
    return jsonResponse({ ok: false, error: 'No direct MP4/HLS streams exposed in VK response' }, 404);
  }

  return jsonResponse({
    ok: true,
    provider: 'vk',
    id: `${oid}_${id}`,
    hlsUrl: hlsUrl || undefined,
    proxiedHlsUrl: hlsUrl ? buildProxyUrl(hlsUrl, ckToken, 'https://vk.com/') : undefined,
    streams,
  });
}

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
    },
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  try {
    const reqUrl = new URL(context.request.url);
    const rawUrl = (reqUrl.searchParams.get('url') || '').trim();
    const rawId = (reqUrl.searchParams.get('id') || '').trim();

    if (rawId && /^\d+$/.test(rawId)) {
      return await extractOkRu(rawId);
    }

    if (!rawUrl) {
      return jsonResponse({ ok: false, error: 'Missing url or id parameter' }, 400);
    }

    const okMatch = rawUrl.match(/(?:ok\.ru|odnoklassniki\.ru)\/(?:video|videoembed|live)\/(\d+)/i);
    if (okMatch) {
      return await extractOkRu(okMatch[1]);
    }

    const vkMatch = rawUrl.match(/(?:vk\.com|vkvideo\.ru)\/video(-?\d+)_(\d+)/i);
    if (vkMatch) {
      return await extractVkVideo(vkMatch[1], vkMatch[2]);
    }

    return jsonResponse({ ok: false, error: 'Unsupported OK.ru or VK video URL' }, 400);
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : 'Extractor failure' },
      500
    );
  }
}
