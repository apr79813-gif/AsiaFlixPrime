// Browser Push & Telegram Bot Notification Service for AsiaFlix Prime

export interface TelegramBroadcastResult {
  success: boolean;
  messageId?: number;
  error?: string;
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
 * Request permission from audience to send push alerts
 */
export async function requestWebPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Trigger native browser push notification on user's device (phone/PC)
 */
export function sendNativePushNotification(title: string, options?: { body?: string; icon?: string; tag?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body: options?.body || 'New 1080p episode ready to stream on AsiaFlix Prime!',
      icon: options?.icon || 'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png',
      badge: 'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png',
      tag: options?.tag || 'asiaflix-alert',
    });
  } catch (err) {
    console.warn('Native notification trigger failed:', err);
  }
}
