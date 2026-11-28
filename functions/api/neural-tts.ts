// Cloudflare Pages Function: Keyless TTS Endpoint with X-TTS-Provider Header

interface PagesContext {
  request: Request;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Expose-Headers': 'X-TTS-Provider',
    },
  });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  try {
    const reqUrl = new URL(context.request.url);
    const rawText = (reqUrl.searchParams.get('text') || '').trim();
    if (!rawText) {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanText = rawText
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    const rawLang = (reqUrl.searchParams.get('lang') || 'hi').trim();
    const tl = rawLang.toLowerCase().startsWith('zh')
      ? 'zh-CN'
      : rawLang.split('-')[0] || 'hi';

    const gtxUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
      tl
    )}&q=${encodeURIComponent(cleanText)}`;

    const upstream = await fetch(gtxUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `TTS upstream ${upstream.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-TTS-Provider': 'gtx',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'X-TTS-Provider',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal TTS error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
