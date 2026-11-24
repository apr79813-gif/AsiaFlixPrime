import React, { useState, useRef, useMemo, useEffect } from 'react';
import { DramaItem, EpisodeItem, AudioType, WatchlistStatus, SubtitleTrackItem } from '../types/drama';
import {
  X,
  Play,
  Pause,
  Send,
  Star,
  CheckCircle2,
  Circle,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  Headphones,
  Clock,
  Calendar,
  Film,
  Check,
  Lightbulb,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  AlertTriangle,
  ShieldCheck,
  RotateCw,
  ArrowLeft,
  Gauge,
  Gem,
  Server,
  Maximize,
  Link2,
  Lock,
  Unlock,
  Camera,
  Repeat,
  Bookmark,
  Captions,
  Users,
  Moon,
  PictureInPicture2,
  Eye,
  EyeOff,
  Sliders,
  Trash2,
} from 'lucide-react';
import { isAiringToday } from '../services/scheduleHelper';
import { getAgeRatingMeta } from '../services/ageRatingHelper';
import { createDramaSlug } from '../services/urlHelper';
import {
  recordWatchSeconds,
  recordEpisodeCompleted,
  getWatchTimestampForDrama,
  saveWatchTimestamp,
  formatTimeSeconds,
  getSceneBookmarks,
  saveSceneBookmark,
  deleteSceneBookmark,
  SceneBookmark,
  getHypeVotes,
  toggleHypeVote,
  HYPE_REACTIONS,
  HypeKey,
  getDanmakuCues,
  addDanmakuCue,
  DanmakuCue,
  parseSrtOrVttContent,
  normalizeSubtitleUrl,
  SubtitleCue,
  TIMESTAMPS_UPDATED_EVENT,
  WatchTimestampEntry,
} from '../services/vipPlayerHelper';

interface DramaDetailModalProps {
  drama: DramaItem | null;
  allDramas?: DramaItem[];
  onSelectDrama?: (drama: DramaItem) => void;
  initialEpisode?: number | null;
  initialTimestamp?: number | null;
  initialPartyRoom?: string | null;
  initialTrack?: AudioType | null;
  isMiniPlayer?: boolean;
  onToggleMiniPlayer?: () => void;
  onActiveEpisodeChange?: (epNum: number | null) => void;
  onClose: () => void;
  onToggleWatchlist: (drama: DramaItem, status?: WatchlistStatus) => void;
  isWatchlisted: boolean;
  watchlistStatus?: WatchlistStatus;
  watchedEpisodes: (number | string)[];
  onToggleEpisodeWatched: (dramaId: string, episodeNum: number | string) => void;
  onMoveToFront?: (dramaId: string) => void;
  isAdminAuthenticated?: boolean;
  isTopOne?: boolean;
  logoUrl?: string;
  onSubscribeDubAlert?: (dramaTitle: string, audio: string) => void;
  onReportIssue?: () => void;
}

export interface VideoMirrorOption {
  label: string;
  url: string;
}

export interface ResolvedVideoSource {
  type: 'video' | 'iframe';
  src: string;
  mirrors: VideoMirrorOption[];
}

