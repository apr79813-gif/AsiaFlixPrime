import React from 'react';
import { DramaItem, AudioType } from '../types/drama';
import { Play, Bookmark, BookmarkCheck, Star, Send } from 'lucide-react';
import { getAgeRatingMeta } from '../services/ageRatingHelper';

interface DramaCardProps {
  drama: DramaItem;
  onSelect: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: boolean;
  rank?: number;
  isTopOne?: boolean;
  activeAudioContext?: AudioType | string;
  isComingSoonContext?: boolean;
  isPhoneDevice?: boolean;
  isGrid?: boolean;
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
  isPhoneDevice = false,
  isGrid = false,
}) => {
  const isRankOne = isTopOne || rank === 1 || drama.spotlightTag === 'TOP #1';
  const showRankBadge = isRankOne || (typeof rank === 'number' && rank >= 2 && rank <= 10);

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

  const isMovie =
    drama.isMovie ||
    drama.category.toLowerCase().includes('movie') ||
    drama.category.toLowerCase().includes('bolly') ||
    drama.category.toLowerCase().includes('holly') ||
    Boolean(drama.details && (drama.details.includes(':') || drama.details.toLowerCase().includes('movie')));

  // Compute ongoing episode progress for bottom-edge neon poster bar
  let maxEp = 0;
  if (drama.activeTrackSchedules && drama.activeTrackSchedules.length > 0) {
    maxEp = Math.max(...drama.activeTrackSchedules.map((t) => t.currentEp || 0), 0);
  }
  if (maxEp === 0 && drama.episodes && drama.episodes.length > 0) {
    for (const ep of drama.episodes) {
      if (typeof ep.episodeNumber === 'number' && ep.episodeNumber > maxEp) {
        maxEp = ep.episodeNumber;
      } else if (typeof ep.episodeNumber === 'string') {
        const range = ep.episodeNumber.match(/(\d+)\s*-\s*(\d+)/);
        if (range) {
          const end = parseInt(range[2], 10);
          if (end > maxEp) maxEp = end;
        } else {
          const single = ep.episodeNumber.match(/(\d+)/);
          if (single) {
            const num = parseInt(single[1], 10);
            if (num > maxEp) maxEp = num;
          }
        }
      }
    }
  }
  if (maxEp === 0 && drama.statusText) {
    const statusEpMatch = drama.statusText.match(/ep\s*(\d+)/i);
    if (statusEpMatch) maxEp = parseInt(statusEpMatch[1], 10);
  }

  let totalEp = drama.totalEpisodes || 0;
  if (totalEp === 0 && drama.details) {
    const detEpMatch = drama.details.match(/(\d+)\s*(?:ep|episode)/i);
    if (detEpMatch) totalEp = parseInt(detEpMatch[1], 10);
  }

  const isCompletedStatus =
    drama.status.toLowerCase().includes('completed') ||
    (drama.statusText && drama.statusText.toLowerCase().includes('completed'));

  const showOngoingProgress =
    !isComingSoonActive && !isCompletedStatus && !isMovie && maxEp > 0 && totalEp > 0 && maxEp < totalEp;
  const ongoingProgressPct = showOngoingProgress
    ? Math.min(96, Math.max(8, Math.round((maxEp / totalEp) * 100)))
    : 0;

  // Determine active telegram URL based on context or available links
  const primaryTelegram =
    drama.telegramHindi ||
    drama.telegramFanDub ||
    drama.telegramOrig ||
    drama.telegramUrl ||
    'https://t.me/+yJH68LvfrT9hZDVl';

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
      displayAudio =
        cs === 'Hindi Fan Dubbed' || cs === 'Fan Dubbed'
          ? 'Hindi Fan Dubbed'
          : cs === 'Original / Eng Sub'
          ? 'Original / Eng Sub'
          : 'Hindi Dubbed';
    }
  }

  const audioBadgeConfig =
    displayAudio === 'Hindi Fan Dubbed'
      ? {
          label: '🎙️ HINDI FAN DUB',
          className:
            'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#ec4899] text-white border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.45)]',
        }
      : displayAudio === 'Original / Eng Sub'
      ? {
          label: '💬 ORIG / ENG SUB',
          className:
            'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#2563eb] text-white border border-sky-400/40 shadow-[0_0_12px_rgba(14,165,233,0.45)]',
        }
      : {
          label: '🔊 IN HINDI',
          className:
            'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white border border-red-400/40 shadow-[0_0_12px_rgba(229,9,20,0.45)]',
        };

  const categoryLabel = drama.category;
  const ageInfo = getAgeRatingMeta(drama.ageRating);
  const detailsDisplay = drama.details
    ? isMovie || drama.details.includes(':')
      ? `⏱️ ${drama.details}`
      : `🎬 ${drama.details}`
    : isMovie
    ? '⏱️ Full Movie'
    : `🎬 ${drama.totalEpisodes || drama.episodes.length || 16} Episodes`;

  const inlineScheduleHint =
    drama.activeTrackSchedules && drama.activeTrackSchedules.length > 0
      ? drama.activeTrackSchedules[0].scheduleText
      : '';

  const cardSizeClass = isPhoneDevice
    ? `${isGrid ? 'w-full' : 'w-[312px] min-w-[312px]'} h-[550px]`
    : 'h-[405px]';

  return (
    <div
      className={`group relative ${cardSizeClass} bg-gradient-to-b from-[#11121a] to-[#0a0b10] rounded-2xl border border-white/[0.08] hover:border-[#e50914]/70 ott-card-elevate flex flex-col overflow-hidden`}
    >
      {/* Locked-Height Poster Area */}
      <div
        onClick={() => onSelect(drama)}
        className={`relative w-full shrink-0 overflow-hidden bg-zinc-900 cursor-pointer ${
          isPhoneDevice ? 'h-[360px]' : 'h-[255px]'
        }`}
      >
        <img
          src={drama.poster}
          alt={drama.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';
          }}
        />

        {/* Deep Bottom Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a10] via-[#090a10]/30 to-transparent" />

        {/* Top-Left: Rank Badge (#1 Gold or #2-#10 Glass) + Single Audio Badge */}
        <div
          className={`absolute top-2.5 left-2.5 flex flex-col items-start pointer-events-none z-10 ${
            isPhoneDevice ? 'gap-1.5' : 'gap-1'
          }`}
        >
          {showRankBadge &&
            (isRankOne ? (
              <span
                className={`bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black uppercase tracking-wider rounded shadow-lg shadow-amber-500/40 ${
                  isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-2 py-0.5'
                }`}
              >
                👑 TOP 1
              </span>
            ) : (
              <span
                className={`bg-black/75 backdrop-blur-md text-zinc-200 border border-white/15 font-black rounded shadow ${
                  isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-1.5 py-0.5'
                }`}
              >
                #{rank}
              </span>
            ))}
          <span
            className={`${audioBadgeConfig.className} font-black uppercase tracking-wider rounded shadow-md flex items-center gap-1 ${
              isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-2 py-0.5'
            }`}
          >
            {audioBadgeConfig.label}
          </span>
        </div>

        {/* Top-Right: Watchlist Bookmark Button + Automatic 18+ Seal directly below */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(drama);
            }}
            className={`rounded-full backdrop-blur-md border transition-all cursor-pointer flex items-center justify-center ${
              isPhoneDevice ? 'w-10 h-10' : 'p-1.5'
            } ${
              isWatchlisted
                ? 'bg-amber-500/90 border-amber-300 text-black shadow-lg opacity-100'
                : 'bg-black/60 border-white/20 text-white hover:bg-[#e50914] hover:border-[#e50914] opacity-85 group-hover:opacity-100'
            }`}
            title={isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
          >
            {isWatchlisted ? (
              <BookmarkCheck className={isPhoneDevice ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            ) : (
              <Bookmark className={isPhoneDevice ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            )}
          </button>

          {ageInfo.is18Plus && (
            <span
              className={`bg-[#e50914] text-white font-black rounded-md border border-white/30 shadow-[0_0_12px_rgba(229,9,20,0.8)] tracking-tighter pointer-events-none ${
                isPhoneDevice ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'
              }`}
            >
              18+
            </span>
          )}
        </div>

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className={`rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform ${
              isPhoneDevice ? 'w-14 h-14' : 'w-10 h-10'
            }`}
          >
            <Play className={`${isPhoneDevice ? 'w-7 h-7' : 'w-5 h-5'} fill-white ml-0.5`} />
          </div>
        </div>

        {/* Live Issue / Issue Fixed Poster Pill */}
        {(drama.issueFixedText || drama.issueText) && (
          <div
            className={`absolute left-2.5 right-2.5 flex items-center pointer-events-none z-10 ${
              isPhoneDevice ? 'bottom-11' : 'bottom-9'
            }`}
          >
            {drama.issueFixedText ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-black font-black uppercase tracking-wider border border-emerald-200/70 shadow-[0_0_14px_rgba(16,185,129,0.75)] ${
                  isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-2 py-0.5'
                }`}
              >
                ✅ ISSUE FIXED
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md text-black font-black uppercase tracking-wider border border-amber-200/70 shadow-[0_0_14px_rgba(245,158,11,0.75)] animate-pulse ${
                  isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[9px] px-2 py-0.5'
                }`}
              >
                ⚠️ FIXING ISSUE
              </span>
            )}
          </div>
        )}

        {/* Bottom of Poster: Left Status Pill & Right Gold Rating Pill */}
        <div
          className={`absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10 ${
            isPhoneDevice ? 'text-xs' : 'text-[10px]'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 bg-black/85 backdrop-blur-md rounded-full border border-white/15 text-white font-bold ${
              isPhoneDevice ? 'px-3 py-1 max-w-[205px]' : 'px-2 py-0.5 max-w-[130px] sm:max-w-[145px]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor()}`} />
            <span
              className={`truncate text-zinc-100 ${
                isPhoneDevice ? 'text-xs font-bold' : 'text-[9.5px] font-extrabold'
              }`}
            >
              {isComingSoonActive ? 'Coming Soon' : drama.statusText || drama.status.replace(/ \(.*\)/, '')}
            </span>
          </div>

          <span
            className={`bg-black/85 backdrop-blur-md text-amber-300 rounded border border-amber-500/25 flex items-center gap-1 shrink-0 ${
              isPhoneDevice ? 'text-xs px-3 py-1 font-bold' : 'font-black text-[9.5px] px-1.5 py-0.5 gap-0.5'
            }`}
          >
            <Star className={`${isPhoneDevice ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} fill-amber-400 text-amber-400`} />
            <span>{drama.rating}</span>
          </span>
        </div>

        {/* Bottom Edge Neon Progress Bar for Ongoing Series */}
        {showOngoingProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20">
            <div
              className="h-full bg-gradient-to-r from-[#e50914] via-[#ff2b54] to-[#a855f7] shadow-[0_0_8px_rgba(229,9,20,0.75)]"
              style={{ width: `${ongoingProgressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Symmetric Card Body (No Nested Gray Border Boxes) */}
      <div
        className={`flex-1 min-h-0 flex flex-col justify-between bg-gradient-to-b from-[#11121a] to-[#0a0b10] ${
          isPhoneDevice ? 'p-4' : 'p-3.5'
        }`}
      >
        <div className="min-w-0">
          {/* Row 1: Crisp Title */}
          <h3
            onClick={() => onSelect(drama)}
            className={`text-white truncate group-hover:text-[#ff2b54] transition-colors cursor-pointer leading-tight ${
              isPhoneDevice ? 'text-lg font-black' : 'text-[13.5px] font-extrabold'
            }`}
            title={drama.title}
          >
            {drama.title}
          </h3>

          {/* Row 2: Clean Dot-Separated OTT Metadata Line with Color-Coded Age Rating */}
          <div
            className={`flex items-center gap-1.5 min-w-0 ${
              isPhoneDevice ? 'text-sm font-bold text-zinc-300 mt-1.5' : 'text-[11px] font-semibold text-zinc-400 mt-1'
            }`}
          >
            <span className="text-zinc-200 truncate">{categoryLabel}</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0">{drama.releaseYear}</span>
            <span className="shrink-0">•</span>
            <span
              className={`rounded font-black shrink-0 ${ageInfo.pillClass} ${
                isPhoneDevice ? 'text-xs px-2.5 py-0.5' : 'text-[9.5px] px-1.5 py-0.2'
              }`}
            >
              {ageInfo.label}
            </span>
          </div>

          {/* Row 3: Episodes + Inline Schedule Hint + Compact Audio Mini-Badges */}
          <div className={`flex items-center justify-between gap-1.5 min-w-0 ${isPhoneDevice ? 'mt-2.5' : 'mt-2'}`}>
            <div
              className={`flex items-center gap-1.5 min-w-0 flex-1 ${
                isPhoneDevice ? 'text-sm font-extrabold' : 'text-[10.5px] font-bold'
              }`}
            >
              <span className="text-sky-400 truncate">{detailsDisplay}</span>
              {inlineScheduleHint && (
                <span className="text-rose-300 truncate shrink" title={inlineScheduleHint}>
                  • 🗓️ {inlineScheduleHint}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isComingSoonActive ? (
                drama.comingSoonAudios && drama.comingSoonAudios.length > 0 ? (
                  <span
                    className={`bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded font-black tracking-wide ${
                      isPhoneDevice ? 'text-xs px-2.5 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                    }`}
                  >
                    {drama.comingSoonAudios[0] === 'Hindi Dubbed'
                      ? '⏳ Hindi'
                      : drama.comingSoonAudios[0] === 'Hindi Fan Dubbed'
                      ? '⏳ Fan'
                      : '⏳ Orig'}
                  </span>
                ) : (
                  <span
                    className={`bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded font-black ${
                      isPhoneDevice ? 'text-xs px-2.5 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                    }`}
                  >
                    ⏳ Soon
                  </span>
                )
              ) : (
                <>
                  {drama.telegramHindi && (
                    <span
                      className={`bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white rounded font-black tracking-wide shadow-[0_0_8px_rgba(229,9,20,0.35)] ${
                        isPhoneDevice ? 'text-xs px-2.5 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                      }`}
                      title="Hindi Dubbed Live"
                    >
                      Hindi
                    </span>
                  )}
                  {drama.telegramFanDub && (
                    <span
                      className={`bg-gradient-to-r from-[#9333ea] to-[#ec4899] text-white rounded font-black tracking-wide shadow-[0_0_8px_rgba(168,85,247,0.35)] ${
                        isPhoneDevice ? 'text-xs px-2.5 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                      }`}
                      title="Hindi Fan Dubbed Live"
                    >
                      Fan Dub
                    </span>
                  )}
                  {drama.telegramOrig && (
                    <span
                      className={`bg-gradient-to-r from-[#0284c7] to-[#2563eb] text-white rounded font-black tracking-wide shadow-[0_0_8px_rgba(14,165,233,0.35)] ${
                        isPhoneDevice ? 'text-xs px-2.5 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                      }`}
                      title="Original / Eng Sub Live"
                    >
                      Orig
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Bottom Action Buttons */}
        <div className={`grid grid-cols-2 mt-auto pt-2 ${isPhoneDevice ? 'gap-2.5' : 'gap-2'}`}>
          <button
            onClick={() => onSelect(drama)}
            className={`w-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/10 text-center transition-all flex items-center justify-center cursor-pointer ${
              isPhoneDevice ? 'py-3 px-3 rounded-xl text-sm font-black' : 'py-1.5 px-2 rounded-lg text-xs font-bold'
            }`}
          >
            <span>{isMovie ? 'Details' : 'Episodes'}</span>
          </button>

          <a
            href={primaryTelegram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`w-full bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-center shadow-[0_0_12px_rgba(229,9,20,0.4)] hover:shadow-[0_0_16px_rgba(229,9,20,0.65)] transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer ${
              isPhoneDevice ? 'py-3 px-3 rounded-xl text-sm font-black' : 'py-1.5 px-2 rounded-lg text-xs font-black'
            }`}
            title="Stream / Open Telegram Link"
          >
            <Send className={`${isPhoneDevice ? 'w-4 h-4' : 'w-3 h-3'} shrink-0`} />
            <span className="truncate">{isMovie ? 'Movie' : 'Stream'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
