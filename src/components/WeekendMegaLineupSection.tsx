import React from 'react';
import { DramaItem } from '../types/drama';
import { Calendar, Flame, Sparkles, Send, Play, Settings, Clock, ArrowRight } from 'lucide-react';

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
  announcementText = 'Weekend Mega Lineup is Active! New Hindi Dubbed Episodes Dropping Sat & Sun 7:00 PM IST • Zero Ads.',
  timingText = 'Sat & Sun 7:00 PM IST Mega Drops',
  isActive = true,
  isAdminAuthenticated,
}) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-10">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1c0f14] via-[#12131a] to-[#0a0a0f] border border-[#e50914]/30 shadow-[0_10px_40px_rgba(229,9,20,0.15)] p-5 sm:p-7">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white shadow-md">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
                {isActive ? 'Weekend Mega Drops Active' : 'Upcoming Weekend Drops'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Clock className="w-3 h-3 text-amber-400" />
                {timingText}
              </span>
              <span className="text-xs text-zinc-400 hidden lg:inline">
                • 100% Free VIP Private Channel
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>🌸 Weekend Mega Lineup</span>
              <span className="text-xs font-bold text-zinc-400 bg-white/10 px-2 py-0.5 rounded-md hidden sm:inline">
                {weekendDramas.length} Curated Titles
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              {announcementText}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdminAuthenticated && (
              <button
                onClick={onOpenAdminWeekend}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-red-500/40 text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-2 transition-all shadow-sm group"
                title="Change titles, timings & announcement in Weekend Lineup"
              >
                <Settings className="w-3.5 h-3.5 text-red-400 group-hover:rotate-45 transition-transform" />
                <span>Curate Lineup</span>
              </button>
            )}
            <a
              href="https://t.me/+yJH68LvfrT9hZDVl"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>VIP Channel</span>
            </a>
          </div>
        </div>

        {/* Curated Titles Carousel / Cards */}
        {weekendDramas.length === 0 ? (
          <div className="py-12 text-center bg-black/30 rounded-2xl border border-white/5 p-6">
            <p className="text-sm font-bold text-zinc-300">New weekend episodes dropping this Saturday & Sunday 7:00 PM IST.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Stay tuned on AsiaFlix Prime VIP Private Channel!
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-red-600/40 scrollbar-track-transparent snap-x">
              {weekendDramas.map((drama, idx) => (
                <div
                  key={drama.id}
                  className="w-[200px] sm:w-[220px] shrink-0 snap-start bg-[#14151f] rounded-2xl border border-white/[0.08] hover:border-[#e50914]/60 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_12px_30px_rgba(0,0,0,0.9)] hover:-translate-y-1 group"
                >
                  {/* Poster Area */}
                  <div
                    onClick={() => onSelectDrama(drama)}
                    className="relative w-full aspect-[2/3] overflow-hidden bg-zinc-900 cursor-pointer"
                  >
                    <img
                      src={drama.poster}
                      alt={drama.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#14151f] via-transparent to-black/50" />

                    {/* Weekend Slot Tag (Top Left) */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                      {idx === 0 ? (
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-lg animate-pulse">
                          👑 TOP 1
                        </span>
                      ) : (
                        <span className="bg-black/80 text-amber-300 border border-amber-500/30 font-bold text-[9px] px-1.5 py-0.2 rounded shadow">
                          #{idx + 1}
                        </span>
                      )}
                      <span className="bg-gradient-to-r from-amber-500 to-red-600 text-black font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-lg">
                        {drama.weekendSlot || drama.scheduleInfo || 'Weekend Drop'}
                      </span>
                      <span className="bg-[#e50914] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
                        {drama.defaultAudio}
                      </span>
                    </div>

                    {/* Category (Top Right) */}
                    <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded border border-white/10">
                      {drama.category}
                    </span>

                    {/* Status row at bottom of poster */}
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px]">
                      <span className="bg-black/80 backdrop-blur-md text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="truncate max-w-[100px]">{drama.statusText || 'FHD 1080p'}</span>
                      </span>
                      <span className="bg-black/80 backdrop-blur-md text-amber-300 font-black px-1.5 py-0.5 rounded border border-white/10">
                        ★ {drama.rating}
                      </span>
                    </div>
                  </div>

                  {/* Info Area */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                    <div>
                      <h3
                        onClick={() => onSelectDrama(drama)}
                        className="text-xs sm:text-sm font-black text-white hover:text-red-400 transition-colors line-clamp-1 cursor-pointer"
                        title={drama.title}
                      >
                        {drama.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5 truncate">
                        {drama.details && (
                          <span className="text-sky-400 font-bold">{drama.details}</span>
                        )}
                        {drama.details && (drama.schedule || drama.scheduleInfo) && <span>·</span>}
                        <span className="truncate">{drama.schedule || drama.scheduleInfo || 'Weekend Mega Drop'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => onSelectDrama(drama)}
                        className="w-full py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-1"
                      >
                        <Play className="w-3 h-3 text-red-400 fill-red-400" />
                        <span>Episodes</span>
                      </button>

                      <a
                        href={drama.telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 px-2 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black text-center shadow transition-all flex items-center justify-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Telegram</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
