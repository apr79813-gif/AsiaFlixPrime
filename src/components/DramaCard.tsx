import React from 'react';
import { DramaItem, AudioType } from '../types/drama';
import { Play, Bookmark, BookmarkCheck, Star, Send, Film, Clock, Calendar } from 'lucide-react';
import { isAiringToday } from '../services/scheduleHelper';

interface DramaCardProps {
  drama: DramaItem;
  onSelect: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: boolean;
  rank?: number;
  isTopOne?: boolean;
  activeAudioContext?: AudioType | string;
  isComingSoonContext?: boolean;
}

export const DramaCard: React.FC<DramaCardProps> = ({
  drama,
  onSelect,
  onToggleWatchlist,
  isWatchlisted,
  rank,
  isTopOne,
  activeAudioContext,
  isComingSoonContext = false,
}) => {
  const isRankOne = isTopOne || rank === 1 || drama.spotlightTag === 'TOP #1';
  const isToday = Boolean(drama.schedule && isAiringToday(drama.schedule));
  const isComingSoonActive = Boolean(
    isComingSoonContext || 
    drama.status === 'Coming Soon' || 
    (drama.statusText && drama.statusText.toLowerCase().includes('coming soon'))
  );

  const getStatusDotColor = () => {
    if (isComingSoonActive) return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
    const s = (drama.statusText || drama.status).toLowerCase();
    if (s.includes('completed') || s.includes('full')) return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
    if (s.includes('coming') || s.includes('upcoming')) return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
    return 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]';
  };

  const isMovie = drama.isMovie || 
    drama.category.toLowerCase().includes('movie') || 
    drama.category.toLowerCase().includes('bolly') || 
    drama.category.toLowerCase().includes('holly') ||
    Boolean(drama.details && (drama.details.includes(':') || drama.details.toLowerCase().includes('movie')));

  // Determine active telegram URL based on context or available links
  const primaryTelegram = drama.telegramHindi || drama.telegramFanDub || drama.telegramOrig || drama.telegramUrl || 'https://t.me/+yJH68LvfrT9hZDVl';

  // Context-aware active audio determination
  const normCtx = (activeAudioContext || '').toLowerCase();
  const hasHindi = Boolean(
    (drama.telegramHindi && drama.telegramHindi.toLowerCase().includes('http')) ||
    drama.availableAudios?.some((a) => a.toLowerCase().includes('hindi') && !a.toLowerCase().includes('fan'))
  );
  const hasFanDub = Boolean(
    (drama.telegramFanDub && drama.telegramFanDub.toLowerCase().includes('http')) ||
    drama.availableAudios?.some((a) => a.toLowerCase().includes('fan'))
  );
  const hasOrig = Boolean(
    (drama.telegramOrig && drama.telegramOrig.toLowerCase().includes('http')) ||
    drama.availableAudios?.some((a) => a.toLowerCase().includes('orig') || a.toLowerCase().includes('sub'))
  );

  let displayAudio: 'Hindi Dubbed' | 'Hindi Fan Dubbed' | 'Original / Eng Sub' = 'Hindi Dubbed';

  if (isComingSoonActive && drama.comingSoonAudios && drama.comingSoonAudios.length > 0) {
    // In Coming Soon context: MUST ONLY show the coming soon audio, NEVER the completed defaultAudio!
    const csAudio = drama.comingSoonAudios[0];
    if (csAudio === 'Hindi Fan Dubbed' || csAudio === 'Fan Dubbed') {
      displayAudio = 'Hindi Fan Dubbed';
    } else if (csAudio === 'Original / Eng Sub') {
      displayAudio = 'Original / Eng Sub';
    } else {
      displayAudio = 'Hindi Dubbed';
    }
  } else if (normCtx.includes('hindi') && !normCtx.includes('fan') && hasHindi) {
    displayAudio = 'Hindi Dubbed';
  } else if (normCtx.includes('fan') && hasFanDub) {
    displayAudio = 'Hindi Fan Dubbed';
  } else if ((normCtx.includes('orig') || normCtx.includes('eng')) && hasOrig) {
    displayAudio = 'Original / Eng Sub';
  } else {
    // Fallback to drama.defaultAudio or what's actually available
    const def = (drama.defaultAudio || '').toLowerCase();
    if (def.includes('fan') && hasFanDub) {
      displayAudio = 'Hindi Fan Dubbed';
    } else if ((def.includes('orig') || def.includes('sub')) && hasOrig) {
      displayAudio = 'Original / Eng Sub';
    } else if (hasHindi) {
      displayAudio = 'Hindi Dubbed';
    } else if (hasFanDub) {
      displayAudio = 'Hindi Fan Dubbed';
    } else if (hasOrig) {
      displayAudio = 'Original / Eng Sub';
    } else if (drama.comingSoonAudios && drama.comingSoonAudios.length > 0) {
      const cs = drama.comingSoonAudios[0];
      displayAudio = (cs === 'Hindi Fan Dubbed' || cs === 'Fan Dubbed') ? 'Hindi Fan Dubbed' : cs === 'Original / Eng Sub' ? 'Original / Eng Sub' : 'Hindi Dubbed';
    } else {
      displayAudio = 'Hindi Dubbed';
    }
  }

  // Audio badge styling configuration (3 distinct, high-contrast themes)
  const audioBadgeConfig = displayAudio === 'Hindi Fan Dubbed'
    ? {
        label: '🎙️ HINDI FAN DUB',
        className: 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#ec4899] text-white border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.5)]',
      }
    : displayAudio === 'Original / Eng Sub'
    ? {
        label: '💬 ORIGINAL / ENG SUB',
        className: 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#2563eb] text-white border-sky-400/40 shadow-[0_0_12px_rgba(14,165,233,0.5)]',
      }
    : {
        label: '🔊 IN HINDI',
        className: 'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white border-red-400/40 shadow-[0_0_12px_rgba(229,9,20,0.5)]',
      };

  return (
    <div className="group relative bg-[#111218] rounded-xl border border-white/[0.08] hover:border-[#e50914]/60 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_12px_30px_rgba(0,0,0,0.8)] hover:-translate-y-1">
      {/* Poster Container */}
      <div 
        onClick={() => onSelect(drama)}
        className="relative w-full aspect-[2/3] overflow-hidden bg-zinc-900 cursor-pointer"
      >
        <img
          src={drama.poster}
          alt={drama.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700";
          }}
        />

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111218] via-transparent to-black/50 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top-Left of Poster: Only #1 badge (if rank 1) & Primary Audio pill in signature color */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none z-10">
          {isRankOne && (
            <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg flex items-center gap-0.5 pointer-events-auto shadow-amber-500/40 animate-pulse">
              👑 TOP 1
            </span>
          )}
          <span className={`${audioBadgeConfig.className} text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md pointer-events-auto flex items-center gap-1`}>
            {audioBadgeConfig.label}
          </span>
        </div>

        {/* Top-Right of Poster: ONLY Watchlist Bookmark button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist(drama);
          }}
          className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-lg backdrop-blur-md border transition-all z-20 ${
            isWatchlisted
              ? 'bg-amber-500/80 border-amber-400 text-black shadow-lg opacity-100'
              : 'bg-black/60 border-white/20 text-white hover:bg-[#e50914] hover:border-[#e50914] opacity-80 group-hover:opacity-100'
          }`}
          title={isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
        >
          {isWatchlisted ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom of Poster: Glowing Status pill on Left, Star Rating on Right */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] sm:text-[11px] pointer-events-none z-10">
          <div className="flex items-center gap-1.5 bg-black/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 text-white font-bold max-w-[160px] sm:max-w-[185px]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor()}`} />
            <span className="text-[9px] sm:text-[10px] truncate text-emerald-300 font-extrabold">
              {isComingSoonActive ? 'Coming Soon' : (drama.statusText || drama.status.replace(/ \(.*\)/, ''))}
            </span>
          </div>

          <span className="bg-black/90 backdrop-blur-md text-amber-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-white/15 flex items-center gap-0.5 shrink-0">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            <span>{drama.rating}</span>
          </span>
        </div>
      </div>

      {/* Card Body Container */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-1.5">
          {/* Drama Title */}
          <h3 
            onClick={() => onSelect(drama)}
            className="text-xs sm:text-sm font-black text-white hover:text-red-400 transition-colors line-clamp-1 cursor-pointer" 
            title={drama.title}
          >
            {drama.title}
          </h3>

          {/* Neon Glass Schedule Pod (Per-Track Active Schedules) */}
          {drama.activeTrackSchedules && drama.activeTrackSchedules.length > 0 && (
            <div className="flex flex-col gap-1">
              {drama.activeTrackSchedules.map((track) => {
                const trackToday = isAiringToday(track.scheduleText);
                const colorCls =
                  track.key === 't1'
                    ? 'bg-red-500/15 border-red-500/35 text-red-200'
                    : track.key === 't2'
                    ? 'bg-purple-500/15 border-purple-500/35 text-purple-200'
                    : 'bg-sky-500/15 border-sky-500/35 text-sky-200';
                const icon = track.key === 't1' ? '🔊' : track.key === 't2' ? '🎙️' : '💬';
                const epLabel = track.isComingSoon
                  ? 'Soon'
                  : track.totalEp > 0
                  ? `Ep ${track.currentEp}/${track.totalEp}`
                  : `Ep ${track.currentEp}`;

                return (
                  <div
                    key={track.key}
                    className={`flex items-center justify-between gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-sm ${colorCls}`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="shrink-0">{icon}</span>
                      <span className="truncate font-extrabold">{track.shortLabel}</span>
                      <span className="opacity-80 shrink-0 text-[9px]">({epLabel})</span>
                      <span className="opacity-60 shrink-0">•</span>
                      <span className="truncate text-white/95">🗓️ {track.scheduleText}</span>
                    </div>
                    {trackToday && (
                      <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse">
                        🔥 TODAY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Metadata Row: Category, Age Rating, Release Year */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 flex-wrap">
            <span className="bg-white/10 text-white px-1.5 py-0.2 rounded font-bold">
              {drama.category}
            </span>
            {drama.ageRating && (
              <span className="bg-black/80 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-black text-[9px]">
                {drama.ageRating}
              </span>
            )}
            <span className="text-zinc-500 font-bold">{drama.releaseYear}</span>
          </div>

          {/* Clean Genre / SubCategory Tags in Card Body */}
          {drama.subCategory && (
            <p className="text-[11px] text-zinc-300 font-medium line-clamp-1">
              ✨ {drama.subCategory}
            </p>
          )}

          {/* Exact Details & Audio Availability Pills */}
          <div className="flex items-center justify-between gap-1 pt-1 flex-wrap text-[10px]">
            {drama.details ? (
              <span className="text-sky-400 font-bold flex items-center gap-1 truncate max-w-[110px]">
                {isMovie ? <Film className="w-2.5 h-2.5 shrink-0" /> : <Clock className="w-2.5 h-2.5 shrink-0" />}
                <span className="truncate">{drama.details}</span>
              </span>
            ) : (
              <span className="text-zinc-500 font-medium">{isMovie ? 'Movie' : 'Series'}</span>
            )}

            {/* Audio Track Indicators in signature high-contrast color themes */}
            <div className="flex items-center gap-1 shrink-0">
              {isComingSoonActive ? (
                // In Coming Soon context: ONLY show what is Coming Soon
                drama.comingSoonAudios && drama.comingSoonAudios.length > 0 ? (
                  drama.comingSoonAudios.map((audio) => {
                    const label = audio === 'Hindi Dubbed' ? '⏳ Hindi Soon' : audio === 'Hindi Fan Dubbed' ? '⏳ Fan Soon' : '⏳ Orig Soon';
                    const colorClass = audio === 'Hindi Dubbed'
                      ? 'bg-gradient-to-r from-red-600/30 to-amber-600/30 text-amber-200 border-amber-500/50'
                      : audio === 'Hindi Fan Dubbed'
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-pink-200 border-purple-500/50'
                      : 'bg-gradient-to-r from-sky-600/30 to-blue-600/30 text-sky-200 border-sky-500/50';
                    return (
                      <span key={audio} className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide border shadow-sm ${colorClass}`}>
                        {label}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                    ⏳ Coming Soon
                  </span>
                )
              ) : (
                // Normal Streaming Context
                <>
                  {drama.telegramHindi && (
                    <span className="text-[9px] bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white border border-red-400/40 shadow-[0_0_8px_rgba(229,9,20,0.4)] px-1.5 py-0.5 rounded font-black tracking-wide" title="Hindi Dubbed Live">
                      Hindi
                    </span>
                  )}
                  {drama.telegramFanDub && (
                    <span className="text-[9px] bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#ec4899] text-white border border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.4)] px-1.5 py-0.5 rounded font-black tracking-wide" title="Hindi Fan Dubbed Live">
                      Fan Dub
                    </span>
                  )}
                  {drama.telegramOrig && (
                    <span className="text-[9px] bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#2563eb] text-white border border-sky-400/40 shadow-[0_0_8px_rgba(14,165,233,0.4)] px-1.5 py-0.5 rounded font-black tracking-wide" title="Original / Eng Sub Live">
                      Orig
                    </span>
                  )}
                  {drama.comingSoonAudios && drama.comingSoonAudios.length > 0 && (
                    drama.comingSoonAudios.map((aud) => (
                      <span key={aud} className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.5 rounded font-bold" title={`${aud} Coming Soon`}>
                        {aud === 'Hindi Dubbed' ? '⏳ Hindi Soon' : aud === 'Hindi Fan Dubbed' ? '⏳ Fan Soon' : '⏳ Orig Soon'}
                      </span>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1 mt-auto">
          <button
            onClick={() => onSelect(drama)}
            className="w-full py-1.5 px-1 sm:px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-bold border border-white/10 text-center transition-all flex items-center justify-center gap-1"
          >
            <span>{isMovie ? 'Details' : 'Episodes'}</span>
          </button>

          <a
            href={primaryTelegram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full py-1.5 px-1 sm:px-2 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black text-center shadow-md hover:shadow-[0_0_12px_rgba(229,9,20,0.6)] transition-all flex items-center justify-center gap-1 truncate"
            title="Stream / Open Telegram Link"
          >
            <Send className="w-3 h-3 shrink-0" />
            <span className="truncate">{isMovie ? 'Movie' : 'Stream'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
