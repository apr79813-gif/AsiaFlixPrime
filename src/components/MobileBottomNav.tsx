import React from 'react';
import { Home, Search, Bookmark, Gamepad2, Headphones } from 'lucide-react';

interface MobileBottomNavProps {
  onGoHome: () => void;
  onFocusSearch: () => void;
  onOpenWatchlist: () => void;
  onOpenArcade: () => void;
  onOpenSupport: () => void;
  watchlistCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onGoHome,
  onFocusSearch,
  onOpenWatchlist,
  onOpenArcade,
  onOpenSupport,
  watchlistCount,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0c0d14]/95 backdrop-blur-md border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      <button
        onClick={onGoHome}
        className="flex flex-col items-center gap-0.5 p-1 text-zinc-400 hover:text-white transition-colors"
      >
        <Home className="w-5 h-5 text-red-500" />
        <span className="text-[10px] font-bold">Home</span>
      </button>

      <button
        onClick={onFocusSearch}
        className="flex flex-col items-center gap-0.5 p-1 text-zinc-400 hover:text-white transition-colors"
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] font-bold">Search</span>
      </button>

      <button
        onClick={onOpenWatchlist}
        className="relative flex flex-col items-center gap-0.5 p-1 text-zinc-400 hover:text-white transition-colors"
      >
        <Bookmark className="w-5 h-5 text-amber-400" />
        <span className="text-[10px] font-bold">Watchlist</span>
        {watchlistCount > 0 && (
          <span className="absolute top-0 right-1 w-3.5 h-3.5 rounded-full bg-[#e50914] text-white text-[8px] font-black flex items-center justify-center">
            {watchlistCount}
          </span>
        )}
      </button>

      <button
        onClick={onOpenArcade}
        className="flex flex-col items-center gap-0.5 p-1 text-zinc-400 hover:text-white transition-colors"
      >
        <Gamepad2 className="w-5 h-5 text-[#ff2b54]" />
        <span className="text-[10px] font-bold">Arcade</span>
      </button>

      <button
        onClick={onOpenSupport}
        className="flex flex-col items-center gap-0.5 p-1 text-zinc-400 hover:text-white transition-colors"
      >
        <Headphones className="w-5 h-5 text-sky-400" />
        <span className="text-[10px] font-bold">Support</span>
      </button>
    </nav>
  );
};
