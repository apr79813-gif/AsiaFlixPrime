import React from 'react';
import { Search, X, Calendar, Filter } from 'lucide-react';
import { AudioType, DramaCategory, DramaStatus } from '../types/drama';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedAudio: string; // 'all' | AudioType
  onSelectAudio: (audio: string) => void;
  selectedCategory: string; // 'all' | DramaCategory
  onSelectCategory: (cat: string) => void;
  selectedYear: string; // 'all' | '2026' | '2025' etc.
  onSelectYear: (year: string) => void;
  selectedStatus: string; // 'all' | DramaStatus
  onSelectStatus: (status: string) => void;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedAudio,
  onSelectAudio,
  selectedCategory,
  onSelectCategory,
  selectedYear,
  onSelectYear,
  selectedStatus,
  onSelectStatus,
  totalFilteredCount,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2000 + 1 }).map((_, i) => currentYear - i);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto mb-4 sm:mb-5">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by drama title, actor, or tag (e.g. Rain or Shine, Lee Jun-ho, Hanuman)..."
            className="w-full pl-12 pr-10 py-3 sm:py-3.5 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/10 focus:border-[#e50914] rounded-2xl text-white placeholder-zinc-500 text-xs sm:text-sm outline-none transition-all shadow-inner focus:ring-2 focus:ring-[#e50914]/30"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Audio Category Focus */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3">
        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider mr-1 hidden sm:inline">
          Audio Track:
        </span>
        <button
          onClick={() => onSelectAudio('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedAudio === 'all'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          All Audios
        </button>
        <button
          onClick={() => onSelectAudio('Hindi Dubbed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            selectedAudio === 'Hindi Dubbed'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          <span>🔊</span> Hindi Dubbed
        </button>
        <button
          onClick={() => onSelectAudio(selectedAudio === 'Hindi Fan Dubbed' || selectedAudio === 'Fan Dubbed' ? 'all' : 'Hindi Fan Dubbed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            selectedAudio === 'Hindi Fan Dubbed' || selectedAudio === 'Fan Dubbed'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          <span>🎙️</span> Hindi Fan Dubbed
        </button>
        <button
          onClick={() => onSelectAudio('Original / Eng Sub')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            selectedAudio === 'Original / Eng Sub'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          <span>💬</span> Original / Eng Sub
        </button>
      </div>

      {/* Origin / Format Chips + Dropdowns */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedCategory === 'all'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          All ({totalFilteredCount})
        </button>
        <button
          onClick={() => onSelectCategory('K-Drama')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedCategory === 'K-Drama'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🇰🇷 K-Drama
        </button>
        <button
          onClick={() => onSelectCategory('C-Drama')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedCategory === 'C-Drama'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🇨🇳 C-Drama
        </button>
        <button
          onClick={() => onSelectCategory('Asian Movies')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedCategory === 'Asian Movies'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🎬 Movies
        </button>
        <button
          onClick={() => onSelectCategory('Hollywood / Bollywood')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedCategory === 'Hollywood / Bollywood'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🍿 Holly/Bolly
        </button>
        <button
          onClick={() => onSelectCategory('J-Drama')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedCategory === 'J-Drama'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🇯🇵 J-Drama
        </button>
        <button
          onClick={() => onSelectStatus(selectedStatus === 'Coming Soon' ? 'all' : 'Coming Soon')}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedStatus === 'Coming Soon'
              ? 'bg-amber-500 text-black font-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20'
          }`}
        >
          ⏳ Coming Soon
        </button>

        {/* Release Year Dropdown */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(e.target.value)}
            className="bg-[#14151b] border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-[#e50914]"
          >
            <option value="all">Year</option>
            {years.map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
          <select
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
            className="bg-[#14151b] border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-[#e50914]"
          >
            <option value="all">Status</option>
            <option value="Now Streaming (Ongoing)">Ongoing</option>
            <option value="Completed (Full Series)">Completed</option>
            <option value="Coming Soon">Coming Soon</option>
          </select>
        </div>
      </div>
    </div>
  );
};
