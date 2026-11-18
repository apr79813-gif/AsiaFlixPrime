import React, { useState, useMemo } from 'react';
import { DramaItem } from '../types/drama';
import { Calendar, Flame, Send, Play, Settings, Clock, Bookmark, BookmarkCheck } from 'lucide-react';
import { 
  DayShort, 
  DAYS_ORDER, 
  getTodayShortName, 
  getTodayFullName, 
  isDramaAiringOnDay, 
  isAiringToday 
} from '../services/scheduleHelper';
import { getAgeRatingMeta } from '../services/ageRatingHelper';

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
  isPhoneDevice?: boolean;
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
  isPhoneDevice = false,
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<'all' | 'today' | DayShort>('all');
  const todayShort = getTodayShortName();
  const todayFull = getTodayFullName();

  const isDramaAiringTodayActive = (d: DramaItem) => {
    if (d.activeTrackSchedules && d.activeTrackSchedules.length > 0) {
      return d.activeTrackSchedules.some((t) => isAiringToday(t.scheduleText));
    }
    return isAiringToday(d.schedule);
  };

  const isDramaAiringOnDayActive = (d: DramaItem, day: DayShort) => {
    if (d.activeTrackSchedules && d.activeTrackSchedules.length > 0) {
      return d.activeTrackSchedules.some((t) => isDramaAiringOnDay(t.scheduleText, day));
    }
    return isDramaAiringOnDay(d.schedule, day);
  };

  // Count items airing today across active tracks
  const todayDroppingCount = useMemo(() => {
    return weekendDramas.filter((d) => isDramaAiringTodayActive(d)).length;
  }, [weekendDramas]);

  // Filter dramas by selected day against activeTrackSchedules
  const filteredDramas = useMemo(() => {
    if (selectedDayFilter === 'all') return weekendDramas;
    if (selectedDayFilter === 'today') {
      return weekendDramas.filter((d) => isDramaAiringTodayActive(d));
    }
    return weekendDramas.filter((d) => isDramaAiringOnDayActive(d, selectedDayFilter));
  }, [weekendDramas, selectedDayFilter]);

  return (
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 my-10 w-full">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1c0f14] via-[#12131a] to-[#0a0a0f] border border-[#e50914]/30 shadow-[0_10px_40px_rgba(229,9,20,0.15)] p-5 sm:p-7 w-full">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black uppercase tracking-wider bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white shadow-md ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                <Flame className={`${isPhoneDevice ? 'w-4 h-4' : 'w-3.5 h-3.5'} animate-pulse text-amber-300`} />
                ⚡ LIVE WEEKLY RELEASE CALENDAR
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                <Clock className={`${isPhoneDevice ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-amber-400`} />
                <span>Today: <strong>{todayFull}</strong></span>
              </span>
              <span className={`text-zinc-400 ${isPhoneDevice ? 'text-sm inline' : 'text-xs hidden lg:inline'}`}>
                • {timingText}
              </span>
            </div>

            <h2 className={`font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap ${isPhoneDevice ? 'text-3xl' : 'text-xl sm:text-2xl lg:text-3xl'}`}>
              <span>🗓️ Weekly Episode Drops & Airing Lineup</span>
              <span className={`font-bold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-md ${isPhoneDevice ? 'text-sm inline' : 'text-xs hidden sm:inline'}`}>
                {weekendDramas.length} Ongoing Titles
              </span>
            </h2>

            <p className={`text-zinc-300 max-w-3xl leading-relaxed ${isPhoneDevice ? 'text-base' : 'text-xs sm:text-sm'}`}>
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
        <div className="relative z-10 flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-3 mb-5 border-b border-white/[0.06]">
          <span className={`text-zinc-500 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1 ${isPhoneDevice ? 'text-sm' : 'text-xs'}`}>
            <Calendar className={`${isPhoneDevice ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-red-500`} />
            <span>Filter Day:</span>
          </span>

          {/* All Drops */}
          <button
            onClick={() => setSelectedDayFilter('all')}
            className={`rounded-xl font-black transition-all shrink-0 cursor-pointer ${
              isPhoneDevice ? 'px-5 py-2.5 text-sm' : 'px-3 py-1.5 text-xs'
            } ${
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
            className={`rounded-xl font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              isPhoneDevice ? 'px-5 py-2.5 text-sm' : 'px-3.5 py-1.5 text-xs'
            } ${
              selectedDayFilter === 'today'
                ? 'bg-gradient-to-r from-[#e50914] via-[#ff2b54] to-[#ec4899] text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] border border-red-400/50 scale-105'
                : 'bg-gradient-to-r from-[#e50914]/15 via-[#ff2b54]/15 to-[#ec4899]/15 hover:from-[#e50914]/25 hover:to-[#ec4899]/25 border border-rose-500/35 text-rose-200'
            }`}
          >
            <span className="animate-pulse">🔥</span>
            <span>Dropping Today ({todayDroppingCount})</span>
          </button>

          {/* Individual Day Buttons: Mon - Sun */}
          {DAYS_ORDER.map((day) => {
            const isToday = day === todayShort;
            const isSelected = selectedDayFilter === day;
            const dayCount = weekendDramas.filter((d) => isDramaAiringOnDayActive(d, day)).length;

            return (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isPhoneDevice ? 'px-5 py-2.5 text-sm font-black' : 'px-3 py-1.5 text-xs font-bold'
                } ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white shadow-[0_0_14px_rgba(229,9,20,0.55)] border border-red-400/40 scale-105'
                    : isToday
                    ? 'bg-rose-500/15 text-rose-200 border border-rose-500/40 hover:bg-rose-500/25 font-black'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className={`bg-[#e50914] text-white px-1.5 py-0.2 rounded font-black shadow-[0_0_8px_rgba(229,9,20,0.5)] ${isPhoneDevice ? 'text-[10px]' : 'text-[9px]'}`}>
                    Today
                  </span>
                )}
                {dayCount > 0 && <span className={`${isPhoneDevice ? 'text-xs' : 'text-[10px]'} opacity-75`}>({dayCount})</span>}
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
                const droppingToday = isDramaAiringTodayActive(drama);
                const hasComingSoonAudios = Boolean(drama.comingSoonAudios && drama.comingSoonAudios.length > 0);
                
                // Prioritize Coming Soon audio track if it has upcoming audios
                const effectiveAudio = hasComingSoonAudios && drama.comingSoonAudios
                  ? drama.comingSoonAudios[0]
                  : drama.defaultAudio;
                
                const audioLabel = effectiveAudio === 'Hindi Dubbed' 
                  ? '🔊 IN HINDI' 
                  : effectiveAudio === 'Hindi Fan Dubbed' 
                  ? '🎙️ HINDI FAN DUB' 
                  : '🌐 ORIG / ENG SUB';

                const audioBadgeColor = effectiveAudio === 'Hindi Dubbed'
                  ? 'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white border-red-400/40'
                  : effectiveAudio === 'Hindi Fan Dubbed'
                  ? 'bg-gradient-to-r from-[#9333ea] to-[#ec4899] text-white border-purple-400/40'
                  : 'bg-gradient-to-r from-[#0284c7] to-[#2563eb] text-white border-sky-400/40';

                const ageInfo = getAgeRatingMeta(drama.ageRating);

                return (
                  <div
                    key={drama.id}
                    className={`shrink-0 snap-start bg-gradient-to-b from-[#13141c] to-[#0b0c12] rounded-2xl border ott-card-elevate flex flex-col justify-between overflow-hidden group ${
                      isPhoneDevice
                        ? 'w-[312px] min-w-[312px] h-[600px]'
                        : 'w-[232px] sm:w-[252px] h-[465px]'
                    } ${
                      droppingToday
                        ? 'border-rose-500/45 shadow-[0_0_22px_rgba(229,9,20,0.18)] hover:border-[#ff2b54]/80'
                        : 'border-white/[0.08] hover:border-[#e50914]/70'
                    }`}
                  >
                    {/* Locked-Height Poster Area */}
                    <div
                      onClick={() => onSelectDrama(drama)}
                      className={`relative w-full shrink-0 overflow-hidden bg-zinc-900 cursor-pointer ${
                        isPhoneDevice ? 'h-[360px]' : 'h-[240px]'
                      }`}
                    >
                      <img
                        src={drama.poster}
                        alt={drama.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#090a10] via-[#090a10]/30 to-transparent" />

                      {/* Top Left of Poster: Rank badge + Audio badge */}
                      <div className={`absolute top-2.5 left-2.5 flex flex-col items-start z-10 pointer-events-none ${isPhoneDevice ? 'gap-1.5' : 'gap-1'}`}>
                        {idx === 0 ? (
                          <span className={`bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black uppercase tracking-wider rounded shadow-lg ${isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-2 py-0.5'}`}>
                            👑 TOP 1
                          </span>
                        ) : (
                          <span className={`bg-black/80 text-zinc-200 border border-white/15 font-black rounded shadow ${isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-1.5 py-0.5'}`}>
                            #{idx + 1}
                          </span>
                        )}
                        <span className={`${audioBadgeColor} font-black uppercase tracking-wider rounded shadow border ${isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-1.5 py-0.5'}`}>
                          {audioLabel}
                        </span>
                      </div>

                      {/* Top Right of Poster: Watchlist Bookmark + Automatic 18+ Seal directly below */}
                      <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(drama);
                          }}
                          className={`rounded-full backdrop-blur-md border transition-all cursor-pointer flex items-center justify-center ${
                            isPhoneDevice ? 'w-10 h-10' : 'p-1.5'
                          } ${
                            isWatchlisted(drama.id)
                              ? 'bg-amber-500/90 border-amber-300 text-black shadow-lg'
                              : 'bg-black/60 border-white/20 text-white hover:bg-[#e50914] hover:border-[#e50914]'
                          }`}
                          title={isWatchlisted(drama.id) ? 'In Watchlist' : 'Add to Watchlist'}
                        >
                          {isWatchlisted(drama.id) ? (
                            <BookmarkCheck className={isPhoneDevice ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                          ) : (
                            <Bookmark className={isPhoneDevice ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                          )}
                        </button>

                        {ageInfo.is18Plus && (
                          <span className={`bg-[#e50914] text-white font-black rounded-md border border-white/30 shadow-[0_0_12px_rgba(229,9,20,0.8)] tracking-tighter pointer-events-none ${isPhoneDevice ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'}`}>
                            18+
                          </span>
                        )}
                      </div>

                      {/* Bottom of Poster: Exact StatusText on Left & Rating on Right */}
                      <div className={`absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none ${isPhoneDevice ? 'text-xs' : 'text-[10px]'}`}>
                        <div className={`flex items-center gap-1.5 bg-black/85 backdrop-blur-md rounded-full border border-white/15 text-white font-bold ${isPhoneDevice ? 'px-3 py-1 max-w-[205px]' : 'px-2.5 py-0.5 max-w-[155px]'}`}>
                          {hasComingSoonAudios ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0 animate-pulse" />
                              <span className={`truncate text-amber-300 ${isPhoneDevice ? 'text-xs font-bold' : 'text-[9px] sm:text-[10px] font-extrabold'}`}>
                                ⏳ Coming Soon
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse shrink-0" />
                              <span className={`truncate text-sky-300 ${isPhoneDevice ? 'text-xs font-bold' : 'text-[9px] sm:text-[10px] font-extrabold'}`}>
                                {drama.statusText || 'Now Streaming'}
                              </span>
                            </>
                          )}
                        </div>

                        <span className={`bg-black/85 backdrop-blur-md text-amber-300 rounded border border-amber-500/25 shrink-0 flex items-center gap-0.5 ${isPhoneDevice ? 'text-xs px-3 py-1 font-bold' : 'px-1.5 py-0.5 font-black'}`}>
                          ★ {drama.rating}
                        </span>
                      </div>
                    </div>

                    {/* Locked-Height Info Area */}
                    <div className={`flex-1 min-h-0 flex flex-col justify-between gap-1.5 bg-gradient-to-b from-[#11121a] to-[#0a0b10] ${isPhoneDevice ? 'p-4' : 'p-3.5'}`}>
                      <div className="space-y-1.5 min-w-0">
                        <h3
                          onClick={() => onSelectDrama(drama)}
                          className={`text-white hover:text-[#ff2b54] transition-colors truncate cursor-pointer leading-tight ${
                            isPhoneDevice ? 'text-lg font-black' : 'text-[13.5px] font-extrabold'
                          }`}
                          title={drama.title}
                        >
                          {drama.title}
                        </h3>

                        {/* Fixed-Height Cyber-Glass Schedule Pod Container */}
                        <div
                          className={`${isPhoneDevice ? 'h-[108px]' : 'h-[96px]'} overflow-y-auto no-scrollbar flex flex-col ${
                            (drama.activeTrackSchedules?.length || 0) <= 1 ? 'justify-center' : 'justify-start'
                          } gap-1.5`}
                        >
                          {drama.activeTrackSchedules && drama.activeTrackSchedules.length > 0 ? (
                            drama.activeTrackSchedules.map((track) => {
                              const trackToday = isAiringToday(track.scheduleText);
                              const podTheme =
                                track.key === 't1'
                                  ? {
                                      box: 'bg-gradient-to-br from-[#e50914]/15 via-[#161119]/90 to-[#0e0f17] border-red-500/35',
                                      labelColor: 'text-rose-300',
                                      bar: 'bg-gradient-to-r from-[#e50914] to-[#ff2b54]',
                                      icon: '🔊',
                                      name: 'Hindi Dub',
                                    }
                                  : track.key === 't2'
                                  ? {
                                      box: 'bg-gradient-to-br from-purple-600/15 via-[#15111c]/90 to-[#0e0f17] border-purple-500/35',
                                      labelColor: 'text-purple-300',
                                      bar: 'bg-gradient-to-r from-[#9333ea] to-[#ec4899]',
                                      icon: '🎙️',
                                      name: 'Fan Dub',
                                    }
                                  : {
                                      box: 'bg-gradient-to-br from-sky-500/15 via-[#101622]/90 to-[#0e0f17] border-sky-500/35',
                                      labelColor: 'text-sky-300',
                                      bar: 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]',
                                      icon: '💬',
                                      name: 'Original',
                                    };

                              const progressLabel = track.isComingSoon
                                ? '⏳ Coming Soon'
                                : track.totalEp > 0
                                ? `Ep ${track.currentEp} / ${track.totalEp}`
                                : track.currentEp > 0
                                ? `Ep ${track.currentEp}`
                                : 'Ongoing';

                              const progressPct =
                                track.currentEp > 0 && track.totalEp > 0
                                  ? Math.min(100, Math.round((track.currentEp / track.totalEp) * 100))
                                  : 0;

                              return (
                                <div
                                  key={track.key}
                                  className={`rounded-xl border px-2.5 py-1.5 backdrop-blur-md transition-all space-y-0.5 shrink-0 ${podTheme.box} ${
                                    trackToday ? 'ring-1 ring-rose-500/40 shadow-[0_0_12px_rgba(229,9,20,0.2)]' : ''
                                  }`}
                                >
                                  {/* Line 1: Audio Track & Episode / TODAY badge */}
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <span className={`tracking-wide flex items-center gap-1 ${podTheme.labelColor} ${isPhoneDevice ? 'text-xs font-extrabold' : 'text-[10px] font-black'}`}>
                                      <span>{podTheme.icon}</span>
                                      <span>{podTheme.name}</span>
                                    </span>

                                    <div className="flex items-center gap-1">
                                      <span className={`font-bold px-1.5 py-0.2 rounded bg-black/50 border border-white/10 text-zinc-200 ${isPhoneDevice ? 'text-[11px]' : 'text-[9px]'}`}>
                                        {progressLabel}
                                      </span>
                                      {trackToday && (
                                        <span className={`bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white font-black px-1.5 py-0.2 rounded shadow-[0_0_8px_rgba(229,9,20,0.6)] animate-pulse ${isPhoneDevice ? 'text-[10px]' : 'text-[8.5px]'}`}>
                                          ⚡ TODAY
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Line 2: Full Untruncated Schedule Text */}
                                  <div className={`tracking-wide leading-snug text-white break-words ${isPhoneDevice ? 'text-xs font-black' : 'text-[10.5px] font-extrabold'}`}>
                                    🗓️ {track.scheduleText}
                                  </div>

                                  {/* Episode Progress Bar */}
                                  {progressPct > 0 && (
                                    <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden mt-0.5">
                                      <div
                                        className={`h-full rounded-full ${podTheme.bar}`}
                                        style={{ width: `${progressPct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-[#e50914]/15 via-[#15121a]/90 to-[#0e0f17] px-2.5 py-2 space-y-1 shrink-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-rose-300 ${isPhoneDevice ? 'text-xs font-extrabold' : 'text-[10px] font-black'}`}>📅 Release Schedule</span>
                                {droppingToday && (
                                  <span className={`bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(229,9,20,0.6)] animate-pulse ${isPhoneDevice ? 'text-[10px]' : 'text-[9px]'}`}>
                                    ⚡ TODAY
                                  </span>
                                )}
                              </div>
                              <div className={`tracking-wide leading-snug text-white break-words ${isPhoneDevice ? 'text-xs font-black' : 'text-[11px] font-extrabold'}`}>
                                🗓️ {drama.schedule || 'Weekly Drop'}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Clean Borderless OTT Metadata with Color-Coded Age Rating */}
                        <div className="space-y-1 pt-0.5">
                          <div className={`flex items-center gap-1.5 text-zinc-400 min-w-0 ${isPhoneDevice ? 'text-xs font-bold' : 'text-[11px] font-semibold'}`}>
                            <span className="text-sky-400 font-bold truncate">{drama.details || '10 Episodes'}</span>
                            <span className="shrink-0">•</span>
                            <span className={`rounded font-black shrink-0 ${ageInfo.pillClass} ${isPhoneDevice ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.2 text-[9.5px]'}`}>
                              {ageInfo.label}
                            </span>
                            <span className="shrink-0">•</span>
                            <span className="text-zinc-200 shrink-0">{drama.releaseYear}</span>
                          </div>
                          <p className={`text-zinc-400 truncate ${isPhoneDevice ? 'text-xs' : 'text-[10.5px]'}`}>
                            {drama.subCategory ? `✨ ${drama.subCategory}` : `${drama.category} • VIP Release`}
                          </p>
                        </div>
                      </div>

                      {/* Pinned Action Buttons */}
                      <div className={`grid grid-cols-2 pt-1 mt-auto ${isPhoneDevice ? 'gap-2.5' : 'gap-1.5'}`}>
                        <button
                          onClick={() => onSelectDrama(drama)}
                          className={`w-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isPhoneDevice ? 'py-3 px-3 rounded-xl text-sm font-black' : 'py-1.5 px-2 rounded-lg text-xs font-bold'
                          }`}
                        >
                          <Play className={`${isPhoneDevice ? 'w-4 h-4' : 'w-3 h-3'} text-red-400 fill-red-400`} />
                          <span>Episodes</span>
                        </button>

                        <a
                          href={drama.telegramHindi || drama.telegramFanDub || drama.telegramOrig || drama.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-center shadow-[0_0_12px_rgba(229,9,20,0.4)] hover:shadow-[0_0_16px_rgba(229,9,20,0.65)] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isPhoneDevice ? 'py-3 px-3 rounded-xl text-sm font-black' : 'py-1.5 px-2 rounded-lg text-xs font-black'
                          }`}
                        >
                          <Send className={isPhoneDevice ? 'w-4 h-4' : 'w-3 h-3'} />
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
