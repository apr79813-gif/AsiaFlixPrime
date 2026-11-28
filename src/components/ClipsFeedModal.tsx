import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Flame,
  Heart,
  Pause,
  Play,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AudioType, ClipItem, DramaItem } from '../types/drama';
import {
  buildProxiedMediaUrl,
  formatTimeSeconds,
  getCachedArchiveOrgDirectStream,
  getCachedOkRuOrVkNativeStream,
  resolveArchiveOrgDirectStream,
  resolveExternalAudioStream,
  resolveOkRuOrVkNativeStream,
  resolveUniversalVideoSource,
} from '../services/vipPlayerHelper';
import { OFFICIAL_WATERMARK_LOGO_URL, useTransparentLogo } from './AnimatedChannelLogo';

export const LIKED_CLIPS_STORAGE_KEY = 'asiaflix_liked_clips';
export const LIKED_CLIPS_UPDATED_EVENT = 'asiaflix-liked-clips-updated';

export interface StoredLikedClip {
  id: string;
  dramaId: string;
  title: string;
  label?: string;
  episodeNumber?: number;
  poster: string;
  audio?: AudioType;
  startTime?: number;
  likedAt: number;
}

export function getLikedClipsList(): StoredLikedClip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_CLIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.id === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

export function toggleClipLikeStorage(clip: ClipItem, forceLike = false): { liked: boolean; list: StoredLikedClip[] } {
  const current = getLikedClipsList();
  const exists = current.some((c) => c.id === clip.id);
  let next: StoredLikedClip[];
  let liked: boolean;
  if (exists && !forceLike) {
    next = current.filter((c) => c.id !== clip.id);
    liked = false;
  } else if (exists && forceLike) {
    next = current;
    liked = true;
  } else {
    const entry: StoredLikedClip = {
      id: clip.id,
      dramaId: clip.dramaId,
      title: clip.title,
      label: clip.label,
      episodeNumber: clip.episodeNumber,
      poster: clip.poster,
      audio: clip.audio,
      startTime: clip.startTime,
      likedAt: Date.now(),
    };
    next = [entry, ...current].slice(0, 120);
    liked = true;
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LIKED_CLIPS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(LIKED_CLIPS_UPDATED_EVENT, { detail: next }));
    } catch {
      // ignore storage quota errors
    }
  }
  return { liked, list: next };
}

function hashCountSeed(seedStr: string, min: number, span: number): number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + (Math.abs(h) % span);
}

const AUTO_CLIP_SEGMENTS: Array<{ label: string; startTime: number; endTime: number }> = [
  { label: '🔥 Opening Hook', startTime: 150, endTime: 190 },
  { label: '⚡ Intense Scene', startTime: 660, endTime: 700 },
  { label: '💖 Peak Drama Moment', startTime: 1320, endTime: 1360 },
  { label: '🎬 Climax Highlight', startTime: 1980, endTime: 2020 },
];

