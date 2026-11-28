import React from 'react';
import {
  X,
  Home,
  Search,
  Bookmark,
  Flame,
  Calendar,
  Film,
  Gamepad2,
  Headphones,
  Send,
  Bell,
  ShieldCheck,
  Volume2,
  Check,
  Download,
} from 'lucide-react';
import { useTransparentLogo } from './AnimatedChannelLogo';

interface AppNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logoUrl?: string;
  watchlistCount: number;
  unreadNotifsCount: number;
  selectedCategory: string;
  selectedAudio: string;
  selectedStatus: string;
  isAdminAuthenticated?: boolean;
  onGoHome: () => void;
  onOpenSearch: () => void;
  onOpenWatchlist: () => void;
  onJumpToTrending: () => void;
  onJumpToSchedule: () => void;
  onSelectCategoryFilter: (cat: string) => void;
  onSelectComingSoonFilter: () => void;
  onSelectAudioFilter: (audio: string) => void;
  onOpenRequest: () => void;
  onOpenArcade: () => void;
  onOpenSupport: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  onOpenAppDownloadModal?: () => void;
}

export const AppNavigationDrawer: React.FC<AppNavigationDrawerProps> = ({
  isOpen,
  onClose,
  logoUrl,
  watchlistCount,
  unreadNotifsCount,
  selectedCategory,
  selectedAudio,
  selectedStatus,
  isAdminAuthenticated = false,
  onGoHome,
  onOpenSearch,
  onOpenWatchlist,
  onJumpToTrending,
  onJumpToSchedule,
  onSelectCategoryFilter,
  onSelectComingSoonFilter,
  onSelectAudioFilter,
  onOpenRequest,
  onOpenArcade,
  onOpenSupport,
  onOpenNotifications,
  onOpenAdmin,
  onOpenAppDownloadModal,
}) => {
  const transparentLogoSrc = useTransparentLogo(logoUrl);
  if (!isOpen) return null;

  const runAction = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex justify-end animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="AsiaFlix Prime App Menu"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-80 max-w-[85vw] h-full bg-[#0b0c14]/98 backdrop-blur-2xl border-l border-white/10 p-5 overflow-y-auto flex flex-col gap-5 shadow-[-20px_0_50px_rgba(0,0,0,0.85)]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={transparentLogoSrc}
              alt="AsiaFlix Prime"
              referrerPolicy="no-referrer"
              style={{
                filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 14px rgba(255,42,133,0.7))',
                mixBlendMode: 'screen',
                background: 'transparent',
              }}
              className="w-10 h-10 object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white tracking-tight truncate">AsiaFlix</span>
                <span className="bg-[#e50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                  PRIME
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium truncate">VIP Streaming App</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-[#e50914] text-zinc-200 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close App Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Quick Navigation */}
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 pb-1">
            Quick Navigation
          </h3>

          <button
            type="button"
            onClick={() => runAction(onGoHome)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Home className="w-4 h-4 text-red-400 shrink-0" />
            <span>🏠 Home</span>
          </button>

          <button
            type="button"
            onClick={() => runAction(onOpenSearch)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Search className="w-4 h-4 text-sky-400 shrink-0" />
            <span>🔍 Smart Search</span>
          </button>

          <button
            type="button"
            onClick={() => runAction(onOpenWatchlist)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer text-left"
          >
            <span className="flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
              <span>🔖 My Watchlist</span>
            </span>
            {watchlistCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold">
                {watchlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => runAction(onJumpToTrending)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <span>🔥 Top Trending Spotlight</span>
          </button>

          <button
            type="button"
            onClick={() => runAction(onJumpToSchedule)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
            <span>📅 Weekly Airing Lineup</span>
          </button>
        </div>

        {/* Section 2: Browse Categories (1-Tap Filter) */}
        <div className="space-y-1.5 pt-3 border-t border-white/[0.08]">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 pb-1">
            Browse Categories (1-Tap Filter)
          </h3>

          {[
            { id: 'K-Drama', label: '🇰🇷 K-Drama (Korean)', isComingSoon: false },
            { id: 'C-Drama', label: '🇨🇳 C-Drama (Chinese)', isComingSoon: false },
            { id: 'Asian Movies', label: '🎬 Asian Movies', isComingSoon: false },
            { id: 'Hollywood / Bollywood', label: '🇮🇳 Hollywood & Bollywood Dubbed', isComingSoon: false },
            { id: 'Other Series', label: '🌏 Other Series (J-Drama / T-Drama)', isComingSoon: false },
            { id: 'Coming Soon', label: '⏳ Coming Soon & Premieres', isComingSoon: true },
          ].map((item) => {
            const isActive = item.isComingSoon
              ? selectedStatus === 'Coming Soon'
              : selectedCategory === item.id && selectedStatus !== 'Coming Soon';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  runAction(() =>
                    item.isComingSoon ? onSelectComingSoonFilter() : onSelectCategoryFilter(item.id)
                  )
                }
                className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer text-left border ${
                  isActive
                    ? 'bg-[#e50914]/20 border-[#e50914]/60 text-white'
                    : 'bg-white/[0.02] hover:bg-white/[0.07] border-transparent text-zinc-200'
                }`}
              >
                <span className="truncate">{item.label}</span>
                {isActive && <Check className="w-4 h-4 text-red-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Section 3: Audio Language Filter */}
        <div className="space-y-1.5 pt-3 border-t border-white/[0.08]">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 pb-1 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audio Language Filter</span>
          </h3>

          {[
            { id: 'all', label: '🔊 All Audios' },
            { id: 'Hindi Dubbed', label: '🇮🇳 Hindi Dubbed (Official)' },
            { id: 'Hindi Fan Dubbed', label: '🎙️ Hindi Fan Dubbed' },
            { id: 'Original / Eng Sub', label: '🌐 Original / Hindi Subtitles' },
          ].map((aud) => {
            const isActive =
              selectedAudio === aud.id ||
              (aud.id === 'Hindi Fan Dubbed' && selectedAudio === 'Fan Dubbed');

            return (
              <button
                key={aud.id}
                type="button"
                onClick={() => runAction(() => onSelectAudioFilter(aud.id))}
                className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer text-left border ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-white'
                    : 'bg-white/[0.02] hover:bg-white/[0.07] border-transparent text-zinc-200'
                }`}
              >
                <span className="truncate">{aud.label}</span>
                {isActive && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Section 4: VIP Community & Tools */}
        <div className="space-y-1.5 pt-3 border-t border-white/[0.08] pb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 pb-1">
            VIP Community & Tools
          </h3>

          <button
            type="button"
            onClick={() => runAction(onOpenRequest)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-200 hover:text-white text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Film className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>📝 Request a Drama</span>
          </button>

          <button
            type="button"
            onClick={() => runAction(onOpenArcade)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-200 hover:text-white text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Gamepad2 className="w-4 h-4 text-pink-400 shrink-0" />
            <span>🎮 Arcade Hub</span>
          </button>

          <button
            type="button"
            onClick={() => runAction(onOpenSupport)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-200 hover:text-white text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Headphones className="w-4 h-4 text-sky-400 shrink-0" />
            <span>🎧 Support & Report Issue</span>
          </button>

          <a
            href="https://t.me/+yJH68LvfrT9hZDVl"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914]/20 to-[#ff2b54]/20 hover:from-[#e50914]/35 hover:to-[#ff2b54]/35 border border-[#e50914]/40 text-white text-sm font-semibold flex items-center gap-3 transition-colors text-left"
          >
            <Send className="w-4 h-4 text-red-400 shrink-0" />
            <span>✈️ Join Official Telegram Channel</span>
          </a>

          <button
            type="button"
            onClick={() => runAction(onOpenNotifications)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-200 hover:text-white text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer text-left"
          >
            <span className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
              <span>🔔 Push & Telegram Bot Alerts</span>
            </span>
            {unreadNotifsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#e50914] text-white text-[10px] font-black">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {onOpenAppDownloadModal && (
            <button
              type="button"
              onClick={() => runAction(onOpenAppDownloadModal)}
              className="w-full px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-600/30 text-emerald-200 hover:text-white border border-emerald-400/35 text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>📲 Install App / Download APK</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => runAction(onOpenAdmin)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-red-600/20 text-zinc-300 hover:text-white border border-white/10 hover:border-red-500/40 text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${isAdminAuthenticated ? 'text-emerald-400' : 'text-red-400'}`} />
            <span>🔐 Admin Studio {isAdminAuthenticated ? '(Unlocked)' : '(for Admin)'}</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
