import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle2, X } from 'lucide-react';
import { getWebPushPermission, requestWebPushPermission } from '../services/notificationService';

interface AudienceNotificationBannerProps {
  botUsername?: string;
  onOpenNotificationsDrawer: () => void;
}

export const AudienceNotificationBanner: React.FC<AudienceNotificationBannerProps> = ({
  botUsername = 'asiaflix_request_bot',
  onOpenNotificationsDrawer,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isDismissed, setIsDismissed] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    const current = getWebPushPermission();
    setPermission(current);

    const savedDismissed = localStorage.getItem('asiaflix_notif_banner_dismissed');
    if (savedDismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleEnablePush = async () => {
    const granted = await requestWebPushPermission();
    if (granted) {
      setPermission('granted');
      setJustEnabled(true);
      setTimeout(() => {
        setIsDismissed(true);
      }, 3000);
    } else {
      setPermission(getWebPushPermission());
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('asiaflix_notif_banner_dismissed', 'true');
  };

  // If already granted and not just clicked, or dismissed, hide banner
  if (isDismissed || permission === 'granted' && !justEnabled || permission === 'unsupported') {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-[#1b1216] via-[#221016] to-[#121624] border-y border-[#e50914]/30 px-3 sm:px-6 py-2.5 relative z-30 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        {justEnabled ? (
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>VIP Push Alerts Activated! You will receive instant notifications on this device.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#e50914]/20 text-[#ff2b54] shrink-0 hidden sm:block">
              <Bell className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-white flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                <span>🔔 Never Miss a Hindi Dubbed Episode Drop!</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-600/30 text-red-300 px-1.5 py-0.2 rounded border border-red-500/30">
                  Instant VIP Alerts
                </span>
              </p>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Get native notifications on phone/browser + instant Telegram bot release updates.
              </p>
            </div>
          </div>
        )}

        {!justEnabled && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
            {/* Native Web Push Button */}
            <button
              onClick={handleEnablePush}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-xs font-black shadow-md hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Allow Phone Alerts</span>
            </button>

            {/* Telegram Bot Link */}
            <a
              href={`https://t.me/${botUsername}?start=site_alerts`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/50 text-sky-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram Bot Alerts</span>
            </a>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
