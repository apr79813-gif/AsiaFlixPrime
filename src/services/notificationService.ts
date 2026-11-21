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
