import React, { useEffect, useState } from 'react';
import { DramaItem, AudioType } from '../types/drama';
import { Play, Bookmark, BookmarkCheck, Star, Send } from 'lucide-react';
import { getAgeRatingMeta } from '../services/ageRatingHelper';
import { getTrackEpisodeCounts } from '../services/scheduleHelper';
import {
  getWatchTimestampForDrama,
  formatTimeSeconds,
  TIMESTAMPS_UPDATED_EVENT,
  WatchTimestampEntry,
} from '../services/vipPlayerHelper';

const detectPhoneOrPortrait = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isPortrait =
    window.innerHeight > window.innerWidth ||
    (window.screen && window.screen.height > window.screen.width);
  const isTouch =
    navigator.maxTouchPoints > 0 ||
    'ontouchstart' in window ||
    window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isNarrow = window.outerWidth <= 1024 || window.innerWidth <= 1024;
  return isPortrait || isTouch || isMobileUA || isNarrow;
};

interface DramaCardProps {
  drama: DramaItem;
  onSelect: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: boolean;
  rank?: number;
  isTopOne?: boolean;
  activeAudioContext?: AudioType | string;
  rowAudioContext?: 'hindi' | 'fandub' | 'orig';
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
  rowAudioContext,
  isComingSoonContext = false,
  isPhoneDevice = false,
  isGrid = false,
}) => {
  const [detectedPhone, setDetectedPhone] = useState<boolean>(() => detectPhoneOrPortrait());
  const [savedProgress, setSavedProgress] = useState<WatchTimestampEntry | null>(() =>
    getWatchTimestampForDrama(drama.id)
  );

  useEffect(() => {
    setSavedProgress(getWatchTimestampForDrama(drama.id));
    const syncTs = () => setSavedProgress(getWatchTimestampForDrama(drama.id));
    const update = () => setDetectedPhone(detectPhoneOrPortrait());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener(TIMESTAMPS_UPDATED_EVENT, syncTs);
    window.addEventListener('storage', syncTs);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener(TIMESTAMPS_UPDATED_EVENT, syncTs);
      window.removeEventListener('storage', syncTs);
    };
  }, [drama.id]);

  const effectiveIsPhone = Boolean(isPhoneDevice || detectedPhone);
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

  const { t1Ep, t2Ep, t3Ep, totalEp, hasHindiLink, hasFanDubLink, hasOrigLink } = getTrackEpisodeCounts(drama);

  // Derive effective row audio context
  const normCtx = (activeAudioContext || '').toLowerCase();
  const effectiveRowAudio: 'hindi' | 'fandub' | 'orig' | undefined =
    rowAudioContext ||
    (normCtx.includes('fan')
      ? 'fandub'
      : normCtx.includes('hindi') && !normCtx.includes('fan')
      ? 'hindi'
      : normCtx.includes('orig') || normCtx.includes('eng')
      ? 'orig'
      : undefined);

  const hasHindi = hasHindiLink;
  const hasFanDub = hasFanDubLink;
  const hasOrig = hasOrigLink;

  const isCompletedStatus =
    drama.status.toLowerCase().includes('completed') ||
    Boolean(drama.statusText && drama.statusText.toLowerCase().includes('completed'));

  // Determine active track episode count for ongoing progress bar
  const maxAnyEp = Math.max(t1Ep, t2Ep, t3Ep);
  const effectiveMaxEp =
    effectiveRowAudio === 'fandub' && t2Ep > 0
      ? t2Ep
      : effectiveRowAudio === 'hindi' && t1Ep > 0
      ? t1Ep
      : effectiveRowAudio === 'orig' && t3Ep > 0
      ? t3Ep
      : maxAnyEp;

  const showOngoingProgress =
    !isComingSoonActive && !isCompletedStatus && !isMovie && effectiveMaxEp > 0 && totalEp > 0 && effectiveMaxEp < totalEp;
  const ongoingProgressPct = showOngoingProgress
    ? Math.min(96, Math.max(8, Math.round((effectiveMaxEp / totalEp) * 100)))
    : 0;

  const hasOnlineStream = Boolean(
    (drama.movieStreamLink && drama.movieStreamLink.startsWith('http')) ||
      (drama.movieFanDubStreamLink && drama.movieFanDubStreamLink.startsWith('http')) ||
      (drama.movieEngSubStreamLink && drama.movieEngSubStreamLink.startsWith('http')) ||
      drama.episodes?.some(
        (ep) =>
          (ep.streamLink && ep.streamLink.startsWith('http')) ||
          (ep.hindiFanDubStreamLink && ep.hindiFanDubStreamLink.startsWith('http')) ||
          (ep.engSubStreamLink && ep.engSubStreamLink.startsWith('http'))
      )
  );

  // Extract a clean single Telegram URL (never dump raw multiline Ep/Es text into href)
  const extractCleanTelegram = (raw?: string, audioFilter?: string): string => {
    const epMatch = drama.episodes?.find(
      (e) =>
        e.telegramUrl &&
        e.telegramUrl.startsWith('http') &&
        (!audioFilter ||
          (audioFilter === 'fandub' && e.audio.toLowerCase().includes('fan')) ||
          (audioFilter === 'hindi' && e.audio === 'Hindi Dubbed') ||
          (audioFilter === 'orig' && e.audio === 'Original / Eng Sub'))
    );
    if (epMatch?.telegramUrl) return epMatch.telegramUrl;
    if (raw) {
      const stripped = raw.replace(
        /\b(?:es|stream)\s*(?:[-_#]?\s*\d+)?\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi,
        ' '
      );
      const m = stripped.match(/https?:\/\/[^\s"',|<>]+/);
      if (m) return m[0];
    }
    return '';
  };

  // Determine active telegram URL based on row context or available links
  const primaryTelegram =
    (effectiveRowAudio === 'fandub' && extractCleanTelegram(drama.telegramFanDub, 'fandub')) ||
    (effectiveRowAudio === 'hindi' && extractCleanTelegram(drama.telegramHindi, 'hindi')) ||
    (effectiveRowAudio === 'orig' && extractCleanTelegram(drama.telegramOrig, 'orig')) ||
    extractCleanTelegram(drama.telegramHindi, 'hindi') ||
    extractCleanTelegram(drama.telegramFanDub, 'fandub') ||
    extractCleanTelegram(drama.telegramOrig, 'orig') ||
    extractCleanTelegram(drama.telegramUrl) ||
    (!hasOnlineStream ? 'https://t.me/+yJH68LvfrT9hZDVl' : '');

  // Top-left audio badge determination
  let displayAudio: 'Hindi Dubbed' | 'Hindi Fan Dubbed' | 'Original / Eng Sub' = 'Hindi Dubbed';

  if (effectiveRowAudio === 'fandub' && hasFanDub) {
    displayAudio = 'Hindi Fan Dubbed';
  } else if (effectiveRowAudio === 'hindi' && hasHindi) {
    displayAudio = 'Hindi Dubbed';
  } else if (effectiveRowAudio === 'orig' && hasOrig) {
    displayAudio = 'Original / Eng Sub';
  } else if (isComingSoonActive && drama.comingSoonAudios && drama.comingSoonAudios.length > 0) {
    const csAudio = drama.comingSoonAudios[0];
    if (csAudio === 'Hindi Fan Dubbed' || csAudio === 'Fan Dubbed') {
      displayAudio = 'Hindi Fan Dubbed';
    } else if (csAudio === 'Original / Eng Sub') {
      displayAudio = 'Original / Eng Sub';
    } else {
      displayAudio = 'Hindi Dubbed';
    }
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

  // Smart Poster Bottom Status Pill (Zero Multi-Audio Confusion)
  const smartPosterStatusText = (() => {
    if (isComingSoonActive) return 'Coming Soon';
    if (isMovie) return drama.statusText || 'Full Movie';

    const epTotalSuffix = totalEp > 0 ? `/${totalEp}` : '';

    if (effectiveRowAudio === 'fandub') {
      if (t2Ep > 0) return `🎙️ Fan Dub: Ep ${t2Ep}${epTotalSuffix}`;
      return isCompletedStatus ? '🎙️ Fan Dub: Completed' : '🎙️ Fan Dub: Streaming';
    }
    if (effectiveRowAudio === 'hindi') {
      if (t1Ep > 0) return `🔊 Hindi: Ep ${t1Ep}${epTotalSuffix}`;
      return isCompletedStatus ? '🔊 Hindi: Completed' : '🔊 Hindi: Streaming';
    }
    if (effectiveRowAudio === 'orig') {
      if (t3Ep > 0) return `💬 Orig: Ep ${t3Ep}${epTotalSuffix}`;
      return isCompletedStatus ? '💬 Orig: Completed' : '💬 Orig: Streaming';
    }

    if (isCompletedStatus) {
      return drama.statusText || 'Completed';
    }

    // Ongoing general row: show per-track episode counts cleanly
    const activeEpTracks: Array<{ shortMulti: string; singleLabel: string }> = [];
    if (hasHindi && t1Ep > 0) {
      activeEpTracks.push({ shortMulti: `🔊 Hin Ep ${t1Ep}`, singleLabel: `🔊 Hindi Ep ${t1Ep}` });
    }
    if (hasFanDub && t2Ep > 0) {
      activeEpTracks.push({ shortMulti: `🎙️ Fan Ep ${t2Ep}`, singleLabel: `🎙️ Fan Dub Ep ${t2Ep}` });
    }
    if (hasOrig && t3Ep > 0) {
      activeEpTracks.push({ shortMulti: `💬 Orig Ep ${t3Ep}`, singleLabel: `💬 Orig Ep ${t3Ep}` });
    }

    if (activeEpTracks.length > 1) {
      return activeEpTracks.map((t) => t.shortMulti).join(' • ');
    }
    if (activeEpTracks.length === 1) {
      return activeEpTracks[0].singleLabel;
    }

    return drama.statusText || drama.status.replace(/ \(.*\)/, '');
  })();

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

  const showLiveTrackEpOnPills = !isMovie && !isCompletedStatus && !isComingSoonActive;

  return (
    <article
      style={
        effectiveIsPhone
          ? !isGrid
            ? {
                width: 'calc((100% - 44px) / 3)',
                minWidth: '418px',
                maxWidth: '445px',
                height: '775px',
                flexShrink: 0,
              }
            : {
                width: '100%',
                height: '775px',
              }
          : undefined
      }
      className={`group relative ${
        effectiveIsPhone ? '' : 'h-[420px]'
      } bg-gradient-to-b from-[#11121a] to-[#0a0b10] rounded-2xl border border-white/[0.08] hover:border-[#e50914]/70 ott-card-elevate flex flex-col overflow-hidden`}
    >
      {/* Locked-Height Poster Area */}
      <div
        onClick={() => onSelect(drama)}
        style={effectiveIsPhone ? { height: '535px', minHeight: '535px' } : undefined}
        className={`relative w-full shrink-0 overflow-hidden bg-zinc-900 cursor-pointer ${
          effectiveIsPhone ? '' : 'h-[250px]'
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
            effectiveIsPhone ? 'gap-2' : 'gap-1'
          }`}
        >
          {showRankBadge &&
            (isRankOne ? (
              <span
                className={`bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black uppercase tracking-wider rounded shadow-lg shadow-amber-500/40 ${
                  effectiveIsPhone ? 'text-[15px] px-3.5 py-1.5' : 'text-[9px] px-2 py-0.5'
                }`}
              >
                👑 TOP 1
              </span>
            ) : (
              <span
                className={`bg-black/75 backdrop-blur-md text-zinc-200 border border-white/15 font-black rounded shadow ${
                  effectiveIsPhone ? 'text-[15px] px-3.5 py-1.5' : 'text-[9px] px-1.5 py-0.5'
                }`}
              >
                #{rank}
              </span>
            ))}
          <span
            className={`${audioBadgeConfig.className} font-black uppercase tracking-wider rounded shadow-md flex items-center gap-1 ${
              effectiveIsPhone ? 'text-[15px] px-3.5 py-1.5' : 'text-[9px] px-2 py-0.5'
            }`}
          >
            {audioBadgeConfig.label}
          </span>
          {hasOnlineStream && (
            <span
              className={`bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-black font-black uppercase tracking-wider rounded border border-emerald-200/70 shadow-[0_0_12px_rgba(16,185,129,0.75)] flex items-center gap-1 ${
                effectiveIsPhone ? 'text-[14px] px-3 py-1' : 'text-[8.5px] px-1.5 py-0.5'
              }`}
            >
              ▶ STREAM
            </span>
          )}
        </div>

        {/* Top-Right: Watchlist Bookmark Button + Automatic 18+ Seal directly below */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(drama);
            }}
            className={`rounded-full backdrop-blur-md border transition-all cursor-pointer flex items-center justify-center ${
              effectiveIsPhone ? 'w-11 h-11' : 'p-1.5'
            } ${
              isWatchlisted
                ? 'bg-amber-500/90 border-amber-300 text-black shadow-lg opacity-100'
                : 'bg-black/60 border-white/20 text-white hover:bg-[#e50914] hover:border-[#e50914] opacity-85 group-hover:opacity-100'
            }`}
            title={isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
          >
            {isWatchlisted ? (
              <BookmarkCheck className={effectiveIsPhone ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            ) : (
              <Bookmark className={effectiveIsPhone ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            )}
          </button>

          {ageInfo.is18Plus && (
            <span
              className={`bg-[#e50914] text-white font-black rounded-md border border-white/30 shadow-[0_0_12px_rgba(229,9,20,0.8)] tracking-tighter pointer-events-none ${
                effectiveIsPhone ? 'text-[14px] px-2.5 py-1' : 'text-[10px] px-1.5 py-0.5'
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
              effectiveIsPhone ? 'w-16 h-16' : 'w-10 h-10'
            }`}
          >
            <Play className={`${effectiveIsPhone ? 'w-8 h-8' : 'w-5 h-5'} fill-white ml-0.5`} />
          </div>
        </div>

        {/* Live Issue / Issue Fixed Poster Pill */}
        {(drama.issueFixedText || drama.issueText) && (
          <div
            className={`absolute left-2.5 right-2.5 flex items-center pointer-events-none z-10 ${
              effectiveIsPhone ? 'bottom-14' : 'bottom-9'
            }`}
          >
            {drama.issueFixedText ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-black font-black uppercase tracking-wider border border-emerald-200/70 shadow-[0_0_14px_rgba(16,185,129,0.75)] ${
                  effectiveIsPhone ? 'text-[14px] px-3.5 py-1.5' : 'text-[9px] px-2 py-0.5'
                }`}
              >
                ✅ ISSUE FIXED
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md text-black font-black uppercase tracking-wider border border-amber-200/70 shadow-[0_0_14px_rgba(245,158,11,0.75)] animate-pulse ${
                  effectiveIsPhone ? 'text-[14px] px-3.5 py-1.5' : 'text-[9px] px-2 py-0.5'
                }`}
              >
                ⚠️ FIXING ISSUE
              </span>
            )}
          </div>
        )}

        {/* Resume Timestamp Badge if viewer has watched >= 2s */}
        {savedProgress && savedProgress.currentTime >= 2 && (
          <div
            className={`absolute left-2.5 pointer-events-none z-10 ${
              drama.issueFixedText || drama.issueText
                ? effectiveIsPhone
                  ? 'bottom-24'
                  : 'bottom-16'
                : effectiveIsPhone
                ? 'bottom-14'
                : 'bottom-10'
            }`}
          >
            <span
              className={`inline-flex items-center gap-1 rounded-lg bg-[#e50914]/95 backdrop-blur-md text-white font-black border border-red-300/40 shadow-[0_0_12px_rgba(229,9,20,0.65)] ${
                effectiveIsPhone ? 'text-[13px] px-3 py-1' : 'text-[9px] px-2 py-0.5'
              }`}
            >
              ▶ Ep {savedProgress.ep} • {formatTimeSeconds(savedProgress.currentTime)}
            </span>
          </div>
        )}

        {/* Bottom of Poster: Smart Audio-Aware Status Pill & Right Gold Rating Pill */}
        <div
          className={`absolute bottom-3 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-10 ${
            effectiveIsPhone ? 'text-[15px]' : 'text-[10px]'
          }`}
        >
          <div
            className={`flex items-center gap-2 bg-black/85 backdrop-blur-md rounded-full border border-white/15 text-white min-w-0 ${
              effectiveIsPhone ? 'px-3.5 py-1.5 max-w-[300px] font-black' : 'px-2 py-0.5 max-w-[calc(100%-46px)] font-bold'
            }`}
            title={smartPosterStatusText}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor()}`} />
            <span
              className={`truncate text-zinc-100 ${
                effectiveIsPhone ? 'text-[15px] font-black' : 'text-[9px] font-extrabold'
              }`}
            >
              {smartPosterStatusText}
            </span>
          </div>

          <span
            className={`bg-black/85 backdrop-blur-md text-amber-300 rounded-full border border-amber-500/25 flex items-center gap-1 shrink-0 ${
              effectiveIsPhone ? 'text-[15px] px-3.5 py-1.5 font-black' : 'font-black text-[9.5px] px-1.5 py-0.5 gap-0.5'
            }`}
          >
            <Star className={`${effectiveIsPhone ? 'w-4 h-4' : 'w-2.5 h-2.5'} fill-amber-400 text-amber-400`} />
            <span>{drama.rating}</span>
          </span>
        </div>

        {/* Netflix-style Crimson Resume Progress Bar OR Ongoing Episode Progress Bar */}
        {savedProgress && savedProgress.currentTime >= 2 ? (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/15 z-20">
            <div
              className="h-full bg-[#e50914] shadow-[0_0_10px_rgba(229,9,20,0.9)]"
              style={{
                width: `${
                  savedProgress.duration > 0
                    ? Math.min(100, Math.max(5, Math.round((savedProgress.currentTime / savedProgress.duration) * 100)))
                    : 25
                }%`,
              }}
            />
          </div>
        ) : showOngoingProgress ? (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20">
            <div
              className="h-full bg-gradient-to-r from-[#e50914] via-[#ff2b54] to-[#a855f7] shadow-[0_0_8px_rgba(229,9,20,0.75)]"
              style={{ width: `${ongoingProgressPct}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* Symmetric Card Body (No Nested Gray Border Boxes) */}
      <div
        className={`flex-1 min-h-0 flex flex-col justify-between bg-gradient-to-b from-[#11121a] to-[#0a0b10] ${
          effectiveIsPhone ? 'p-4' : 'p-3'
        }`}
      >
        <div className="min-w-0">
          {/* Row 1: Crisp Title */}
          <h3
            onClick={() => onSelect(drama)}
            className={`text-white truncate group-hover:text-[#ff2b54] transition-colors cursor-pointer ${
              effectiveIsPhone ? 'text-[22px] font-black leading-snug' : 'text-[13.5px] font-extrabold leading-tight'
            }`}
            title={drama.title}
          >
            {drama.title}
          </h3>

          {/* Row 2: Clean Dot-Separated OTT Metadata Line with Color-Coded Age Rating */}
          <div
            className={`flex items-center gap-2 min-w-0 ${
              effectiveIsPhone ? 'text-[16px] font-bold text-zinc-200 mt-1.5' : 'text-[11px] font-semibold text-zinc-400 mt-1'
            }`}
          >
            <span className="text-zinc-200 truncate">{categoryLabel}</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0">{drama.releaseYear}</span>
            <span className="shrink-0">•</span>
            <span
              className={`rounded font-black shrink-0 ${ageInfo.pillClass} ${
                effectiveIsPhone ? 'text-[14px] px-3 py-0.5' : 'text-[9.5px] px-1.5 py-0.2'
              }`}
            >
              {ageInfo.label}
            </span>
          </div>

          {/* Row 3a: Untruncated Episodes Count + Schedule Hint */}
          <div
            className={`flex items-center justify-between gap-2 min-w-0 ${
              effectiveIsPhone ? 'mt-2 text-[16px] font-black' : 'mt-1.5 text-[10.5px] font-bold'
            }`}
          >
            <span className="text-sky-400 shrink-0 whitespace-nowrap">{detailsDisplay}</span>
            {inlineScheduleHint && (
              <span className="text-rose-300 truncate min-w-0 text-right" title={inlineScheduleHint}>
                🗓️ {inlineScheduleHint}
              </span>
            )}
          </div>

          {/* Row 3b: Audio Badges with Live Episode Counts per Language */}
          <div className={`flex items-center flex-wrap gap-1.5 ${effectiveIsPhone ? 'mt-2.5' : 'mt-1.5'}`}>
            {isComingSoonActive ? (
              drama.comingSoonAudios && drama.comingSoonAudios.length > 0 ? (
                <span
                  className={`bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded font-black tracking-wide ${
                    effectiveIsPhone ? 'text-[14px] px-3 py-1' : 'text-[8.5px] px-1.5 py-0.5'
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
                    effectiveIsPhone ? 'text-[14px] px-3 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                  }`}
                >
                  ⏳ Soon
                </span>
              )
            ) : (
              <>
                {drama.telegramHindi && (
                  <span
                    className={`bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white rounded font-black tracking-wide whitespace-nowrap shadow-[0_0_8px_rgba(229,9,20,0.35)] ${
                      effectiveIsPhone ? 'text-[14px] px-3 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                    }`}
                    title="Hindi Dubbed Live"
                  >
                    {showLiveTrackEpOnPills && t1Ep > 0 ? `Hindi Ep ${t1Ep}` : 'Hindi'}
                  </span>
                )}
                {drama.telegramFanDub && (
                  <span
                    className={`bg-gradient-to-r from-[#9333ea] to-[#ec4899] text-white rounded font-black tracking-wide whitespace-nowrap shadow-[0_0_8px_rgba(168,85,247,0.35)] ${
                      effectiveIsPhone ? 'text-[14px] px-3 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                    }`}
                    title="Hindi Fan Dubbed Live"
                  >
                    {showLiveTrackEpOnPills && t2Ep > 0 ? `Fan Ep ${t2Ep}` : 'Fan Dub'}
                  </span>
                )}
                {drama.telegramOrig && (
                  <span
                    className={`bg-gradient-to-r from-[#0284c7] to-[#2563eb] text-white rounded font-black tracking-wide whitespace-nowrap shadow-[0_0_8px_rgba(14,165,233,0.35)] ${
                      effectiveIsPhone ? 'text-[14px] px-3 py-1' : 'text-[8.5px] px-1.5 py-0.5'
                    }`}
                    title="Original / Eng Sub Live"
                  >
                    {showLiveTrackEpOnPills && t3Ep > 0 ? `Orig Ep ${t3Ep}` : 'Orig'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 4: Bottom Action Buttons */}
        <div className={`grid grid-cols-2 mt-auto pt-2 ${effectiveIsPhone ? 'gap-3' : 'gap-2'}`}>
          <button
            onClick={() => onSelect(drama)}
            className={`w-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/10 text-center transition-all flex items-center justify-center cursor-pointer ${
              effectiveIsPhone ? 'py-4 px-3 rounded-xl text-[17px] font-black' : 'py-1.5 px-2 rounded-lg text-xs font-bold'
            }`}
          >
            <span>{isMovie ? 'Details' : 'Episodes'}</span>
          </button>

          {primaryTelegram ? (
            <a
              href={primaryTelegram}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`w-full bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-center shadow-[0_0_12px_rgba(229,9,20,0.4)] hover:shadow-[0_0_16px_rgba(229,9,20,0.65)] transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer ${
                effectiveIsPhone ? 'py-4 px-3 rounded-xl text-[17px] font-black' : 'py-1.5 px-2 rounded-lg text-xs font-black'
              }`}
              title="Stream / Open Telegram Link"
            >
              <Send className={`${effectiveIsPhone ? 'w-4 h-4' : 'w-3 h-3'} shrink-0`} />
              <span className="truncate">{isMovie ? 'Movie' : 'Stream'}</span>
            </a>
          ) : (
            <button
              onClick={() => onSelect(drama)}
              className={`w-full bg-[#e50914] hover:bg-[#f6121d] text-white text-center shadow-[0_0_14px_rgba(229,9,20,0.45)] transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer ${
                effectiveIsPhone ? 'py-4 px-3 rounded-xl text-[17px] font-black' : 'py-1.5 px-2 rounded-lg text-xs font-black'
              }`}
              title="Watch Online in HD Cinema Player"
            >
              <Play className={`${effectiveIsPhone ? 'w-4 h-4' : 'w-3 h-3'} fill-white shrink-0`} />
              <span className="truncate">Watch HD</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
