import React from 'react';
import { Search, X, Calendar, Filter } from 'lucide-react';
import { MoodFilterType } from '../types/drama';

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
  selectedMood?: MoodFilterType;
  onSelectMood?: (mood: MoodFilterType) => void;
  onSurpriseMe?: () => void;
  totalFilteredCount: number;
  isPhoneDevice?: boolean;
}

const MOOD_PILLS: Array<{ id: MoodFilterType; label: string }> = [
  { id: 'all', label: '✨ All Moods' },
  { id: 'romance', label: '💖 CEO & Romance' },
  { id: 'thriller', label: '🔥 Dark Revenge & Thriller' },
  { id: 'fantasy', label: '⚔️ Fantasy & Historical' },
  { id: 'short', label: '⚡ Short Binge (≤12 Eps)' },
];

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
  selectedMood = 'all',
  onSelectMood,
  onSurpriseMe,
  totalFilteredCount,
  isPhoneDevice = false,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2000 + 1 }).map((_, i) => currentYear - i);

  const audioBtnPad = isPhoneDevice ? 'px-4 py-2 text-sm font-black' : 'px-3 py-1.5 text-xs font-bold';
  const catBtnPad = isPhoneDevice ? 'px-4 py-2 text-sm font-black rounded-xl' : 'px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg';

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-8 w-full">
      {/* Search Bar */}
      <div className={`relative mx-auto mb-4 sm:mb-5 ${isPhoneDevice ? 'max-w-3xl' : 'max-w-2xl'}`}>
        <div className="relative flex items-center">
          <Search className={`absolute left-4 text-zinc-400 pointer-events-none ${isPhoneDevice ? 'w-6 h-6' : 'w-5 h-5'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by drama title, actor, or tag (e.g. Rain or Shine, Lee Jun-ho, Hanuman)..."
            className={`w-full bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/10 focus:border-[#e50914] rounded-2xl text-white placeholder-zinc-500 outline-none transition-all shadow-inner focus:ring-2 focus:ring-[#e50914]/30 ${
              isPhoneDevice ? 'pl-13 pr-12 py-4 text-base font-medium' : 'pl-12 pr-10 py-3 sm:py-3.5 text-xs sm:text-sm'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className={isPhoneDevice ? 'w-5 h-5' : 'w-4 h-4'} />
            </button>
          )}
        </div>
      </div>

      {/* Audio Category Focus */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        <span className={`text-zinc-500 font-bold uppercase tracking-wider mr-1 ${isPhoneDevice ? 'text-sm inline' : 'text-xs hidden sm:inline'}`}>
          Audio Track:
        </span>
        <button
          onClick={() => onSelectAudio('all')}
          className={`${audioBtnPad} rounded-xl transition-all cursor-pointer ${
            selectedAudio === 'all'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          All Audios
        </button>
        <button
          onClick={() => onSelectAudio('Hindi Dubbed')}
          className={`${audioBtnPad} rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedAudio === 'Hindi Dubbed'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          <span>🔊</span> Hindi Dubbed
        </button>
        <button
          onClick={() => onSelectAudio(selectedAudio === 'Hindi Fan Dubbed' || selectedAudio === 'Fan Dubbed' ? 'all' : 'Hindi Fan Dubbed')}
          className={`${audioBtnPad} rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedAudio === 'Hindi Fan Dubbed' || selectedAudio === 'Fan Dubbed'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          <span>🎙️</span> Hindi Fan Dubbed
        </button>
        <button
          onClick={() => onSelectAudio('Original / Eng Sub')}
          className={`${audioBtnPad} rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedAudio === 'Original / Eng Sub'
              ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          <span>💬</span> Original / Eng Sub
        </button>
      </div>

      {/* Mood & Trope Quick-Filter Pills + Surprise Me Drama Roulette */}
      {(onSelectMood || onSurpriseMe) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {onSelectMood &&
            MOOD_PILLS.map((mood) => {
              const active = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  onClick={() => onSelectMood(active && mood.id !== 'all' ? 'all' : mood.id)}
                  className={`${audioBtnPad} rounded-xl transition-all cursor-pointer border ${
                    active
                      ? 'bg-gradient-to-r from-[#e50914]/90 to-amber-500/90 text-white border-amber-300/60 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
                  }`}
                >
                  {mood.label}
                </button>
              );
            })}

          {onSurpriseMe && (
            <button
              onClick={onSurpriseMe}
              className="bg-gradient-to-r from-[#e50914] to-[#f59e0b] hover:from-[#f6121d] hover:to-amber-400 text-white font-black px-4 py-2 rounded-xl text-xs sm:text-sm shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300/40 whitespace-nowrap"
              title="Spin the Drama Roulette & Watch a Top-Rated Pick!"
            >
              🎲 Surprise Me
            </button>
          )}
        </div>
      )}

      {/* Origin / Format Chips + Dropdowns */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => onSelectCategory('all')}
          className={`${catBtnPad} transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          All ({totalFilteredCount})
        </button>
        <button
          onClick={() => onSelectCategory('K-Drama')}
          className={`${catBtnPad} transition-all cursor-pointer ${
            selectedCategory === 'K-Drama'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🇰🇷 K-Drama
        </button>
        <button
          onClick={() => onSelectCategory('C-Drama')}
          className={`${catBtnPad} transition-all cursor-pointer ${
            selectedCategory === 'C-Drama'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🇨🇳 C-Drama
        </button>
        <button
          onClick={() => onSelectCategory('Asian Movies')}
          className={`${catBtnPad} transition-all cursor-pointer ${
            selectedCategory === 'Asian Movies'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🎬 Movies
        </button>
        <button
          onClick={() => onSelectCategory('Hollywood / Bollywood')}
          className={`${catBtnPad} transition-all cursor-pointer ${
            selectedCategory === 'Hollywood / Bollywood'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🍿 Holly/Bolly
        </button>
        <button
          onClick={() => onSelectCategory('Other Series')}
          className={`${catBtnPad} transition-all cursor-pointer ${
            selectedCategory === 'Other Series' || selectedCategory === 'J-Drama'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
          }`}
        >
          🌐 Other Series
        </button>
        <button
          onClick={() => onSelectStatus(selectedStatus === 'Coming Soon' ? 'all' : 'Coming Soon')}
          className={`${catBtnPad} transition-all cursor-pointer ${
            selectedStatus === 'Coming Soon'
              ? 'bg-amber-500 text-black font-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20'
          }`}
        >
          ⏳ Coming Soon
        </button>

        {/* Release Year Dropdown */}
        <div className="flex items-center gap-1">
          <Calendar className={`text-zinc-400 ${isPhoneDevice ? 'w-4 h-4 block' : 'w-3.5 h-3.5 hidden sm:block'}`} />
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(e.target.value)}
            className={`bg-[#14151b] border border-white/10 hover:border-white/20 text-white outline-none cursor-pointer focus:border-[#e50914] ${
              isPhoneDevice ? 'text-sm font-black rounded-xl px-3 py-2' : 'text-xs font-bold rounded-lg px-2 py-1'
            }`}
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
          <Filter className={`text-zinc-400 ${isPhoneDevice ? 'w-4 h-4 block' : 'w-3.5 h-3.5 hidden sm:block'}`} />
          <select
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
            className={`bg-[#14151b] border border-white/10 hover:border-white/20 text-white outline-none cursor-pointer focus:border-[#e50914] ${
              isPhoneDevice ? 'text-sm font-black rounded-xl px-3 py-2' : 'text-xs font-bold rounded-lg px-2 py-1'
            }`}
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
