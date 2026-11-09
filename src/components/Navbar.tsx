import React, { useRef } from 'react';
import { 
  Bell, 
  Bookmark, 
  Gamepad2, 
  Headphones, 
  Film, 
  Send, 
  Sparkles,
  Flower2
} from 'lucide-react';

interface NavbarProps {
  unreadNotifsCount: number;
  watchlistCount: number;
  sakuraEnabled: boolean;
  onToggleSakura: () => void;
  onOpenNotifications: () => void;
  onOpenWatchlist: () => void;
  onOpenArcade: () => void;
  onOpenSupport: () => void;
  onOpenRequest: () => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated?: boolean;
  logoUrl?: string;
  sheetSyncCount?: number;
  isSheetSyncing?: boolean;
  onRefreshSheet?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  unreadNotifsCount,
  watchlistCount,
  sakuraEnabled,
  onToggleSakura,
  onOpenNotifications,
  onOpenWatchlist,
  onOpenArcade,
  onOpenSupport,
  onOpenRequest,
  onOpenAdmin,
  isAdminAuthenticated = false,
  logoUrl,
  sheetSyncCount = 202,
  isSheetSyncing = false,
  onRefreshSheet,
}) => {
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isAdminAuthenticated) {
      onOpenAdmin();
      return;
    }

    logoClicksRef.current += 1;
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);

    if (logoClicksRef.current >= 2) {
      e.preventDefault();
      logoClicksRef.current = 0;
      onOpenAdmin();
      return;
    }

    logoTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1200);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#08080c]/95 backdrop-blur-md border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <div onClick={handleLogoClick} className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer select-none shrink-0">
            <div className="relative w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/15 shadow-[0_0_20px_rgba(229,9,20,0.5)]">
              <img 
                src={logoUrl || "https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png"} 
                alt="AsiaFlix Prime" 
                referrerPolicy="no-referrer"
                className="w-11 h-11 min-w-[44px] min-h-[44px] shrink-0 object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png";
                }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#08080c]" title="Network Active" />
            </div>
            <div className="shrink-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-red-500 transition-colors">
                  AsiaFlix
                </span>
                <span className="bg-[#e50914] text-white text-[9px] sm:text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm">
                  PRIME
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 tracking-wider flex items-center gap-1 mt-1 leading-none">
                PRIVATE VIP NETWORK 🐰
              </p>
              <div className="flex items-center gap-1.5 mt-1 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] sm:text-[9px] text-emerald-400 font-bold tracking-tight">VIP Network Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Google Sheet Live Sync Pill */}
          {onRefreshSheet && (
            <button
              onClick={onRefreshSheet}
              disabled={isSheetSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="Click to live-sync dramas, links, and posters from Google Sheets"
            >
              <span className={`w-2 h-2 rounded-full ${isSheetSyncing ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{isSheetSyncing ? 'Syncing...' : `Sheet: ${sheetSyncCount} Live`}</span>
              <span className={`text-[10px] ${isSheetSyncing ? 'animate-spin' : ''}`}>🔄</span>
            </button>
          )}

          {/* Sakura Ambient Toggle */}
          <button
            onClick={onToggleSakura}
            className={`p-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0 ${
              sakuraEnabled 
                ? 'bg-pink-500/15 border-pink-500/30 text-pink-300 hover:bg-pink-500/25' 
                : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]'
            }`}
            title={sakuraEnabled ? 'Sakura Drift: ON (Click to turn off)' : 'Sakura Drift: OFF (Click to turn on)'}
          >
            <Flower2 className={`w-4 h-4 ${sakuraEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="Release Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e50914] text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-md">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Watchlist Quick Button */}
          <button
            onClick={onOpenWatchlist}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="My Watchlist"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span>Watchlist</span>
            {watchlistCount > 0 && (
              <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.2 text-[10px] rounded font-black">
                {watchlistCount}
              </span>
            )}
          </button>

          {/* Arcade Modal Button */}
          <button
            onClick={onOpenArcade}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="Drama Arcade (Memory, Quiz, Wheel)"
          >
            <Gamepad2 className="w-4 h-4 text-[#ff2b54]" />
            <span>Arcade</span>
          </button>

          {/* Support Desk */}
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="Support Desk"
          >
            <Headphones className="w-4 h-4 text-sky-400" />
            <span>Support</span>
          </button>

          {/* Request Drama */}
          <button
            onClick={onOpenRequest}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all whitespace-nowrap shrink-0"
            title="Request Drama"
          >
            <Film className="w-4 h-4 text-emerald-400" />
            <span>Request</span>
          </button>

          {/* Admin Studio Indicator Button (Visible when unlocked) */}
          {isAdminAuthenticated && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 hover:text-white text-xs font-black transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] whitespace-nowrap shrink-0"
              title="Open Admin Control Studio"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Admin Studio</span>
            </button>
          )}

          {/* VIP Telegram Join Primary CTA */}
          <a
            href="https://t.me/+yJH68LvfrT9hZDVl"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.45)] hover:shadow-[0_0_28px_rgba(229,9,20,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Join VIP</span>
          </a>
        </div>
      </div>
    </header>
  );
};