export function resolveVideoPlayerSource(rawUrl: string, mirrorIndex = 0): ResolvedVideoSource {
  let trimmed = (rawUrl || '').trim();
  if (trimmed.includes('huggingface.co') && trimmed.includes('/blob/')) {
    trimmed = trimmed.replace('/blob/', '/resolve/');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { type: 'iframe', src: 'about:blank', mirrors: [] };
  }

  // 1. CLOUD HOST EMBED RULES ALWAYS RUN FIRST (before extension checks, e.g. streamtape slugs ending in .mp4)

  // Streamtape (streamtape.com, strtape.cloud, strcloud.in, shavetape.cash, streamtape.to, streamtape.xyz)
  const streamtapeMatch = trimmed.match(
    /(?:streamtape\.\w+|strtape\.cloud|strcloud\.in|shavetape\.cash)\/(?:v|e)\/([a-zA-Z0-9_-]+)/i
  );
  if (streamtapeMatch) {
    const id = streamtapeMatch[1];
    const mirrors: VideoMirrorOption[] = [
      { label: '🇮🇳 Server 1 (India No-VPN)', url: `https://strcloud.in/e/${id}/` },
      { label: '⚡ Server 2 (Fast Cloud)', url: `https://strtape.cloud/e/${id}/` },
      { label: '🛡️ Server 3 (Mirror)', url: `https://shavetape.cash/e/${id}/` },
      { label: '🌐 Server 4 (Global)', url: `https://streamtape.com/e/${id}/` },
    ];
    return { type: 'iframe', src: mirrors[mirrorIndex]?.url || mirrors[0].url, mirrors };
  }

  // Doodstream (dood.*, ds2play.com, d000d.com)
  const doodMatch = trimmed.match(/(?:dood\w*\.\w+|ds2play\.com|d000d\.com)\/(?:d|e)\/([a-zA-Z0-9_-]+)/i);
  if (doodMatch) {
    const id = doodMatch[1];
    const mirrors: VideoMirrorOption[] = [
      { label: '🇮🇳 Server 1 (India No-VPN)', url: `https://d000d.com/e/${id}` },
      { label: '⚡ Server 2 (Fast Cloud)', url: `https://ds2play.com/e/${id}` },
      { label: '🛡️ Server 3 (Mirror)', url: `https://dood.wf/e/${id}` },
    ];
    return { type: 'iframe', src: mirrors[mirrorIndex]?.url || mirrors[0].url, mirrors };
  }

  // Filemoon (filemoon.sx, filemoon.in, filemoon.to, etc.)
  const filemoonMatch = trimmed.match(/(?:filemoon\.\w+)\/(?:d|e)\/([a-zA-Z0-9_-]+)/i);
  if (filemoonMatch) {
    const id = filemoonMatch[1];
    const mirrors: VideoMirrorOption[] = [
      { label: '🇮🇳 Server 1 (India No-VPN)', url: `https://filemoon.in/e/${id}` },
      { label: '⚡ Server 2 (Fast Cloud)', url: `https://filemoon.sx/e/${id}` },
      { label: '🛡️ Server 3 (Mirror)', url: `https://filemoon.to/e/${id}` },
    ];
    return { type: 'iframe', src: mirrors[mirrorIndex]?.url || mirrors[0].url, mirrors };
  }

  // Voe (voe.sx)
  const voeMatch = trimmed.match(/voe\.sx\/(?:e\/)?([a-zA-Z0-9_-]+)/i);
  if (voeMatch) {
    const src = `https://voe.sx/e/${voeMatch[1]}`;
    return { type: 'iframe', src, mirrors: [{ label: '🇮🇳 Main HD Server', url: src }] };
  }

  // Mixdrop (mixdrop.co, mixdrop.to, mixdrop.ag)
  const mixdropMatch = trimmed.match(/mixdrop\.\w+\/(?:f|e)\/([a-zA-Z0-9_-]+)/i);
  if (mixdropMatch) {
    const src = `https://mixdrop.ag/e/${mixdropMatch[1]}`;
    return { type: 'iframe', src, mirrors: [{ label: '🇮🇳 Main HD Server', url: src }] };
  }

  // Abyss / Hydrax (abyss.to, abysscdn.com)
  if (/(?:abyss\.to|abysscdn\.com)\//i.test(trimmed)) {
    return { type: 'iframe', src: trimmed, mirrors: [{ label: '🇮🇳 Main HD Server', url: trimmed }] };
  }

  // Google Drive share link -> /preview
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch) {
    const src = `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
    return { type: 'iframe', src, mirrors: [{ label: '🇮🇳 Main HD Server', url: src }] };
  }

  // OK.ru link -> /videoembed/
  const okMatch = trimmed.match(/ok\.ru\/video\/(\d+)/i);
  if (okMatch) {
    const src = `https://ok.ru/videoembed/${okMatch[1]}?autoplay=1`;
    return { type: 'iframe', src, mirrors: [{ label: '🇮🇳 Main HD Server', url: src }] };
  }

  // Mega.nz link -> /embed/
  const megaMatch = trimmed.match(/mega\.nz\/file\/([^#]+)#(.+)/i);
  if (megaMatch) {
    const src = `https://mega.nz/embed/${megaMatch[1]}#${megaMatch[2]}`;
    return { type: 'iframe', src, mirrors: [{ label: '🇮🇳 Main HD Server', url: src }] };
  }

  // YouTube link -> privacy-enhanced youtube-nocookie.com/embed/
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/i
  );
  if (ytMatch) {
    const src = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    return { type: 'iframe', src, mirrors: [{ label: '🇮🇳 Main HD Server', url: src }] };
  }

  // Dailymotion link -> /embed/video/
  const dmMatch = trimmed.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/i);
  if (dmMatch) {
    const src = `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1`;
    return { type: 'iframe', src, mirrors: [{ label: '🇮🇳 Main HD Server', url: src }] };
  }

  // 2. ONLY AFTER cloud host rules: check genuine direct media streams
  const lowerUrl = trimmed.toLowerCase();
  const pathWithoutQuery = trimmed.split(/[?#]/)[0].toLowerCase();
  if (
    /\.(mp4|m3u8|webm|ogg)$/i.test(pathWithoutQuery) ||
    (lowerUrl.includes('huggingface.co') && lowerUrl.includes('/resolve/')) ||
    (lowerUrl.includes('archive.org') && lowerUrl.includes('/download/')) ||
    lowerUrl.includes('/direct/') ||
    lowerUrl.includes('workers.dev') ||
    lowerUrl.includes('r2.dev')
  ) {
    return { type: 'video', src: trimmed, mirrors: [] };
  }

  // 3. Fallback custom embed iframe
  return { type: 'iframe', src: trimmed, mirrors: [{ label: '🇮🇳 Main HD Server', url: trimmed }] };
}

function getStreamLinkForTrack(ep: EpisodeItem, track: AudioType): string | undefined {
  if (track === 'Hindi Dubbed') return ep.streamLink;
  if (track === 'Hindi Fan Dubbed' || track === 'Fan Dubbed') return ep.hindiFanDubStreamLink;
  if (track === 'Original / Eng Sub') return ep.engSubStreamLink;
  return undefined;
}

function extractNumericEp(episodeNumber: number | string): number {
  if (typeof episodeNumber === 'number') return episodeNumber;
  const m = String(episodeNumber).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

interface StreamableEpisodeEntry {
  epNum: number;
  label: string;
  streamUrl: string;
  telegramUrl?: string;
  episodeKey: number | string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const QUALITY_OPTIONS = [
  {
    id: '1080p FHD (Ultra)',
    label: '1080p FHD (Ultra)',
    filter: 'contrast(1.07) saturate(1.14) brightness(1.02)',
    hudText: '💎 Quality: 1080p FHD (Ultra) Enhanced',
  },
  {
    id: '720p HD',
    label: '720p HD',
    filter: 'contrast(1.0) saturate(1.0) brightness(1.0)',
    hudText: '💎 Quality: 720p HD Standard Crisp',
  },
  {
    id: '480p Saver',
    label: '480p Saver',
    filter: 'contrast(0.95) saturate(0.88) brightness(0.98)',
    hudText: '💎 Quality: 480p Saver Mode',
  },
  {
    id: 'Auto HDR',
    label: 'Auto HDR',
    filter: 'contrast(1.16) saturate(1.26) brightness(1.05) drop-shadow(0 0 12px rgba(0,242,254,0.25))',
    hudText: '💎 Quality: Auto HDR Cinema Boost Active',
  },
] as const;

type AudioEqMode = 'normal' | 'dialogue' | 'bass3d' | 'night';
type VideoFitMode = 'contain' | 'cover' | 'cinema219' | 'stretch';
type StudioTab = 'audio' | 'screen' | 'vault' | 'party';
type SleepTimerMode = 'off' | '30m' | '60m' | 'end_of_ep';

export const DramaDetailModal: React.FC<DramaDetailModalProps> = ({
  drama,
  allDramas = [],
  onSelectDrama,
  initialEpisode = null,
  initialTimestamp = null,
  initialPartyRoom = null,
  initialTrack = null,
  isMiniPlayer = false,
  onToggleMiniPlayer,
  onActiveEpisodeChange,
  onClose,
  onToggleWatchlist,
  isWatchlisted,
  watchlistStatus = 'want_to_watch',
  watchedEpisodes,
  onToggleEpisodeWatched,
  onMoveToFront,
  isAdminAuthenticated = false,
  isTopOne = false,
  logoUrl,
  onReportIssue,
}) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hudTimerRef = useRef<number | null>(null);
  const pendingRestoreTimeRef = useRef<{ time: number; shouldPlay: boolean } | null>(
    initialTimestamp && initialTimestamp > 0 ? { time: initialTimestamp, shouldPlay: true } : null
  );
  const videoAudioNodeRef = useRef<{ el: HTMLVideoElement; ctx: AudioContext; gain: GainNode } | null>(null);
  const studioAudioGraphRef = useRef<{
    el: HTMLMediaElement;
    ctx: AudioContext;
    highpass: BiquadFilterNode;
    lowshelf: BiquadFilterNode;
    peaking: BiquadFilterNode;
    highshelf: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
    gain: GainNode;
  } | null>(null);
  const corsCheckCacheRef = useRef<Record<string, boolean>>({});
  const prevInitialEpisodeRef = useRef<number | null>(initialEpisode);
  const lastSavedTsWallRef = useRef<number>(0);
  const watchSecondsAccRef = useRef<number>(0);
  const lastPlaybackTickMsRef = useRef<number | null>(null);
  const preloadedNextUrlRef = useRef<string | null>(null);
  const lastTapLeftRef = useRef<number>(0);
  const lastTapRightRef = useRef<number>(0);
  const lastTapUnlockRef = useRef<number>(0);
  const lastDanmakuIdShownRef = useRef<Record<string, number>>({});
  const subtitleFileInputRef = useRef<HTMLInputElement>(null);
  const hardSubCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastHardSubScanMsRef = useRef<number>(0);
  const hardSubCorsBlockedRef = useRef<boolean>(false);
  const seekRippleTimerRef = useRef<number | null>(null);

  const isAdmin =
    isAdminAuthenticated ||
    (typeof window !== 'undefined' &&
      (localStorage.getItem('asiaflix_admin_unlocked') === 'true' ||
        sessionStorage.getItem('asiaflix_admin_unlocked') === 'true' ||
        sessionStorage.getItem('asiaflix_admin_session') === 'true'));

  // Extract a clean single Telegram URL per audio track (excluding Es/Stream links)
  const extractCleanTrackTelegram = (track: AudioType): string | undefined => {
    if (!drama) return undefined;
    const epWithTg = drama.episodes.find(
      (e) =>
        (track === 'Hindi Fan Dubbed'
          ? e.audio === 'Hindi Fan Dubbed' || e.audio === 'Fan Dubbed'
          : e.audio === track) &&
        e.telegramUrl &&
        e.telegramUrl.startsWith('http')
    );
    if (epWithTg?.telegramUrl) return epWithTg.telegramUrl;

    const raw =
      track === 'Hindi Dubbed'
        ? drama.telegramHindi
        : track === 'Hindi Fan Dubbed' || track === 'Fan Dubbed'
        ? drama.telegramFanDub
        : drama.telegramOrig;

    if (raw) {
      const stripped = raw.replace(
        /\b(?:es|stream)\s*(?:[-_#]?\s*\d+)?\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi,
        ' '
      );
      const m = stripped.match(/https?:\/\/[^\s"',|<>]+/);
      if (m) return m[0];
    }

    if (drama.availableAudios.includes(track) && drama.telegramUrl?.startsWith('http')) {
      return drama.telegramUrl;
    }
    return undefined;
  };

  // Helper to get streamable episodes list for any track
  const getStreamableEpisodesForTrack = (track: AudioType): StreamableEpisodeEntry[] => {
    if (!drama) return [];
    const matched = drama.episodes.filter((e) =>
      track === 'Hindi Fan Dubbed' || track === 'Fan Dubbed'
        ? e.audio === 'Hindi Fan Dubbed' || e.audio === 'Fan Dubbed'
        : e.audio === track
    );

    const list: StreamableEpisodeEntry[] = [];
    const seenEpNums = new Set<number>();

    matched.forEach((ep) => {
      const sUrl = getStreamLinkForTrack(ep, track);
      if (sUrl && /^https?:\/\//i.test(sUrl)) {
        const epNum = extractNumericEp(ep.episodeNumber);
        if (!seenEpNums.has(epNum)) {
          seenEpNums.add(epNum);
          list.push({
            epNum,
            label:
              typeof ep.episodeNumber === 'number' || /^\d+/.test(String(ep.episodeNumber))
                ? `Ep ${ep.episodeNumber}`
                : String(ep.episodeNumber),
            streamUrl: sUrl,
            telegramUrl: ep.telegramUrl && ep.telegramUrl.startsWith('http') ? ep.telegramUrl : undefined,
            episodeKey: ep.episodeNumber,
          });
        }
      }
    });

    const movieFallbackStream =
      track === 'Hindi Dubbed'
        ? drama.movieStreamLink
        : track === 'Hindi Fan Dubbed' || track === 'Fan Dubbed'
        ? drama.movieFanDubStreamLink
        : drama.movieEngSubStreamLink;

    if (list.length === 0 && movieFallbackStream && /^https?:\/\//i.test(movieFallbackStream)) {
      list.push({
        epNum: 1,
        label: 'Full Movie',
        streamUrl: movieFallbackStream,
        telegramUrl: extractCleanTrackTelegram(track),
        episodeKey: 'Full Movie',
      });
    }

    return list.sort((a, b) => a.epNum - b.epNum);
  };

  // Link for each audio track strictly from drama
  const audioLinkMap: Record<string, string | undefined> = {
    'Hindi Dubbed': extractCleanTrackTelegram('Hindi Dubbed'),
    'Hindi Fan Dubbed': extractCleanTrackTelegram('Hindi Fan Dubbed'),
    'Fan Dubbed': extractCleanTrackTelegram('Hindi Fan Dubbed'),
    'Original / Eng Sub': extractCleanTrackTelegram('Original / Eng Sub'),
  };

  // List only audio tracks that actually have an http link (Telegram OR Online Stream) or are present in availableAudios
  const availableTrackList = (['Hindi Dubbed', 'Hindi Fan Dubbed', 'Original / Eng Sub'] as AudioType[]).filter(
    (audio) => {
      const link = audioLinkMap[audio];
      if (link && link.startsWith('http')) return true;
      if (getStreamableEpisodesForTrack(audio).length > 0) return true;
      if (audio === 'Hindi Fan Dubbed' && drama?.availableAudios.some((a) => a.includes('Fan'))) return true;
      if (drama?.availableAudios.includes(audio)) return true;
      return false;
    }
  );

  // If availableTrackList is empty but drama has a valid telegramUrl, ensure at least defaultAudio is available
  if (availableTrackList.length === 0 && drama?.telegramUrl && drama.telegramUrl.startsWith('http')) {
    const fallback = drama.defaultAudio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : drama.defaultAudio || 'Hindi Dubbed';
    availableTrackList.push(fallback as AudioType);
    if (!audioLinkMap[fallback]) {
      audioLinkMap[fallback] = drama.telegramUrl;
    }
  }

  // Determine initial active audio track based on what's available
  const [activeAudio, setActiveAudio] = useState<AudioType>(() => {
    if (!drama) return 'Hindi Dubbed';
    if (audioLinkMap['Hindi Dubbed']?.startsWith('http') || getStreamableEpisodesForTrack('Hindi Dubbed').length > 0)
      return 'Hindi Dubbed';
    if (
      audioLinkMap['Hindi Fan Dubbed']?.startsWith('http') ||
      getStreamableEpisodesForTrack('Hindi Fan Dubbed').length > 0
    )
      return 'Hindi Fan Dubbed';
    if (
      audioLinkMap['Original / Eng Sub']?.startsWith('http') ||
      getStreamableEpisodesForTrack('Original / Eng Sub').length > 0
    )
      return 'Original / Eng Sub';
    return availableTrackList[0] || drama.defaultAudio || 'Hindi Dubbed';
  });

  // Protected IMAX Cyber-Cinema Player State
  const [activeStreamEp, setActiveStreamEp] = useState<number | null>(null);
  const [activeMirrorIndex, setActiveMirrorIndex] = useState<number>(0);
  const [isStreamUnlocked, setIsStreamUnlocked] = useState<boolean>(false);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isLightsOff, setIsLightsOff] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p FHD (Ultra)');
  const [streamReloadNonce, setStreamReloadNonce] = useState<number>(0);
  const [hudToast, setHudToast] = useState<string | null>(null);
  const [iframeControlNotice, setIframeControlNotice] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);
  const [audioVolume, setAudioVolume] = useState<number>(1);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [audioSyncOffset, setAudioSyncOffset] = useState<number>(0);
  const [forceBuiltinAudio, setForceBuiltinAudio] = useState<boolean>(false);
  const [isAudioCorsFallback, setIsAudioCorsFallback] = useState<boolean>(false);

  const [copied, setCopied] = useState(false);
  const [epLinkCopied, setEpLinkCopied] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [frontSuccess, setFrontSuccess] = useState(false);

  // --- VIP STUDIO DECK & NEXT-GEN PLAYER STATES ---
  const [isStudioToolsOpen, setIsStudioToolsOpen] = useState<boolean>(false);
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>('audio');
  const [audioEqMode, setAudioEqMode] = useState<AudioEqMode>('normal');
  const [volumeBoost, setVolumeBoost] = useState<100 | 150 | 200>(100);
  const [audibleCorsSupported, setAudibleCorsSupported] = useState<boolean>(false);
  const [videoFitMode, setVideoFitMode] = useState<VideoFitMode>('contain');
  const [isAmbilightOn, setIsAmbilightOn] = useState<boolean>(false);
  const [isEyeCareOn, setIsEyeCareOn] = useState<boolean>(false);
  const [isTouchLocked, setIsTouchLocked] = useState<boolean>(false);
  const [seekRipple, setSeekRipple] = useState<{ side: 'left' | 'right'; nonce: number } | null>(null);

  // Saved Timestamp Auto-Resume
  const [savedDramaProgress, setSavedDramaProgress] = useState<WatchTimestampEntry | null>(() =>
    drama ? getWatchTimestampForDrama(drama.id) : null
  );

  // A-B Looper & Personal Scene Vault
  const [loopPointA, setLoopPointA] = useState<number | null>(null);
  const [loopPointB, setLoopPointB] = useState<number | null>(null);
  const [sceneBookmarks, setSceneBookmarks] = useState<SceneBookmark[]>(() =>
    drama ? getSceneBookmarks(drama.id) : []
  );

  // Multi-Language Subtitles (CC) & Smart Hard-Sub Auto-Blur / Pure Transparent Engine
  const [activeSubLang, setActiveSubLang] = useState<string>('off');
  const [uploadedSubCues, setUploadedSubCues] = useState<{ label: string; cues: SubtitleCue[] } | null>(null);
  const [parsedSubCues, setParsedSubCues] = useState<Array<{ id: number; start: number; end: number; text: string }>>([]);
  const [activeCue, setActiveCue] = useState<{ id: number; start: number; end: number; text: string } | null>(null);
  const [subBackdropMode, setSubBackdropMode] = useState<'auto' | 'blur' | 'transparent'>('auto');
  const [hasHardcodedSubtitles, setHasHardcodedSubtitles] = useState<boolean>(true);
  const [detectedHardcodedSubs, setDetectedHardcodedSubs] = useState<boolean>(false);
  const [isPlayerControlsActive, setIsPlayerControlsActive] = useState<boolean>(false);
  const [subFontSize, setSubFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [subColor, setSubColor] = useState<'white' | 'yellow' | 'cyan'>('yellow');
  const [isSubLoading, setIsSubLoading] = useState<boolean>(false);
  const activeCueRef = useRef<{ id: number; start: number; end: number; text: string } | null>(null);

  // Danmaku Live Hype & Watch Party
  const [isDanmakuOn, setIsDanmakuOn] = useState<boolean>(true);
  const [danmakuCues, setDanmakuCues] = useState<DanmakuCue[]>([]);
  const [floatingDanmaku, setFloatingDanmaku] = useState<Array<{ id: string; text: string; topPct: number }>>([]);
  const [watchPartyRoom, setWatchPartyRoom] = useState<string | null>(initialPartyRoom || null);
  const [partyReactions, setPartyReactions] = useState<Array<{ id: string; emoji: string; leftPct: number }>>([]);

  // Auto-Next 5s Countdown & Sleep Timer
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [sleepTimerMode, setSleepTimerMode] = useState<SleepTimerMode>('off');

  // Part C: Hype Vibe Meter & Anti-Spoiler Shield
  const [hypeState, setHypeState] = useState(() =>
    drama ? getHypeVotes(drama.id, drama.rating) : { counts: { must_watch: 0, chemistry: 0, mind_blowing: 0, emotional: 0 }, userVoted: { must_watch: false, chemistry: false, mind_blowing: false, emotional: false } }
  );
  const [isAntiSpoilerOn, setIsAntiSpoilerOn] = useState<boolean>(false);
  const [revealedSpoilerEpKeys, setRevealedSpoilerEpKeys] = useState<Record<string, boolean>>({});
  const [showStoryGuide, setShowStoryGuide] = useState<boolean>(false);

  const showHudFeedback = (msg: string) => {
    setHudToast(msg);
    if (hudTimerRef.current !== null) {
      window.clearTimeout(hudTimerRef.current);
    }
    hudTimerRef.current = window.setTimeout(() => {
      setHudToast(null);
    }, 1500);
  };

  // Sync saved watch progress on mount / update
  useEffect(() => {
    if (!drama) return;
    setSavedDramaProgress(getWatchTimestampForDrama(drama.id));
    setSceneBookmarks(getSceneBookmarks(drama.id));
    setHypeState(getHypeVotes(drama.id, drama.rating));
    const syncTs = () => setSavedDramaProgress(getWatchTimestampForDrama(drama.id));
    window.addEventListener(TIMESTAMPS_UPDATED_EVENT, syncTs);
    return () => window.removeEventListener(TIMESTAMPS_UPDATED_EVENT, syncTs);
  }, [drama?.id]);

  // Reset server mirror index, embed notice & video overlay state whenever episode or drama changes
  useEffect(() => {
    setActiveMirrorIndex(0);
    setIframeControlNotice(false);
    setIsVideoPlaying(false);
    setIsVideoLoading(true);
    setForceBuiltinAudio(false);
    setIsAudioCorsFallback(false);
    setLoopPointA(null);
    setLoopPointB(null);
    setAutoNextCountdown(null);
    setFloatingDanmaku([]);
    setActiveCue(null);
    activeCueRef.current = null;
    setDetectedHardcodedSubs(false);
    hardSubCorsBlockedRef.current = false;
    preloadedNextUrlRef.current = null;
    lastPlaybackTickMsRef.current = null;
    if (drama && activeStreamEp !== null) {
      setDanmakuCues(getDanmakuCues(drama.id, activeStreamEp));
    } else {
      setDanmakuCues([]);
    }
  }, [activeStreamEp, drama?.id]);

  // Reset mirror & custom audio override when switching audio tracks without dropping playback if same video source
  useEffect(() => {
    setActiveMirrorIndex(0);
    setIframeControlNotice(false);
    setForceBuiltinAudio(false);
  }, [activeAudio]);

  // Synchronize activeAudio & reset/auto-open player from deep link when drama or initialEpisode changes
  useEffect(() => {
    setActiveMirrorIndex(0);
    setIsLightsOff(false);
    setIsTheaterMode(false);
    setPlaybackSpeed(1);
    setSelectedQuality('1080p FHD (Ultra)');
    setStreamReloadNonce(0);
    setHudToast(null);
    setIframeControlNotice(false);
    setIsVideoPlaying(false);
    setIsVideoLoading(true);
    setAudioSyncOffset(0);
    setForceBuiltinAudio(false);
    setIsAudioCorsFallback(false);
    setIsTouchLocked(false);
    setLoopPointA(null);
    setLoopPointB(null);
    setAutoNextCountdown(null);
    setWatchPartyRoom(initialPartyRoom || null);
    setActiveSubLang('off');
    setParsedSubCues([]);
    setActiveCue(null);
    activeCueRef.current = null;
    setDetectedHardcodedSubs(false);
    hardSubCorsBlockedRef.current = false;
    setUploadedSubCues(null);
    setRevealedSpoilerEpKeys({});
    pendingRestoreTimeRef.current =
      initialTimestamp && initialTimestamp > 0 ? { time: initialTimestamp, shouldPlay: true } : null;

    if (!drama) {
      setActiveStreamEp(null);
      setIsStreamUnlocked(false);
      return;
    }

    const pickPreferredTrackForEp = (targetEp: number | null): AudioType => {
      const tracksOrder: AudioType[] = ['Hindi Dubbed', 'Hindi Fan Dubbed', 'Original / Eng Sub'];
      if (targetEp !== null) {
        const matchTrack = tracksOrder.find((tr) =>
          getStreamableEpisodesForTrack(tr).some((e) => e.epNum === targetEp)
        );
        if (matchTrack) return matchTrack;
      }
      if (
        audioLinkMap['Hindi Dubbed']?.startsWith('http') ||
        getStreamableEpisodesForTrack('Hindi Dubbed').length > 0
      ) {
        return 'Hindi Dubbed';
      }
      if (
        audioLinkMap['Hindi Fan Dubbed']?.startsWith('http') ||
        getStreamableEpisodesForTrack('Hindi Fan Dubbed').length > 0
      ) {
        return 'Hindi Fan Dubbed';
      }
      if (
        audioLinkMap['Original / Eng Sub']?.startsWith('http') ||
        getStreamableEpisodesForTrack('Original / Eng Sub').length > 0
      ) {
        return 'Original / Eng Sub';
      }
      return availableTrackList[0] || 'Hindi Dubbed';
    };

    const chosenTrack = initialTrack || pickPreferredTrackForEp(initialEpisode);
    setActiveAudio(chosenTrack);

    if (initialEpisode !== null && initialEpisode !== undefined) {
      setActiveStreamEp(initialEpisode);
      setIsStreamUnlocked(true);
    } else if (initialTimestamp && initialTimestamp > 0) {
      const fallbackEp = getStreamableEpisodesForTrack(chosenTrack)[0]?.epNum ?? 1;
      setActiveStreamEp(fallbackEp);
      setIsStreamUnlocked(true);
    } else {
      setActiveStreamEp(null);
      setIsStreamUnlocked(false);
    }
    prevInitialEpisodeRef.current = initialEpisode;
  }, [drama?.id]);

  // Sync deep-link initialEpisode changes on browser Back/Forward (popstate)
  useEffect(() => {
    if (!drama) return;
    if (prevInitialEpisodeRef.current === initialEpisode) return;
    prevInitialEpisodeRef.current = initialEpisode;

    if (initialEpisode !== null && initialEpisode !== undefined) {
      const tracksOrder: AudioType[] = ['Hindi Dubbed', 'Hindi Fan Dubbed', 'Original / Eng Sub'];
      const matchTrack = tracksOrder.find((tr) =>
        getStreamableEpisodesForTrack(tr).some((e) => e.epNum === initialEpisode)
      );
      if (matchTrack) setActiveAudio(matchTrack);
      setActiveStreamEp(initialEpisode);
      setIsStreamUnlocked(true);
    } else {
      if (audioRef.current) audioRef.current.pause();
      setActiveStreamEp(null);
      setIsStreamUnlocked(false);
    }
  }, [initialEpisode, drama?.id]);

  // Apply playbackRate to native <video> & synced <audio> whenever speed or active video changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeStreamEp, activeAudio, isStreamUnlocked, streamReloadNonce, activeMirrorIndex]);

  useEffect(() => {
    return () => {
      if (hudTimerRef.current !== null) {
        window.clearTimeout(hudTimerRef.current);
      }
      if (seekRippleTimerRef.current !== null) {
        window.clearTimeout(seekRippleTimerRef.current);
      }
      if (videoAudioNodeRef.current) {
        videoAudioNodeRef.current.ctx.close().catch(() => {});
        videoAudioNodeRef.current = null;
      }
      if (studioAudioGraphRef.current) {
        studioAudioGraphRef.current.ctx.close().catch(() => {});
        studioAudioGraphRef.current = null;
      }
    };
  }, []);

  // Precompute streamable lists per track
  const streamablesByTrack = useMemo(() => {
    return {
      'Hindi Dubbed': getStreamableEpisodesForTrack('Hindi Dubbed'),
      'Hindi Fan Dubbed': getStreamableEpisodesForTrack('Hindi Fan Dubbed'),
      'Original / Eng Sub': getStreamableEpisodesForTrack('Original / Eng Sub'),
    };
  }, [drama]);

  if (!drama) return null;

  const isMovie =
    drama.isMovie ||
    drama.category.toLowerCase().includes('movie') ||
    drama.category.toLowerCase().includes('bolly') ||
    drama.category.toLowerCase().includes('holly') ||
    Boolean(drama.details && (drama.details.includes(':') || drama.details.toLowerCase().includes('movie')));

  const hasActiveTrackSchedules = Boolean(drama.activeTrackSchedules && drama.activeTrackSchedules.length > 0);
  const isDroppingToday = hasActiveTrackSchedules
    ? Boolean(drama.activeTrackSchedules?.some((t) => isAiringToday(t.scheduleText)))
    : Boolean(drama.activeTrackSchedules === undefined && drama.schedule && isAiringToday(drama.schedule));

  const currentAudioLink = audioLinkMap[activeAudio] || audioLinkMap[availableTrackList[0]];

  const activeTrackStreamables =
    streamablesByTrack[
      activeAudio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : (activeAudio as keyof typeof streamablesByTrack)
    ] || [];

  // Hero stream target: prefers activeAudio, else first available track with online streams
  const heroStreamTarget: { track: AudioType; ep: StreamableEpisodeEntry } | null = (() => {
    if (activeTrackStreamables.length > 0) {
      return { track: activeAudio, ep: activeTrackStreamables[0] };
    }
    for (const tr of ['Hindi Dubbed', 'Hindi Fan Dubbed', 'Original / Eng Sub'] as AudioType[]) {
      const list = streamablesByTrack[tr as keyof typeof streamablesByTrack];
      if (list && list.length > 0) {
        return { track: tr, ep: list[0] };
      }
    }
    return null;
  })();

  // Current playing stream item (never resolve or expose raw stream src in DOM unless isStreamUnlocked is true)
  const currentPlayingStream: StreamableEpisodeEntry | null =
    activeStreamEp !== null
      ? activeTrackStreamables.find((item) => item.epNum === activeStreamEp) || activeTrackStreamables[0] || null
      : null;

  const currentEpObj = drama.episodes.find(
    (ep) =>
      extractNumericEp(ep.episodeNumber) === (currentPlayingStream?.epNum ?? activeStreamEp) &&
      (activeAudio === 'Hindi Fan Dubbed' || activeAudio === 'Fan Dubbed'
        ? ep.audio === 'Hindi Fan Dubbed' || ep.audio === 'Fan Dubbed'
        : ep.audio === activeAudio)
  );
  const activeCustomThumbnail =
    currentEpObj?.thumbnailUrl ||
    (activeStreamEp !== null ? drama.episodeThumbnails?.[activeStreamEp] : undefined) ||
    drama.thumbnailUrl;

  const activeEpNumForLookup = currentPlayingStream?.epNum ?? activeStreamEp;

  const sheetSubtitleTracks = useMemo(() => {
    const epSubs = currentEpObj?.subtitleTracks || [];
    const dramaSubs = drama.subtitleTracks || [];
    const merged = [...epSubs];
    dramaSubs.forEach((s) => {
      if (!merged.some((x) => x.url === s.url)) merged.push(s);
    });
    return merged;
  }, [currentEpObj, drama.subtitleTracks]);

  const availableSubLanguages = useMemo(() => {
    const epMatch =
      (currentEpObj?.subtitles && Object.keys(currentEpObj.subtitles).length > 0 ? currentEpObj : undefined) ||
      (activeEpNumForLookup !== null
        ? drama.episodes.find(
            (ep) =>
              extractNumericEp(ep.episodeNumber) === activeEpNumForLookup &&
              ep.subtitles &&
              Object.keys(ep.subtitles).length > 0
          )
        : undefined);

    const subMap: Record<string, SubtitleTrackItem> =
      epMatch?.subtitles ||
      (drama.subtitles && Object.keys(drama.subtitles).length > 0 ? drama.subtitles : {});

    const items = Object.values(subMap).map((item) => {
      const capCode = item.code.charAt(0).toUpperCase() + item.code.slice(1);
      const epTag = activeEpNumForLookup !== null && !isMovie ? `${capCode}${activeEpNumForLookup}` : capCode;
      return {
        ...item,
        displayLabel: `${item.label} (${epTag})`,
      };
    });

    if (items.length === 0 && sheetSubtitleTracks.length > 0) {
      sheetSubtitleTracks.forEach((legacy, idx) => {
        const code = `sub${idx + 1}`;
        items.push({
          code,
          label: legacy.label,
          langTag: legacy.label.toLowerCase().includes('eng') ? 'en-US' : 'hi-IN',
          url: legacy.url,
          displayLabel: legacy.label,
        });
      });
    }

    return items;
  }, [currentEpObj, activeEpNumForLookup, drama.episodes, drama.subtitles, sheetSubtitleTracks, isMovie]);
  const trackCustomAudio = (() => {
    if (activeEpNumForLookup === null) return undefined;
    const lookupField =
      activeAudio === 'Hindi Dubbed'
        ? 'hindiCustomAudioLink'
        : activeAudio === 'Hindi Fan Dubbed' || activeAudio === 'Fan Dubbed'
        ? 'fanDubCustomAudioLink'
        : 'origCustomAudioLink';
    if (currentEpObj?.[lookupField]) return currentEpObj[lookupField];
    const fallbackEp = drama.episodes.find(
      (ep) => extractNumericEp(ep.episodeNumber) === activeEpNumForLookup && Boolean(ep[lookupField])
    );
    return fallbackEp?.[lookupField];
  })();

  const resolvedPlayerSource =
    isStreamUnlocked && currentPlayingStream
      ? resolveVideoPlayerSource(currentPlayingStream.streamUrl, activeMirrorIndex)
      : null;

  const isExternalAudioActive =
    Boolean(trackCustomAudio) && !forceBuiltinAudio && resolvedPlayerSource?.type === 'video';

  const currentSourceMeta = currentPlayingStream
    ? resolveVideoPlayerSource(currentPlayingStream.streamUrl, activeMirrorIndex)
    : null;

  const attachVideoSilenceRouter = (vid: HTMLVideoElement, shouldSilence: boolean) => {
    try {
      let entry = videoAudioNodeRef.current;
      if (!entry || entry.el !== vid) {
        if (entry) {
          entry.ctx.close().catch(() => {});
          videoAudioNodeRef.current = null;
        }
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
          if (shouldSilence) setIsAudioCorsFallback((prev) => (prev ? prev : true));
          return;
        }
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(vid);
        const gain = ctx.createGain();
        gain.gain.value = shouldSilence ? 0 : 1;
        source.connect(gain);
        gain.connect(ctx.destination);
        entry = { el: vid, ctx, gain };
        videoAudioNodeRef.current = entry;
      } else {
        entry.gain.gain.value = shouldSilence ? 0 : 1;
      }
      if (entry.ctx.state === 'suspended') {
        entry.ctx.resume().catch(() => {});
      }
      setIsAudioCorsFallback((prev) => (prev ? false : prev));
    } catch {
      if (shouldSilence) {
        setIsAudioCorsFallback((prev) => (prev ? prev : true));
      }
    }
  };

  const syncAudioToVideo = (forcePlay = false) => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid || !aud || !isExternalAudioActive) return;

    attachVideoSilenceRouter(vid, true);
    aud.volume = isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume));
    aud.muted = isAudioMuted;
    aud.playbackRate = vid.playbackRate || playbackSpeed;

    const targetTime = Math.max(0, vid.currentTime + audioSyncOffset);
    if (Number.isFinite(targetTime) && Math.abs(aud.currentTime - targetTime) > 0.28) {
      try {
        aud.currentTime = targetTime;
      } catch {
        // Audio metadata not ready yet; onLoadedMetadata/onCanPlay will sync
      }
    }

    if (forcePlay || !vid.paused) {
      if (aud.paused) {
        aud.play().catch(() => {});
      }
    } else if (!aud.paused) {
      aud.pause();
    }
  };

  // CORS-safe probe before attaching crossOrigin / Web Audio EQ+Boost on the audible media element
  const activeAudibleUrl = isExternalAudioActive ? trackCustomAudio || '' : resolvedPlayerSource?.type === 'video' ? resolvedPlayerSource.src : '';
  const wantsAudioStudio = audioEqMode !== 'normal' || volumeBoost > 100;

  useEffect(() => {
    if (!wantsAudioStudio || !activeAudibleUrl || !/^https?:\/\//i.test(activeAudibleUrl)) {
      setAudibleCorsSupported(false);
      return;
    }
    if (activeAudibleUrl in corsCheckCacheRef.current) {
      setAudibleCorsSupported(corsCheckCacheRef.current[activeAudibleUrl]);
      return;
    }
    let cancelled = false;
    fetch(activeAudibleUrl, { method: 'HEAD', mode: 'cors' })
      .then((res) => {
        const ok = res.ok;
        corsCheckCacheRef.current[activeAudibleUrl] = ok;
        if (!cancelled) setAudibleCorsSupported(ok);
      })
      .catch(() => {
        corsCheckCacheRef.current[activeAudibleUrl] = false;
        if (!cancelled) setAudibleCorsSupported(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wantsAudioStudio, activeAudibleUrl]);

  const applyStudioEqGraph = (audibleEl: HTMLMediaElement | null) => {
    if (!audibleEl || !wantsAudioStudio || !audibleCorsSupported) {
      if (studioAudioGraphRef.current) {
        try {
          const g = studioAudioGraphRef.current;
          g.highpass.frequency.value = 10;
          g.lowshelf.gain.value = 0;
          g.peaking.gain.value = 0;
          g.highshelf.gain.value = 0;
          g.compressor.threshold.value = 0;
          g.compressor.ratio.value = 1;
          g.gain.gain.value = isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume));
        } catch {
          // ignore
        }
      }
      return;
    }
    try {
      let graph = studioAudioGraphRef.current;
      if (!graph || graph.el !== audibleEl) {
        if (graph) {
          graph.ctx.close().catch(() => {});
          studioAudioGraphRef.current = null;
        }
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(audibleEl);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 10;

        const lowshelf = ctx.createBiquadFilter();
        lowshelf.type = 'lowshelf';
        lowshelf.frequency.value = 95;
        lowshelf.gain.value = 0;

        const peaking = ctx.createBiquadFilter();
        peaking.type = 'peaking';
        peaking.frequency.value = 2200;
        peaking.Q.value = 1.1;
        peaking.gain.value = 0;

        const highshelf = ctx.createBiquadFilter();
        highshelf.type = 'highshelf';
        highshelf.frequency.value = 8000;
        highshelf.gain.value = 0;

        const compressor = ctx.createDynamicsCompressor();
        const gain = ctx.createGain();

        source.connect(highpass);
        highpass.connect(lowshelf);
        lowshelf.connect(peaking);
        peaking.connect(highshelf);
        highshelf.connect(compressor);
        compressor.connect(gain);
        gain.connect(ctx.destination);

        graph = { el: audibleEl, ctx, highpass, lowshelf, peaking, highshelf, compressor, gain };
        studioAudioGraphRef.current = graph;
      }

      if (graph.ctx.state === 'suspended') {
        graph.ctx.resume().catch(() => {});
      }

      // Reset then apply active EQ profile
      graph.highpass.frequency.value = audioEqMode === 'dialogue' ? 110 : 10;
      graph.peaking.gain.value = audioEqMode === 'dialogue' ? 7 : 0;
      graph.lowshelf.gain.value = audioEqMode === 'bass3d' ? 8 : 0;
      graph.highshelf.gain.value = audioEqMode === 'bass3d' ? 4 : 0;
      if (audioEqMode === 'night') {
        graph.compressor.threshold.value = -28;
        graph.compressor.ratio.value = 8;
        graph.compressor.knee.value = 20;
      } else {
        graph.compressor.threshold.value = 0;
        graph.compressor.ratio.value = 1;
      }

      const boostMult = volumeBoost / 100;
      graph.gain.gain.value = isAudioMuted ? 0 : Math.min(2.0, Math.max(0, audioVolume * boostMult));
    } catch {
      // Fallback safely to native audio
    }
  };

  // Keep master audio volume, mute, EQ, 200% boost & lip-sync offset synchronized in real time while keeping native speaker UNMUTED
  useEffect(() => {
    const aud = audioRef.current;
    const vid = videoRef.current;
    const nativeVol = isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume * (audibleCorsSupported && wantsAudioStudio ? 1 : volumeBoost / 100)));

    if (isExternalAudioActive) {
      if (vid) {
        attachVideoSilenceRouter(vid, true);
        if (isAudioCorsFallback) {
          vid.muted = true;
        } else {
          vid.muted = isAudioMuted;
          vid.volume = isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume));
        }
      }
      if (aud && vid) {
        aud.volume = audibleCorsSupported && wantsAudioStudio ? (isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume))) : nativeVol;
        aud.muted = isAudioMuted;
        aud.playbackRate = vid.playbackRate || playbackSpeed;
        applyStudioEqGraph(aud);
        const targetTime = Math.max(0, vid.currentTime + audioSyncOffset);
        if (Number.isFinite(targetTime) && Math.abs(aud.currentTime - targetTime) > 0.15) {
          try {
            aud.currentTime = targetTime;
          } catch {
            // Audio not loaded yet
          }
        }
        if (!vid.paused && aud.paused) {
          aud.play().catch(() => {});
        }
      }
    } else {
      if (aud && !aud.paused) {
        aud.pause();
      }
      if (vid) {
        if (videoAudioNodeRef.current && videoAudioNodeRef.current.el === vid) {
          videoAudioNodeRef.current.gain.gain.value = 1;
        }
        vid.muted = isAudioMuted;
        vid.volume = audibleCorsSupported && wantsAudioStudio ? (isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume))) : nativeVol;
        applyStudioEqGraph(vid);
      }
    }
  }, [audioVolume, isAudioMuted, audioSyncOffset, isExternalAudioActive, isAudioCorsFallback, trackCustomAudio, activeAudio, audioEqMode, volumeBoost, audibleCorsSupported, wantsAudioStudio]);

  // Detect burned-in subtitles in lower video subtitle zone (78%–92% height) via canvas pixel contrast
  const detectLowerRegionHardSubs = (vid: HTMLVideoElement) => {
    if (subBackdropMode !== 'auto' || hardSubCorsBlockedRef.current || vid.videoWidth <= 0 || vid.videoHeight <= 0) {
      return;
    }
    const now = Date.now();
    if (now - lastHardSubScanMsRef.current < 650) return;
    lastHardSubScanMsRef.current = now;

    try {
      if (!hardSubCanvasRef.current) {
        hardSubCanvasRef.current = document.createElement('canvas');
        hardSubCanvasRef.current.width = 160;
        hardSubCanvasRef.current.height = 28;
      }
      const canvas = hardSubCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const sx = Math.floor(vid.videoWidth * 0.14);
      const sw = Math.max(16, Math.floor(vid.videoWidth * 0.72));
      const sy = Math.floor(vid.videoHeight * 0.76);
      const sh = Math.max(8, Math.floor(vid.videoHeight * 0.2));

      ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let brightContrastHits = 0;
      let rowsWithText = 0;
      for (let y = 0; y < canvas.height; y++) {
        let rowHits = 0;
        let prevLuma = 0;
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (x > 0 && ((luma >= 180 && Math.abs(luma - prevLuma) >= 65) || (prevLuma >= 180 && Math.abs(luma - prevLuma) >= 65))) {
            rowHits++;
          }
          prevLuma = luma;
        }
        if (rowHits >= 4 && rowHits <= 80) {
          rowsWithText++;
          brightContrastHits += rowHits;
        }
      }

      const detected = rowsWithText >= 2 && brightContrastHits >= 12;
      setDetectedHardcodedSubs((prev) => (prev === detected ? prev : detected));
    } catch {
      hardSubCorsBlockedRef.current = true;
    }
  };

  const shouldBlurSubArea =
    subBackdropMode === 'blur' ||
    (subBackdropMode === 'auto' &&
      (hardSubCorsBlockedRef.current ? hasHardcodedSubtitles : detectedHardcodedSubs));

  const handleSelectSubLang = (langCode: string) => {
    setActiveSubLang(langCode);
    setActiveCue(null);
    activeCueRef.current = null;
    if (langCode === 'off') {
      showHudFeedback('💬 Subtitles: Off');
    } else if (langCode === 'local') {
      showHudFeedback('💬 Subtitles: Local File Active');
    } else {
      const matched = availableSubLanguages.find((s) => s.code === langCode);
      if (matched) showHudFeedback(`💬 ${matched.displayLabel} Active`);
    }
  };

  // Auto-Fetch & Parse Remote .SRT / .MD.SRT / .VTT Subtitle File whenever activeSubLang or episode changes
  useEffect(() => {
    if (activeSubLang === 'off') {
      setParsedSubCues([]);
      setActiveCue(null);
      activeCueRef.current = null;
      setIsSubLoading(false);
      return;
    }
    if (activeSubLang === 'local' && uploadedSubCues) {
      setParsedSubCues(uploadedSubCues.cues);
      setIsSubLoading(false);
      return;
    }
    const track =
      currentEpObj?.subtitles?.[activeSubLang] ||
      availableSubLanguages.find((s) => s.code === activeSubLang);
    const resolvedUrl = track?.url ? normalizeSubtitleUrl(track.url) : '';
    if (resolvedUrl && (/^https?:\/\//i.test(resolvedUrl) || /^data:/i.test(resolvedUrl))) {
      let cancelled = false;
      setIsSubLoading(true);
      fetch(resolvedUrl)
        .then((r) => {
          if (!r.ok) throw new Error('Subtitle fetch failed');
          return r.text();
        })
        .then((txt) => {
          if (!cancelled) {
            const cues = parseSrtOrVttContent(txt);
            setParsedSubCues(cues);
            setIsSubLoading(false);
            if (cues.length === 0) {
              showHudFeedback('⚠️ Subtitle file empty or unsupported format');
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            setParsedSubCues([]);
            setIsSubLoading(false);
            showHudFeedback('⚠️ Unable to load subtitle track');
          }
        });
      return () => {
        cancelled = true;
      };
    } else {
      setParsedSubCues([]);
      setIsSubLoading(false);
    }
  }, [activeSubLang, availableSubLanguages, currentEpObj, uploadedSubCues]);

  // Auto-Next 5-Second Countdown interval
  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      setAutoNextCountdown(null);
      if (nextStreamItem) {
        pendingRestoreTimeRef.current = null;
        setActiveStreamEp(nextStreamItem.epNum);
        onActiveEpisodeChange?.(nextStreamItem.epNum);
        setIsStreamUnlocked(true);
        const markKey = nextStreamItem.episodeKey ?? nextStreamItem.epNum;
        if (drama && !watchedEpisodes.includes(markKey) && !watchedEpisodes.includes('all')) {
          onToggleEpisodeWatched(drama.id, markKey);
        }
      }
      return;
    }
    const timer = window.setTimeout(() => {
      setAutoNextCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [autoNextCountdown]);

  // Sleep Timer (30m / 60m) fade & pause
  useEffect(() => {
    if (sleepTimerMode !== '30m' && sleepTimerMode !== '60m') return;
    const ms = sleepTimerMode === '30m' ? 30 * 60 * 1000 : 60 * 60 * 1000;
    const timer = window.setTimeout(() => {
      const vid = videoRef.current;
      const aud = audioRef.current;
      if (vid) {
        let step = 0;
        const startVol = vid.volume;
        const fade = window.setInterval(() => {
          step += 1;
          const factor = Math.max(0, 1 - step / 10);
          vid.volume = startVol * factor;
          if (aud) aud.volume = startVol * factor;
          if (step >= 10) {
            window.clearInterval(fade);
            vid.pause();
            if (aud) aud.pause();
            vid.volume = startVol;
            if (aud) aud.volume = startVol;
          }
        }, 200);
      }
      setSleepTimerMode('off');
      showHudFeedback('🌙 Sleep Timer: Playback Paused');
    }, ms);
    return () => window.clearTimeout(timer);
  }, [sleepTimerMode]);

  const currentStreamIndex = currentPlayingStream
    ? activeTrackStreamables.findIndex((item) => item.epNum === currentPlayingStream.epNum)
    : -1;
  const prevStreamItem = currentStreamIndex > 0 ? activeTrackStreamables[currentStreamIndex - 1] : null;
  const nextStreamItem =
    currentStreamIndex >= 0 && currentStreamIndex < activeTrackStreamables.length - 1
      ? activeTrackStreamables[currentStreamIndex + 1]
      : null;

  const totalEpisodesNum =
    drama.totalEpisodes ||
    (() => {
      const m = drama.details?.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : activeTrackStreamables.length || 16;
    })();

  // Quick audio tracks inside player that have stream link for the currently playing episode
  const playerTrackSwitcherList = (
    [
      { track: 'Hindi Dubbed' as AudioType, label: '🔊 Hindi Dub' },
      { track: 'Hindi Fan Dubbed' as AudioType, label: '🎙️ Fan Dub' },
      { track: 'Original / Eng Sub' as AudioType, label: '💬 Original' },
    ] as const
  ).filter((item) => {
    const list = streamablesByTrack[item.track as keyof typeof streamablesByTrack];
    if (!list || list.length === 0) return false;
    if (activeStreamEp === null) return true;
    return list.some((s) => s.epNum === activeStreamEp);
  });

  const activeAudioBadgeText =
    activeAudio === 'Hindi Dubbed'
      ? '🔊 HINDI DUBBED'
      : activeAudio.includes('Fan')
      ? '🎙️ FAN DUBBED'
      : '💬 ORIGINAL';

  const handleSwitchPlayerTrack = (nextTrack: AudioType) => {
    if (nextTrack === activeAudio) return;
    const vid = videoRef.current;
    const currentTime = vid && Number.isFinite(vid.currentTime) ? vid.currentTime : 0;
    const wasPlaying = vid ? !vid.paused : false;

    const nextList =
      streamablesByTrack[
        nextTrack === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : (nextTrack as keyof typeof streamablesByTrack)
      ] || [];
    const nextEpEntry =
      activeStreamEp !== null
        ? nextList.find((item) => item.epNum === activeStreamEp) || nextList[0]
        : nextList[0];
    const nextResolved = nextEpEntry ? resolveVideoPlayerSource(nextEpEntry.streamUrl, 0) : null;
    const isDifferentVideoSrc =
      Boolean(nextResolved?.src) && resolvedPlayerSource?.src !== nextResolved?.src;

    if (currentTime > 0.5 && isDifferentVideoSrc) {
      pendingRestoreTimeRef.current = { time: currentTime, shouldPlay: wasPlaying };
    } else {
      pendingRestoreTimeRef.current = null;
    }

    if (isDifferentVideoSrc) {
      setIsVideoLoading(true);
    }
    setActiveAudio(nextTrack);
    showHudFeedback(`🎧 Audio: ${nextTrack}`);
  };

  const handleOpenStream = (
    epNum: number,
    trackOverride?: AudioType,
    epKey?: number | string,
    clickEvent?: React.MouseEvent
  ) => {
    pendingRestoreTimeRef.current = null;
    if (trackOverride) {
      setActiveAudio(trackOverride);
    }
    setActiveStreamEp(epNum);
    onActiveEpisodeChange?.(epNum);

    // Only unlock immediately for trusted human mouse/touch clicks
    if (clickEvent && clickEvent.nativeEvent?.isTrusted) {
      setIsStreamUnlocked(true);
    }

    const markKey = epKey ?? epNum;
    if (!watchedEpisodes.includes(markKey) && !watchedEpisodes.includes('all')) {
      onToggleEpisodeWatched(drama.id, markKey);
    }

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 30);
  };

  const handleUnlockPrivacyGate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.nativeEvent?.isTrusted) {
      setIsStreamUnlocked(true);
    }
  };

  const handleClosePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    pendingRestoreTimeRef.current = null;
    setActiveStreamEp(null);
    onActiveEpisodeChange?.(null);
    setActiveMirrorIndex(0);
    setIsStreamUnlocked(false);
    setIsLightsOff(false);
    setIsTheaterMode(false);
    setHudToast(null);
    setIframeControlNotice(false);
  };

  const triggerSeekRipple = (side: 'left' | 'right') => {
    if (seekRippleTimerRef.current !== null) {
      window.clearTimeout(seekRippleTimerRef.current);
    }
    setSeekRipple({ side, nonce: Date.now() });
    seekRippleTimerRef.current = window.setTimeout(() => {
      setSeekRipple(null);
    }, 500);
  };

  const handleSeek = (deltaSeconds: number, feedbackLabel: string) => {
    if (resolvedPlayerSource?.type === 'iframe') {
      iframeRef.current?.focus();
      setIframeControlNotice(true);
      return;
    }

    if (videoRef.current) {
      const nextTime = Math.max(0, videoRef.current.currentTime + deltaSeconds);
      videoRef.current.currentTime = nextTime;
      if (isExternalAudioActive && audioRef.current) {
        try {
          audioRef.current.currentTime = Math.max(0, nextTime + audioSyncOffset);
        } catch {
          // Ignore if audio metadata not ready
        }
      }
      if (deltaSeconds === -10 || deltaSeconds === 10) {
        triggerSeekRipple(deltaSeconds < 0 ? 'left' : 'right');
      } else {
        showHudFeedback(feedbackLabel);
      }
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackSpeed(rate);
    if (resolvedPlayerSource?.type === 'iframe') {
      iframeRef.current?.focus();
      setIframeControlNotice(true);
      return;
    }

    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      if (isExternalAudioActive && audioRef.current) {
        audioRef.current.playbackRate = rate;
      }
      showHudFeedback(`⚡ Speed: ${rate}x`);
    }
  };

  const handleQualityChange = (qualityId: string) => {
    setSelectedQuality(qualityId);
    if (resolvedPlayerSource?.type === 'iframe') {
      iframeRef.current?.focus();
      setIframeControlNotice(true);
      return;
    }
    const meta = QUALITY_OPTIONS.find((q) => q.id === qualityId);
    showHudFeedback(meta ? meta.hudText : `💎 Quality: ${qualityId}`);
  };

  const handleMirrorSelect = (idx: number, label: string) => {
    setActiveMirrorIndex(idx);
    setIframeControlNotice(false);
    setIsVideoPlaying(false);
    setIsVideoLoading(true);
    setStreamReloadNonce((n) => n + 1);
    showHudFeedback(`Switched to ${label}`);
  };

  const handleFullscreen = () => {
    const target = playerContainerRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    target.requestFullscreen?.().catch(() => {});
  };

  const handleReloadStream = () => {
    setIframeControlNotice(false);
    setIsVideoPlaying(false);
    setIsVideoLoading(true);
    setStreamReloadNonce((n) => n + 1);
    showHudFeedback('🔄 Stream Reloaded');
  };

  const triggerShareToast = (msg: string) => {
    setShareToast(msg);
    window.setTimeout(() => {
      setShareToast((curr) => (curr === msg ? null : curr));
    }, 2600);
  };

  const handleShare = () => {
    const seriesUrl = `https://asiaflixprime.pages.dev/watch/${createDramaSlug(drama)}`;
    navigator.clipboard?.writeText(seriesUrl).catch(() => {});
    setCopied(true);
    triggerShareToast('✅ Direct Series Link Copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyEpisodeLink = () => {
    if (activeStreamEp === null) return;
    const epUrl = `https://asiaflixprime.pages.dev/watch/${createDramaSlug(drama)}/ep-${activeStreamEp}`;
    navigator.clipboard?.writeText(epUrl).catch(() => {});
    setEpLinkCopied(true);
    triggerShareToast(`✅ Direct Episode ${activeStreamEp} Link Copied!`);
    showHudFeedback(`🔗 Ep ${activeStreamEp} Link Copied!`);
    setTimeout(() => setEpLinkCopied(false), 2500);
  };

  const handleResumeSavedProgress = (clickEvent?: React.MouseEvent) => {
    if (!savedDramaProgress) return;
    pendingRestoreTimeRef.current = { time: savedDramaProgress.currentTime, shouldPlay: true };
    const trackToUse = savedDramaProgress.track || activeAudio;
    setActiveAudio(trackToUse);
    setActiveStreamEp(savedDramaProgress.ep);
    onActiveEpisodeChange?.(savedDramaProgress.ep);
    if (!clickEvent || clickEvent.nativeEvent?.isTrusted) {
      setIsStreamUnlocked(true);
    }
    showHudFeedback(`▶ Resuming Ep ${savedDramaProgress.ep} from ${formatTimeSeconds(savedDramaProgress.currentTime)}`);
  };

  const handleSceneSnapshot = () => {
    const vid = videoRef.current;
    const t = vid ? vid.currentTime : 0;
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stampCollectorOverlay = () => {
      const grad = ctx.createLinearGradient(0, canvas.height - 110, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height - 110, canvas.width, 110);

      ctx.fillStyle = '#e50914';
      ctx.fillRect(28, canvas.height - 62, 130, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('ASIAFLIX PRIME', 38, canvas.height - 39);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      const labelText = `${drama.title} • ${isMovie ? 'Full Movie' : `Ep ${activeStreamEp ?? 1}`} [${formatTimeSeconds(t)}]`;
      ctx.fillText(labelText.slice(0, 72), 174, canvas.height - 37);
    };

    const triggerDownload = (dataUrl: string) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${createDramaSlug(drama)}-ep${activeStreamEp ?? 1}-${Math.floor(t)}s.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showHudFeedback('📸 HD Scene Snapshot Saved!');
    };

    try {
      if (vid && vid.videoWidth > 0 && resolvedPlayerSource?.type === 'video') {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        stampCollectorOverlay();
        const url = canvas.toDataURL('image/png');
        triggerDownload(url);
        return;
      }
    } catch {
      // Tainted cross-origin video canvas -> fallback cleanly to stylized Collector Card PNG
    }

    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#0a0b12');
    bgGrad.addColorStop(0.5, '#250912');
    bgGrad.addColorStop(1, '#08090f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('✨ ASIAFLIX PRIME VIP SCENE COLLECTOR CARD', 60, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(drama.title.slice(0, 38), 60, 220);

    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${isMovie ? 'Full Movie' : `Episode ${activeStreamEp ?? 1}`}  •  Timestamp ${formatTimeSeconds(t)}`, 60, 290);

    stampCollectorOverlay();
    triggerDownload(canvas.toDataURL('image/png'));
  };

  const handleToggleABLoop = () => {
    const vid = videoRef.current;
    if (!vid || resolvedPlayerSource?.type === 'iframe') {
      setIframeControlNotice(true);
      return;
    }
    const nowT = Math.floor(vid.currentTime * 10) / 10;
    if (loopPointA === null) {
      setLoopPointA(nowT);
      setLoopPointB(null);
      showHudFeedback(`🔁 Loop Point A Set (${formatTimeSeconds(nowT)})`);
    } else if (loopPointB === null) {
      const pointA = loopPointA;
      const pointB = nowT <= pointA + 0.5 ? pointA + 5 : nowT;
      setLoopPointB(pointB);
      showHudFeedback(`🔁 Looping ${formatTimeSeconds(pointA)} → ${formatTimeSeconds(pointB)}`);
    } else {
      setLoopPointA(null);
      setLoopPointB(null);
      showHudFeedback('🔁 A–B Scene Loop Cleared');
    }
  };

  const handleCopyClipLink = () => {
    if (activeStreamEp === null) return;
    const t = Math.floor(loopPointA ?? videoRef.current?.currentTime ?? 0);
    const clipUrl = `https://asiaflixprime.pages.dev/watch/${createDramaSlug(drama)}/ep-${activeStreamEp}?t=${t}`;
    navigator.clipboard?.writeText(clipUrl).catch(() => {});
    triggerShareToast(`🔗 Clip Link Copied (${formatTimeSeconds(t)})!`);
    showHudFeedback(`🔗 Clip Link Copied (${formatTimeSeconds(t)})`);
  };

  const handleSaveMoment = () => {
    if (!drama || activeStreamEp === null) return;
    const t = Math.floor(videoRef.current?.currentTime ?? 0);
    const bm: SceneBookmark = {
      id: `bm-${Date.now()}`,
      ep: activeStreamEp,
      time: t,
      label: `Ep ${activeStreamEp} • ${formatTimeSeconds(t)}`,
      createdAt: Date.now(),
    };
    const next = saveSceneBookmark(drama.id, bm);
    setSceneBookmarks(next);
    showHudFeedback(`🔖 Saved ${bm.label}`);
  };

  const handleJumpToBookmark = (bm: SceneBookmark) => {
    pendingRestoreTimeRef.current = { time: bm.time, shouldPlay: true };
    if (activeStreamEp === bm.ep && videoRef.current) {
      videoRef.current.currentTime = bm.time;
      if (isExternalAudioActive && audioRef.current) {
        try {
          audioRef.current.currentTime = Math.max(0, bm.time + audioSyncOffset);
        } catch {}
      }
      videoRef.current.play().catch(() => {});
      pendingRestoreTimeRef.current = null;
    } else {
      setActiveStreamEp(bm.ep);
      onActiveEpisodeChange?.(bm.ep);
      setIsStreamUnlocked(true);
    }
    showHudFeedback(`🔖 Jumped to ${bm.label}`);
  };

  const handleStartWatchParty = () => {
    if (activeStreamEp === null) return;
    const code = watchPartyRoom || Math.random().toString(36).slice(2, 7).toUpperCase();
    setWatchPartyRoom(code);
    const t = Math.floor(videoRef.current?.currentTime ?? 0);
    const trackParam =
      activeAudio === 'Hindi Dubbed' ? 't1' : activeAudio.includes('Fan') ? 't2' : 't3';
    const partyUrl = `https://asiaflixprime.pages.dev/watch/${createDramaSlug(drama)}/ep-${activeStreamEp}?party=${code}&t=${t}&track=${trackParam}`;
    navigator.clipboard?.writeText(partyUrl).catch(() => {});
    triggerShareToast(`👯‍♂️ Watch Party Room #${code} Link Copied!`);
    showHudFeedback(`👯‍♂️ Party #${code} Active!`);
  };

  const handleSendPartyBurst = (emoji: string) => {
    const id = `pr-${Date.now()}-${Math.random()}`;
    const leftPct = 15 + Math.random() * 70;
    setPartyReactions((prev) => [...prev.slice(-10), { id, emoji, leftPct }]);
    window.setTimeout(() => {
      setPartyReactions((prev) => prev.filter((p) => p.id !== id));
    }, 2200);
  };

  const handleStampDanmaku = (text: string) => {
    if (!drama || activeStreamEp === null) return;
    const t = videoRef.current?.currentTime ?? 0;
    const updated = addDanmakuCue(drama.id, activeStreamEp, t, text);
    setDanmakuCues(updated);
    const floatId = `dm-now-${Date.now()}`;
    const topPct = 14 + Math.floor(Math.random() * 14);
    setFloatingDanmaku((prev) => [...prev.slice(-6), { id: floatId, text, topPct }]);
    window.setTimeout(() => {
      setFloatingDanmaku((prev) => prev.filter((d) => d.id !== floatId));
    }, 6600);
    if (watchPartyRoom) {
      handleSendPartyBurst(text.split(' ')[0] || '🔥');
    }
  };

  const handleSubtitleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const cues = parseSrtOrVttContent(content);
      setUploadedSubCues({ label: file.name.slice(0, 22), cues });
      setActiveSubLang('local');
      setActiveCue(null);
      activeCueRef.current = null;
      setParsedSubCues(cues);
      showHudFeedback(`💬 Loaded ${cues.length} CC lines`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNativePiP = () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      } else {
        videoRef.current.requestPictureInPicture().catch(() => {});
      }
    }
  };

  // Recommended "More Like This" dramas (Part C)
  const moreLikeThisDramas = useMemo(() => {
    if (!drama || !allDramas || allDramas.length === 0) return [];
    const baseTags = new Set([...(drama.tags || []), ...(drama.hashtags || [])].map((t) => t.toLowerCase()));
    return allDramas
      .filter((d) => d.id !== drama.id)
      .map((d) => {
        let score = 0;
        if (d.category === drama.category) score += 4;
        if (d.subCategory && drama.subCategory && d.subCategory === drama.subCategory) score += 3;
        const dTags = [...(d.tags || []), ...(d.hashtags || [])];
        dTags.forEach((t) => {
          if (baseTags.has(t.toLowerCase())) score += 2;
        });
        score += (d.rating || 8) * 0.1;
        return { drama: d, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.drama);
  }, [drama?.id, allDramas]);

  const hasActiveStudioEffects =
    audioEqMode !== 'normal' ||
    volumeBoost > 100 ||
    videoFitMode !== 'contain' ||
    isAmbilightOn ||
    isEyeCareOn ||
    loopPointA !== null ||
    activeSubLang !== 'off' ||
    sleepTimerMode !== 'off' ||
    Boolean(watchPartyRoom);

  // Episodes matching active audio track
  const episodesForActiveAudio = drama.episodes.filter((ep) =>
    activeAudio === 'Hindi Fan Dubbed' || activeAudio === 'Fan Dubbed'
      ? ep.audio === 'Hindi Fan Dubbed' || ep.audio === 'Fan Dubbed'
      : ep.audio === activeAudio
  );

  const showIndividualEpisodeCards =
    episodesForActiveAudio.length > 1 ||
    episodesForActiveAudio.some(
      (ep) =>
        Boolean(getStreamLinkForTrack(ep, activeAudio)?.startsWith('http')) || typeof ep.episodeNumber === 'number'
    );

  const isPlayerActive = activeStreamEp !== null && Boolean(currentPlayingStream);

  // Docked Floating Mini-Player fallback: if user activates Mini-Player without an open stream, auto-unlock first stream
  useEffect(() => {
    if (isMiniPlayer && !isPlayerActive && heroStreamTarget) {
      setActiveAudio(heroStreamTarget.track);
      setActiveStreamEp(heroStreamTarget.ep.epNum);
      setIsStreamUnlocked(true);
    }
  }, [isMiniPlayer, isPlayerActive]);

  const videoFitClass =
    videoFitMode === 'cover'
      ? 'object-cover scale-[1.03]'
      : videoFitMode === 'cinema219'
      ? 'object-cover aspect-[21/9] my-auto'
      : videoFitMode === 'stretch'
      ? 'object-fill'
      : 'object-contain';

  const baseQualityFilter =
    QUALITY_OPTIONS.find((q) => q.id === selectedQuality)?.filter ||
    'contrast(1.07) saturate(1.14) brightness(1.02)';
  const combinedVideoFilter = isEyeCareOn
    ? `${baseQualityFilter} sepia(0.16) brightness(0.95)`
    : baseQualityFilter;

  return (
    <div
      className={
        isMiniPlayer
          ? 'fixed bottom-6 right-6 z-[65] w-[350px] sm:w-[410px] rounded-2xl border-2 border-[#e50914] bg-[#0a0b10] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden text-white'
          : `relative w-full min-w-full min-h-screen text-white flex flex-col animate-fade-in transition-colors duration-300 ${
              isLightsOff && isPlayerActive ? 'bg-black' : 'bg-[#050508]'
            }`
      }
    >
      {/* Mini-Player Compact Header Bar */}
      {isMiniPlayer && (
        <div className="px-3 py-2 bg-[#11131e] border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#e50914] animate-pulse shrink-0" />
            <span className="text-xs font-black text-white truncate">
              {drama.title} • {isMovie ? 'Movie' : `Ep ${activeStreamEp ?? 1}`}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {resolvedPlayerSource?.type === 'video' && (
              <button
                onClick={() => {
                  const vid = videoRef.current;
                  if (!vid) return;
                  if (vid.paused) vid.play().catch(() => {});
                  else vid.pause();
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title={isVideoPlaying ? 'Pause' : 'Play'}
              >
                {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              </button>
            )}
            {onToggleMiniPlayer && (
              <button
                onClick={onToggleMiniPlayer}
                className="px-2 py-1 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-[10px] font-black cursor-pointer flex items-center gap-1"
                title="Expand Full Cinema Page"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expand</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600 text-white cursor-pointer"
              title="Close Mini-Player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Full-Width Page Top Navigation Bar */}
      {!isMiniPlayer && (
        <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 bg-[#08090f]/95 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between gap-3 shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.85)]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-base sm:text-lg font-black rounded-xl bg-white/10 hover:bg-[#e50914] text-white border border-white/15 flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center justify-center gap-2.5 min-w-0 flex-1 px-2">
            <h1 className="text-base sm:text-xl font-black text-white truncate">{drama.title}</h1>
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[11px] font-black text-amber-300 uppercase tracking-wider shrink-0">
              {activeAudioBadgeText}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-3 rounded-xl bg-white/10 hover:bg-[#e50914] text-white border border-white/15 transition-all cursor-pointer shrink-0 shadow-lg"
            aria-label="Close Drama Page"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
      )}

      {/* Glowing Share / Deep-Link Copy Toast */}
      {shareToast && !isMiniPlayer && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 px-4 py-2.5 rounded-xl bg-emerald-950/95 border border-emerald-400/50 text-emerald-200 text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(16,185,129,0.45)] flex items-center gap-2 backdrop-blur-xl animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Lights-Off Cinema Overlay Dimmer inside page */}
      {isLightsOff && isPlayerActive && !isMiniPlayer && (
        <div
          onClick={() => setIsLightsOff(false)}
          className="absolute inset-0 z-20 bg-black/92 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
          title="Click anywhere outside the player to turn lights back on"
        />
      )}

      <div
        className={
          isMiniPlayer
            ? 'w-full flex flex-col'
            : `relative w-full mx-auto min-h-screen bg-[#050508] text-white pb-20 flex-1 flex flex-col transition-all duration-300 ${
                isTheaterMode ? 'max-w-none' : 'max-w-[1600px]'
              }`
        }
      >
        {/* Top Hero Backdrop Banner — HIDDEN cleanly while Video Player or Mini-Player is active */}
        {!isPlayerActive && !isMiniPlayer && (
          <div className="relative w-full h-72 sm:h-96 shrink-0 overflow-hidden bg-zinc-950 sm:rounded-b-2xl">
            <img
              src={drama.backdrop || drama.poster}
              alt={drama.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center filter brightness-[0.4]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111218] via-[#111218]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#111218] via-transparent to-transparent" />

            {/* Banner Content Overlay */}
            <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-[#e50914] text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow">
                    {drama.category}
                  </span>

                  {/* Color-Coded Age Rating Badge */}
                  {drama.ageRating &&
                    (() => {
                      const ageInfo = getAgeRatingMeta(drama.ageRating);
                      return (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded ${ageInfo.pillClass}`}>
                          {ageInfo.label}
                        </span>
                      );
                    })()}

                  {/* Sub-Category / Content Type Badge */}
                  {drama.subCategory && (
                    <span className="bg-white/10 text-zinc-200 text-xs font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
                      {drama.subCategory}
                    </span>
                  )}

                  <span className="bg-white/10 text-zinc-200 text-xs font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
                    {drama.releaseYear}
                  </span>

                  <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-black">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{drama.rating}</span>
                  </div>

                  {/* Exact Details Pill (Episode Count or Runtime) */}
                  {drama.details && (
                    <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                      {isMovie ? <Film className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{drama.details}</span>
                    </span>
                  )}

                  {/* Status Pill (Exact Status Text) */}
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{drama.statusText || drama.status}</span>
                  </span>

                  {/* Schedule Pill if ongoing */}
                  {drama.schedule && drama.schedule.trim() ? (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{drama.schedule}</span>
                    </span>
                  ) : null}

                  {isTopOne || drama.spotlightTag === 'TOP #1' ? (
                    <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-2.5 py-0.5 rounded text-xs font-black flex items-center gap-1 shadow-lg shadow-amber-500/30 animate-pulse">
                      <span>👑</span>
                      <span>TOP 1 IN ASIAFLIX</span>
                    </span>
                  ) : null}
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  {drama.title}
                </h2>
                {drama.originalTitle && (
                  <p className="text-zinc-400 text-xs font-semibold mt-0.5">{drama.originalTitle}</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {savedDramaProgress && savedDramaProgress.currentTime >= 2 && (
                  <button
                    onClick={handleResumeSavedProgress}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black text-xs font-black shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300/60"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>
                      ▶ Resume Ep {savedDramaProgress.ep} from {formatTimeSeconds(savedDramaProgress.currentTime)}
                    </span>
                  </button>
                )}

                {heroStreamTarget && (
                  <button
                    onClick={(e) =>
                      handleOpenStream(
                        heroStreamTarget.ep.epNum,
                        heroStreamTarget.track,
                        heroStreamTarget.ep.episodeKey,
                        e
                      )
                    }
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#b20710] hover:from-[#f6121d] hover:to-[#e50914] text-white text-xs font-black shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-red-400/35"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>
                      {isMovie
                        ? 'Stream Movie Online in HD'
                        : `Stream Online in HD (Ep ${heroStreamTarget.ep.epNum})`}
                    </span>
                  </button>
                )}

                {currentAudioLink && (
                  <a
                    href={currentAudioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open in Telegram ({activeAudio})</span>
                  </a>
                )}

                {/* Sabse Aage (#1) Button: STRICTLY visible only when admin is authenticated */}
                {isAdminAuthenticated && onMoveToFront && (
                  <button
                    onClick={() => {
                      onMoveToFront(drama.id);
                      setFrontSuccess(true);
                      setTimeout(() => setFrontSuccess(false), 3500);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-red-500/20 hover:from-amber-500 hover:to-red-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-black transition-all shadow-sm cursor-pointer"
                    title="Admin Control: Is drama ko portal par sabse aage (#1 position) par set karein"
                  >
                    <span>👑 Set #1 Front</span>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                      : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-white'
                  }`}
                  title="Copy Direct Shareable Series Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copied ? 'Series Link Copied!' : 'Copy Series Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Body Container */}
        <div
          className={
            isMiniPlayer
              ? 'w-full'
              : `space-y-6 flex-1 ${isPlayerActive ? 'p-3 sm:p-6 pt-4' : 'p-4 sm:p-8'}`
          }
        >
          {/* ============================================================
              NETFLIX CRIMSON + ROYAL GOLD + OBSIDIAN PROTECTED VIDEO PLAYER DECK
             ============================================================ */}
          {isPlayerActive && currentPlayingStream && (
            <div className={isMiniPlayer ? 'relative z-30' : 'relative z-30'}>
              {/* Ambilight Reactive Cinema Backlight (outside overflow-hidden player shell) */}
              {isAmbilightOn && !isMiniPlayer && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-4 sm:-inset-6 -z-10 rounded-3xl blur-3xl opacity-65 animate-pulse bg-gradient-to-r from-[#e50914]/50 via-[#f59e0b]/40 to-[#a855f7]/50"
                />
              )}

              <div
                className={
                  isMiniPlayer
                    ? 'bg-[#0a0b10] overflow-hidden flex flex-col'
                    : 'rounded-2xl border border-white/15 bg-[#0a0b10] shadow-[0_20px_70px_rgba(0,0,0,0.95)] overflow-hidden animate-fade-in'
                }
              >
                <div className="bg-[#0a0b10] overflow-hidden flex flex-col">
                  {/* 1. Prominent Obsidian & Crimson Episode Header Bar (Hidden in Mini-Player) */}
                  {!isMiniPlayer && !isTouchLocked && (
                    <div className="px-4 py-3 bg-[#0f1018] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        {/* Glowing Crimson Episode Pill + Animated Equalizer Bars */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#e50914] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_20px_rgba(229,9,20,0.45)] border border-red-400/40 shrink-0">
                          <span className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
                            <span className="w-[3px] h-2 bg-white rounded-full animate-pulse" />
                            <span className="w-[3px] h-3.5 bg-amber-300 rounded-full animate-bounce" />
                            <span className="w-[3px] h-2.5 bg-white rounded-full animate-pulse" />
                          </span>
                          <span>
                            {isMovie
                              ? '🎬 FULL MOVIE • HD STREAM'
                              : `🎬 EPISODE ${String(activeStreamEp).padStart(2, '0')} / ${totalEpisodesNum}`}
                          </span>
                        </div>

                        {/* Drama Title + Active Audio Badge */}
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[280px] sm:max-w-[380px]">
                            {drama.title}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[10px] font-black text-amber-300 uppercase tracking-wider shrink-0">
                            {activeAudioBadgeText}
                          </span>
                          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>PRIVACY SHIELD</span>
                          </span>
                          {watchPartyRoom && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-500/25 border border-purple-400/50 text-purple-200 text-[10px] font-black uppercase tracking-wider shrink-0 animate-pulse">
                              <span>👯‍♂️ PARTY #{watchPartyRoom}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Action Buttons: Copy Ep Link, Back to Drama Info + Close Player */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {activeStreamEp !== null && (
                          <button
                            onClick={handleCopyEpisodeLink}
                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                              epLinkCopied
                                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                : 'bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-amber-200 border-[#f59e0b]/40'
                            }`}
                            title="Copy Direct Episode Link for Telegram"
                          >
                            {epLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                            <span>
                              {epLinkCopied
                                ? `Copied Ep ${activeStreamEp}!`
                                : isMovie
                                ? 'Copy Movie Link'
                                : `Copy Ep ${activeStreamEp} Link`}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={handleClosePlayer}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 hover:text-white border border-white/15 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Back to Drama Info</span>
                          <span className="sm:hidden">Info</span>
                        </button>
                        <button
                          onClick={handleClosePlayer}
                          className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-[#e50914] text-red-200 hover:text-white border border-red-500/40 text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Close Player</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. 16:9 Protected Video Viewport */}
                  <div
                    ref={playerContainerRef}
                    onMouseEnter={() => setIsPlayerControlsActive(true)}
                    onMouseMove={() => setIsPlayerControlsActive(true)}
                    onMouseLeave={() => setIsPlayerControlsActive(false)}
                    onTouchStart={() => setIsPlayerControlsActive(true)}
                    className="aspect-video w-full bg-black relative overflow-hidden"
                  >
                  {/* Top-Left On-Screen Episode HUD Watermark Overlay — ONLY for Episode Series */}
                  {!isMovie &&
                    drama.category !== 'Asian Movies' &&
                    ((drama.totalEpisodes ?? 0) > 1 || activeTrackStreamables.length > 1) &&
                    activeStreamEp !== null && (
                    <div className="absolute top-3.5 left-4 z-30 pointer-events-none select-none">
                      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                        <span className="relative flex items-center justify-center w-2 h-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-[#e50914] animate-ping opacity-85" />
                          <span className="relative inline-flex rounded-full w-2 h-2 bg-[#e50914] shadow-[0_0_8px_#e50914]" />
                        </span>
                        <span className="text-white font-black text-xs sm:text-sm tracking-wide drop-shadow">
                          Episode {activeStreamEp}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top-Right Official AsiaFlix Prime Channel Watermark Logo (visible on all videos & movies) */}
                  <div className="absolute top-3 right-3.5 sm:top-4 sm:right-5 z-30 pointer-events-none select-none">
                    <img
                      src={
                        logoUrl && !logoUrl.includes('asiaflix-bot/main/logo.png')
                          ? logoUrl
                          : '/logo-watermark.png'
                      }
                      alt="AsiaFlix Prime"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.fallbackApplied) {
                          img.dataset.fallbackApplied = '1';
                          img.src = '/logo.png';
                        }
                      }}
                      className={
                        isMiniPlayer
                          ? 'h-7 w-auto object-contain opacity-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]'
                          : 'h-11 sm:h-14 md:h-16 w-auto object-contain opacity-90 drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]'
                      }
                    />
                  </div>

                  {/* Center-Screen Animated Gold/Obsidian HUD Overlay (for native video seek/speed/quality) */}
                  {hudToast && (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4">
                      <div className="px-6 py-3 rounded-2xl bg-black/90 backdrop-blur-xl border border-[#f59e0b]/60 text-white text-sm sm:text-base font-black tracking-wide shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-fade-in">
                        {hudToast}
                      </div>
                    </div>
                  )}

                  {/* Live Floating Danmaku Reactions Overlay */}
                  {isDanmakuOn && !isMiniPlayer && floatingDanmaku.length > 0 && (
                    <div className="pointer-events-none absolute inset-x-0 top-12 h-28 z-30 overflow-hidden">
                      {floatingDanmaku.map((dm) => (
                        <div
                          key={dm.id}
                          style={{ top: `${dm.topPct}%` }}
                          className="absolute right-0 whitespace-nowrap px-3.5 py-1 rounded-full bg-black/75 border border-amber-400/50 text-xs sm:text-sm font-black text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-danmaku"
                        >
                          {dm.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Floating Watch Party Emoji Bursts */}
                  {watchPartyRoom && partyReactions.length > 0 && (
                    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                      {partyReactions.map((pr) => (
                        <div
                          key={pr.id}
                          style={{ left: `${pr.leftPct}%` }}
                          className="absolute bottom-14 text-2xl sm:text-3xl animate-bounce drop-shadow-[0_0_12px_rgba(229,9,20,0.8)]"
                        >
                          {pr.emoji}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sleek Transparent Glassmorphic OTT Seek Indicator (auto-fades in 500ms) */}
                  {seekRipple && (
                    <div
                      key={seekRipple.nonce}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#ffffff',
                        borderRadius: '9999px',
                      }}
                      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-30 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide shadow-[0_4px_24px_rgba(0,0,0,0.35)] animate-fade-in ${
                        seekRipple.side === 'left' ? 'left-6 sm:left-10' : 'right-6 sm:right-10'
                      }`}
                    >
                      {seekRipple.side === 'left' ? '↺ 10s' : '10s ↻'}
                    </div>
                  )}

                  {/* Active-Only Bottom-Center Subtitle Overlay (Returns null when no cue is active) */}
                  {activeSubLang !== 'off' && !isMiniPlayer && activeCue?.text ? (
                    <div
                      className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center px-3 transition-all duration-200 ${
                        isPlayerControlsActive ? 'bottom-[13%] sm:bottom-[14%]' : 'bottom-[3.5%] sm:bottom-[4.5%]'
                      }`}
                    >
                      <div
                        style={
                          shouldBlurSubArea
                            ? {
                                minWidth: 'min(82%, 920px)',
                                minHeight: '78px',
                                padding: '14px 36px',
                                borderRadius: '10px',
                                background: 'rgba(6, 6, 10, 0.86)',
                                backdropFilter: 'blur(28px) brightness(0.25)',
                                WebkitBackdropFilter: 'blur(28px) brightness(0.25)',
                              }
                            : {
                                background: 'transparent',
                                padding: '4px 16px',
                              }
                        }
                        className="inline-flex items-center justify-center text-center max-w-[94%] sm:max-w-[90%] transition-all duration-200"
                      >
                        <span
                          style={{
                            fontSize:
                              subFontSize === 'sm'
                                ? 'clamp(1.1rem, 2.0vw, 1.75rem)'
                                : subFontSize === 'lg'
                                ? 'clamp(1.55rem, 3.0vw, 2.65rem)'
                                : 'clamp(1.35rem, 2.5vw, 2.25rem)',
                            fontWeight: 800,
                            lineHeight: 1.38,
                            letterSpacing: '0.01em',
                            color:
                              subColor === 'yellow'
                                ? '#ffea3b'
                                : subColor === 'cyan'
                                ? '#00f2fe'
                                : '#ffffff',
                            textShadow: '0 3px 8px rgba(0,0,0,0.98), 0 0 4px #000',
                            WebkitTextStroke: '0.5px rgba(0,0,0,0.9)',
                          }}
                          className="whitespace-pre-line"
                        >
                          {activeCue.text}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Mobile Touch-Lock Screen Shield */}
                  {isTouchLocked && (
                    <div
                      onClick={() => {
                        const now = Date.now();
                        if (now - lastTapUnlockRef.current <= 500) {
                          setIsTouchLocked(false);
                          lastTapUnlockRef.current = 0;
                          showHudFeedback('🔓 Screen Touch Unlocked');
                        } else {
                          lastTapUnlockRef.current = now;
                        }
                      }}
                      className="absolute inset-0 z-40 flex items-end justify-center pb-6 cursor-pointer select-none"
                    >
                      <div className="px-4 py-2 rounded-full bg-black/85 border border-amber-400/60 text-amber-200 text-xs font-black shadow-[0_0_25px_rgba(0,0,0,0.9)] flex items-center gap-2 backdrop-blur-md">
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        <span>🔓 Tap Twice to Unlock Screen</span>
                      </div>
                    </div>
                  )}

                  {/* 5-Second Auto-Next Countdown Overlay */}
                  {autoNextCountdown !== null && nextStreamItem && (
                    <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center gap-4">
                      <div className="px-4 py-1 rounded-full bg-[#e50914]/25 border border-[#e50914]/50 text-xs font-black text-red-200 uppercase tracking-wider">
                        Up Next Automatically
                      </div>
                      <h4 className="text-lg sm:text-2xl font-black text-white">
                        ⏭ Playing Episode {nextStreamItem.epNum} in {autoNextCountdown}s...
                      </h4>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAutoNextCountdown(0)}
                          className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#f6121d] text-white text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(229,9,20,0.5)] cursor-pointer flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Play Now</span>
                        </button>
                        <button
                          onClick={() => setAutoNextCountdown(null)}
                          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-xs sm:text-sm font-black border border-white/15 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {!isStreamUnlocked || !resolvedPlayerSource ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                      <img
                        src={activeCustomThumbnail || drama.backdrop || drama.poster}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover filter blur-md brightness-[0.28] scale-105 pointer-events-none"
                      />
                      <div className="relative z-10 max-w-lg space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Anti-Bot Privacy Shield Active</span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-300 font-semibold">
                          Stream link stays shielded from automated crawlers until unlocked by viewer action.
                        </p>
                        <button
                          onClick={handleUnlockPrivacyGate}
                          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#b20710] hover:from-[#f6121d] hover:to-[#e50914] text-white text-xs sm:text-sm font-black shadow-[0_0_30px_rgba(229,9,20,0.55)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-red-400/40"
                        >
                          🛡️ Click to Unlock &amp; Start Secure 1080p Stream (Anti-Bot Protected)
                        </button>
                      </div>
                    </div>
                  ) : resolvedPlayerSource.type === 'video' ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      {/* Double-Tap Left/Right Seek Gesture Zones (keep bottom 56px native scrubber clear) */}
                      {!isTouchLocked && !isMiniPlayer && isVideoPlaying && (
                        <>
                          <div
                            onClick={() => {
                              const now = Date.now();
                              if (now - lastTapLeftRef.current <= 320) {
                                handleSeek(-10, '↺ 10s');
                                lastTapLeftRef.current = 0;
                              } else {
                                lastTapLeftRef.current = now;
                              }
                            }}
                            className="absolute top-0 bottom-14 left-0 w-[30%] z-20 cursor-pointer"
                            aria-label="Double tap left to rewind 10 seconds"
                          />
                          <div
                            onClick={() => {
                              const now = Date.now();
                              if (now - lastTapRightRef.current <= 320) {
                                handleSeek(10, '10s ↻');
                                lastTapRightRef.current = 0;
                              } else {
                                lastTapRightRef.current = now;
                              }
                            }}
                            className="absolute top-0 bottom-14 right-0 w-[30%] z-20 cursor-pointer"
                            aria-label="Double tap right to forward 10 seconds"
                          />
                        </>
                      )}

                      <video
                        ref={videoRef}
                        key={`${resolvedPlayerSource.src}-${streamReloadNonce}-${!isExternalAudioActive && wantsAudioStudio && audibleCorsSupported ? 'cors' : 'direct'}`}
                        src={resolvedPlayerSource.src}
                        crossOrigin={!isExternalAudioActive && wantsAudioStudio && audibleCorsSupported ? 'anonymous' : undefined}
                        poster=""
                        controls
                        autoPlay
                        playsInline
                        muted={isExternalAudioActive && isAudioCorsFallback ? true : isAudioMuted}
                        onLoadStart={() => setIsVideoLoading(true)}
                        onLoadedMetadata={(e) => {
                          const vid = e.currentTarget;
                          vid.playbackRate = playbackSpeed;
                          if (isExternalAudioActive) {
                            attachVideoSilenceRouter(vid, true);
                            if (isAudioCorsFallback) {
                              vid.muted = true;
                            } else {
                              vid.muted = isAudioMuted;
                              vid.volume = isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume));
                            }
                          } else {
                            vid.volume = isAudioMuted ? 0 : Math.min(1, Math.max(0, audioVolume));
                            vid.muted = isAudioMuted;
                            applyStudioEqGraph(vid);
                          }
                          const pending = pendingRestoreTimeRef.current;
                          if (pending) {
                            try {
                              vid.currentTime = pending.time;
                            } catch {
                              // Ignore
                            }
                            if (pending.shouldPlay) {
                              vid.play().catch(() => {});
                            }
                            pendingRestoreTimeRef.current = null;
                          }
                          syncAudioToVideo();
                        }}
                        onCanPlay={() => {
                          setIsVideoLoading(false);
                          syncAudioToVideo();
                        }}
                        onPlay={() => {
                          lastPlaybackTickMsRef.current = Date.now();
                          syncAudioToVideo(true);
                        }}
                        onPlaying={() => {
                          setIsVideoPlaying(true);
                          setIsVideoLoading(false);
                          lastPlaybackTickMsRef.current = Date.now();
                          syncAudioToVideo(true);
                        }}
                        onPause={() => {
                          setIsVideoPlaying(false);
                          lastPlaybackTickMsRef.current = null;
                          if (audioRef.current && !audioRef.current.paused) {
                            audioRef.current.pause();
                          }
                        }}
                        onWaiting={() => {
                          lastPlaybackTickMsRef.current = null;
                          if (audioRef.current && !audioRef.current.paused) {
                            audioRef.current.pause();
                          }
                        }}
                        onSeeking={() => {
                          syncAudioToVideo(!videoRef.current?.paused);
                        }}
                        onSeeked={() => syncAudioToVideo(!videoRef.current?.paused)}
                        onRateChange={(e) => {
                          if (audioRef.current) {
                            audioRef.current.playbackRate = e.currentTarget.playbackRate;
                          }
                        }}
                        onVolumeChange={(e) => {
                          const vid = e.currentTarget;
                          if (isExternalAudioActive && isAudioCorsFallback) return;
                          setAudioVolume(vid.volume);
                          setIsAudioMuted(vid.muted);
                          if (audioRef.current) {
                            audioRef.current.volume = vid.muted ? 0 : vid.volume;
                            audioRef.current.muted = vid.muted;
                          }
                        }}
                        onEnded={() => {
                          setIsVideoPlaying(false);
                          lastPlaybackTickMsRef.current = null;
                          recordEpisodeCompleted();
                          if (sleepTimerMode === 'end_of_ep') {
                            setSleepTimerMode('off');
                            showHudFeedback('🌙 Sleep Timer: Episode Finished');
                            return;
                          }
                          if (nextStreamItem && !isMovie) {
                            setAutoNextCountdown(5);
                          }
                        }}
                        onTimeUpdate={(e) => {
                          const vid = e.currentTarget;
                          if (vid.currentTime > 0.1) {
                            setIsVideoPlaying(true);
                            setIsVideoLoading(false);
                          }

                          // 1. A-B Scene Looper
                          if (loopPointA !== null && loopPointB !== null && vid.currentTime >= loopPointB) {
                            vid.currentTime = loopPointA;
                            if (isExternalAudioActive && audioRef.current) {
                              try {
                                audioRef.current.currentTime = Math.max(0, loopPointA + audioSyncOffset);
                              } catch {}
                            }
                          }

                          // 2. Active Subtitle Cue Matcher & Burned-In Hard-Sub Detector
                          if (activeSubLang !== 'off' && parsedSubCues.length > 0) {
                            const tNow = vid.currentTime;
                            const matchedCue = parsedSubCues.find((c) => tNow >= c.start && tNow <= c.end) || null;
                            if ((activeCueRef.current?.id ?? null) !== (matchedCue?.id ?? null)) {
                              activeCueRef.current = matchedCue;
                              setActiveCue(matchedCue);
                            }
                            if (!vid.paused) {
                              detectLowerRegionHardSubs(vid);
                            }
                          } else if (activeCueRef.current) {
                            activeCueRef.current = null;
                            setActiveCue(null);
                          }

                          // 3. Live Danmaku Matching
                          if (isDanmakuOn && danmakuCues.length > 0 && !vid.paused) {
                            const tNow = vid.currentTime;
                            const wallNow = Date.now();
                            danmakuCues.forEach((cue) => {
                              if (
                                Math.abs(tNow - cue.time) <= 1.2 &&
                                wallNow - (lastDanmakuIdShownRef.current[cue.id] || 0) > 12000
                              ) {
                                lastDanmakuIdShownRef.current[cue.id] = wallNow;
                                const floatId = `${cue.id}-${wallNow}`;
                                const topPct = 14 + (Math.abs(cue.time * 7) % 16);
                                setFloatingDanmaku((prev) => [...prev.slice(-6), { id: floatId, text: cue.text, topPct }]);
                                window.setTimeout(() => {
                                  setFloatingDanmaku((prev) => prev.filter((x) => x.id !== floatId));
                                }, 6600);
                              }
                            });
                          }

                          // 4. Exact Timestamp Auto-Resume Save (every 3s when currentTime >= 2)
                          const nowWall = Date.now();
                          if (currentPlayingStream && vid.currentTime >= 2 && nowWall - lastSavedTsWallRef.current >= 3000) {
                            lastSavedTsWallRef.current = nowWall;
                            saveWatchTimestamp(drama.id, {
                              ep: currentPlayingStream.epNum,
                              track: activeAudio,
                              currentTime: vid.currentTime,
                              duration: Number.isFinite(vid.duration) ? vid.duration : 0,
                              updatedAt: nowWall,
                            });
                          }

                          // 5. VIP Watch Minutes & Daily Streak Accumulator
                          if (!vid.paused) {
                            if (lastPlaybackTickMsRef.current !== null) {
                              const dt = (nowWall - lastPlaybackTickMsRef.current) / 1000;
                              if (dt > 0 && dt < 5) {
                                watchSecondsAccRef.current += dt;
                                if (watchSecondsAccRef.current >= 15) {
                                  const flush = watchSecondsAccRef.current;
                                  watchSecondsAccRef.current = 0;
                                  recordWatchSeconds(flush);
                                }
                              }
                            }
                            lastPlaybackTickMsRef.current = nowWall;
                          }

                          // 6. 85% Smart Pre-Loader for Next Episode
                          if (
                            nextStreamItem &&
                            Number.isFinite(vid.duration) &&
                            vid.duration > 30 &&
                            vid.currentTime / vid.duration >= 0.85 &&
                            preloadedNextUrlRef.current !== nextStreamItem.streamUrl
                          ) {
                            preloadedNextUrlRef.current = nextStreamItem.streamUrl;
                            const nextMeta = resolveVideoPlayerSource(nextStreamItem.streamUrl, 0);
                            if (nextMeta.type === 'video' && nextMeta.src) {
                              const link = document.createElement('link');
                              link.rel = 'preload';
                              link.as = 'video';
                              link.href = nextMeta.src;
                              document.head.appendChild(link);
                            }
                          }

                          // 7. External Audio Sync
                          if (isExternalAudioActive && audioRef.current) {
                            const aud = audioRef.current;
                            if (!vid.paused) {
                              const targetTime = Math.max(0, vid.currentTime + audioSyncOffset);
                              if (Number.isFinite(targetTime) && Math.abs(aud.currentTime - targetTime) > 0.28) {
                                try {
                                  aud.currentTime = targetTime;
                                } catch {
                                  // Ignore
                                }
                              }
                              if (aud.paused) {
                                aud.play().catch(() => {});
                              }
                            } else if (!aud.paused) {
                              aud.pause();
                            }
                          }
                        }}
                        {...({ referrerpolicy: 'origin' } as Record<string, string>)}
                        style={{ filter: combinedVideoFilter }}
                        className={`w-full h-full ${videoFitClass} bg-black transition-[filter] duration-300`}
                      />

                      {/* Track-Specific Synced External Dubbed Audio Element (Hindi / FanDub / Orig) */}
                      {isExternalAudioActive && trackCustomAudio && (
                        <audio
                          ref={audioRef}
                          key={`${activeAudio}-${activeStreamEp}-${trackCustomAudio}-${wantsAudioStudio && audibleCorsSupported ? 'cors' : 'direct'}`}
                          src={trackCustomAudio}
                          crossOrigin={wantsAudioStudio && audibleCorsSupported ? 'anonymous' : undefined}
                          preload="auto"
                          onLoadedMetadata={() => {
                            if (audioRef.current) applyStudioEqGraph(audioRef.current);
                            syncAudioToVideo();
                          }}
                          onCanPlay={() => syncAudioToVideo()}
                          className="hidden"
                        />
                      )}

                      {/* Fallback sleek floating speaker control only if CORS blocks Web Audio zero-gain routing */}
                      {isExternalAudioActive && isAudioCorsFallback && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAudioMuted((m) => !m);
                          }}
                          className="absolute bottom-14 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black border border-white/20 text-white text-xs font-black shadow-lg backdrop-blur-md cursor-pointer"
                          title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                        >
                          {isAudioMuted ? (
                            <VolumeX className="w-4 h-4 text-red-400" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                          )}
                          <span>{isAudioMuted ? 'Muted' : `${Math.round(audioVolume * 100)}%`}</span>
                        </button>
                      )}

                      {/* 16:9 Full-Widescreen Custom Thumbnail Overlay + Cyber-Cinema Animated Loader */}
                      {!isVideoPlaying && (
                        <div
                          onClick={() => {
                            videoAudioNodeRef.current?.ctx.resume().catch(() => {});
                            videoRef.current?.play().catch(() => {});
                          }}
                          className="absolute inset-0 z-20 overflow-hidden cursor-pointer group bg-[#050508]"
                        >
                          {activeCustomThumbnail ? (
                            <>
                              <img
                                src={activeCustomThumbnail}
                                alt={drama.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />
                            </>
                          ) : (
                            <>
                              <img
                                src={drama.poster}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover scale-125 blur-2xl opacity-45"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/65 to-black/60" />
                            </>
                          )}

                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-4">
                            {isVideoLoading ? (
                              <>
                                <div className="relative flex items-center justify-center">
                                  <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-[#e50914] border-r-[#f59e0b] animate-spin shadow-[0_0_30px_rgba(229,9,20,0.45)]" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-14 h-14 rounded-full bg-black/75 border border-white/20 flex items-center justify-center backdrop-blur-md">
                                      <Play className="w-6 h-6 text-white fill-white ml-0.5 animate-pulse" />
                                    </div>
                                  </div>
                                </div>
                                <div className="px-5 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-[#e50914]/50 shadow-[0_0_30px_rgba(229,9,20,0.45)] flex flex-col items-center gap-1.5">
                                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white">
                                    <span className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
                                      <span className="w-[3px] h-2 bg-[#e50914] rounded-full animate-pulse" />
                                      <span className="w-[3px] h-3.5 bg-[#f59e0b] rounded-full animate-bounce" />
                                      <span className="w-[3px] h-2.5 bg-[#e50914] rounded-full animate-pulse" />
                                    </span>
                                    <span className="animate-pulse">⚡ Loading 1080p FHD Stream...</span>
                                    <span className="px-2 py-0.5 rounded-md bg-[#e50914] text-white text-[10px] font-black uppercase tracking-wider">
                                      {isMovie ? 'Full Movie' : `Episode ${activeStreamEp}`}
                                    </span>
                                  </div>
                                  <div className="w-44 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                                    <div className="w-24 h-full rounded-full bg-gradient-to-r from-[#e50914] via-[#f59e0b] to-[#ff2b54] animate-cinema-shimmer" />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute w-24 h-24 rounded-full bg-[#e50914]/30 animate-ping" />
                                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#e50914]/90 group-hover:bg-[#f6121d] border-2 border-white/40 shadow-[0_0_35px_rgba(229,9,20,0.7)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                    <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white fill-white ml-1" />
                                  </div>
                                </div>
                                <div className="px-5 py-2 rounded-full bg-black/80 backdrop-blur-md border border-[#e50914]/50 text-white text-xs sm:text-sm font-black tracking-wide shadow-[0_0_25px_rgba(229,9,20,0.4)]">
                                  ▶ Tap to Watch {isMovie ? 'Full Movie' : `Episode ${activeStreamEp}`}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <iframe
                      ref={iframeRef}
                      key={`${resolvedPlayerSource.src}-${activeMirrorIndex}-${streamReloadNonce}`}
                      src={resolvedPlayerSource.src}
                      title={`${drama.title} Ep ${activeStreamEp}`}
                      className="w-full h-full border-0 bg-black"
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )}
                </div>

                {/* 3. SYSTEMATIC 2-TIER PLAYER CONTROL ARCHITECTURE (Hidden in Mini-Player or Touch-Lock) */}
                {!isMiniPlayer && !isTouchLocked && (
                  <>
                    <div className="bg-[#0a0b10] border-t border-b border-white/10 p-4 flex flex-col gap-3">
                      {/* TIER 1 PRIMARY BAR */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleSeek(-10, '↺ 10s')}
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255, 255, 255, 0.18)',
                              color: '#ffffff',
                              borderRadius: '9999px',
                            }}
                            className="hover:bg-white/[0.16] font-bold px-3.5 py-2 transition-all active:scale-95 text-xs cursor-pointer whitespace-nowrap"
                          >
                            ↺ 10s
                          </button>
                          <button
                            onClick={() => handleSeek(10, '10s ↻')}
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255, 255, 255, 0.18)',
                              color: '#ffffff',
                              borderRadius: '9999px',
                            }}
                            className="hover:bg-white/[0.16] font-bold px-3.5 py-2 transition-all active:scale-95 text-xs cursor-pointer whitespace-nowrap"
                          >
                            10s ↻
                          </button>
                          <button
                            onClick={() => handleSeek(85, '⚡ +85s Intro Skipped!')}
                            className="bg-[#e50914] hover:bg-[#f6121d] text-white border border-red-400/40 shadow-[0_0_16px_rgba(229,9,20,0.4)] font-black px-4 py-2 rounded-xl transition-all active:scale-95 text-xs cursor-pointer whitespace-nowrap"
                          >
                            ⚡ Skip Intro (+85s)
                          </button>
                          <button
                            onClick={handleReloadStream}
                            className="bg-[#141622] hover:bg-[#1e2235] border border-white/15 text-zinc-100 font-black px-3.5 py-2 rounded-xl transition-all active:scale-95 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            title="Reload current video stream"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>🔄 Reload</span>
                          </button>

                          <button
                            onClick={() => setIsStudioToolsOpen((prev) => !prev)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                              isStudioToolsOpen || hasActiveStudioEffects
                                ? 'bg-gradient-to-r from-amber-500/25 to-red-500/25 border-amber-400/60 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                : 'bg-[#141622] hover:bg-[#1e2235] border-white/15 text-zinc-100'
                            }`}
                          >
                            <Sliders className="w-3.5 h-3.5 text-amber-400" />
                            <span>✨ VIP Studio Tools {isStudioToolsOpen ? '▴' : '▾'}</span>
                            {hasActiveStudioEffects && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                          </button>
                        </div>

                        {/* SPEED Pod (0.5x – 2x) */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-[#11131d] border border-white/10 rounded-xl px-3 py-1.5">
                          <span className="text-[10px] font-black text-[#f59e0b] uppercase tracking-wider flex items-center gap-1 mr-1">
                            <Gauge className="w-3.5 h-3.5 text-[#f59e0b]" />
                            <span>⚡ SPEED</span>
                          </span>
                          {SPEED_OPTIONS.map((spd) => {
                            const active = playbackSpeed === spd;
                            return (
                              <button
                                key={`spd-${spd}`}
                                onClick={() => handleSpeedChange(spd)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                                  active
                                    ? 'bg-[#f59e0b] text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                                }`}
                              >
                                {spd}x
                              </button>
                            );
                          })}
                        </div>

                        {/* QUALITY Pod */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-[#11131d] border border-white/10 rounded-xl px-3 py-1.5">
                          <span className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                            <Gem className="w-3.5 h-3.5 text-[#e50914]" />
                            <span>💎 QUALITY</span>
                          </span>
                          {QUALITY_OPTIONS.map((q) => {
                            const active = selectedQuality === q.id;
                            return (
                              <button
                                key={q.id}
                                onClick={() => handleQualityChange(q.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                                  active
                                    ? 'bg-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.45)]'
                                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                                }`}
                              >
                                {q.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 💬 SUBTITLES BAR (Hidden for Audience when no subtitles are configured) */}
                      {(availableSubLanguages.length > 0 || isAdmin) && (
                        <div className="rounded-xl bg-[#0e1019] border border-sky-400/25 px-3.5 py-2.5 flex flex-col gap-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black text-sky-300 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                              <Captions className="w-3.5 h-3.5 text-sky-400" />
                              <span>SUBTITLES</span>
                              {isSubLoading && (
                                <span className="text-[10px] text-amber-300 animate-pulse normal-case font-bold">
                                  (Loading...)
                                </span>
                              )}
                            </span>

                            <button
                              onClick={() => handleSelectSubLang('off')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer ${
                                activeSubLang === 'off'
                                  ? 'bg-[#e50914] text-white border-red-400/60 shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                                  : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-300 border-white/10'
                              }`}
                            >
                              🚫 Off
                            </button>

                            {availableSubLanguages.map((sub) => (
                              <button
                                key={`cc-pill-${sub.code}-${sub.url}`}
                                onClick={() => handleSelectSubLang(sub.code)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer ${
                                  activeSubLang === sub.code
                                    ? 'bg-sky-400 text-black border-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
                                    : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                }`}
                              >
                                {sub.displayLabel}
                              </button>
                            ))}

                            {isAdmin && uploadedSubCues && (
                              <button
                                onClick={() => handleSelectSubLang('local')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer ${
                                  activeSubLang === 'local'
                                    ? 'bg-sky-400 text-black border-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
                                    : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                }`}
                              >
                                📄 {uploadedSubCues.label}
                              </button>
                            )}

                            {isAdmin && (
                              <>
                                <input
                                  ref={subtitleFileInputRef}
                                  type="file"
                                  accept=".srt,.vtt,.md.srt,.txt"
                                  onChange={handleSubtitleFileUpload}
                                  className="hidden"
                                />
                                <button
                                  onClick={() => subtitleFileInputRef.current?.click()}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-white/[0.06] hover:bg-white/[0.14] text-amber-200 border border-amber-400/30 transition-all cursor-pointer"
                                >
                                  📂 Admin Upload .SRT
                                </button>
                              </>
                            )}
                          </div>

                          {activeSubLang !== 'off' && (
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-[11px]">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-black text-amber-300">🪄 Sub Backdrop:</span>
                                {(
                                  [
                                    { id: 'auto', label: 'Auto-Detect' },
                                    { id: 'blur', label: 'Blur Hard-Subs' },
                                    { id: 'transparent', label: 'Pure Transparent' },
                                  ] as const
                                ).map((mode) => (
                                  <button
                                    key={`sub-mode-${mode.id}`}
                                    onClick={() => setSubBackdropMode(mode.id)}
                                    className={`px-2 py-0.5 rounded-md font-black border cursor-pointer transition-all ${
                                      subBackdropMode === mode.id
                                        ? 'bg-amber-400 text-black border-amber-200'
                                        : 'bg-[#141622] text-zinc-300 border-white/10 hover:text-white'
                                    }`}
                                  >
                                    {mode.label}
                                  </button>
                                ))}
                                {subBackdropMode === 'auto' && hardSubCorsBlockedRef.current && (
                                  <button
                                    onClick={() => setHasHardcodedSubtitles((v) => !v)}
                                    className={`px-2 py-0.5 rounded-md font-black border cursor-pointer transition-all ${
                                      hasHardcodedSubtitles
                                        ? 'bg-sky-400 text-black border-sky-200'
                                        : 'bg-[#141622] text-zinc-300 border-white/10 hover:text-white'
                                    }`}
                                  >
                                    {hasHardcodedSubtitles ? 'Burned-In Blur: ON' : 'Burned-In Blur: OFF'}
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-black text-zinc-400">🎨 Text Style:</span>
                                {(
                                  [
                                    { id: 'yellow', label: 'Yellow', cls: 'text-[#ffea3b]' },
                                    { id: 'white', label: 'White', cls: 'text-white' },
                                    { id: 'cyan', label: 'Cyan', cls: 'text-[#00f2fe]' },
                                  ] as const
                                ).map((col) => (
                                  <button
                                    key={`col-${col.id}`}
                                    onClick={() => setSubColor(col.id)}
                                    className={`px-2 py-0.5 rounded-md font-black border cursor-pointer transition-all ${col.cls} ${
                                      subColor === col.id
                                        ? 'bg-white/20 border-white'
                                        : 'bg-[#141622] border-white/10 opacity-75 hover:opacity-100'
                                    }`}
                                  >
                                    {col.label}
                                  </button>
                                ))}
                                <span className="text-zinc-600 mx-0.5">|</span>
                                {(
                                  [
                                    { id: 'sm', label: 'S' },
                                    { id: 'md', label: 'M' },
                                    { id: 'lg', label: 'L' },
                                  ] as const
                                ).map((sz) => (
                                  <button
                                    key={`sz-${sz.id}`}
                                    onClick={() => setSubFontSize(sz.id)}
                                    className={`px-2 py-0.5 rounded-md font-black border cursor-pointer transition-all ${
                                      subFontSize === sz.id
                                        ? 'bg-white text-black border-white'
                                        : 'bg-[#141622] text-zinc-300 border-white/10 hover:text-white'
                                    }`}
                                  >
                                    {sz.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TIER 2 EXPANDABLE 4-TAB VIP STUDIO DECK */}
                      {isStudioToolsOpen && (
                        <div className="rounded-2xl bg-[#0e1019] border border-white/15 p-3.5 space-y-3 animate-fade-in">
                          {/* Category Tabs */}
                          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2.5">
                            {(
                              [
                                { id: 'audio' as StudioTab, label: '🔊 Audio & 200% Boost' },
                                { id: 'screen' as StudioTab, label: '🎬 Screen, Zoom & Ambilight' },
                                { id: 'vault' as StudioTab, label: '🔖 Scene Snap, Loop & Vault' },
                                { id: 'party' as StudioTab, label: '👯‍♂️ Watch Party, CC & Timer' },
                              ] as const
                            ).map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setActiveStudioTab(tab.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                  activeStudioTab === tab.id
                                    ? 'bg-[#e50914] text-white border-red-400/50 shadow-[0_0_14px_rgba(229,9,20,0.4)]'
                                    : 'bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 border-white/10'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* TAB 1: Audio EQ & 200% Volume Booster */}
                          {activeStudioTab === 'audio' && (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider mr-1">
                                  🎛️ Cinema EQ:
                                </span>
                                {(
                                  [
                                    { id: 'normal' as AudioEqMode, label: 'Normal', msg: '🎛️ EQ: Normal Studio' },
                                    { id: 'dialogue' as AudioEqMode, label: '🗣️ Clear Dialogue', msg: '🗣️ Dialogue Vocal Booster (+7dB) ON' },
                                    { id: 'bass3d' as AudioEqMode, label: '🔊 3D Cinema Bass', msg: '🔊 3D Surround Bass (+8dB) ON' },
                                    { id: 'night' as AudioEqMode, label: '🌙 Night Mode', msg: '🌙 Night Volume Compressor ON' },
                                  ] as const
                                ).map((eq) => (
                                  <button
                                    key={eq.id}
                                    onClick={() => {
                                      setAudioEqMode(eq.id);
                                      showHudFeedback(eq.msg);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                      audioEqMode === eq.id
                                        ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                                        : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                    }`}
                                  >
                                    {eq.label}
                                  </button>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider mr-1">
                                    ⚡ Volume Boost:
                                  </span>
                                  {([100, 150, 200] as const).map((lvl) => (
                                    <button
                                      key={lvl}
                                      onClick={() => {
                                        setVolumeBoost(lvl);
                                        showHudFeedback(`🔊 Volume Boost: ${lvl}%`);
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                        volumeBoost === lvl
                                          ? 'bg-amber-400 text-black border-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                                          : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                      }`}
                                    >
                                      {lvl === 200 ? '200% ULTRA' : `${lvl}%`}
                                    </button>
                                  ))}
                                </div>

                                {wantsAudioStudio && !audibleCorsSupported && resolvedPlayerSource?.type === 'video' && (
                                  <span className="text-[10px] font-bold text-zinc-400">
                                    ℹ️ Direct playback safe mode active on this CDN host
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB 2: Screen Fit, Ambilight, Eye-Care, Touch Lock & Mini-Player */}
                          {activeStudioTab === 'screen' && (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider mr-1">
                                  📐 Screen Fit:
                                </span>
                                {(
                                  [
                                    { id: 'contain' as VideoFitMode, label: 'Default (16:9)' },
                                    { id: 'cover' as VideoFitMode, label: '🔍 Fill / Zoom' },
                                    { id: 'cinema219' as VideoFitMode, label: '🎥 21:9 CinemaScope' },
                                    { id: 'stretch' as VideoFitMode, label: '↔ Stretch' },
                                  ] as const
                                ).map((fit) => (
                                  <button
                                    key={fit.id}
                                    onClick={() => {
                                      setVideoFitMode(fit.id);
                                      showHudFeedback(`📐 Screen Fit: ${fit.label}`);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                      videoFitMode === fit.id
                                        ? 'bg-sky-500 text-black border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.45)]'
                                        : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                    }`}
                                  >
                                    {fit.label}
                                  </button>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => {
                                    setIsAmbilightOn((v) => !v);
                                    showHudFeedback(!isAmbilightOn ? '🌈 Ambilight Glow ON' : '🌈 Ambilight Glow OFF');
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                    isAmbilightOn
                                      ? 'bg-gradient-to-r from-[#e50914] to-[#a855f7] text-white border-purple-300/60 shadow-[0_0_16px_rgba(168,85,247,0.45)]'
                                      : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                  }`}
                                >
                                  🌈 Ambilight Glow
                                </button>

                                <button
                                  onClick={() => {
                                    setIsEyeCareOn((v) => !v);
                                    showHudFeedback(!isEyeCareOn ? '🕶️ 2 AM Eye-Care Filter ON' : '🕶️ Eye-Care Filter OFF');
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                    isEyeCareOn
                                      ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                                      : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                  }`}
                                >
                                  🕶️ 2 AM Eye-Care
                                </button>

                                <button
                                  onClick={() => setIsTouchLocked(true)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border border-white/15 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>🔒 Lock Screen Touch</span>
                                </button>

                                {onToggleMiniPlayer && (
                                  <button
                                    onClick={onToggleMiniPlayer}
                                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/20 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-400/45 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <PictureInPicture2 className="w-3.5 h-3.5" />
                                    <span>🖼️ Mini-Player (Browse Home)</span>
                                  </button>
                                )}

                                {resolvedPlayerSource?.type === 'video' && (
                                  <button
                                    onClick={handleNativePiP}
                                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border border-white/15 cursor-pointer"
                                  >
                                    📺 OS PiP Window
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB 3: HD Scene Snapshot, A-B Looper & Personal Scene Vault */}
                          {activeStudioTab === 'vault' && (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={handleSceneSnapshot}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#141622] hover:bg-[#1e2235] text-white border border-white/15 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                                  <span>📸 Snap HD Scene</span>
                                </button>

                                <button
                                  onClick={handleToggleABLoop}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer transition-all ${
                                    loopPointA !== null
                                      ? 'bg-purple-600 text-white border-purple-300/60 shadow-[0_0_15px_rgba(168,85,247,0.45)]'
                                      : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                  }`}
                                >
                                  <Repeat className="w-3.5 h-3.5" />
                                  <span>
                                    {loopPointA === null
                                      ? '🔁 Set Loop A'
                                      : loopPointB === null
                                      ? `🔁 Set Loop B (A: ${formatTimeSeconds(loopPointA)})`
                                      : `🔁 Clear Loop (${formatTimeSeconds(loopPointA)} → ${formatTimeSeconds(loopPointB)})`}
                                  </span>
                                </button>

                                {loopPointA !== null && (
                                  <button
                                    onClick={handleCopyClipLink}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/45 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Link2 className="w-3.5 h-3.5" />
                                    <span>🔗 Copy Clip Link</span>
                                  </button>
                                )}

                                <button
                                  onClick={handleSaveMoment}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#e50914]/20 hover:bg-[#e50914] text-red-200 hover:text-white border border-red-400/40 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                  <span>🔖 Save Moment</span>
                                </button>
                              </div>

                              {sceneBookmarks.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                                    Scene Vault:
                                  </span>
                                  {sceneBookmarks.map((bm) => (
                                    <div
                                      key={bm.id}
                                      className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] border border-white/15 pl-2.5 pr-1 py-1 text-[11px] font-black text-zinc-200"
                                    >
                                      <button
                                        onClick={() => handleJumpToBookmark(bm)}
                                        className="hover:text-amber-300 cursor-pointer"
                                      >
                                        🔖 {bm.label}
                                      </button>
                                      <button
                                        onClick={() => setSceneBookmarks(deleteSceneBookmark(drama.id, bm.id))}
                                        className="p-0.5 text-zinc-400 hover:text-red-400 cursor-pointer"
                                        title="Remove Bookmark"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-zinc-400">
                                  Tap 🔖 Save Moment during your favorite scene to jump back anytime.
                                </p>
                              )}
                            </div>
                          )}

                          {/* TAB 4: Watch Party, Custom Subtitles (CC), Danmaku & Sleep Timer */}
                          {activeStudioTab === 'party' && (
                            <div className="space-y-3">
                              {/* Watch Party & Live Danmaku Row */}
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={handleStartWatchParty}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer ${
                                    watchPartyRoom
                                      ? 'bg-purple-600 text-white border-purple-300/60 shadow-[0_0_14px_rgba(168,85,247,0.45)]'
                                      : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 border-white/15'
                                  }`}
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>
                                    {watchPartyRoom ? `👯‍♂️ Copy Party #${watchPartyRoom} Link` : '👯‍♂️ 1-Click Watch Party'}
                                  </span>
                                </button>

                                <button
                                  onClick={() => setIsDanmakuOn((v) => !v)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                                    isDanmakuOn
                                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/45'
                                      : 'bg-white/[0.04] text-zinc-400 border-white/10'
                                  }`}
                                >
                                  💬 Live Hype: {isDanmakuOn ? 'ON' : 'OFF'}
                                </button>

                                {(['🔥 Goosebumps!', '😍 Best Scene!', '🤯 Plot Twist!', '😭 Crying!'] as const).map((stamp) => (
                                  <button
                                    key={stamp}
                                    onClick={() => handleStampDanmaku(stamp)}
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-[#e50914] text-white text-[11px] font-black border border-white/10 cursor-pointer transition-all"
                                  >
                                    {stamp}
                                  </button>
                                ))}
                              </div>

                              {/* Custom Subtitles (CC) & Sleep Timer Row */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                                {(availableSubLanguages.length > 0 || isAdmin) ? (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] font-black text-sky-300 uppercase tracking-wider flex items-center gap-1 mr-1">
                                      <Captions className="w-3.5 h-3.5" />
                                      <span>CC:</span>
                                    </span>
                                    <button
                                      onClick={() => handleSelectSubLang('off')}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                                        activeSubLang === 'off'
                                          ? 'bg-sky-500 text-black border-sky-300'
                                          : 'bg-[#141622] text-zinc-300 border-white/10'
                                      }`}
                                    >
                                      Off
                                    </button>
                                    {availableSubLanguages.map((sub) => (
                                      <button
                                        key={`${sub.code}-${sub.url}`}
                                        onClick={() => handleSelectSubLang(sub.code)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                                          activeSubLang === sub.code
                                            ? 'bg-sky-500 text-black border-sky-300'
                                            : 'bg-[#141622] text-zinc-300 border-white/10'
                                        }`}
                                      >
                                        {sub.displayLabel}
                                      </button>
                                    ))}
                                    {isAdmin && uploadedSubCues && (
                                      <button
                                        onClick={() => handleSelectSubLang('local')}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                                          activeSubLang === 'local'
                                            ? 'bg-sky-500 text-black border-sky-300'
                                            : 'bg-[#141622] text-zinc-300 border-white/10'
                                        }`}
                                      >
                                        📄 {uploadedSubCues.label}
                                      </button>
                                    )}
                                    {isAdmin && (
                                      <button
                                        onClick={() => subtitleFileInputRef.current?.click()}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/15 cursor-pointer"
                                      >
                                        + Upload .SRT/.MD.SRT
                                      </button>
                                    )}

                                    {activeSubLang !== 'off' && (
                                      <>
                                        <span className="text-zinc-600 mx-0.5">|</span>
                                        {(['sm', 'md', 'lg'] as const).map((sz) => (
                                          <button
                                            key={sz}
                                            onClick={() => setSubFontSize(sz)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase cursor-pointer ${
                                              subFontSize === sz ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'
                                            }`}
                                          >
                                            {sz === 'sm' ? 'S' : sz === 'md' ? 'M' : 'L'}
                                          </button>
                                        ))}
                                        {(['white', 'yellow', 'cyan'] as const).map((col) => (
                                          <button
                                            key={col}
                                            onClick={() => setSubColor(col)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-black capitalize cursor-pointer border ${
                                              subColor === col ? 'border-white scale-105' : 'border-white/15 opacity-70'
                                            } ${col === 'yellow' ? 'text-amber-300' : col === 'cyan' ? 'text-cyan-300' : 'text-white'}`}
                                          >
                                            {col}
                                          </button>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                ) : <div />}

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1 mr-1">
                                    <Moon className="w-3.5 h-3.5" />
                                    <span>Sleep:</span>
                                  </span>
                                  {(
                                    [
                                      { id: 'off' as SleepTimerMode, label: 'OFF' },
                                      { id: '30m' as SleepTimerMode, label: '30m' },
                                      { id: '60m' as SleepTimerMode, label: '60m' },
                                      { id: 'end_of_ep' as SleepTimerMode, label: 'End of Ep' },
                                    ] as const
                                  ).map((st) => (
                                    <button
                                      key={st.id}
                                      onClick={() => {
                                        setSleepTimerMode(st.id);
                                        showHudFeedback(st.id === 'off' ? '🌙 Sleep Timer Off' : `🌙 Sleep Timer: ${st.label}`);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                                        sleepTimerMode === st.id
                                          ? 'bg-indigo-500 text-white border-indigo-300'
                                          : 'bg-[#141622] text-zinc-300 border-white/10'
                                      }`}
                                    >
                                      {st.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin-Only Master Audio Sync & Lip-Sync Calibration Bar (Hidden from regular visitors) */}
                      {isAdmin && (resolvedPlayerSource?.type === 'video' || Boolean(trackCustomAudio)) && (
                        <div className="px-3.5 py-2.5 rounded-xl bg-[#11131d] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                isExternalAudioActive
                                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                                  : 'bg-white/[0.05] border-white/10 text-zinc-300'
                              }`}
                            >
                              <Headphones className="w-3.5 h-3.5" />
                              <span>
                                {isExternalAudioActive
                                  ? `Custom ${activeAudio} Synced`
                                  : 'Built-in Stream Audio'}
                              </span>
                            </span>

                            <button
                              onClick={() => setIsAudioMuted((m) => !m)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isAudioMuted
                                  ? 'bg-red-500/20 border-red-400/40 text-red-300'
                                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white'
                              }`}
                              title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                            >
                              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>

                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={isAudioMuted ? 0 : audioVolume}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setAudioVolume(val);
                                  if (val > 0 && isAudioMuted) setIsAudioMuted(false);
                                }}
                                aria-label="Master Audio Volume"
                                className="w-24 sm:w-28 accent-[#e50914] cursor-pointer h-1.5"
                              />
                              <span className="text-[11px] font-black text-zinc-300 w-9 tabular-nums">
                                {Math.round((isAudioMuted ? 0 : audioVolume) * 100)}%
                              </span>
                            </div>
                          </div>

                          {Boolean(trackCustomAudio) && resolvedPlayerSource?.type === 'video' && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider mr-1">
                                Lip-Sync:
                              </span>
                              <button
                                onClick={() => {
                                  setAudioSyncOffset((prev) => Number((prev - 0.2).toFixed(1)));
                                  showHudFeedback('🎧 Audio Sync -0.2s');
                                }}
                                className="px-2 py-1 rounded-lg bg-[#141622] hover:bg-[#1e2235] border border-white/15 text-zinc-200 text-[11px] font-black cursor-pointer"
                              >
                                -0.2s
                              </button>
                              <button
                                onClick={() => {
                                  setAudioSyncOffset(0);
                                  showHudFeedback('🎧 Audio Sync Reset (0.0s)');
                                }}
                                className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-amber-300 text-[11px] font-black tabular-nums cursor-pointer"
                                title="Reset Lip-Sync Offset to 0.0s"
                              >
                                {audioSyncOffset > 0 ? `+${audioSyncOffset.toFixed(1)}s` : `${audioSyncOffset.toFixed(1)}s`}
                              </button>
                              <button
                                onClick={() => {
                                  setAudioSyncOffset((prev) => Number((prev + 0.2).toFixed(1)));
                                  showHudFeedback('🎧 Audio Sync +0.2s');
                                }}
                                className="px-2 py-1 rounded-lg bg-[#141622] hover:bg-[#1e2235] border border-white/15 text-zinc-200 text-[11px] font-black cursor-pointer"
                              >
                                +0.2s
                              </button>
                              <button
                                onClick={() => {
                                  setForceBuiltinAudio((prev) => !prev);
                                  showHudFeedback(forceBuiltinAudio ? '🎧 External Dub Active' : '🔊 Built-in Audio Active');
                                }}
                                className={`ml-1 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                  forceBuiltinAudio
                                    ? 'bg-amber-500/20 border-amber-400/45 text-amber-200'
                                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-zinc-300'
                                }`}
                              >
                                {forceBuiltinAudio ? 'Use External Dub' : 'Use Built-in Audio'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Honest 1-line Cloud Embed Mode helper whenever stream is a third-party iframe */}
                      {resolvedPlayerSource?.type === 'iframe' && (
                        <div
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                            iframeControlNotice
                              ? 'bg-[#f59e0b]/15 border-[#f59e0b]/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                              : 'bg-white/[0.03] border-white/10 text-zinc-400'
                          }`}
                        >
                          <span>
                            ℹ️ Cloud Embed Mode: Use the timeline bar &amp; ⚙️ icon inside the video frame to seek or change speed (or use Direct MP4 links for external button control)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 4. Cloud Servers (India No-VPN) + Episode Navigation, Audio Switcher & Utility Modes */}
                    <div className="px-4 py-3 bg-[#090a10] space-y-2.5">
                      {/* Cloud Server Switcher Row (shown whenever mirrors exist) */}
                      {currentSourceMeta && currentSourceMeta.mirrors.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1 mr-1">
                              <Server className="w-3.5 h-3.5 text-emerald-400" />
                              <span>🇮🇳 Cloud Servers:</span>
                            </span>
                            {currentSourceMeta.mirrors.map((mirror, idx) => {
                              const isMirrorActive = activeMirrorIndex === idx;
                              return (
                                <button
                                  key={`${mirror.label}-${idx}`}
                                  onClick={() => handleMirrorSelect(idx, mirror.label)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black border transition-all cursor-pointer whitespace-nowrap ${
                                    isMirrorActive
                                      ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                      : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-200 hover:text-white border-white/15'
                                  }`}
                                >
                                  {mirror.label}
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-[11px] font-semibold text-zinc-400">
                            💡 No VPN needed on Server 1/2 in India
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        {/* Left: Prev/Next Ep + 1-Click Audio Switcher */}
                        <div className="flex flex-wrap items-center gap-2">
                          {!isMovie && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) =>
                                  prevStreamItem &&
                                  handleOpenStream(prevStreamItem.epNum, activeAudio, prevStreamItem.episodeKey, e)
                                }
                                disabled={!prevStreamItem}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 border transition-all whitespace-nowrap ${
                                  prevStreamItem
                                    ? 'bg-white/[0.08] hover:bg-white/[0.15] text-white border-white/15 cursor-pointer'
                                    : 'bg-white/[0.02] text-zinc-600 border-white/5 cursor-not-allowed'
                                }`}
                              >
                                <SkipBack className="w-3.5 h-3.5" />
                                <span>Prev Ep</span>
                              </button>

                              <button
                                onClick={(e) =>
                                  nextStreamItem &&
                                  handleOpenStream(nextStreamItem.epNum, activeAudio, nextStreamItem.episodeKey, e)
                                }
                                disabled={!nextStreamItem}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 border transition-all whitespace-nowrap ${
                                  nextStreamItem
                                    ? 'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white border-red-400/40 shadow cursor-pointer'
                                    : 'bg-white/[0.02] text-zinc-600 border-white/5 cursor-not-allowed'
                                }`}
                              >
                                <span>Next Ep</span>
                                <SkipForward className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {playerTrackSwitcherList.length > 0 && (
                            <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/10">
                              {playerTrackSwitcherList.map((item) => {
                                const isTrackActive = activeAudio === item.track;
                                return (
                                  <button
                                    key={item.track}
                                    onClick={() => handleSwitchPlayerTrack(item.track)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer whitespace-nowrap ${
                                      isTrackActive
                                        ? 'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white shadow'
                                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Right: Lights Off, Theater, Fullscreen & Telegram Backup Link */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => setIsLightsOff((prev) => !prev)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                              isLightsOff
                                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                                : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border-white/10'
                            }`}
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>{isLightsOff ? 'Lights On' : 'Lights Off'}</span>
                          </button>

                          <button
                            onClick={() => setIsTheaterMode((prev) => !prev)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                              isTheaterMode
                                ? 'bg-[#f59e0b] text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                                : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border-white/10'
                            }`}
                          >
                            {isTheaterMode ? (
                              <Minimize2 className="w-3.5 h-3.5" />
                            ) : (
                              <Maximize2 className="w-3.5 h-3.5" />
                            )}
                            <span>Theater</span>
                          </button>

                          <button
                            onClick={handleFullscreen}
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-white border border-white/15 text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <Maximize className="w-3.5 h-3.5" />
                            <span>Fullscreen</span>
                          </button>

                          {currentPlayingStream.telegramUrl && (
                            <a
                              href={currentPlayingStream.telegramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-[#e50914]/90 hover:bg-[#e50914] text-white text-[11px] font-black flex items-center gap-1.5 shadow whitespace-nowrap"
                            >
                              <Send className="w-3 h-3" />
                              <span>Telegram Backup Link</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Horizontal Quick Episode Selector Pills */}
                      {activeTrackStreamables.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-white/[0.06]">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
                            Episodes:
                          </span>
                          {activeTrackStreamables.map((item) => {
                            const isPlayingThis = item.epNum === currentPlayingStream.epNum;
                            return (
                              <button
                                key={`quick-ep-${activeAudio}-${item.epNum}`}
                                onClick={(e) => handleOpenStream(item.epNum, activeAudio, item.episodeKey, e)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 border transition-all cursor-pointer ${
                                  isPlayingThis
                                    ? 'bg-[#e50914] text-white border-red-400/50 shadow-[0_0_14px_rgba(229,9,20,0.45)]'
                                    : 'bg-[#141622] hover:bg-[#1e2235] text-zinc-300 border-white/10'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 5. DMCA Safe-Harbor & Third-Party Host Disclaimer Bar */}
                    <div className="px-4 py-2.5 bg-[#05060a] border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        🛡️ Fair-Use &amp; DMCA Safe-Harbor Notice: AsiaFlix Prime does not host, upload, or store any video files on its servers. This player only embeds third-party cloud links provided by independent web hosts.
                      </p>
                      {onReportIssue && (
                        <button
                          onClick={onReportIssue}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-[11px] font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Report / DMCA Takedown</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              </div>
            </div>
          )}

          {!isMiniPlayer && (
            <>

          {frontSuccess && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-between animate-fade-in shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <span>"{drama.title}" ab live portal par sabse aage (#1 position) par set ho gaya hai!</span>
              </div>
              <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-black">#1 FRONT</span>
            </div>
          )}

          {/* LIVE KNOWN ISSUE / RESOLVED NOTICE BANNERS */}
          {drama.issueText && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border border-amber-400/40 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    ⚠️ Known Issue Under Fix
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-amber-50 leading-relaxed pl-4">
                  {drama.issueText}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-black">
                🔧 FIXING
              </span>
            </div>
          )}

          {drama.issueFixedText && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 border border-emerald-400/40 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    ✅ Issue Resolved
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-emerald-50 leading-relaxed pl-4">
                  {drama.issueFixedText}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400 text-black">
                RESOLVED
              </span>
            </div>
          )}

          {/* TELEGRAM & ONLINE STREAM TRACK SELECTOR */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#e50914]" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Audio Tracks &amp; Direct Links (
                  {Math.max(availableTrackList.length, drama.availableAudios.length || 1)} Audio{' '}
                  {Math.max(availableTrackList.length, drama.availableAudios.length || 1) > 1 ? 'Tracks' : 'Track'}{' '}
                  Ready)
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">Online HD Player + Direct private channel links</span>
            </div>

            <div
              className={`grid gap-2.5 ${
                availableTrackList.length === 1
                  ? 'grid-cols-1'
                  : availableTrackList.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-3'
              }`}
            >
              {availableTrackList.map((audio) => {
                const link = audioLinkMap[audio];
                const trackStreamables =
                  streamablesByTrack[
                    audio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : (audio as keyof typeof streamablesByTrack)
                  ] || [];
                const isSelected = activeAudio === audio;
                const icon = audio === 'Hindi Dubbed' ? '🇮🇳' : audio.includes('Fan') ? '🎙️' : '🌐';
                return (
                  <div
                    key={audio}
                    onClick={() => setActiveAudio(audio)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#e50914]/15 border-[#e50914] shadow-[0_0_15px_rgba(229,9,20,0.25)]'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/25 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{icon}</span>
                        <span>{audio}</span>
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black">
                        {trackStreamables.length > 0 ? '▶ HD Stream' : '⚡ Ready'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] text-zinc-400 truncate">
                        {trackStreamables.length > 0
                          ? `${trackStreamables.length} Ep Online Stream`
                          : '1080p FHD Stream'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {trackStreamables.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenStream(
                                trackStreamables[0].epNum,
                                audio,
                                trackStreamables[0].episodeKey,
                                e
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#e50914] hover:bg-[#f6121d] text-white text-[11px] font-black flex items-center gap-1 shadow cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Stream</span>
                          </button>
                        )}
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-[11px] font-black flex items-center gap-1 shadow"
                          >
                            <Send className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Promised / Coming Soon Audios */}
              {drama.comingSoonAudios &&
                drama.comingSoonAudios.map((audio) => {
                  const icon = audio === 'Hindi Dubbed' ? '🇮🇳' : audio.includes('Fan') ? '🎙️' : '🌐';
                  const audioLabel = audio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : audio;
                  return (
                    <div
                      key={`cs-${audio}`}
                      className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-300 flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span>{audioLabel}</span>
                        </span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-black">
                          ⏳ Coming Soon
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-zinc-400">
                        <span>Dubbing / In Pipeline</span>
                        <span className="text-amber-400 font-bold">Dropping Soon</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ACTIVE AUDIO STATUS & STREAM ACCESS */}
          {(currentAudioLink || activeTrackStreamables.length > 0) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-[#111218] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    {activeAudio} Stream Available · 1080p FHD
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  {isMovie
                    ? `Complete Full Movie in clean ${activeAudio} audio ready to stream or open on Telegram.`
                    : `Watch online inside the IMAX Cyber-Cinema Player or open episodes directly on Telegram.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {savedDramaProgress && savedDramaProgress.currentTime >= 2 && (
                  <button
                    onClick={handleResumeSavedProgress}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black text-xs font-black shadow-[0_0_18px_rgba(245,158,11,0.45)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-300/60"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>
                      ▶ Resume Ep {savedDramaProgress.ep} from {formatTimeSeconds(savedDramaProgress.currentTime)}
                    </span>
                  </button>
                )}

                {activeTrackStreamables.length > 0 && (
                  <button
                    onClick={(e) =>
                      handleOpenStream(
                        activeTrackStreamables[0].epNum,
                        activeAudio,
                        activeTrackStreamables[0].episodeKey,
                        e
                      )
                    }
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#b20710] hover:from-[#f6121d] hover:to-[#e50914] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.45)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-400/35"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>
                      {isMovie ? 'Watch Movie Online' : `Watch Online (Ep ${activeTrackStreamables[0].epNum})`}
                    </span>
                  </button>
                )}

                {currentAudioLink && (
                  <a
                    href={currentAudioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isMovie ? 'Watch Full Movie on Telegram' : `Open ${activeAudio} Post`}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Watchlist Status Selector & Meta Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-400">Watchlist Status:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onToggleWatchlist(drama, 'want_to_watch')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isWatchlisted && watchlistStatus === 'want_to_watch'
                      ? 'bg-amber-500 text-black shadow-sm font-black'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white'
                  }`}
                >
                  🔖 Want to Watch
                </button>
                <button
                  onClick={() => onToggleWatchlist(drama, 'watching')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isWatchlisted && watchlistStatus === 'watching'
                      ? 'bg-sky-500 text-white shadow-sm font-black'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white'
                  }`}
                >
                  ▶️ Watching
                </button>
                <button
                  onClick={() => onToggleWatchlist(drama, 'completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isWatchlisted && watchlistStatus === 'completed'
                      ? 'bg-emerald-500 text-white shadow-sm font-black'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white'
                  }`}
                >
                  ✅ Completed
                </button>
                {isWatchlisted && (
                  <button
                    onClick={() => onToggleWatchlist(drama)}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 ml-1 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-zinc-400">
              {onReportIssue && (
                <button
                  onClick={onReportIssue}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⚠️ Report Broken Link / Audio Issue</span>
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>100% Free VIP Stream · No Token Needed</span>
              </div>
            </div>
          </div>

          {/* Details & Schedule Overview Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" />
                <span>Details &amp; Runtime</span>
              </span>
              <p className="text-sm font-black text-white">
                {drama.details || (isMovie ? 'Feature Film 1080p' : '16 Episodes')}
              </p>
              <p className="text-[11px] text-zinc-400">
                Format: {isMovie ? 'Full Length Movie (Continuous Stream)' : 'Episodic VIP Series'}
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                isDroppingToday
                  ? 'bg-gradient-to-r from-emerald-950/40 via-black/40 to-amber-950/30 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-white/[0.03] border-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Release Schedule</span>
                </span>
                {isDroppingToday && (
                  <span className="bg-gradient-to-r from-emerald-400 to-amber-400 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow animate-pulse">
                    🔥 New Episode Drops Today!
                  </span>
                )}
              </div>

              {hasActiveTrackSchedules && drama.activeTrackSchedules ? (
                <div className="space-y-1.5">
                  {drama.activeTrackSchedules.map((track) => {
                    const trackToday = isAiringToday(track.scheduleText);
                    const themeClass =
                      track.key === 't1'
                        ? 'bg-red-500/15 border-red-500/35 text-red-200'
                        : track.key === 't2'
                        ? 'bg-amber-500/15 border-amber-500/35 text-amber-200'
                        : 'bg-sky-500/15 border-sky-500/35 text-sky-200';
                    const icon = track.key === 't1' ? '🔊' : track.key === 't2' ? '🎙️' : '💬';
                    const progressLabel = track.isComingSoon
                      ? 'Soon'
                      : track.totalEp > 0
                      ? `Ep ${track.currentEp}/${track.totalEp}`
                      : `Ep ${track.currentEp}`;

                    return (
                      <div
                        key={track.key}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold ${themeClass}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>{icon}</span>
                          <span className="font-black text-white">{track.shortLabel}</span>
                          <span className="opacity-80 text-[10px]">({progressLabel})</span>
                          <span className="text-zinc-200 truncate">🗓️ {track.scheduleText}</span>
                        </div>
                        {trackToday && (
                          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 animate-pulse">
                            🔥 TODAY
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : drama.activeTrackSchedules === undefined && drama.schedule && drama.schedule.trim() ? (
                <>
                  <p className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                    <span>🗓️ Drops:</span>
                    <span className="text-white">{drama.schedule}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {isDroppingToday
                      ? 'Today is official drop day! Fresh episodes uploaded on AsiaFlix VIP Telegram around 7:00 PM IST.'
                      : `Episodes drop on scheduled days (${drama.schedule}) on AsiaFlix VIP Telegram.`}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm sm:text-base font-black text-emerald-300 flex items-center gap-2">
                    <span>✅ Status:</span>
                    <span className="text-white">Full Series Completed (All Episodes Live)</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    All episodes and batches are ready for instant binge-watching in 1080p FHD.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Lead Cast Section */}
          {(drama.leadCast && drama.leadCast.length > 0) || (drama.cast && drama.cast.length > 0) ? (
            <div>
              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Lead Cast</h4>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
                {Array.from(new Set(drama.leadCast && drama.leadCast.length > 0 ? drama.leadCast : drama.cast)).map(
                  (actor, idx) => (
                    <span
                      key={`cast-${actor}-${idx}`}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-bold flex items-center gap-1.5"
                    >
                      <span>🎭</span>
                      <span>{actor}</span>
                    </span>
                  )
                )}
              </div>
            </div>
          ) : null}

          {/* Hashtags Section */}
          {((drama.hashtags && drama.hashtags.length > 0) || (drama.tags && drama.tags.length > 0)) && (
            <div>
              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                Series Hashtags &amp; Topics
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set(drama.hashtags && drama.hashtags.length > 0 ? drama.hashtags : drama.tags)).map(
                  (tag, idx) => (
                    <span
                      key={`tag-${tag}-${idx}`}
                      className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Synopsis & Storyline */}
          <div>
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
              Synopsis &amp; Storyline
            </h4>
            <p className="text-sm text-zinc-300 leading-relaxed">{drama.synopsis}</p>
          </div>

          {/* Episodes List & Dual Online Stream + Telegram Deep Links */}
          {!isMovie && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Episode Upload Packs &amp; Online Stream Links</span>
                </h4>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsAntiSpoilerOn((v) => !v)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black border flex items-center gap-1.5 cursor-pointer transition-all ${
                      isAntiSpoilerOn
                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border-white/10'
                    }`}
                    title="Blur titles & thumbnails of unwatched future episodes"
                  >
                    {isAntiSpoilerOn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>🛡️ Anti-Spoiler Shield: {isAntiSpoilerOn ? 'ON' : 'OFF'}</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">Watched: {watchedEpisodes.length} episodes</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {showIndividualEpisodeCards ? (
                  episodesForActiveAudio.map((ep) => {
                    const isWatched = watchedEpisodes.includes(ep.episodeNumber) || watchedEpisodes.includes('all');
                    const streamUrl = getStreamLinkForTrack(ep, activeAudio);
                    const hasStreamLink = Boolean(streamUrl && /^https?:\/\//i.test(streamUrl));
                    const hasTelegramLink = Boolean(ep.telegramUrl && /^https?:\/\//i.test(ep.telegramUrl));
                    const numericEp = extractNumericEp(ep.episodeNumber);
                    const isCurrentlyPlaying = activeStreamEp === numericEp;
                    const epCustomThumbnail =
                      ep.thumbnailUrl || drama.episodeThumbnails?.[numericEp] || drama.thumbnailUrl;
                    const isSpoilerBlurred =
                      isAntiSpoilerOn && !isWatched && !isCurrentlyPlaying && !revealedSpoilerEpKeys[ep.id];

                    return (
                      <div
                        key={ep.id}
                        onClick={(e) => {
                          if (hasStreamLink) {
                            handleOpenStream(numericEp, activeAudio, ep.episodeNumber, e);
                          }
                        }}
                        className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                          hasStreamLink ? 'cursor-pointer' : ''
                        } ${
                          isCurrentlyPlaying
                            ? 'bg-[#e50914]/15 border-[#e50914]/60 shadow-[0_0_20px_rgba(229,9,20,0.2)]'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleEpisodeWatched(drama.id, ep.episodeNumber);
                            }}
                            className="text-zinc-400 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                            title={isWatched ? 'Mark as Unwatched' : 'Mark as Watched'}
                          >
                            {isWatched ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                            ) : (
                              <Circle className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                            )}
                          </button>

                          {epCustomThumbnail && (
                            <div className="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden shrink-0 border border-white/15 bg-zinc-900">
                              <img
                                src={epCustomThumbnail}
                                alt={ep.title}
                                referrerPolicy="no-referrer"
                                className={`w-full h-full object-cover object-center transition-all ${
                                  isSpoilerBlurred ? 'blur-md brightness-50 scale-110' : ''
                                }`}
                              />
                              {hasStreamLink && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="w-7 h-7 rounded-full bg-[#e50914]/90 flex items-center justify-center shadow">
                                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-black text-white truncate block transition-all ${
                                  isSpoilerBlurred ? 'blur-sm select-none' : ''
                                }`}
                              >
                                {ep.title}
                              </span>
                              {isSpoilerBlurred && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRevealedSpoilerEpKeys((prev) => ({ ...prev, [ep.id]: true }));
                                  }}
                                  className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-black cursor-pointer"
                                >
                                  👁 Reveal Ep {numericEp}
                                </button>
                              )}
                              {isCurrentlyPlaying && (
                                <span className="text-[9px] bg-[#e50914] text-white px-1.5 py-0.2 rounded font-black uppercase shrink-0">
                                  Playing
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                              <span className="text-red-400 font-bold">{ep.audio}</span>
                              <span>·</span>
                              <span>{ep.quality || '1080p FHD'}</span>
                              {hasStreamLink && (
                                <>
                                  <span>·</span>
                                  <span className="text-emerald-400 font-bold">Protected Cloud Stream</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          {hasStreamLink && hasTelegramLink ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStream(numericEp, activeAudio, ep.episodeNumber, e);
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-[#e50914] hover:bg-[#f6121d] text-white text-xs font-black border border-red-400/35 shadow-[0_0_14px_rgba(229,9,20,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Stream</span>
                              </button>
                              <a
                                href={ep.telegramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#e50914] text-zinc-200 hover:text-white border border-white/15 text-xs font-black transition-all flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>Telegram</span>
                              </a>
                            </>
                          ) : hasStreamLink ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStream(numericEp, activeAudio, ep.episodeNumber, e);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-[#e50914] hover:bg-[#f6121d] text-white text-xs font-black border border-red-400/35 shadow-[0_0_14px_rgba(229,9,20,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Watch Online</span>
                            </button>
                          ) : hasTelegramLink ? (
                            <a
                              href={ep.telegramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1.5 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black shadow transition-all flex items-center gap-1 shrink-0"
                            >
                              <Send className="w-3 h-3" />
                              <span>Watch on Telegram</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Master / Full Pack Drop */
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] transition-all">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => onToggleEpisodeWatched(drama.id, 'all')}
                        className="text-zinc-400 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                        title={watchedEpisodes.includes('all') ? 'Mark as Unwatched' : 'Mark as Watched'}
                      >
                        {watchedEpisodes.includes('all') ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white truncate">
                            {drama.title} · {activeAudio} Master Pack
                          </span>
                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded border border-amber-500/30">
                            {drama.details || 'Batch / Merged'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span className="text-red-400 font-bold">{activeAudio}</span>
                          <span>·</span>
                          <span className="text-zinc-400">1080p FHD Quality</span>
                          {drama.schedule && (
                            <>
                              <span>·</span>
                              <span className="text-amber-400">{drama.schedule}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeTrackStreamables.length > 0 && (
                        <button
                          onClick={(e) =>
                            handleOpenStream(
                              activeTrackStreamables[0].epNum,
                              activeAudio,
                              activeTrackStreamables[0].episodeKey,
                              e
                            )
                          }
                          className="px-3.5 py-2 rounded-lg bg-[#e50914] hover:bg-[#f6121d] text-white text-xs font-black border border-red-400/35 shadow-[0_0_15px_rgba(229,9,20,0.45)] transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Watch Online</span>
                        </button>
                      )}

                      {currentAudioLink && (
                        <a
                          href={currentAudioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black shadow-md hover:shadow-[0_0_15px_rgba(229,9,20,0.6)] transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Watch on Telegram</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PART C-1: 1-TAP AUDIENCE HYPE VIBE METER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>⚡ Audience Hype Vibe Meter</span>
              </h4>
              <span className="text-[11px] text-zinc-400 font-semibold">Tap to cast your vibe vote</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {HYPE_REACTIONS.map((item) => {
                const count = hypeState.counts[item.key] || 0;
                const voted = Boolean(hypeState.userVoted[item.key]);
                const totalAll = Math.max(
                  1,
                  Object.values(hypeState.counts).reduce((acc, v) => acc + v, 0)
                );
                const pct = Math.round((count / totalAll) * 100);
                return (
                  <button
                    key={item.key}
                    onClick={() => setHypeState(toggleHypeVote(drama.id, item.key, drama.rating))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                      voted
                        ? item.glowClass
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black flex items-center gap-1.5">
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                      </span>
                      <span className="text-xs font-black tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#e50914] to-amber-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PART C-2: SPOILER-FREE QUICK STORY & AUDIO GUIDE */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setShowStoryGuide((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <span className="text-xs font-black text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <span>📖 Spoiler-Free Story &amp; Audio Track Guide</span>
              </span>
              <span className="text-xs font-black text-amber-300">{showStoryGuide ? 'Hide ▴' : 'Open ▾'}</span>
            </button>
            {showStoryGuide && (
              <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] text-xs text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-white">Genre &amp; Vibe:</strong> {drama.category}
                  {drama.subCategory ? ` • ${drama.subCategory}` : ''} ({drama.releaseYear}) —{' '}
                  {(drama.tags || []).slice(0, 5).join(', ')}.
                </p>
                <p>
                  <strong className="text-white">Available Audio Tracks:</strong>{' '}
                  {availableTrackList.join(' • ') || drama.defaultAudio}. Switch tracks anytime inside the player without losing your timestamp!
                </p>
                <p className="text-zinc-400">
                  💡 Tip: Toggle <strong className="text-amber-300">Anti-Spoiler Shield</strong> above the episode list to blur unwatched future episodes.
                </p>
              </div>
            )}
          </div>

          {/* PART C-3: MORE LIKE THIS (3 RECOMMENDED DRAMAS) */}
          {moreLikeThisDramas.length > 0 && onSelectDrama && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>🎬 More Like This</span>
                  <span className="text-[11px] font-bold text-zinc-400">Similar VIP picks for you</span>
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {moreLikeThisDramas.map((rec) => (
                  <div
                    key={`rec-${rec.id}`}
                    onClick={() => onSelectDrama(rec)}
                    className="group rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-[#e50914]/60 overflow-hidden cursor-pointer transition-all flex items-center gap-3 p-2.5"
                  >
                    <img
                      src={rec.poster}
                      alt={rec.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-24 rounded-xl object-cover shrink-0 bg-zinc-900 border border-white/10 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <h5 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-red-400 transition-colors">
                        {rec.title}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-bold">
                        <span>{rec.category}</span>
                        <span>•</span>
                        <span className="text-amber-300 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {rec.rating}
                        </span>
                      </div>
                      <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded bg-[#e50914]/20 text-red-300 border border-red-500/30">
                        {rec.defaultAudio}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
