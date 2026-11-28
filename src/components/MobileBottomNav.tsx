import React from 'react';
import { Home, Search, Clapperboard, Bookmark, User } from 'lucide-react';

interface MobileBottomNavProps {
  onGoHome: () => void;
  onFocusSearch: () => void;
  onOpenWatchlist?: () => void;
  onOpenArcade?: () => void;
  onOpenSupport?: () => void;
  watchlistCount?: number;
  isInstalledApp?: boolean;
  activeAppTab?: 'home' | 'clips' | 'search' | 'watchlist' | 'profile';
  onOpenClips?: () => void;
  onOpenProfile?: () => void;
  vipAvatar?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onGoHome,
  onFocusSearch,
  onOpenWatchlist,
  watchlistCount = 0,
  isInstalledApp = false,
  activeAppTab = 'home',
  onOpenClips,
  onOpenProfile,
  vipAvatar,
}) => {
  if (isInstalledApp) {
    return (
      <nav
        aria-label="App Navigation Bar"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07080e]/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)] grid grid-cols-5 items-center shadow-[0_-10px_35px_rgba(0,0,0,0.75)]"
      >
        <button
          type="button"
          onClick={onGoHome}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
            activeAppTab === 'home' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Home className={`w-5 h-5 ${activeAppTab === 'home' ? 'text-[#e50914]' : ''}`} />
          <span className="text-[10px] font-bold tracking-tight">Home</span>
        </button>

        <button
          type="button"
          onClick={onOpenClips || onGoHome}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
            activeAppTab === 'clips' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clapperboard className={`w-5 h-5 ${activeAppTab === 'clips' ? 'text-[#ff2a85]' : ''}`} />
          <span className="text-[10px] font-bold tracking-tight">Clips</span>
        </button>

        <button
          type="button"
          onClick={onFocusSearch}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
            activeAppTab === 'search' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Search className={`w-5 h-5 ${activeAppTab === 'search' ? 'text-[#e50914]' : ''}`} />
          <span className="text-[10px] font-bold tracking-tight">Search</span>
        </button>

        <button
          type="button"
          onClick={onOpenWatchlist || onGoHome}
          className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
            activeAppTab === 'watchlist' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Bookmark className={`w-5 h-5 ${activeAppTab === 'watchlist' ? 'text-amber-400' : ''}`} />
            {watchlistCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 rounded-full bg-[#e50914] text-white text-[9px] font-black flex items-center justify-center">
                {watchlistCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">Watchlist</span>
        </button>

        <button
          type="button"
          onClick={onOpenProfile || onGoHome}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
            activeAppTab === 'profile' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {vipAvatar ? (
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
              activeAppTab === 'profile' ? 'border-[#e50914] bg-[#e50914]/20' : 'border-white/25 bg-white/10'
            }`}>
              {vipAvatar}
            </span>
          ) : (
            <User className={`w-5 h-5 ${activeAppTab === 'profile' ? 'text-[#e50914]' : ''}`} />
          )}
          <span className="text-[10px] font-bold tracking-tight">Profile</span>
        </button>
      </nav>
    );
  }

  return (
    <aside
      aria-label="Quick Navigation Dock"
      className="fixed bottom-6 right-5 z-40 p-1.5 rounded-2xl bg-[#0b0c14]/95 backdrop-blur-2xl border-2 border-[#e50914]/60 shadow-[0_12px_40px_rgba(229,9,20,0.5)] flex items-center gap-2"
    >
      <button
        onClick={onGoHome}
        className="px-3.5 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-[#e50914] text-white text-[13px] font-black flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer group"
        title="Return to Home & Reset All Filters"
      >
        <Home className="w-4 h-4 text-zinc-200 group-hover:text-white" />
        <span>Home</span>
      </button>

      {onOpenClips && (
        <button
          onClick={onOpenClips}
          className="px-3.5 py-2.5 rounded-2xl bg-pink-500/20 hover:bg-[#ff2a85] border border-pink-400/40 text-pink-200 hover:text-white text-[13px] font-black flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Watch Short Drama Clips Feed"
        >
          <Clapperboard className="w-4 h-4" />
          <span>Clips</span>
        </button>
      )}

      <button
        onClick={onFocusSearch}
        className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-[13px] font-black flex items-center gap-1.5 shadow-[0_0_20px_rgba(229,9,20,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Instant Search Dramas, Movies, and Cast"
      >
        <Search className="w-4 h-4" />
        <span>Search</span>
      </button>

      {onOpenProfile && (
        <button
          onClick={onOpenProfile}
          className="px-3 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] text-white text-[13px] font-black flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Open VIP Profile"
        >
          <User className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">Profile</span>
        </button>
      )}
    </aside>
  );
};

