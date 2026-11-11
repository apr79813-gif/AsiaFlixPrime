import React, { useState, useMemo } from 'react';
import { DramaItem } from '../types/drama';
import { Calendar, Flame, Send, Play, Settings, Clock, Sparkles } from 'lucide-react';
import { 
  DayShort, 
  DAYS_ORDER, 
  getTodayShortName, 
  getTodayFullName, 
  isDramaAiringOnDay, 
  isAiringToday 
} from '../services/scheduleHelper';

interface WeekendMegaLineupSectionProps {
  weekendDramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: (id: string) => boolean;
  onOpenAdminWeekend: () => void;
  announcementText?: string;
  timingText?: string;
  isActive?: boolean;
  isAdminAuthenticated?: boolean;
}

export const WeekendMegaLineupSection: React.FC<WeekendMegaLineupSectionProps> = ({
  weekendDramas,
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
  onOpenAdminWeekend,
  announcementText,
  timingText = '7:00 PM IST Daily Upload Window',
  isActive = true,
  isAdminAuthenticated,
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<'all' | 'today' | DayShort>('all');
  const todayShort = getTodayShortName();
  const todayFull = getTodayFullName();

  // Count items airing today
  const todayDroppingCount = useMemo(() => {
    return weekendDramas.filter((d) => isAiringToday(d.schedule)).length;
  }, [weekendDramas]);

  // Filter dramas by selected day
  const filteredDramas = useMemo(() => {
    if (selectedDayFilter === 'all') return weekendDramas;
    if (selectedDayFilter === 'today') {
      const todayList = weekendDramas.filter((d) => isAiringToday(d.schedule));
      return todayList.length > 0 ? todayList : weekendDramas;
    }
    return weekendDramas.filter((d) => isDramaAiringOnDay(d.schedule, selectedDayFilter));
  }, [weekendDramas, selectedDayFilter]);

  return (
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 my-10">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1c0f14] via-[#12131a] to-[#0a0a0f] border border-[#e50914]/30 shadow-[0_10px_40px_rgba(229,9,20,0.15)] p-5 sm:p-7">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white shadow-md">
                <Flame className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                ⚡ LIVE WEEKLY RELEASE CALENDAR
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Today: <strong>{todayFull}</strong></span>
              </span>
              <span className="text-xs text-zinc-400 hidden lg:inline">
                • {timingText}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>🗓️ Weekly Episode Drops & Airing Lineup</span>
              <span className="text-xs font-bold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-md hidden sm:inline">
                {weekendDramas.length} Ongoing Titles
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              {announcementText || "Fresh episodes uploaded on their official release days (Mon–Sun) • Track your ongoing dramas below!"}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdminAuthenticated && (
              <button
                onClick={onOpenAdminWeekend}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-red-500/40 text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-2 transition-all shadow-sm group cursor-pointer"
                title="Curate titles, timings & announcement"
              >
                <Settings className="w-3.5 h-3.5 text-red-400 group-hover:rotate-45 transition-transform" />
                <span>Curate Lineup</span>
              </button>
            )}
            <a
              href="https://t.me/+yJH68LvfrT9hZDVl"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>VIP Channel</span>
            </a>
          </div>
        </div>

        {/* Day Filter Pills Strip (Mon - Sun + Today) */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-5 border-b border-white/[0.06]">
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-red-500" />
            <span>Filter Day:</span>
          </span>

          {/* All Drops */}
          <button
            onClick={() => setSelectedDayFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              selectedDayFilter === 'all'
                ? 'bg-[#e50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.6)]'
                : 'bg-white/[0.05] hover:bg-white/10 text-zinc-300 border border-white/10'
            }`}
          >
            All Drops ({weekendDramas.length})
          </button>

          {/* Dropping Today */}
          <button
            onClick={() => setSelectedDayFilter('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedDayFilter === 'today'
                ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span className="animate-pulse">🔥</span>
            <span>Dropping Today ({todayDroppingCount})</span>
          </button>

          {/* Individual Day Buttons: Mon - Sun */}
          {DAYS_ORDER.map((day) => {
            const isToday = day === todayShort;
            const isSelected = selectedDayFilter === day;
            const dayCount = weekendDramas.filter((d) => isDramaAiringOnDay(d.schedule, day)).length;

            return (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#e50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.5)] scale-105'
                    : isToday
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-black'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
                }`}
              >
                <span>{day}</span>
                {isToday && <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-black">Today</span>}
                {dayCount > 0 && <span className="text-[10px] opacity-70">({dayCount})</span>}
              </button>
            );
          })}
        </div>

        {/* Curated Titles Carousel / Cards */}
        {filteredDramas.length === 0 ? (
          <div className="py-12 text-center bg-black/30 rounded-2xl border border-white/5 p-6">
            <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-bold text-zinc-300">
              No episodes scheduled specifically for {selectedDayFilter === 'today' ? `today (${todayFull})` : selectedDayFilter}.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Select "All Drops" to browse the full ongoing lineup and upcoming releases!
            </p>
            <button
              onClick={() => setSelectedDayFilter('all')}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#e50914] hover:bg-red-600 text-white text-xs font-bold cursor-pointer transition-all"
            >
              Show All Drops
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-red-600/40 scrollbar-track-transparent snap-x">
              {filteredDramas.map((drama, idx) => {
                const droppingToday = isAiringToday(drama.schedule);
                const audioLabel = drama.defaultAudio === 'Fan Dubbed' ? 'Hindi Fan Dub' : drama.defaultAudio;

                return (
                  <div
                    key={drama.id}
                    className={`w-[210px] sm:w-[230px] shrink-0 snap-start bg-[#14151f] rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_12px_30px_rgba(0,0,0,0.9)] hover:-translate-y-1 group ${
                      droppingToday 
                        ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-400' 
                        : 'border-white/[0.08] hover:border-[#e50914]/60'
                    }`}
                  >
                    {/* Poster Area */}
                    <div
                      onClick={() => onSelectDrama(drama)}
                      className="relative w-full aspect-[2/3] overflow-hidden bg-zinc-900 cursor-pointer"
                    >
                      <img
                        src={drama.poster}
                        alt={drama.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#14151f] via-transparent to-black/50" />

                      {/* Top Left of Poster: Rank badge + Audio badge */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
                        {idx === 0 ? (
                          <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-lg animate-pulse">
                            👑 TOP 1
                          </span>
                        ) : (
                          <span className="bg-black/80 text-amber-300 border border-amber-500/30 font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                            #{idx + 1}
                          </span>
                        )}
                        <span className="bg-[#e50914] text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                          {audioLabel}
                        </span>
                      </div>

                      {/* Top Right of Poster: High-Contrast Release Day Pill */}
                      <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none max-w-[125px]">
                        {droppingToday ? (
                          <span className="bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-[9px] px-2 py-1 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)] border border-emerald-300 animate-pulse flex items-center gap-1 truncate">
                            <span>🔥 TODAY</span>
                            {drama.schedule && <span className="opacity-80 truncate">• {drama.schedule}</span>}
                          </span>
                        ) : drama.schedule ? (
                          <span className="bg-black/85 backdrop-blur-md text-amber-300 border border-amber-500/40 font-black text-[9px] px-2 py-0.5 rounded-full shadow flex items-center gap-1 truncate">
                            <span>🗓️</span>
                            <span className="truncate">{drama.schedule}</span>
                          </span>
                        ) : (
                          <span className="bg-black/80 backdrop-blur-md text-sky-300 border border-sky-500/30 font-bold text-[9px] px-2 py-0.5 rounded-full shadow truncate">
                            ⚡ Ongoing Weekly
                          </span>
                        )}
                      </div>

                      {/* Bottom of Poster: Exact StatusText on Left (Never cut off) & Rating on Right */}
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] z-10 pointer-events-none">
                        <div className="flex items-center gap-1.5 bg-black/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 text-white font-bold max-w-[140px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse shrink-0" />
                          <span className="truncate text-[9px] sm:text-[10px] text-emerald-300 font-extrabold">
                            {drama.statusText || 'Now Streaming'}
                          </span>
                        </div>

                        <span className="bg-black/90 backdrop-blur-md text-amber-300 font-black px-1.5 py-0.5 rounded border border-white/15 shrink-0 flex items-center gap-0.5">
                          ★ {drama.rating}
                        </span>
                      </div>
                    </div>

                    {/* Info Area */}
                    <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                      <div className="space-y-1.5">
                        <h3
                          onClick={() => onSelectDrama(drama)}
                          className="text-xs sm:text-sm font-black text-white hover:text-red-400 transition-colors line-clamp-1 cursor-pointer"
                          title={drama.title}
                        >
                          {drama.title}
                        </h3>

                        {/* Dedicated Highlighted Schedule Strip */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-bold">
                          <span>🗓️</span>
                          <span className="truncate">
                            Drops: <strong className="text-white">{drama.schedule || 'Weekly Drop'}</strong>
                          </span>
                          {droppingToday && (
                            <span className="ml-auto bg-emerald-400 text-black px-1 rounded text-[8px] font-black uppercase tracking-wider shrink-0 animate-pulse">
                              AIRING
                            </span>
                          )}
                        </div>

                        {/* Details & Release Year */}
                        <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400 pt-0.5">
                          <span className="text-sky-400 font-bold truncate max-w-[130px]">
                            {drama.details || 'Full HD 1080p'}
                          </span>
                          <span className="text-zinc-500 font-bold shrink-0">{drama.releaseYear}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 mt-auto">
                        <button
                          onClick={() => onSelectDrama(drama)}
                          className="w-full py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 text-red-400 fill-red-400" />
                          <span>Episodes</span>
                        </button>

                        <a
                          href={drama.telegramHindi || drama.telegramFanDub || drama.telegramOrig || drama.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-2 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black text-center shadow transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Telegram</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
