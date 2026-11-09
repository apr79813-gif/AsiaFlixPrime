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
    <div className="bg-gradient-to-r from-[#170e12]/95 via-[#1c0e14]/95 to-[#101320]/95 border-b border-[#e50914]/25 px-4 py-2 relative z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        {justEnabled ? (
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
            <span>VIP Push Alerts Activated! You will receive instant notifications on this device.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-[#e50914]/20 text-[#ff2b54] shrink-0">
              <Bell className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-white whitespace-nowrap">
                Never Miss a Hindi Dubbed Episode Drop!
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-red-600/30 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30 whitespace-nowrap">
                Instant VIP Alerts
              </span>
              <span className="text-[11px] text-zinc-400 hidden md:inline">
                • Push alerts & Telegram bot updates
              </span>
            </div>
          </div>
        )}

        {!justEnabled && (
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Native Web Push Button */}
            <button
              onClick={handleEnablePush}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-[11px] font-black shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Bell className="w-3 h-3" />
              <span>Allow Phone Alerts</span>
            </button>

            {/* Telegram Bot Link */}
            <a
              href={`https://t.me/${botUsername}?start=site_alerts`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/50 text-sky-300 text-[11px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Send className="w-3 h-3" />
              <span>Telegram Bot Alerts</span>
            </a>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
