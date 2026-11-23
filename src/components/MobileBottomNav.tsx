import React from 'react';
import { Home, Search } from 'lucide-react';

interface MobileBottomNavProps {
  onGoHome: () => void;
  onFocusSearch: () => void;
  onOpenWatchlist?: () => void;
  onOpenArcade?: () => void;
  onOpenSupport?: () => void;
  watchlistCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onGoHome,
  onFocusSearch,
}) => {
  return (
    <aside
      aria-label="Quick Navigation Dock"
      className="fixed bottom-6 right-5 z-40 p-1.5 rounded-2xl bg-[#0b0c14]/95 backdrop-blur-2xl border-2 border-[#e50914]/60 shadow-[0_12px_40px_rgba(229,9,20,0.5)] flex items-center gap-2"
    >
      <button
        onClick={onGoHome}
        className="px-4 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-[#e50914] text-white text-[14px] font-black flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer group"
        title="Return to Home & Reset All Filters"
      >
        <Home className="w-4 h-4 text-zinc-200 group-hover:text-white" />
        <span>Home</span>
      </button>

      <button
        onClick={onFocusSearch}
        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-[14px] font-black flex items-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Instant Search Dramas, Movies, and Cast"
      >
        <Search className="w-4 h-4" />
        <span>Search</span>
      </button>
    </aside>
  );
};
