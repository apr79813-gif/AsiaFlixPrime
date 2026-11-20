import React, { useEffect } from 'react';
import { DramaItem, ReleaseNotification } from '../types/drama';
import { X, Play, Flame, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LiveToastNotificationProps {
  notification: ReleaseNotification | null;
  drama?: DramaItem | null;
  onOpenDrama: (drama: DramaItem) => void;
  onDismiss: () => void;
}

export const LiveToastNotification: React.FC<LiveToastNotificationProps> = ({
  notification,
  drama,
  onOpenDrama,
  onDismiss,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isIssueToast = notification.type === 'issue';
  const isFixToast = notification.type === 'fix';

  // Determine audio/status badge and signature colors
  const msgLower = (notification.message || '').toLowerCase();
  const titleLower = (notification.title || '').toLowerCase();

  let statusBadge = {
    label: '🔊 IN HINDI',
    className: 'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white border-red-400/40 shadow-[0_0_12px_rgba(229,9,20,0.5)]',
  };

  if (isFixToast) {
    statusBadge = {
      label: notification.badge || '✅ ISSUE FIXED',
      className: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-emerald-300/50 shadow-[0_0_12px_rgba(16,185,129,0.55)]',
    };
  } else if (isIssueToast) {
    statusBadge = {
      label: notification.badge || '⚠️ UNDER FIX',
      className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-black border-amber-300/60 shadow-[0_0_12px_rgba(245,158,11,0.55)]',
    };
  } else if (msgLower.includes('fan dub') || titleLower.includes('fan dub')) {
    statusBadge = {
      label: '🎙️ HINDI FAN DUB',
      className: 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#ec4899] text-white border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.5)]',
    };
  } else if (msgLower.includes('original') || msgLower.includes('eng sub') || titleLower.includes('original') || titleLower.includes('eng sub')) {
    statusBadge = {
      label: '💬 ORIGINAL / ENG SUB',
      className: 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#2563eb] text-white border-sky-400/40 shadow-[0_0_12px_rgba(14,165,233,0.5)]',
    };
  }

  const cardThemeClass = isFixToast
    ? 'border-emerald-500/55 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_32px_rgba(16,185,129,0.3)] hover:border-emerald-400/80'
    : isIssueToast
    ? 'border-amber-500/55 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_32px_rgba(245,158,11,0.3)] hover:border-amber-400/80'
    : 'border-red-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(229,9,20,0.25)] hover:border-red-400/70';

  const glowBubbleClass = isFixToast
    ? 'bg-emerald-500/20'
    : isIssueToast
    ? 'bg-amber-500/20'
    : 'bg-[#e50914]/20';

  const posterSrc = drama?.poster || notification.posterUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';

  const handleClick = () => {
    if (drama) {
      onOpenDrama(drama);
    }
    onDismiss();
  };

  return (
    <div className="fixed top-20 right-6 z-[60] max-w-sm w-[calc(100%-3rem)] sm:w-96 animate-slide-down">
      <div className={`relative overflow-hidden bg-[#111218]/95 backdrop-blur-xl border rounded-2xl p-3.5 flex items-start gap-3 transition-all duration-300 group ${cardThemeClass}`}>
        {/* Glow ambient accent */}
        <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none ${glowBubbleClass}`} />

        {/* Poster Thumbnail */}
        <div 
          onClick={handleClick}
          className="relative w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 shadow-md cursor-pointer group-hover:scale-105 transition-transform"
        >
          <img
            src={posterSrc}
            alt={notification.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0 pr-6">
          {/* Header strip */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {isFixToast ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                <span>LIVE FIX UPDATE</span>
              </span>
            ) : isIssueToast ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/35 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                <span>ISSUE NOTICE</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <Flame className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                <span>LIVE DROP</span>
              </span>
            )}
            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shadow-sm ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* Drama Title */}
          <h4 
            onClick={handleClick}
            className="text-xs sm:text-sm font-black text-white hover:text-red-400 transition-colors line-clamp-1 cursor-pointer"
            title={notification.title}
          >
            {notification.title}
          </h4>

          {/* Episode / Drop Message */}
          <p className="text-[11px] text-zinc-300 font-medium line-clamp-2 mt-0.5 leading-snug">
            {notification.message}
          </p>

          {/* Action Button */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={handleClick}
              className={`px-3 py-1 rounded-lg text-white text-[11px] font-black tracking-wide shadow-md flex items-center gap-1 transition-all cursor-pointer ${
                isFixToast
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : isIssueToast
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-red-700 hover:shadow-[0_0_15px_rgba(229,9,20,0.6)]'
              }`}
            >
              <Play className="w-2.5 h-2.5 fill-white" />
              <span>{isFixToast ? 'Open Drama →' : isIssueToast ? 'View Status →' : 'Watch Now →'}</span>
            </button>
            <span className="text-[10px] text-zinc-500">Auto-close in 8s</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.15] text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