export function buildAllDramaClips(
  dramas: DramaItem[],
  preferredAudio?: AudioType
): ClipItem[] {
  const sheetClips: ClipItem[] = [];
  const dramaBuckets: ClipItem[][] = [];

  dramas.forEach((drama) => {
    const bucket: ClipItem[] = [];

    if (Array.isArray(drama.clips) && drama.clips.length > 0) {
      drama.clips.forEach((c) => {
        sheetClips.push(c);
      });
    }

    const eps = Array.isArray(drama.episodes) ? drama.episodes : [];
    eps.forEach((ep, epIdx) => {
      if (epIdx > 5) return; // Cap auto-generation per series at first 6 playable eps for fast scroll variety
      const epNum =
        typeof ep.episodeNumber === 'number'
          ? ep.episodeNumber
          : parseInt(String(ep.episodeNumber || epIdx + 1), 10) || epIdx + 1;

      const candidates: Array<{ audio: AudioType; url?: string; extAudio?: string }> = [
        { audio: 'Hindi Dubbed', url: ep.streamLink, extAudio: ep.hindiCustomAudioLink },
        { audio: 'Hindi Fan Dubbed', url: ep.hindiFanDubStreamLink, extAudio: ep.fanDubCustomAudioLink },
        { audio: 'Original / Eng Sub', url: ep.engSubStreamLink, extAudio: ep.origCustomAudioLink },
      ];

      // Pick track prioritizing preferredAudio first, then any available stream
      const sortedCandidates = [...candidates].sort((a, b) => {
        if (preferredAudio) {
          if (a.audio === preferredAudio && b.audio !== preferredAudio) return -1;
          if (b.audio === preferredAudio && a.audio !== preferredAudio) return 1;
        }
        return 0;
      });

      const chosen = sortedCandidates.find((c) => c.url && /^https?:\/\//i.test(c.url.trim()));
      if (!chosen || !chosen.url) return;

      AUTO_CLIP_SEGMENTS.forEach((seg, segIdx) => {
        bucket.push({
          id: `auto-${drama.id}-ep${epNum}-s${segIdx}`,
          dramaId: drama.id,
          title: drama.title,
          label: seg.label,
          episodeNumber: epNum,
          streamUrl: chosen.url!.trim(),
          externalAudioUrl: chosen.extAudio,
          poster: drama.poster,
          backdrop: drama.backdrop || drama.poster,
          thumbnailUrl: ep.thumbnailUrl || drama.thumbnailUrl || drama.poster,
          startTime: seg.startTime,
          endTime: seg.endTime,
          audio: chosen.audio,
          sourceType: 'auto',
          category: drama.category,
          tags: drama.tags || [],
          synopsis: drama.synopsis,
          telegramUrl: ep.telegramUrl || drama.telegramUrl,
        });
      });
    });

    // Movie fallback if no episode entries exist
    if (bucket.length === 0 && (drama.movieStreamLink || drama.movieFanDubStreamLink || drama.movieEngSubStreamLink)) {
      const mUrl = drama.movieStreamLink || drama.movieFanDubStreamLink || drama.movieEngSubStreamLink || '';
      const mAudio: AudioType = drama.movieStreamLink
        ? 'Hindi Dubbed'
        : drama.movieFanDubStreamLink
        ? 'Hindi Fan Dubbed'
        : 'Original / Eng Sub';
      if (/^https?:\/\//i.test(mUrl.trim())) {
        AUTO_CLIP_SEGMENTS.forEach((seg, segIdx) => {
          bucket.push({
            id: `auto-${drama.id}-movie-s${segIdx}`,
            dramaId: drama.id,
            title: drama.title,
            label: seg.label,
            episodeNumber: 1,
            streamUrl: mUrl.trim(),
            poster: drama.poster,
            backdrop: drama.backdrop || drama.poster,
            thumbnailUrl: drama.thumbnailUrl || drama.poster,
            startTime: seg.startTime,
            endTime: seg.endTime,
            audio: mAudio,
            sourceType: 'auto',
            category: drama.category,
            tags: drama.tags || [],
            synopsis: drama.synopsis,
            telegramUrl: drama.telegramUrl,
          });
        });
      }
    }

    if (bucket.length > 0) {
      dramaBuckets.push(bucket);
    }
  });

  // Round-robin interleave buckets so user gets diverse dramas on every swipe
  const interleavedAuto: ClipItem[] = [];
  let round = 0;
  let pushed = true;
  while (pushed && interleavedAuto.length < 180) {
    pushed = false;
    for (const bucket of dramaBuckets) {
      if (bucket[round]) {
        interleavedAuto.push(bucket[round]);
        pushed = true;
      }
    }
    round++;
  }

  return [...sheetClips, ...interleavedAuto];
}

interface ClipSlideProps {
  clip: ClipItem;
  drama?: DramaItem;
  isActive: boolean;
  isNearActive: boolean;
  isFirstClip: boolean;
  showFirstClipLogoReveal: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isLiked: boolean;
  onToggleLike: (clip: ClipItem, forceLike?: boolean) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (drama?: DramaItem) => void;
  onWatchFullEpisode: (clip: ClipItem) => void;
  transparentLogoSrc: string;
}

const ClipSlide: React.FC<ClipSlideProps> = ({
  clip,
  drama,
  isActive,
  isNearActive,
  isFirstClip,
  showFirstClipLogoReveal,
  isMuted,
  onToggleMute,
  isLiked,
  onToggleLike,
  isWatchlisted,
  onToggleWatchlist,
  onWatchFullEpisode,
  transparentLogoSrc,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioHlsRef = useRef<Hls | null>(null);
  const lastTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<number | null>(null);
  const hasSeekedStartRef = useRef(false);

  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [resolvedType, setResolvedType] = useState<'video' | 'iframe'>('video');
  const [isHlsStream, setIsHlsStream] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(clip.startTime || 0);
  const [duration, setDuration] = useState(0);

  const [extAudioSrc, setExtAudioSrc] = useState<string>('');
  const [extAudioReady, setExtAudioReady] = useState(false);
  const [extAudioFailed, setExtAudioFailed] = useState(false);
  const audioProxyRetriedRef = useRef(false);

  const [heartBursts, setHeartBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [fireBursts, setFireBursts] = useState<number[]>([]);
  const [fireCount, setFireCount] = useState(() => hashCountSeed(clip.id + '-fire', 48, 420));
  const baseLikeCount = useMemo(() => hashCountSeed(clip.id + '-like', 120, 1800), [clip.id]);
  const [showSynopsis, setShowSynopsis] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [tapFeedbackIcon, setTapFeedbackIcon] = useState<'play' | 'pause' | null>(null);

  const startOffset = clip.startTime || 0;
  const endOffset = clip.endTime && clip.endTime > startOffset ? clip.endTime : 0;

  // Resolve video URL when near active
  useEffect(() => {
    if (!isNearActive) return;
    let cancelled = false;
    hasSeekedStartRef.current = false;

    const resolveStream = async () => {
      const meta = resolveUniversalVideoSource(clip.streamUrl, 0);
      if (meta.asyncProvider?.provider === 'archive') {
        const cached = getCachedArchiveOrgDirectStream(meta.asyncProvider.id);
        if (cached) {
          if (!cancelled) {
            setResolvedType('video');
            setResolvedSrc(cached);
            setIsHlsStream(/\.m3u8(\?|$)/i.test(cached));
          }
          return;
        }
        const direct = await resolveArchiveOrgDirectStream(meta.asyncProvider.id);
        if (!cancelled) {
          if (direct) {
            setResolvedType('video');
            setResolvedSrc(direct);
            setIsHlsStream(/\.m3u8(\?|$)/i.test(direct));
          } else {
            setResolvedType('iframe');
            setResolvedSrc(`https://archive.org/embed/${meta.asyncProvider.id}`);
          }
        }
        return;
      }

      if (meta.asyncProvider?.provider === 'okru' || meta.asyncProvider?.provider === 'vk') {
        const cached = getCachedOkRuOrVkNativeStream(meta.asyncProvider.rawUrl);
        if (cached && cached.ok && (cached.streams.length > 0 || cached.proxiedHlsUrl)) {
          const picked =
            cached.streams.find((s) => s.height === 720) ||
            cached.streams.find((s) => s.height <= 720) ||
            cached.streams[0];
          const src = picked?.proxiedUrl || cached.proxiedHlsUrl || '';
          if (src && !cancelled) {
            setResolvedType('video');
            setResolvedSrc(src);
            setIsHlsStream(!picked?.proxiedUrl && Boolean(cached.proxiedHlsUrl));
            return;
          }
        }
        const extracted = await resolveOkRuOrVkNativeStream(meta.asyncProvider.rawUrl);
        if (!cancelled) {
          if (extracted.ok && (extracted.streams.length > 0 || extracted.proxiedHlsUrl)) {
            const picked =
              extracted.streams.find((s) => s.height === 720) ||
              extracted.streams.find((s) => s.height <= 720) ||
              extracted.streams[0];
            const src = picked?.proxiedUrl || extracted.proxiedHlsUrl || '';
            setResolvedType('video');
            setResolvedSrc(src);
            setIsHlsStream(!picked?.proxiedUrl && Boolean(extracted.proxiedHlsUrl));
          } else {
            setResolvedType('iframe');
            setResolvedSrc(
              meta.asyncProvider.provider === 'okru'
                ? `https://ok.ru/videoembed/${meta.asyncProvider.id}`
                : meta.asyncProvider.rawUrl
            );
          }
        }
        return;
      }

      if (!cancelled) {
        setResolvedType(meta.type);
        setResolvedSrc(meta.src);
        setIsHlsStream(/\.m3u8(\?|$)/i.test(meta.src));
      }
    };

    void resolveStream();
    return () => {
      cancelled = true;
    };
  }, [isNearActive, clip.streamUrl]);

  // Resolve paired external dubbed audio if present
  useEffect(() => {
    if (!isNearActive || !clip.externalAudioUrl) {
      setExtAudioSrc('');
      setExtAudioReady(false);
      setExtAudioFailed(false);
      return;
    }
    let cancelled = false;
    audioProxyRetriedRef.current = false;
    setExtAudioFailed(false);
    setExtAudioReady(false);

    void resolveExternalAudioStream(clip.externalAudioUrl).then((res) => {
      if (cancelled) return;
      if (res.ok && res.src) {
        setExtAudioSrc(res.src);
      } else {
        setExtAudioFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isNearActive, clip.externalAudioUrl]);

  // Attach HLS or direct source to video element
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || resolvedType !== 'video' || !resolvedSrc) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, maxBufferLength: 20 });
      hlsRef.current = hls;
      hls.loadSource(resolvedSrc);
      hls.attachMedia(vid);
    } else {
      vid.src = resolvedSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedSrc, resolvedType, isHlsStream]);

  // Attach external audio source when present
  useEffect(() => {
    const aud = audioRef.current;
    if (!aud || !extAudioSrc || extAudioFailed) return;

    if (audioHlsRef.current) {
      audioHlsRef.current.destroy();
      audioHlsRef.current = null;
    }

    if (/\.m3u8(\?|$)/i.test(extAudioSrc) && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      audioHlsRef.current = hls;
      hls.loadSource(extAudioSrc);
      hls.attachMedia(aud);
    } else {
      aud.src = extAudioSrc;
    }

    return () => {
      if (audioHlsRef.current) {
        audioHlsRef.current.destroy();
        audioHlsRef.current = null;
      }
    };
  }, [extAudioSrc, extAudioFailed]);

  // Sync play/pause & mute with active state
  useEffect(() => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid) return;

    const useExternalAudio = Boolean(extAudioSrc && !extAudioFailed && extAudioReady);
    vid.muted = isMuted || useExternalAudio;
    if (aud) {
      aud.muted = isMuted || !useExternalAudio;
    }

    if (!isActive || isPaused) {
      vid.pause();
      aud?.pause();
      return;
    }

    if (startOffset > 0 && !hasSeekedStartRef.current && vid.readyState >= 1) {
      try {
        if (Math.abs(vid.currentTime - startOffset) > 1.5) {
          vid.currentTime = startOffset;
        }
        hasSeekedStartRef.current = true;
      } catch {
        // ignore seek before ready
      }
    }

    vid.play().catch(() => {});
    if (aud && useExternalAudio) {
      try {
        if (Math.abs(aud.currentTime - vid.currentTime) > 0.45) {
          aud.currentTime = vid.currentTime;
        }
        aud.play().catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [isActive, isPaused, isMuted, extAudioSrc, extAudioFailed, extAudioReady, startOffset]);

  const handleVideoLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setDuration(vid.duration || 0);
    if (startOffset > 0 && vid.duration > startOffset + 5 && !hasSeekedStartRef.current) {
      try {
        vid.currentTime = startOffset;
        hasSeekedStartRef.current = true;
      } catch {
        // ignore
      }
    }
    if (isActive && !isPaused) {
      vid.play().catch(() => {});
    }
  };

  const handleVideoTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const t = vid.currentTime;
    setCurrentTime(t);

    if (endOffset > startOffset && t >= endOffset) {
      try {
        vid.currentTime = startOffset;
        if (audioRef.current && extAudioSrc && !extAudioFailed) {
          audioRef.current.currentTime = startOffset;
        }
      } catch {
        // ignore
      }
    }

    // Keep paired external audio synced within 350ms
    const aud = audioRef.current;
    if (aud && extAudioSrc && !extAudioFailed && extAudioReady && isActive && !isPaused) {
      if (Math.abs(aud.currentTime - t) > 0.38) {
        try {
          aud.currentTime = t;
        } catch {
          // ignore
        }
      }
      if (aud.paused && !vid.paused) {
        aud.play().catch(() => {});
      }
    }
  };

  const handleSurfaceTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const tapY = e.clientY - rect.top;

    if (now - lastTapRef.current < 280) {
      // Double-tap -> heart burst + force like
      if (singleTapTimerRef.current) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      const burstId = Date.now() + Math.random();
      setHeartBursts((prev) => [...prev, { id: burstId, x: tapX, y: tapY }]);
      window.setTimeout(() => {
        setHeartBursts((prev) => prev.filter((b) => b.id !== burstId));
      }, 950);
      onToggleLike(clip, true);
      return;
    }

    lastTapRef.current = now;
    if (singleTapTimerRef.current) window.clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = window.setTimeout(() => {
      setIsPaused((prev) => {
        const nextPaused = !prev;
        setTapFeedbackIcon(nextPaused ? 'pause' : 'play');
        window.setTimeout(() => setTapFeedbackIcon(null), 550);
        return nextPaused;
      });
    }, 260);
  };

  const handleFireBoost = () => {
    setFireCount((c) => c + 1);
    const id = Date.now() + Math.random();
    setFireBursts((prev) => [...prev, id]);
    window.setTimeout(() => {
      setFireBursts((prev) => prev.filter((b) => b !== id));
    }, 900);
  };

  const handleShareClip = () => {
    const shareUrl = `${window.location.origin}/?drama=${encodeURIComponent(clip.dramaId)}&clip=${encodeURIComponent(clip.id)}`;
    if (navigator.share) {
      navigator
        .share({
          title: `${clip.title} — ${clip.label || 'VIP Clip'}`,
          text: `Watch this scene from ${clip.title} on AsiaFlix Prime!`,
          url: shareUrl,
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2000);
  };

  // Segment scrub math
  const segDuration = endOffset > startOffset ? endOffset - startOffset : Math.max(duration || 40, 1);
  const segElapsed = endOffset > startOffset
    ? Math.max(0, Math.min(segDuration, currentTime - startOffset))
    : Math.max(0, Math.min(segDuration, currentTime));
  const segPct = Math.max(0, Math.min(100, (segElapsed / segDuration) * 100));

  const handleScrub = (val: number) => {
    const targetTime = (endOffset > startOffset ? startOffset : 0) + (val / 100) * segDuration;
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      } catch {
        // ignore
      }
    }
    if (audioRef.current && extAudioSrc && !extAudioFailed) {
      try {
        audioRef.current.currentTime = targetTime;
      } catch {
        // ignore
      }
    }
  };

  return (
    <section className="relative w-full h-full snap-start shrink-0 flex items-center justify-center bg-black overflow-hidden select-none">
      {/* Ambient Blurred Glow Backdrop */}
      <img
        src={clip.backdrop || clip.poster}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-40 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-black/90 pointer-events-none" />

      {/* Centered Portrait Video Stage (Full-bleed mobile, sleek 9:16 cinema frame on desktop) */}
      <div className="relative w-full sm:w-auto sm:aspect-[9/16] h-full max-w-[500px] bg-black sm:rounded-3xl overflow-hidden sm:border sm:border-white/15 sm:shadow-[0_0_80px_rgba(229,9,20,0.28)] flex items-center justify-center">
        {/* Video or Fallback Iframe */}
        {isNearActive && resolvedType === 'video' ? (
          <video
            ref={videoRef}
            playsInline
            loop={!(endOffset > startOffset)}
            preload={isActive ? 'auto' : 'metadata'}
            crossOrigin="anonymous"
            poster={clip.thumbnailUrl || clip.backdrop || clip.poster}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onWaiting={() => setIsBuffering(true)}
            onCanPlay={() => setIsBuffering(false)}
            onPlaying={() => setIsBuffering(false)}
            onTimeUpdate={handleVideoTimeUpdate}
            onError={() => {
              const cur = videoRef.current?.src || '';
              if (cur && !cur.includes('/api/okru-proxy') && /^https?:\/\//i.test(resolvedSrc)) {
                const proxied = buildProxiedMediaUrl(resolvedSrc);
                if (proxied !== resolvedSrc) {
                  setResolvedSrc(proxied);
                  return;
                }
              }
              setIsBuffering(false);
            }}
            className="w-full h-full object-cover"
          />
        ) : isNearActive && resolvedType === 'iframe' && resolvedSrc ? (
          <iframe
            src={resolvedSrc}
            title={clip.title}
            allow="autoplay; fullscreen; encrypted-media"
            className="w-full h-full border-0"
          />
        ) : (
          <img
            src={clip.poster}
            alt={clip.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-85"
          />
        )}

        {/* Hidden Paired External Dubbed Audio Track */}
        {clip.externalAudioUrl && isNearActive && (
          <video
            ref={audioRef}
            className="hidden"
            playsInline
            preload="auto"
            onCanPlay={() => setExtAudioReady(true)}
            onError={() => {
              if (!audioProxyRetriedRef.current && extAudioSrc && !extAudioSrc.includes('/api/okru-proxy')) {
                audioProxyRetriedRef.current = true;
                setExtAudioSrc(`/api/okru-proxy?url=${encodeURIComponent(extAudioSrc)}`);
                return;
              }
              setExtAudioFailed(true);
            }}
          />
        )}

        {/* Tap / Double-Tap Surface */}
        {resolvedType === 'video' && (
          <div
            onClick={handleSurfaceTap}
            className="absolute inset-0 z-10 cursor-pointer"
          />
        )}

        {/* Buffering Spinner */}
        {isActive && isBuffering && resolvedType === 'video' && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full border-3 border-white/20 border-t-[#ff2a85] animate-spin" />
          </div>
        )}

        {/* Single-Tap Play/Pause Brief Indicator */}
        {tapFeedbackIcon && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center animate-ping">
            <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
              {tapFeedbackIcon === 'pause' ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
            </div>
          </div>
        )}

        {/* Double-Tap Neon Heart Burst Particles */}
        {heartBursts.map((b) => (
          <div
            key={b.id}
            style={{ left: b.x - 42, top: b.y - 42 }}
            className="pointer-events-none absolute z-30 w-[84px] h-[84px] flex items-center justify-center animate-[afpHeartPop_0.9s_ease-out_forwards]"
          >
            <Heart className="w-20 h-20 text-[#ff2a85] fill-[#ff2a85] drop-shadow-[0_0_26px_rgba(255,42,133,0.95)]" />
          </div>
        ))}

        {/* First-Clip 2.8s Transparent Floating Logo Reveal (NO 8s Black-Screen Intro) */}
        {isFirstClip && showFirstClipLogoReveal && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30"
            style={{ background: 'transparent' }}
          >
            <img
              src={transparentLogoSrc}
              alt="AsiaFlix Prime"
              referrerPolicy="no-referrer"
              style={{
                filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 18px rgba(255,42,133,0.85))',
                mixBlendMode: 'screen',
                background: 'transparent',
                animation: 'afpClipLogoGlide 2.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
              }}
              className="absolute w-32 h-32 object-contain"
            />
          </div>
        )}

        {/* Persistent Top-Right Transparent Mini Watermark */}
        {(!isFirstClip || !showFirstClipLogoReveal) && (
          <img
            src={transparentLogoSrc}
            alt="AsiaFlix Prime"
            referrerPolicy="no-referrer"
            style={{
              filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 10px rgba(255,42,133,0.65))',
              mixBlendMode: 'screen',
              background: 'transparent',
            }}
            className="pointer-events-none absolute top-14 right-3.5 z-20 h-9 w-auto object-contain opacity-90"
          />
        )}

        {/* Bottom Scrim Gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-t from-black via-black/75 to-transparent z-10" />

        {/* Right-Side Floating Vertical Glass Social Stack */}
        <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-3.5">
          {/* Like */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(clip);
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div
              className={`w-11 h-11 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all group-active:scale-90 ${
                isLiked
                  ? 'bg-[#ff2a85]/25 border-[#ff2a85]/70 text-[#ff2a85] shadow-[0_0_20px_rgba(255,42,133,0.5)]'
                  : 'bg-black/45 border-white/20 text-white hover:bg-white/15'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current scale-110' : ''}`} />
            </div>
            <span className="text-[11px] font-black text-white drop-shadow">
              {(baseLikeCount + (isLiked ? 1 : 0)).toLocaleString()}
            </span>
          </button>

          {/* Fire Hype Burst */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFireBoost();
            }}
            className="relative flex flex-col items-center gap-1 group cursor-pointer"
          >
            {fireBursts.map((b) => (
              <span
                key={b}
                className="pointer-events-none absolute -top-6 text-xl animate-[afpFireFloat_0.85s_ease-out_forwards]"
              >
                🔥
              </span>
            ))}
            <div className="w-11 h-11 rounded-full bg-black/45 hover:bg-amber-500/25 backdrop-blur-xl border border-white/20 hover:border-amber-400/60 text-amber-300 flex items-center justify-center transition-all group-active:scale-90">
              <Flame className="w-5 h-5 fill-amber-400/40" />
            </div>
            <span className="text-[11px] font-black text-amber-200 drop-shadow">{fireCount}</span>
          </button>

          {/* Watchlist Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(drama);
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div
              className={`w-11 h-11 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all group-active:scale-90 ${
                isWatchlisted
                  ? 'bg-amber-500/25 border-amber-400/70 text-amber-300'
                  : 'bg-black/45 border-white/20 text-white hover:bg-white/15'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isWatchlisted ? 'fill-current' : ''}`} />
            </div>
            <span className="text-[10px] font-black text-white drop-shadow">
              {isWatchlisted ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Mute / Unmute */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/45 hover:bg-white/15 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all">
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-300" />}
            </div>
            <span className="text-[10px] font-bold text-zinc-200">{isMuted ? 'Muted' : 'Sound'}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShareClip();
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-black/45 hover:bg-white/15 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all">
              {shareCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-bold text-zinc-200">{shareCopied ? 'Copied' : 'Share'}</span>
          </button>

          {/* Rotating Drama Poster Disc */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWatchFullEpisode(clip);
            }}
            title={`Open ${clip.title}`}
            className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#e50914] via-[#ff2a85] to-amber-400 animate-[spin_7s_linear_infinite] cursor-pointer shadow-lg"
          >
            <img
              src={clip.poster}
              alt={clip.title}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover border border-black"
            />
          </button>
        </div>

        {/* Bottom-Left Metadata & Full Episode CTA */}
        <div className="absolute left-3.5 right-20 bottom-6 z-30 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-[#e50914] text-white text-[10px] font-black uppercase tracking-wider shadow">
              {clip.category}
            </span>
            {clip.episodeNumber && (
              <span className="px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-md text-white text-[10px] font-black border border-white/15">
                EP {clip.episodeNumber}
              </span>
            )}
            {clip.label && (
              <span className="px-2 py-0.5 rounded-md bg-pink-500/25 border border-pink-400/40 text-pink-100 text-[10px] font-black">
                {clip.label}
              </span>
            )}
            {clip.audio && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 text-[10px] font-extrabold">
                {clip.audio === 'Hindi Dubbed' ? '🇮🇳 Hindi' : clip.audio === 'Hindi Fan Dubbed' ? '🎙️ Fan Dub' : '🌏 Eng Sub'}
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] line-clamp-2">
            {clip.title}
          </h3>

          {clip.synopsis && (
            <p
              onClick={(e) => {
                e.stopPropagation();
                setShowSynopsis((s) => !s);
              }}
              className={`text-xs text-zinc-200/90 leading-relaxed cursor-pointer ${
                showSynopsis ? 'line-clamp-5 bg-black/55 p-2 rounded-xl backdrop-blur-md' : 'line-clamp-2'
              }`}
            >
              {clip.synopsis}
            </p>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWatchFullEpisode(clip);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2a85] hover:from-red-600 hover:to-pink-500 text-white text-xs sm:text-sm font-black shadow-[0_8px_28px_rgba(229,9,20,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Watch Full Episode Now</span>
          </button>
        </div>

        {/* Mini Scrubbable Clip Progress Bar */}
        {resolvedType === 'video' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-30 px-3 pb-1.5 pt-2 flex items-center gap-2"
          >
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={segPct}
              onChange={(e) => handleScrub(Number(e.target.value))}
              aria-label="Scrub clip progress"
              className="w-full h-1 accent-[#ff2a85] bg-white/25 rounded-full cursor-pointer"
            />
            <span className="text-[10px] font-mono font-bold text-white/75 shrink-0">
              {formatTimeSeconds(segElapsed)} / {formatTimeSeconds(segDuration)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

interface ClipsFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  dramas: DramaItem[];
  onOpenDramaEpisode: (drama: DramaItem, epNum: number, track: AudioType, startTime?: number) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: (dramaId: string) => boolean;
  preferredAudio?: AudioType;
  initialClipId?: string | null;
  customLogoUrl?: string;
}

export const ClipsFeedModal: React.FC<ClipsFeedModalProps> = ({
  isOpen,
  onClose,
  dramas,
  onOpenDramaEpisode,
  onToggleWatchlist,
  isWatchlisted,
  preferredAudio,
  initialClipId,
  customLogoUrl,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const transparentLogoSrc = useTransparentLogo(customLogoUrl || OFFICIAL_WATERMARK_LOGO_URL);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    return new Set(getLikedClipsList().map((c) => c.id));
  });
  const [showFirstClipLogoReveal, setShowFirstClipLogoReveal] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'Hindi Dubbed' | 'sheet'>('all');

  const dramaById = useMemo(() => {
    const map = new Map<string, DramaItem>();
    dramas.forEach((d) => map.set(d.id, d));
    return map;
  }, [dramas]);

  const allClips = useMemo(() => {
    const built = buildAllDramaClips(dramas, preferredAudio);
    if (initialClipId) {
      const idx = built.findIndex((c) => c.id === initialClipId);
      if (idx > 0) {
        const picked = built[idx];
        return [picked, ...built.slice(0, idx), ...built.slice(idx + 1)];
      }
    }
    return built;
  }, [dramas, preferredAudio, initialClipId]);

  const visibleClips = useMemo(() => {
    if (filterMode === 'Hindi Dubbed') {
      const hindi = allClips.filter((c) => c.audio === 'Hindi Dubbed' || c.audio === 'Hindi Fan Dubbed');
      return hindi.length > 0 ? hindi : allClips;
    }
    if (filterMode === 'sheet') {
      const sheetOnly = allClips.filter((c) => c.sourceType === 'sheet');
      return sheetOnly.length > 0 ? sheetOnly : allClips;
    }
    return allClips;
  }, [allClips, filterMode]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(0);
    setShowFirstClipLogoReveal(true);
    setLikedIds(new Set(getLikedClipsList().map((c) => c.id)));
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0 });
    }
    const timer = window.setTimeout(() => {
      setShowFirstClipLogoReveal(false);
    }, 2900);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialClipId]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        scrollToClipIndex(Math.min(visibleClips.length - 1, activeIndex + 1));
      }
      if (e.key === 'ArrowUp') {
        scrollToClipIndex(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, activeIndex, visibleClips.length, onClose]);

  const scrollToClipIndex = useCallback((idx: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(visibleClips.length - 1, idx));
    container.scrollTo({
      top: clamped * container.clientHeight,
      behavior: 'smooth',
    });
    setActiveIndex(clamped);
  }, [visibleClips.length]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || container.clientHeight <= 0) return;
    const idx = Math.round(container.scrollTop / container.clientHeight);
    if (idx !== activeIndex && idx >= 0 && idx < visibleClips.length) {
      setActiveIndex(idx);
    }
  };

  const handleToggleLike = (clip: ClipItem, forceLike = false) => {
    const { list } = toggleClipLikeStorage(clip, forceLike);
    setLikedIds(new Set(list.map((c) => c.id)));
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AsiaFlix Prime Clips Feed"
      className="fixed inset-0 z-[95] bg-black flex flex-col overflow-hidden"
    >
      <style>{`
        @keyframes afpClipLogoGlide {
          0% {
            top: 24%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.75);
            opacity: 0;
          }
          18% {
            top: 24%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 1;
          }
          58% {
            top: 24%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1.06);
            opacity: 1;
          }
          100% {
            top: 56px;
            left: calc(100% - 14px);
            transform: translate(-100%, 0%) scale(0.3);
            opacity: 0.9;
          }
        }
        @keyframes afpHeartPop {
          0% { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          25% { transform: scale(1.25) rotate(6deg); opacity: 1; }
          60% { transform: scale(1.0) rotate(-3deg); opacity: 0.95; }
          100% { transform: scale(1.45) translateY(-48px); opacity: 0; }
        }
        @keyframes afpFireFloat {
          0% { transform: translateY(0) scale(0.8); opacity: 1; }
          100% { transform: translateY(-44px) scale(1.35); opacity: 0; }
        }
      `}</style>

      {/* Top Glass Header Bar */}
      <div className="absolute top-0 inset-x-0 z-40 px-3.5 sm:px-6 py-3 flex items-center justify-between gap-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-pink-400/35 text-white">
            <Clapperboard className="w-4 h-4 text-[#ff2a85]" />
            <span className="text-xs sm:text-sm font-black tracking-tight">Clips</span>
            <span className="text-[10px] font-bold text-pink-300/90 ml-1">
              {visibleClips.length > 0 ? `${activeIndex + 1}/${visibleClips.length}` : '0'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-black/55 backdrop-blur-xl p-1 rounded-full border border-white/15">
            {([
              { id: 'all', label: 'All Clips' },
              { id: 'Hindi Dubbed', label: '🇮🇳 Hindi' },
              { id: 'sheet', label: '⭐ Curated' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterMode(tab.id);
                  setActiveIndex(0);
                  scrollContainerRef.current?.scrollTo({ top: 0 });
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-[#ff2a85] text-white'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Desktop Up/Down Slide Buttons */}
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={() => scrollToClipIndex(activeIndex - 1)}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-white/15 disabled:opacity-30 border border-white/20 text-white flex items-center justify-center cursor-pointer"
              title="Previous Clip"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={activeIndex >= visibleClips.length - 1}
              onClick={() => scrollToClipIndex(activeIndex + 1)}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-white/15 disabled:opacity-30 border border-white/20 text-white flex items-center justify-center cursor-pointer"
              title="Next Clip"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/65 hover:bg-[#e50914] border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Clips Feed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Vertical Snap-Scroll Feed */}
      {visibleClips.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
          <Sparkles className="w-10 h-10 text-[#ff2a85]" />
          <h3 className="text-lg font-black text-white">No Playable Clips Ready Yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            Clips are automatically generated from every drama episode stream and Google Sheet Clips column.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#e50914] text-white text-xs font-black cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 w-full h-full snap-y snap-mandatory overflow-y-scroll no-scrollbar"
        >
          {visibleClips.map((clip, idx) => {
            const drama = dramaById.get(clip.dramaId);
            const isNear = Math.abs(idx - activeIndex) <= 1;
            return (
              <ClipSlide
                key={clip.id}
                clip={clip}
                drama={drama}
                isActive={idx === activeIndex}
                isNearActive={isNear}
                isFirstClip={idx === 0}
                showFirstClipLogoReveal={showFirstClipLogoReveal}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((m) => !m)}
                isLiked={likedIds.has(clip.id)}
                onToggleLike={handleToggleLike}
                isWatchlisted={isWatchlisted(clip.dramaId)}
                onToggleWatchlist={(d) => {
                  if (d) onToggleWatchlist(d);
                }}
                onWatchFullEpisode={(targetClip) => {
                  const d = dramaById.get(targetClip.dramaId);
                  if (d) {
                    onClose();
                    onOpenDramaEpisode(
                      d,
                      targetClip.episodeNumber || 1,
                      targetClip.audio || 'Hindi Dubbed',
                      targetClip.startTime
                    );
                  }
                }}
                transparentLogoSrc={transparentLogoSrc}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
