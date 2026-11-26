import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

// Browser Push & Telegram Bot Notification Service for AsiaFlix Prime
const DEFAULT_LOGO_URL = 'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png';
const SOUND_MUTE_STORAGE_KEY = 'asiaflix_notif_sound_muted_v1';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let sharedAudioCtx: AudioContext | null = null;
let lastSoundPlayedAt = 0;

export interface TelegramBroadcastResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Check or persist user notification sound mute preference
 */
export function isNotificationSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_MUTE_STORAGE_KEY) === 'true';
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_MUTE_STORAGE_KEY, muted ? 'true' : 'false');
}

/**
 * Play a pleasant, crisp two-tone OTT notification chime (D5 587.33 Hz -> A5 880 Hz)
 * using the Web Audio API with smooth exponential decay (works 100% offline/no MP3 failures).
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  if (isNotificationSoundMuted()) return;

  const nowMs = Date.now();
  if (nowMs - lastSoundPlayedAt < 450) return; // Prevent double chime when toast + OS popup fire together
  lastSoundPlayedAt = nowMs;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, startTime);
    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.23);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, startTime + 0.12);
    gain2.gain.setValueAtTime(0.001, startTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.2, startTime + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.12);
    osc2.stop(startTime + 0.46);
  } catch {
    // Ignore autoplay restriction or Web Audio unavailability gracefully
  }
}

/**
 * Register /sw.js for background & closed-tab OS push notifications + periodicSync
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (swRegistrationPromise) return swRegistrationPromise;

  swRegistrationPromise = navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(async (registration) => {
      try {
        const target = registration.active || registration.waiting || registration.installing;
        target?.postMessage({
          type: 'CONFIG',
          supabaseUrl: SUPABASE_URL,
          supabaseKey: SUPABASE_ANON_KEY,
        });
      } catch {}

      try {
        const periodicSync = (registration as any).periodicSync;
        if (periodicSync && typeof periodicSync.register === 'function') {
          await periodicSync.register('asiaflix-bg-notifs', {
            minInterval: 15 * 60 * 1000,
          });
        }
      } catch {
        // periodicSync may not be permitted in all browsers
      }

      return registration;
    })
    .catch(() => null);

  return swRegistrationPromise;
}

/**
 * Inform the background Service Worker of notification IDs already shown or read in foreground
 */
export function syncShownIdsToServiceWorker(ids: string[]): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!ids || ids.length === 0) return;

  navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({
        type: 'MARK_SHOWN',
        ids: ids.slice(-300),
      });
    })
    .catch(() => {});
}

// Auto-register Service Worker on app load in browser environments
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerServiceWorker();
}

/**
 * Send official broadcast message via Telegram Bot API
 * Directly reaches thousands of channel subscribers or users
 */
export async function sendTelegramBroadcast(
  botToken: string,
  channelId: string,
  text: string,
  buttonText?: string,
  buttonUrl?: string
): Promise<TelegramBroadcastResult> {
  if (!botToken || !botToken.trim()) {
    return { success: false, error: 'Telegram Bot Token is missing. Please set it in Admin Studio.' };
  }
  if (!channelId || !channelId.trim()) {
    return { success: false, error: 'Target Telegram Channel/Group ID is missing (e.g. @asiaflixprime).' };
  }

  try {
    const cleanToken = botToken.trim();
    const cleanChannel = channelId.trim();

    const payload: any = {
      chat_id: cleanChannel,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    };

    if (buttonText && buttonUrl) {
      payload.reply_markup = {
        inline_keyboard: [
          [
            {
              text: buttonText,
              url: buttonUrl,
            },
          ],
        ],
      };
    }

    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    } else {
      return { success: false, error: data.description || 'Failed to send message via Telegram Bot API.' };
    }
  } catch (err: any) {
    console.error('Telegram broadcast error:', err);
    return { success: false, error: err.message || 'Network error reaching Telegram API.' };
  }
}

export interface BrandedEpisodePostPayload {
  title: string;
  episodeNumber?: number | string;
  audioLabel?: string;
  totalEpisodesText?: string;
  genres?: string;
  ageRating?: string;
  statusText?: string;
  imageUrl?: string;
  watchUrl: string;
  logoUrl?: string;
}

function escapeTelegramHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadImageForCanvas(url: string): Promise<HTMLImageElement | null> {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl || (!/^https?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith('/'))) return null;

  const tryLoad = (targetSrc: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      const timer = window.setTimeout(() => resolve(null), 6500);
      img.onload = () => {
        window.clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve(null);
      };
      img.src = targetSrc;
    });

  const direct = await tryLoad(cleanUrl);
  if (direct) return direct;

  // Fallback via local Express CORS proxy if available
  try {
    const proxied = `/api/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    return await tryLoad(proxied);
  } catch {
    return null;
  }
}

function createBlackKeyTransparentLogoCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width || 256;
  c.height = img.naturalHeight || img.height || 256;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  try {
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = Math.max(r, g, b);
      if (lum < 28) {
        data[i + 3] = 0;
      } else if (lum < 56) {
        data[i + 3] = Math.round(((lum - 28) / 28) * data[i + 3]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } catch {
    // Tainted canvas fallback: keep drawn image as-is
  }
  return c;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function renderBrandedEpisodeBannerBlob(
  payload: BrandedEpisodePostPayload
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Base crimson-obsidian gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
  bgGrad.addColorStop(0, '#09090f');
  bgGrad.addColorStop(0.55, '#190b12');
  bgGrad.addColorStop(1, '#08080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1280, 720);

  // 2. Draw series thumbnail / poster covering 16:9 canvas
  const bgImg = payload.imageUrl ? await loadImageForCanvas(payload.imageUrl) : null;
  if (bgImg) {
    const scale = Math.max(1280 / bgImg.width, 720 / bgImg.height);
    const drawW = bgImg.width * scale;
    const drawH = bgImg.height * scale;
    const dx = (1280 - drawW) / 2;
    const dy = (720 - drawH) / 2;
    ctx.drawImage(bgImg, dx, dy, drawW, drawH);
  }

  // 3. Cinema gradient scrims for crisp readability
  const bottomScrim = ctx.createLinearGradient(0, 340, 0, 720);
  bottomScrim.addColorStop(0, 'rgba(8,8,12,0)');
  bottomScrim.addColorStop(0.55, 'rgba(8,8,12,0.72)');
  bottomScrim.addColorStop(1, 'rgba(6,6,10,0.96)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, 340, 1280, 380);

  const topScrim = ctx.createLinearGradient(0, 0, 0, 180);
  topScrim.addColorStop(0, 'rgba(6,6,10,0.78)');
  topScrim.addColorStop(1, 'rgba(6,6,10,0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, 1280, 180);

  // 4. Black-key transparent Official Channel Logo at Top-Left
  const logoImg =
    (await loadImageForCanvas(payload.logoUrl || '/logo-watermark.png')) ||
    (await loadImageForCanvas(DEFAULT_LOGO_URL));
  if (logoImg) {
    const transparentLogo = createBlackKeyTransparentLogoCanvas(logoImg);
    const targetH = 84;
    const aspect = (transparentLogo.width || 1) / (transparentLogo.height || 1);
    const targetW = Math.min(240, Math.round(targetH * aspect));
    ctx.save();
    ctx.shadowColor = 'rgba(229, 9, 20, 0.65)';
    ctx.shadowBlur = 18;
    ctx.drawImage(transparentLogo, 34, 28, targetW, targetH);
    ctx.restore();
  }

  // 5. Glowing Audio Badge at Top-Right
  const badgeText = `${(payload.audioLabel || 'Hindi Dubbed').toUpperCase()} • 1080P FHD`;
  ctx.save();
  ctx.font = '800 22px "Plus Jakarta Sans", system-ui, sans-serif';
  const metrics = ctx.measureText(badgeText);
  const pillW = Math.min(540, metrics.width + 52);
  const pillX = 1280 - 34 - pillW;
  const pillY = 34;

  ctx.shadowColor = 'rgba(229, 9, 20, 0.85)';
  ctx.shadowBlur = 22;
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + 52);
  pillGrad.addColorStop(0, '#e50914');
  pillGrad.addColorStop(1, '#ff2b54');
  ctx.fillStyle = pillGrad;
  drawRoundedRectPath(ctx, pillX, pillY, pillW, 52, 26);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, pillX + 26, pillY + 27);
  ctx.restore();

  // 6. Bottom-Left Title, Episode Tag & VIP Seal
  const epBadge = payload.episodeNumber
    ? `✨ EPISODE ${payload.episodeNumber} ADDED`
    : '✨ NOW STREAMING IN 1080P HD';
  ctx.save();
  ctx.font = '800 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(epBadge, 42, 560);

  ctx.font = '900 48px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 12;
  const cleanTitle = payload.title.length > 36 ? `${payload.title.slice(0, 35)}…` : payload.title;
  ctx.fillText(cleanTitle, 42, 622);

  ctx.shadowBlur = 0;
  ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(228, 228, 231, 0.9)';
  const metaLine = [
    payload.genres || 'Asian Drama',
    payload.ageRating || 'UA 13+',
    'asiaflixprime.pages.dev',
  ]
    .filter(Boolean)
    .join('  •  ');
  ctx.fillText(metaLine, 42, 668);
  ctx.restore();

  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function sendBrandedTelegramEpisodePost(
  botToken: string,
  channelId: string,
  payload: BrandedEpisodePostPayload
): Promise<TelegramBroadcastResult> {
  if (!botToken || !botToken.trim()) {
    return { success: false, error: 'Telegram Bot Token is missing. Please configure it in Admin Studio.' };
  }
  if (!channelId || !channelId.trim()) {
    return { success: false, error: 'Target Telegram Channel ID is missing (e.g. @asiaflixprime).' };
  }

  const cleanToken = botToken.trim();
  const cleanChannel = channelId.trim();
  const epMarker = payload.episodeNumber
    ? `——✨ Ep ${escapeTelegramHtml(String(payload.episodeNumber))} Added ✨——`
    : '——✨ New Release Added ✨——';

  const caption = [
    `<b>🎬 ${escapeTelegramHtml(payload.title)}</b>`,
    '',
    `<blockquote><b>📡 Status:</b> ${escapeTelegramHtml(payload.statusText || 'Now Streaming')}`,
    `<b>🎧 Audio:</b> ${escapeTelegramHtml(payload.audioLabel || 'Hindi Dubbed')}`,
    `<b>🎞 Episodes:</b> ${escapeTelegramHtml(payload.totalEpisodesText || (payload.episodeNumber ? `Ep ${payload.episodeNumber}` : 'Full Series'))}`,
    `<b>🏷 Genres:</b> ${escapeTelegramHtml(payload.genres || 'Asian Drama • 1080p FHD')}`,
    `<b>🛡 Content Rating:</b> ${escapeTelegramHtml(payload.ageRating || 'UA 13+')}</blockquote>`,
    '',
    `<b>${epMarker}</b>`,
    '',
    `<a href="${escapeTelegramHtml(payload.watchUrl)}">✨ WATCH NOW ✔️</a>`,
  ].join('\n');

  const replyMarkup = JSON.stringify({
    inline_keyboard: [[{ text: '✨ WATCH NOW ✔️', url: payload.watchUrl }]],
  });

  try {
    const bannerBlob = await renderBrandedEpisodeBannerBlob(payload);
    if (bannerBlob) {
      const formData = new FormData();
      formData.append('chat_id', cleanChannel);
      formData.append('photo', bannerBlob, 'asiaflix-episode-banner.png');
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
      formData.append('reply_markup', replyMarkup);

      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        return { success: true, messageId: data.result?.message_id };
      }
      return { success: false, error: data.description || 'Telegram sendPhoto failed.' };
    }

    // Fallback to sendPhoto by image URL or sendMessage
    if (payload.imageUrl && /^https?:\/\//i.test(payload.imageUrl)) {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChannel,
          photo: payload.imageUrl,
          caption,
          parse_mode: 'HTML',
          reply_markup: JSON.parse(replyMarkup),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        return { success: true, messageId: data.result?.message_id };
      }
    }

    return await sendTelegramBroadcast(cleanToken, cleanChannel, caption, '✨ WATCH NOW ✔️', payload.watchUrl);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error posting branded Telegram update.' };
  }
}

/**
 * Check browser native push notification permission
 */
export function getWebPushPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request permission from audience to send native OS push alerts
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    registerServiceWorker();
    return true;
  }
  if (Notification.permission === 'denied') {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      registerServiceWorker();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

export const requestWebPushPermission = requestBrowserNotificationPermission;

/**
 * Trigger native OS push notification outside browser (prefers ServiceWorkerRegistration.showNotification
 * for Windows Opera/Chrome/Edge & Android native popups with poster image and system sound).
 */
export function sendNativeBrowserNotification(
  title: string,
  body?: string,
  iconUrl?: string,
  tagId?: string
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  playNotificationSound();

  const tag = tagId || `asiaflix-alert-${Date.now()}`;
  const messageBody = body || 'New 1080p episode ready to stream on AsiaFlix Prime!';
  const icon = iconUrl || DEFAULT_LOGO_URL;

  const showFallbackNotification = () => {
    try {
      const notif = new Notification(title, {
        body: messageBody,
        icon,
        tag,
        silent: false,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (err) {
      console.warn('Native notification trigger failed:', err);
    }
  };

  if ('serviceWorker' in navigator) {
    registerServiceWorker()
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (!reg || typeof reg.showNotification !== 'function') {
          showFallbackNotification();
          return;
        }
        const options: NotificationOptions & { image?: string; renotify?: boolean; vibrate?: number[] } = {
          body: messageBody,
          icon,
          image: iconUrl || undefined,
          badge: DEFAULT_LOGO_URL,
          tag,
          renotify: true,
          silent: false,
          vibrate: [200, 100, 200],
          data: {
            url: 'https://asiaflixprime.pages.dev/',
            notifId: tag,
          },
        };
        return reg.showNotification(title, options);
      })
      .catch(() => {
        showFallbackNotification();
      });
  } else {
    showFallbackNotification();
  }
}

/**
 * Trigger native browser push notification on user's device (phone/PC)
 */
export function sendNativePushNotification(title: string, options?: { body?: string; icon?: string; tag?: string }) {
  sendNativeBrowserNotification(title, options?.body, options?.icon, options?.tag);
}
