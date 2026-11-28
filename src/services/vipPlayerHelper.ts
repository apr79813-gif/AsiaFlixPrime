import { AudioType } from '../types/drama';

export const VIP_STATS_STORAGE_KEY = 'asiaflix_vip_stats';
export const WATCH_TIMESTAMPS_STORAGE_KEY = 'asiaflix_watch_timestamps';
export const SCENE_BOOKMARKS_STORAGE_KEY = 'asiaflix_scene_bookmarks';
export const HYPE_VOTES_STORAGE_KEY = 'asiaflix_hype_votes';
export const DANMAKU_STORAGE_KEY = 'asiaflix_danmaku_reactions';

export const VIP_STATS_UPDATED_EVENT = 'asiaflix-vip-stats-updated';
export const TIMESTAMPS_UPDATED_EVENT = 'asiaflix-timestamps-updated';

export interface VipStats {
  totalMinutes: number;
  totalSecondsCarry: number;
  episodesCompleted: number;
  streakDays: number;
  lastWatchDate: string;
}

export interface WatchTimestampEntry {
  ep: number;
  track: AudioType;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface SceneBookmark {
  id: string;
  ep: number;
  time: number;
  label: string;
  createdAt: number;
}

export interface DanmakuCue {
  id: string;
  time: number;
  text: string;
}

export interface SubtitleCue {
  id: number;
  start: number;
  end: number;
  text: string;
}

export type HypeKey = 'must_watch' | 'chemistry' | 'mind_blowing' | 'emotional';

export const HYPE_REACTIONS: Array<{
  key: HypeKey;
  emoji: string;
  label: string;
  glowClass: string;
}> = [
  {
    key: 'must_watch',
    emoji: '🔥',
    label: 'Must Watch',
    glowClass: 'border-red-500/60 bg-red-500/20 text-red-200 shadow-[0_0_20px_rgba(229,9,20,0.4)]',
  },
  {
    key: 'chemistry',
    emoji: '😍',
    label: 'Best Chemistry',
    glowClass: 'border-pink-500/60 bg-pink-500/20 text-pink-200 shadow-[0_0_20px_rgba(236,72,153,0.4)]',
  },
  {
    key: 'mind_blowing',
    emoji: '🤯',
    label: 'Mind-Blowing',
    glowClass: 'border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
  },
  {
    key: 'emotional',
    emoji: '😭',
    label: 'Emotional',
    glowClass: 'border-sky-500/60 bg-sky-500/20 text-sky-200 shadow-[0_0_20px_rgba(14,165,233,0.4)]',
  },
];

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getVipStats(): VipStats {
  const fallback: VipStats = {
    totalMinutes: 0,
    totalSecondsCarry: 0,
    episodesCompleted: 0,
    streakDays: 0,
    lastWatchDate: '',
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(VIP_STATS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      totalMinutes: Math.max(0, Number(parsed.totalMinutes) || 0),
      totalSecondsCarry: Math.max(0, Number(parsed.totalSecondsCarry) || 0),
      episodesCompleted: Math.max(0, Number(parsed.episodesCompleted) || 0),
      streakDays: Math.max(0, Number(parsed.streakDays) || 0),
      lastWatchDate: typeof parsed.lastWatchDate === 'string' ? parsed.lastWatchDate : '',
    };
  } catch {
    return fallback;
  }
}

function saveVipStats(stats: VipStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIP_STATS_STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent(VIP_STATS_UPDATED_EVENT, { detail: stats }));
  } catch {
    // ignore quota errors
  }
}

function updateDailyStreak(stats: VipStats): VipStats {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  if (stats.lastWatchDate === today) {
    return stats.streakDays === 0 ? { ...stats, streakDays: 1 } : stats;
  }
  if (stats.lastWatchDate === yesterday) {
    return {
      ...stats,
      streakDays: Math.max(1, stats.streakDays + 1),
      lastWatchDate: today,
    };
  }
  return {
    ...stats,
    streakDays: 1,
    lastWatchDate: today,
  };
}

export function recordWatchSeconds(secondsDelta: number): VipStats {
  const base = updateDailyStreak(getVipStats());
  const nextCarry = base.totalSecondsCarry + Math.max(0, secondsDelta);
  const addedMinutes = Math.floor(nextCarry / 60);
  const updated: VipStats = {
    ...base,
    totalMinutes: base.totalMinutes + addedMinutes,
    totalSecondsCarry: nextCarry % 60,
  };
  saveVipStats(updated);
  return updated;
}

export function recordEpisodeCompleted(): VipStats {
  const base = updateDailyStreak(getVipStats());
  const updated: VipStats = {
    ...base,
    episodesCompleted: base.episodesCompleted + 1,
  };
  saveVipStats(updated);
  return updated;
}

export interface VipRankMeta {
  title: string;
  badgeEmoji: string;
  nextRankTitle: string | null;
  nextRankMinutes: number | null;
  progressPct: number;
  gradientClass: string;
}

export function getVipRankMeta(totalMinutes: number): VipRankMeta {
  if (totalMinutes > 400) {
    return {
      title: '👑 AsiaFlix Legend',
      badgeEmoji: '👑',
      nextRankTitle: null,
      nextRankMinutes: null,
      progressPct: 100,
      gradientClass: 'from-amber-400 via-yellow-500 to-red-500 text-black border-amber-300/70',
    };
  }
  if (totalMinutes >= 151) {
    const pct = Math.min(100, Math.max(5, Math.round(((totalMinutes - 151) / (401 - 151)) * 100)));
    return {
      title: '🥇 Drama Master',
      badgeEmoji: '🥇',
      nextRankTitle: '👑 AsiaFlix Legend',
      nextRankMinutes: 401,
      progressPct: pct,
      gradientClass: 'from-amber-500/25 to-red-500/25 text-amber-200 border-amber-400/50',
    };
  }
  if (totalMinutes >= 31) {
    const pct = Math.min(100, Math.max(5, Math.round(((totalMinutes - 31) / (151 - 31)) * 100)));
    return {
      title: '🥈 Binge Hunter',
      badgeEmoji: '🥈',
      nextRankTitle: '🥇 Drama Master',
      nextRankMinutes: 151,
      progressPct: pct,
      gradientClass: 'from-slate-300/20 to-sky-500/20 text-sky-200 border-sky-400/45',
    };
  }
  const pct = Math.min(100, Math.max(4, Math.round((totalMinutes / 31) * 100)));
  return {
    title: '🥉 Rookie',
    badgeEmoji: '🥉',
    nextRankTitle: '🥈 Binge Hunter',
    nextRankMinutes: 31,
    progressPct: pct,
    gradientClass: 'from-orange-500/20 to-rose-500/20 text-orange-200 border-orange-400/45',
  };
}

export function formatTimeSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const sec = Math.floor(totalSeconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getWatchTimestamps(): Record<string, WatchTimestampEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WATCH_TIMESTAMPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getWatchTimestampForDrama(dramaId: string): WatchTimestampEntry | null {
  const all = getWatchTimestamps();
  return all[dramaId] || null;
}

export function saveWatchTimestamp(dramaId: string, entry: WatchTimestampEntry): void {
  if (typeof window === 'undefined' || !dramaId) return;
  try {
    const all = getWatchTimestamps();
    all[dramaId] = entry;
    localStorage.setItem(WATCH_TIMESTAMPS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(TIMESTAMPS_UPDATED_EVENT, { detail: { dramaId, entry } }));
  } catch {
    // ignore quota errors
  }
}

export function getSceneBookmarks(dramaId: string): SceneBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCENE_BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw);
    return Array.isArray(map?.[dramaId]) ? map[dramaId] : [];
  } catch {
    return [];
  }
}

export function saveSceneBookmark(dramaId: string, bookmark: SceneBookmark): SceneBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCENE_BOOKMARKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const list: SceneBookmark[] = Array.isArray(map?.[dramaId]) ? map[dramaId] : [];
    const next = [bookmark, ...list].slice(0, 24);
    map[dramaId] = next;
    localStorage.setItem(SCENE_BOOKMARKS_STORAGE_KEY, JSON.stringify(map));
    return next;
  } catch {
    return [];
  }
}

export function deleteSceneBookmark(dramaId: string, bookmarkId: string): SceneBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCENE_BOOKMARKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const list: SceneBookmark[] = Array.isArray(map?.[dramaId]) ? map[dramaId] : [];
    const next = list.filter((b) => b.id !== bookmarkId);
    map[dramaId] = next;
    localStorage.setItem(SCENE_BOOKMARKS_STORAGE_KEY, JSON.stringify(map));
    return next;
  } catch {
    return [];
  }
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface HypeVoteState {
  counts: Record<HypeKey, number>;
  userVoted: Record<HypeKey, boolean>;
}

export function getHypeVotes(dramaId: string, rating = 9.0): HypeVoteState {
  const seed = hashSeed(dramaId);
  const boost = rating >= 9.4 ? 1.5 : rating >= 9.0 ? 1.2 : 1.0;
  const baseCounts: Record<HypeKey, number> = {
    must_watch: Math.round((85 + (seed % 190)) * boost),
    chemistry: Math.round((60 + ((seed >> 3) % 160)) * boost),
    mind_blowing: Math.round((45 + ((seed >> 6) % 130)) * boost),
    emotional: Math.round((40 + ((seed >> 9) % 120)) * boost),
  };
  const userVoted: Record<HypeKey, boolean> = {
    must_watch: false,
    chemistry: false,
    mind_blowing: false,
    emotional: false,
  };
  if (typeof window === 'undefined') return { counts: baseCounts, userVoted };
  try {
    const raw = localStorage.getItem(HYPE_VOTES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const saved = parsed?.[dramaId];
    if (saved && typeof saved === 'object') {
      (Object.keys(userVoted) as HypeKey[]).forEach((k) => {
        if (saved[k]) {
          userVoted[k] = true;
          baseCounts[k] += 1;
        }
      });
    }
  } catch {
    // ignore
  }
  return { counts: baseCounts, userVoted };
}

export function toggleHypeVote(dramaId: string, key: HypeKey, rating = 9.0): HypeVoteState {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(HYPE_VOTES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const curr = parsed?.[dramaId] || {};
      curr[key] = !curr[key];
      parsed[dramaId] = curr;
      localStorage.setItem(HYPE_VOTES_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }
  return getHypeVotes(dramaId, rating);
}

export function getDanmakuCues(dramaId: string, epNum: number): DanmakuCue[] {
  const key = `${dramaId}-ep-${epNum}`;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DANMAKU_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (Array.isArray(parsed?.[key])) {
      return parsed[key];
    }
  } catch {
    // ignore
  }
  return [];
}

export function addDanmakuCue(dramaId: string, epNum: number, time: number, text: string): DanmakuCue[] {
  const key = `${dramaId}-ep-${epNum}`;
  const existing = getDanmakuCues(dramaId, epNum);
  const nextCue: DanmakuCue = {
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: Math.max(0, Math.round(time)),
    text,
  };
  const next = [...existing, nextCue].slice(-80);
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(DANMAKU_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[key] = next;
      localStorage.setItem(DANMAKU_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }
  return next;
}

export interface UniversalMirrorOption {
  label: string;
  url: string;
}

export interface AsyncStreamProviderMeta {
  provider: 'archive' | 'okru' | 'vk';
  id: string;
  rawUrl: string;
}

export interface UniversalResolvedVideo {
  type: 'video' | 'iframe';
  src: string;
  mirrors: UniversalMirrorOption[];
  asyncProvider?: AsyncStreamProviderMeta;
}

export interface ExtractedQualityStream {
  quality: string;
  label: string;
  height: number;
  mbPerMin?: number;
  sizeBytes?: number;
  url: string;
  proxiedUrl: string;
}

export interface ExtractedNativeStreamResult {
  ok: boolean;
  provider?: 'okru' | 'vk' | 'archive';
  id?: string;
  title?: string;
  hlsUrl?: string;
  proxiedHlsUrl?: string;
  streams: ExtractedQualityStream[];
  error?: string;
}

const archiveOrgResolvedCache = new Map<string, string>();
const archiveOrgMultiCache = new Map<string, ExtractedQualityStream[]>();
const okVkExtractedCache = new Map<string, ExtractedNativeStreamResult>();
const archiveOrgInflight = new Map<string, Promise<ExtractedQualityStream[]>>();
const okVkInflight = new Map<string, Promise<ExtractedNativeStreamResult>>();

const ARCHIVE_SESSION_KEY = 'asiaflix_archive_stream_cache_v1';
const ARCHIVE_MULTI_SESSION_KEY = 'asiaflix_archive_multi_cache_v1';
const OKVK_SESSION_KEY = 'asiaflix_okvk_stream_cache_v1';
const ARCHIVE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const OKVK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function readSessionCacheEntry<T>(storageKey: string, entryKey: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, { value: T; expiresAt: number }>;
    const entry = map?.[entryKey];
    if (!entry || typeof entry.expiresAt !== 'number' || entry.expiresAt <= Date.now()) {
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

function writeSessionCacheEntry<T>(storageKey: string, entryKey: string, value: T, ttlMs: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(storageKey);
    const map = raw ? (JSON.parse(raw) as Record<string, { value: T; expiresAt: number }>) : {};
    const now = Date.now();
    // Prune expired entries & cap size at 40 entries
    const cleaned: Record<string, { value: T; expiresAt: number }> = {};
    for (const [k, v] of Object.entries(map)) {
      if (v && typeof v.expiresAt === 'number' && v.expiresAt > now) {
        cleaned[k] = v;
      }
    }
    const keys = Object.keys(cleaned);
    if (keys.length >= 40) {
      delete cleaned[keys[0]];
    }
    cleaned[entryKey] = { value, expiresAt: now + ttlMs };
    sessionStorage.setItem(storageKey, JSON.stringify(cleaned));
  } catch {
    // ignore storage quota errors
  }
}

export function getCachedArchiveOrgMultiQualityStreams(identifier: string): ExtractedQualityStream[] | null {
  const cleanId = decodeURIComponent((identifier || '').trim());
  if (!cleanId) return null;
  const mem = archiveOrgMultiCache.get(cleanId);
  if (mem && mem.length > 0) return mem;
  const sess = readSessionCacheEntry<ExtractedQualityStream[]>(ARCHIVE_MULTI_SESSION_KEY, cleanId);
  if (sess && Array.isArray(sess) && sess.length > 0) {
    archiveOrgMultiCache.set(cleanId, sess);
    return sess;
  }
  return null;
}

export function getCachedArchiveOrgDirectStream(identifier: string): string | null {
  const cleanId = decodeURIComponent((identifier || '').trim());
  if (!cleanId) return null;
  const multi = getCachedArchiveOrgMultiQualityStreams(cleanId);
  if (multi && multi.length > 0) return multi[0].url;
  const mem = archiveOrgResolvedCache.get(cleanId);
  if (mem) return mem;
  const sess = readSessionCacheEntry<string>(ARCHIVE_SESSION_KEY, cleanId);
  if (sess) {
    archiveOrgResolvedCache.set(cleanId, sess);
    return sess;
  }
  return null;
}

export function getCachedOkRuOrVkNativeStream(rawUrl: string): ExtractedNativeStreamResult | null {
  const key = (rawUrl || '').trim();
  if (!key) return null;
  const mem = okVkExtractedCache.get(key);
  if (mem && mem.ok) return mem;
  const sess = readSessionCacheEntry<ExtractedNativeStreamResult>(OKVK_SESSION_KEY, key);
  if (sess && sess.ok) {
    okVkExtractedCache.set(key, sess);
    return sess;
  }
  return null;
}

export async function resolveArchiveOrgMultiQualityStreams(
  identifier: string
): Promise<ExtractedQualityStream[]> {
  const cleanId = decodeURIComponent((identifier || '').trim());
  if (!cleanId) return [];

  const cached = getCachedArchiveOrgMultiQualityStreams(cleanId);
  if (cached) return cached;

  const existingInflight = archiveOrgInflight.get(cleanId);
  if (existingInflight) return existingInflight;

  const reqPromise = (async (): Promise<ExtractedQualityStream[]> => {
    try {
      const resp = await fetch(`https://archive.org/metadata/${encodeURIComponent(cleanId)}`);
      if (!resp.ok) return [];
      const data = (await resp.json()) as {
        files?: Array<{
          name?: string;
          format?: string;
          height?: string | number;
          width?: string | number;
          size?: string | number;
          source?: string;
        }>;
      };

      const files = Array.isArray(data?.files) ? data.files : [];
      const videoFiles = files.filter((f) => {
        const name = (f.name || '').toLowerCase();
        return /\.(mp4|m4v|webm|mkv|mov|ogv)$/i.test(name) && !name.includes('__ia_thumb');
      });

      if (videoFiles.length === 0) return [];

      const buildDirectUrl = (fileName: string) => {
        const encodedFilePath = fileName
          .split('/')
          .map((seg) => encodeURIComponent(seg))
          .join('/');
        return `https://archive.org/download/${encodeURIComponent(cleanId)}/${encodedFilePath}`;
      };

      const scoreFile = (f: (typeof videoFiles)[number]): number => {
        const name = (f.name || '').toLowerCase();
        const format = (f.format || '').toLowerCase();
        let score = 0;
        if (name.endsWith('.mp4')) score += 100000;
        else if (name.endsWith('.m4v') || name.endsWith('.webm')) score += 60000;
        else if (name.endsWith('.mkv') || name.endsWith('.mov')) score += 30000;

        if (format.includes('mpeg4') || format.includes('h.264') || format.includes('mp4')) score += 25000;
        if (f.source === 'original') score += 12000;
        else if (f.source === 'derivative' && !name.endsWith('.ia.mp4')) score += 4000;
        if (name.endsWith('.ia.mp4')) score -= 6000;
        const height = Number(f.height) || 0;
        score += height * 25;
        const sizeMb = Math.min(4000, (Number(f.size) || 0) / (1024 * 1024));
        score += sizeMb;
        return score;
      };

      const sorted = [...videoFiles].sort((a, b) => scoreFile(b) - scoreFile(a));
      const streams: ExtractedQualityStream[] = [];
      const seenUrls = new Set<string>();

      const addTier = (
        f: (typeof videoFiles)[number] | undefined,
        tier: { quality: string; label: string; defaultHeight: number; mbPerMin: number }
      ) => {
        if (!f?.name) return;
        const url = buildDirectUrl(f.name);
        if (seenUrls.has(url)) return;
        seenUrls.add(url);
        const rawH = Number(f.height) || tier.defaultHeight;
        streams.push({
          quality: tier.quality,
          label: tier.label,
          height: tier.quality === 'full' ? Math.max(1080, rawH) : tier.defaultHeight,
          mbPerMin: tier.mbPerMin,
          sizeBytes: Number(f.size) || undefined,
          url,
          proxiedUrl: url,
        });
      };

      const bestFile = sorted[0];
      const saverFile =
        sorted.find((f) => (f.name || '').toLowerCase().endsWith('.ia.mp4')) ||
        sorted.find((f) => {
          const h = Number(f.height) || 0;
          return h > 0 && h <= 540;
        }) ||
        (sorted.length > 1 ? sorted[sorted.length - 1] : undefined);

      const midFile =
        sorted.find(
          (f) =>
            f !== bestFile &&
            f !== saverFile &&
            ((Number(f.height) || 0) >= 640 && (Number(f.height) || 0) <= 900)
        ) || (sorted.length >= 3 ? sorted[1] : undefined);

      addTier(bestFile, { quality: 'full', label: '1080p FHD', defaultHeight: 1080, mbPerMin: 15 });
      addTier(midFile, { quality: 'hd', label: '720p HD', defaultHeight: 720, mbPerMin: 8 });
      if (saverFile && saverFile !== bestFile) {
        addTier(saverFile, { quality: 'sd', label: '480p Saver', defaultHeight: 480, mbPerMin: 3.5 });
      }

      if (streams.length > 0) {
        archiveOrgMultiCache.set(cleanId, streams);
        archiveOrgResolvedCache.set(cleanId, streams[0].url);
        writeSessionCacheEntry(ARCHIVE_MULTI_SESSION_KEY, cleanId, streams, ARCHIVE_TTL_MS);
        writeSessionCacheEntry(ARCHIVE_SESSION_KEY, cleanId, streams[0].url, ARCHIVE_TTL_MS);
      }

      return streams;
    } catch {
      return [];
    } finally {
      archiveOrgInflight.delete(cleanId);
    }
  })();

  archiveOrgInflight.set(cleanId, reqPromise);
  return reqPromise;
}

export async function resolveArchiveOrgDirectStream(identifier: string): Promise<string | null> {
  const streams = await resolveArchiveOrgMultiQualityStreams(identifier);
  return streams[0]?.url || null;
}

export async function resolveOkRuOrVkNativeStream(
  rawUrl: string,
  bypassCache = false
): Promise<ExtractedNativeStreamResult> {
  const key = rawUrl.trim();
  if (!bypassCache) {
    const cached = getCachedOkRuOrVkNativeStream(key);
    if (cached) return cached;
  }

  const existingInflight = !bypassCache ? okVkInflight.get(key) : undefined;
  if (existingInflight) return existingInflight;

  const reqPromise = (async (): Promise<ExtractedNativeStreamResult> => {
    try {
      const resp = await fetch(`/api/okru-stream?url=${encodeURIComponent(key)}`);
      const data = (await resp.json()) as ExtractedNativeStreamResult;
      if (data && data.ok) {
        okVkExtractedCache.set(key, data);
        writeSessionCacheEntry(OKVK_SESSION_KEY, key, data, OKVK_TTL_MS);
        return data;
      }
      return {
        ok: false,
        streams: [],
        error: data?.error || 'Could not extract direct stream URL',
      };
    } catch (err) {
      return {
        ok: false,
        streams: [],
        error: err instanceof Error ? err.message : 'Extractor network error',
      };
    } finally {
      okVkInflight.delete(key);
    }
  })();

  if (!bypassCache) {
    okVkInflight.set(key, reqPromise);
  }
  return reqPromise;
}

const archiveOrgAudioCache = new Map<string, string>();
const archiveOrgAudioInflight = new Map<string, Promise<string | null>>();

export function parseArchiveOrgAudioCandidate(rawUrl: string): { id: string; hasDirectMediaFile: boolean } | null {
  const m = (rawUrl || '').trim().match(
    /^https?:\/\/(?:[\w-]+\.)?archive\.org\/(?:details|embed|download|stream)\/([^/?#]+)(\/[^?#]+)?/i
  );
  if (!m) return null;
  const id = m[1];
  const filePart = m[2] || '';
  const hasDirectMediaFile =
    Boolean(filePart && filePart !== '/') &&
    /\.(mp3|m4a|aac|ogg|opus|wav|mp4|m4v|m3u8|webm|mkv|mov)$/i.test(filePart.split(/[?#]/)[0]);
  return { id, hasDirectMediaFile };
}

export async function resolveArchiveOrgAudioStream(identifier: string): Promise<string | null> {
  const cleanId = decodeURIComponent((identifier || '').trim());
  if (!cleanId) return null;

  const mem = archiveOrgAudioCache.get(cleanId);
  if (mem) return mem;

  const inflight = archiveOrgAudioInflight.get(cleanId);
  if (inflight) return inflight;

  const task = (async (): Promise<string | null> => {
    try {
      const resp = await fetch(`https://archive.org/metadata/${encodeURIComponent(cleanId)}`);
      if (!resp.ok) return null;
      const data = (await resp.json()) as {
        files?: Array<{
          name?: string;
          format?: string;
          height?: string | number;
          size?: string | number;
          source?: string;
        }>;
      };
      const files = Array.isArray(data?.files) ? data.files : [];
      if (files.length === 0) return null;

      const buildDirectUrl = (fileName: string) => {
        const encodedFilePath = fileName
          .split('/')
          .map((seg) => encodeURIComponent(seg))
          .join('/');
        return `https://archive.org/download/${encodeURIComponent(cleanId)}/${encodedFilePath}`;
      };

      // Priority 1: Dedicated audio files (.mp3, .m4a, .aac, .ogg, .opus, .wav)
      const audioFiles = files.filter((f) => {
        const name = (f.name || '').toLowerCase();
        return /\.(mp3|m4a|aac|ogg|opus|wav)$/i.test(name) && !name.includes('__ia_thumb');
      });

      if (audioFiles.length > 0) {
        const scoredAudio = [...audioFiles].sort((a, b) => {
          const score = (f: (typeof audioFiles)[number]) => {
            const name = (f.name || '').toLowerCase();
            let s = 0;
            if (name.endsWith('.mp3')) s += 50000;
            else if (name.endsWith('.m4a') || name.endsWith('.aac')) s += 40000;
            else if (name.endsWith('.ogg') || name.endsWith('.opus')) s += 25000;
            if (f.source === 'original') s += 10000;
            if (name.includes('sample') || name.includes('preview')) s -= 20000;
            return s;
          };
          return score(b) - score(a);
        });
        const bestAudio = scoredAudio[0];
        if (bestAudio?.name) {
          const url = buildDirectUrl(bestAudio.name);
          archiveOrgAudioCache.set(cleanId, url);
          return url;
        }
      }

      // Priority 2: Video container (.mp4, .m4v, .mkv, .webm) when dubbed audio is hosted as video
      const videoFiles = files.filter((f) => {
        const name = (f.name || '').toLowerCase();
        return /\.(mp4|m4v|mkv|webm|mov)$/i.test(name) && !name.includes('__ia_thumb');
      });

      if (videoFiles.length > 0) {
        const scoredVideo = [...videoFiles].sort((a, b) => {
          const score = (f: (typeof videoFiles)[number]) => {
            const name = (f.name || '').toLowerCase();
            const h = Number(f.height) || 0;
            let s = 0;
            if (name.endsWith('.mp4')) s += 40000;
            else if (name.endsWith('.m4v') || name.endsWith('.webm')) s += 25000;
            // Prefer lighter bandwidth tier when using video only for its audio track
            if (h > 0 && h <= 480) s += 12000;
            else if (h > 0 && h <= 720) s += 8000;
            if (name.endsWith('.ia.mp4')) s += 5000;
            return s;
          };
          return score(b) - score(a);
        });
        const bestVid = scoredVideo[0];
        if (bestVid?.name) {
          const url = buildDirectUrl(bestVid.name);
          archiveOrgAudioCache.set(cleanId, url);
          return url;
        }
      }

      return null;
    } catch {
      return null;
    } finally {
      archiveOrgAudioInflight.delete(cleanId);
    }
  })();

  archiveOrgAudioInflight.set(cleanId, task);
  return task;
}

export async function preResolveStreamUrl(rawUrl?: string): Promise<void> {
  if (!rawUrl) return;
  const meta = resolveUniversalVideoSource(rawUrl, 0);
  if (meta.asyncProvider?.provider === 'archive') {
    await resolveArchiveOrgDirectStream(meta.asyncProvider.id);
  } else if (meta.asyncProvider?.provider === 'okru' || meta.asyncProvider?.provider === 'vk') {
    await resolveOkRuOrVkNativeStream(meta.asyncProvider.rawUrl);
  }
}

export function normalizeUniversalAssetUrl(rawUrl: string): string {
  let trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';

  // 1. Hugging Face /blob/ -> /resolve/
  if (/huggingface\.co/i.test(trimmed) && /\/blob\//i.test(trimmed)) {
    trimmed = trimmed.replace(/\/blob\//i, '/resolve/');
  }

  // 2. GitHub /blob/ -> raw.githubusercontent.com
  const ghBlobMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
  if (ghBlobMatch) {
    trimmed = `https://raw.githubusercontent.com/${ghBlobMatch[1]}/${ghBlobMatch[2]}/${ghBlobMatch[3]}`;
  }

  // 3. Archive.org /details/ or /embed/ <id>/<file> -> /download/<id>/<file> ONLY when an actual filename exists
  const archiveMatch = trimmed.match(/^https?:\/\/(?:www\.)?archive\.org\/(?:details|embed|download)\/([^/?#]+)(\/[^?#]+)?/i);
  if (archiveMatch) {
    const id = archiveMatch[1];
    const filePart = archiveMatch[2] || '';
    if (filePart && filePart.length > 1) {
      trimmed = `https://archive.org/download/${id}${filePart}`;
    }
  }

  // 4. Google Drive share URL -> direct download when used for audio/srt assets
  const gdriveDirectMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveDirectMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdriveDirectMatch[1]}`;
  }

  return trimmed;
}

export function isDeadExternalAudioUrl(rawUrl?: string): boolean {
  if (!rawUrl) return true;
  return !/^https?:\/\//i.test(rawUrl.trim());
}

export function buildProxiedMediaUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/okru-proxy')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const proxyHosts = [
      'catbox.moe',
      'huggingface.co',
      'hf.co',
      'cdn-lfs.huggingface.co',
      'cdn-lfs-us-1.huggingface.co',
      'raw.githubusercontent.com',
      'github.com',
      'objects.githubusercontent.com',
      'drive.google.com',
      'googleusercontent.com',
      'archive.org',
    ];
    if (proxyHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      return `/api/okru-proxy?url=${encodeURIComponent(trimmed)}&ref=${encodeURIComponent(`${parsed.origin}/`)}`;
    }
  } catch {
    // ignore malformed URL
  }
  return trimmed;
}

export function isExtractorAudioUrl(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  const trimmed = rawUrl.trim();
  if (/(?:ok\.ru|odnoklassniki\.ru|vk\.com|vkvideo\.ru)\/(?:video|videoembed|live)/i.test(trimmed)) {
    return true;
  }
  const arch = parseArchiveOrgAudioCandidate(trimmed);
  if (arch && !arch.hasDirectMediaFile) {
    return true;
  }
  return false;
}

export function getCachedExternalAudioResolution(
  rawAudioUrl?: string
): { src: string; isHls: boolean } | null {
  const trimmed = (rawAudioUrl || '').trim();
  if (!trimmed) return null;

  if (/(?:ok\.ru|odnoklassniki\.ru|vk\.com|vkvideo\.ru)\/(?:video|videoembed|live)/i.test(trimmed)) {
    const cached = getCachedOkRuOrVkNativeStream(trimmed);
    if (cached && cached.ok && (cached.streams.length > 0 || cached.proxiedHlsUrl)) {
      const sortedLow = [...cached.streams].sort((a, b) => (a.height || 9999) - (b.height || 9999));
      const src = sortedLow[0]?.proxiedUrl || cached.proxiedHlsUrl || '';
      if (src) {
        return { src, isHls: !sortedLow[0]?.proxiedUrl && Boolean(cached.proxiedHlsUrl) };
      }
    }
    return null;
  }

  const arch = parseArchiveOrgAudioCandidate(trimmed);
  if (arch && !arch.hasDirectMediaFile) {
    const mem = archiveOrgAudioCache.get(decodeURIComponent(arch.id));
    if (mem) return { src: mem, isHls: false };
    return null;
  }

  return null;
}

export async function resolveExternalAudioStream(
  rawAudioUrl: string
): Promise<{ ok: boolean; src: string; isHls: boolean; error?: string }> {
  const trimmed = (rawAudioUrl || '').trim();
  if (!trimmed || isDeadExternalAudioUrl(trimmed)) {
    return { ok: false, src: '', isHls: false, error: 'Invalid or unavailable audio URL.' };
  }

  // 1. OK.ru / VK Video Extractor (pick lowest-bandwidth progressive MP4 or proxied HLS)
  if (/(?:ok\.ru|odnoklassniki\.ru|vk\.com|vkvideo\.ru)\/(?:video|videoembed|live)/i.test(trimmed)) {
    const res = await resolveOkRuOrVkNativeStream(trimmed, false);
    if (res.ok && (res.streams.length > 0 || res.proxiedHlsUrl)) {
      const sortedLow = [...res.streams].sort((a, b) => (a.height || 9999) - (b.height || 9999));
      const src = sortedLow[0]?.proxiedUrl || res.proxiedHlsUrl || '';
      if (src) {
        return {
          ok: true,
          src,
          isHls: !sortedLow[0]?.proxiedUrl && Boolean(res.proxiedHlsUrl),
        };
      }
    }
    return {
      ok: false,
      src: '',
      isHls: false,
      error: res.error || 'Could not extract OK.ru/VK audio stream.',
    };
  }

  // 2. Archive.org Item Page / Embed Extractor (prefer .mp3/.m4a/.aac/.ogg/.opus/.wav, fallback .mp4/.m4v/.mkv/.webm)
  const arch = parseArchiveOrgAudioCandidate(trimmed);
  if (arch) {
    if (arch.hasDirectMediaFile) {
      const direct = normalizeUniversalAssetUrl(trimmed);
      return {
        ok: Boolean(direct),
        src: direct,
        isHls: /\.m3u8(\?|$)/i.test(direct),
      };
    }
    const resolvedArchive = await resolveArchiveOrgAudioStream(arch.id);
    if (resolvedArchive) {
      return { ok: true, src: resolvedArchive, isHls: false };
    }
    return {
      ok: false,
      src: '',
      isHls: false,
      error: 'No playable audio or MP4 file found in Archive.org item metadata.',
    };
  }

  // 3. Direct .mp3 / .m4a / .wav / .mp4 / .m3u8 URL (Google Drive always routed through /api/okru-proxy for redirect/CORP safety)
  const normalized = normalizeUniversalAssetUrl(trimmed);
  const finalSrc = /drive\.google\.com|googleusercontent\.com/i.test(normalized)
    ? buildProxiedMediaUrl(normalized)
    : normalized;
  return {
    ok: Boolean(finalSrc),
    src: finalSrc,
    isHls: /\.m3u8(\?|$)/i.test(normalized),
  };
}

export function sanitizeExternalAudioUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed || isDeadExternalAudioUrl(trimmed)) {
    return undefined;
  }
  if (isExtractorAudioUrl(trimmed)) {
    return trimmed;
  }
  const normalized = normalizeUniversalAssetUrl(trimmed);
  if (!normalized || isDeadExternalAudioUrl(normalized)) {
    return undefined;
  }
  return normalized;
}

export function resolveUniversalVideoSource(rawUrl: string, mirrorIndex = 0): UniversalResolvedVideo {
  let trimmed = (rawUrl || '').trim();
  if (trimmed.includes('huggingface.co') && /\/blob\//i.test(trimmed)) {
    trimmed = trimmed.replace(/\/blob\//i, '/resolve/');
  }

  // Convert GitHub /blob/ to raw.githubusercontent.com
  const ghBlobMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
  if (ghBlobMatch) {
    trimmed = `https://raw.githubusercontent.com/${ghBlobMatch[1]}/${ghBlobMatch[2]}/${ghBlobMatch[3]}`;
  }

  // Archive.org -> ALWAYS resolve to native HTML5 <video> stream (NEVER archive.org/embed/ iframe)
  const archiveMatch = trimmed.match(
    /^https?:\/\/(?:[\w-]+\.)?archive\.org\/(?:details|embed|download|stream)\/([^/?#]+)(\/[^?#]+)?/i
  );
  if (archiveMatch) {
    const id = archiveMatch[1];
    const filePart = archiveMatch[2] || '';
    const hasDirectVideoFile =
      Boolean(filePart && filePart !== '/') &&
      /\.(mp4|m4v|m3u8|webm|ogg|mkv|mov)$/i.test(filePart.split(/[?#]/)[0]);
    if (hasDirectVideoFile) {
      const directDownloadUrl = `https://archive.org/download/${id}${filePart}`;
      return { type: 'video', src: directDownloadUrl, mirrors: [] };
    }
    return {
      type: 'video',
      src: '',
      mirrors: [],
      asyncProvider: { provider: 'archive', id, rawUrl: trimmed },
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return { type: 'iframe', src: 'about:blank', mirrors: [] };
  }

  // 1. CLOUD HOST EMBED RULES ALWAYS RUN FIRST (before extension checks, e.g. streamtape slugs ending in .mp4)

  // Streamwish (streamwish.*, wishfast.*, awish.*, flaswish.*, embedwish.*)
  const streamwishMatch = trimmed.match(
    /(?:streamwish\.\w+|wishfast\.\w+|awish\.\w+|flaswish\.\w+|embedwish\.\w+)\/(?:f|e|d)?\/?([a-zA-Z0-9_-]+)/i
  );
  if (streamwishMatch) {
    const id = streamwishMatch[1];
    const mirrors: UniversalMirrorOption[] = [
      { label: '🇮🇳 Server 1 (Streamwish)', url: `https://streamwish.to/e/${id}` },
      { label: '⚡ Server 2 (Wishfast)', url: `https://wishfast.top/e/${id}` },
      { label: '🛡️ Server 3 (Awish)', url: `https://awish.pro/e/${id}` },
    ];
    return { type: 'iframe', src: mirrors[mirrorIndex]?.url || mirrors[0].url, mirrors };
  }

  // Vidhide (vidhide.*, dhtpre.*, peytonepre.*, callistanise.*)
  const vidhideMatch = trimmed.match(
    /(?:vidhide\w*\.\w+|dhtpre\.com|peytonepre\.com|callistanise\.com)\/(?:v|e|f|d)?\/?([a-zA-Z0-9_-]+)/i
  );
  if (vidhideMatch) {
    const id = vidhideMatch[1];
    const mirrors: UniversalMirrorOption[] = [
      { label: '🇮🇳 Server 1 (Vidhide)', url: `https://vidhidevip.com/v/${id}` },
      { label: '⚡ Server 2 (Fast Cloud)', url: `https://dhtpre.com/v/${id}` },
      { label: '🛡️ Server 3 (Mirror)', url: `https://peytonepre.com/v/${id}` },
    ];
    return { type: 'iframe', src: mirrors[mirrorIndex]?.url || mirrors[0].url, mirrors };
  }

  // Streamtape (streamtape.*, strtape.cloud, strcloud.in, shavetape.cash)
  const streamtapeMatch = trimmed.match(
    /(?:streamtape\.\w+|strtape\.cloud|strcloud\.in|shavetape\.cash)\/(?:v|e)\/([a-zA-Z0-9_-]+)/i
  );
  if (streamtapeMatch) {
    const id = streamtapeMatch[1];
    const mirrors: UniversalMirrorOption[] = [
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
    const mirrors: UniversalMirrorOption[] = [
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
    const mirrors: UniversalMirrorOption[] = [
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
    const id = gdriveMatch[1];
    const mirrors: UniversalMirrorOption[] = [
      { label: '☁️ Google Drive HD', url: `https://drive.google.com/file/d/${id}/preview` },
    ];
    return { type: 'iframe', src: mirrors[0].url, mirrors };
  }

  // OneDrive / 1drv.ms
  if (/onedrive\.live\.com/i.test(trimmed)) {
    const embedUrl = trimmed.includes('/embed')
      ? trimmed
      : trimmed.replace(/\/view\.aspx/i, '/embed').replace(/\bdownload=1\b/i, 'embed=1');
    return {
      type: 'iframe',
      src: embedUrl,
      mirrors: [{ label: '☁️ OneDrive HD', url: embedUrl }],
    };
  }
  if (/1drv\.ms\//i.test(trimmed)) {
    return {
      type: 'iframe',
      src: trimmed,
      mirrors: [{ label: '☁️ OneDrive Link', url: trimmed }],
    };
  }

  // OK.ru link -> Native HTML5 Video Extractor via /api/okru-stream + /api/okru-proxy
  const okMatch = trimmed.match(/(?:ok\.ru|odnoklassniki\.ru)\/(?:video|videoembed|live)\/(\d+)/i);
  if (okMatch) {
    return {
      type: 'video',
      src: '',
      mirrors: [],
      asyncProvider: { provider: 'okru', id: okMatch[1], rawUrl: trimmed },
    };
  }

  // VK Video link -> Native HTML5 Video Extractor via /api/okru-stream + /api/okru-proxy
  const vkMatch = trimmed.match(/(?:vk\.com|vkvideo\.ru)\/video(-?\d+_\d+)/i);
  if (vkMatch) {
    return {
      type: 'video',
      src: '',
      mirrors: [],
      asyncProvider: { provider: 'vk', id: vkMatch[1], rawUrl: trimmed },
    };
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

  // 2. Direct media streams (Archive.org, Telegram File-to-Stream Workers, GitHub Raw, jsDelivr, Cloudflare R2, Backblaze B2, MP4/M3U8/MKV/WEBM)
  const lowerUrl = trimmed.toLowerCase();
  const pathWithoutQuery = trimmed.split(/[?#]/)[0].toLowerCase();
  if (
    /\.(mp4|m3u8|webm|ogg|mkv|mov)$/i.test(pathWithoutQuery) ||
    (lowerUrl.includes('huggingface.co') && lowerUrl.includes('/resolve/')) ||
    (lowerUrl.includes('archive.org') && lowerUrl.includes('/download/')) ||
    lowerUrl.includes('raw.githubusercontent.com') ||
    lowerUrl.includes('cdn.jsdelivr.net') ||
    lowerUrl.includes('r2.dev') ||
    lowerUrl.includes('workers.dev') ||
    lowerUrl.includes('backblazeb2.com') ||
    lowerUrl.includes('b2cdn.com') ||
    /\/(?:direct|stream|dl|watch)\//i.test(lowerUrl)
  ) {
    return { type: 'video', src: trimmed, mirrors: [] };
  }

  // 3. Fallback custom embed iframe
  return { type: 'iframe', src: trimmed, mirrors: [{ label: '🇮🇳 Main HD Server', url: trimmed }] };
}

export const ADMIN_SUBTITLES_STORAGE_KEY = 'asiaflix_admin_subtitles';

export interface AdminSubtitleEntry {
  code: string;
  label: string;
  langTag: string;
  url: string;
  epNum: number | 'all';
}

export function normalizeSubtitleUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  return normalizeUniversalAssetUrl(trimmed);
}

export function getAdminSubtitleOverrides(): Record<string, AdminSubtitleEntry[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ADMIN_SUBTITLES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAdminSubtitleOverrides(map: Record<string, AdminSubtitleEntry[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_SUBTITLES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

function parseTimestampToken(token: string): number | null {
  const clean = token.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    if (!Number.isNaN(h) && !Number.isNaN(m) && !Number.isNaN(s)) {
      return h * 3600 + m * 60 + s;
    }
  } else if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    if (!Number.isNaN(m) && !Number.isNaN(s)) {
      return m * 60 + s;
    }
  }
  return null;
}

export function parseSrtOrVttContent(rawText: string): SubtitleCue[] {
  if (!rawText) return [];
  const normalized = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Strip markdown code-fence wrappers common in .md.srt files
    .replace(/^[ \t]*```[a-zA-Z0-9_-]*[ \t]*$/gm, '')
    .replace(/^[ \t]*~~~[a-zA-Z0-9_-]*[ \t]*$/gm, '')
    // Strip leading markdown blockquotes if any
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .trim();

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    if (/^WEBVTT/i.test(lines[0]) || /^NOTE\b/i.test(lines[0]) || /^STYLE\b/i.test(lines[0])) {
      continue;
    }

    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx < 0) continue;

    const timeMatch = lines[timeLineIdx].match(
      /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/
    );
    if (!timeMatch) continue;

    const start = parseTimestampToken(timeMatch[1]);
    const end = parseTimestampToken(timeMatch[2]);
    if (start === null || end === null) continue;

    const textLines = lines
      .slice(timeLineIdx + 1)
      .join('\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\{\\[^}]*\}/g, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/`+/g, '')
      .trim();

    if (textLines) {
      cues.push({ id: cues.length + 1, start, end, text: textLines });
    }
  }

  return cues
    .sort((a, b) => a.start - b.start)
    .map((cue, idx) => ({ ...cue, id: idx + 1 }));
}

export interface SubtitleLanguageDefinition {
  code: string;
  shortPrefix: string;
  label: string;
  langTag: string;
  gtxCode: string;
  aliases: string[];
}

export const SUBTITLE_LANGUAGE_CATALOG: SubtitleLanguageDefinition[] = [
  { code: 'hi', shortPrefix: 'Hin', label: '🇮🇳 Hindi', langTag: 'hi-IN', gtxCode: 'hi', aliases: ['hin', 'hi', 'hindi', 'sub', 'srt', 'cc'] },
  { code: 'en', shortPrefix: 'Eng', label: '🇬🇧 English', langTag: 'en-US', gtxCode: 'en', aliases: ['eng', 'en', 'english'] },
  { code: 'ko', shortPrefix: 'Kor', label: '🇰🇷 Korean', langTag: 'ko-KR', gtxCode: 'ko', aliases: ['kor', 'ko', 'korean'] },
  { code: 'ur', shortPrefix: 'Urd', label: '🇵🇰 Urdu (اردو)', langTag: 'ur-PK', gtxCode: 'ur', aliases: ['urd', 'ur', 'urdu'] },
  { code: 'bn', shortPrefix: 'Ben', label: '🇧🇩 Bengali (বাংলা)', langTag: 'bn-IN', gtxCode: 'bn', aliases: ['ben', 'bn', 'bengali', 'bangla'] },
  { code: 'mai', shortPrefix: 'Mai', label: '🇮🇳 Maithili (मैथिली)', langTag: 'mai-IN', gtxCode: 'mai', aliases: ['mai', 'maithili'] },
  { code: 'bho', shortPrefix: 'Bho', label: '🇮🇳 Bhojpuri (भोजपुरी)', langTag: 'bho-IN', gtxCode: 'bho', aliases: ['bho', 'bhojpuri'] },
  { code: 'mr', shortPrefix: 'Mar', label: '🇮🇳 Marathi (मराठी)', langTag: 'mr-IN', gtxCode: 'mr', aliases: ['mar', 'mr', 'marathi'] },
  { code: 'ta', shortPrefix: 'Tam', label: '🇮🇳 Tamil (தமிழ்)', langTag: 'ta-IN', gtxCode: 'ta', aliases: ['tam', 'ta', 'tamil'] },
  { code: 'te', shortPrefix: 'Tel', label: '🇮🇳 Telugu (తెలుగు)', langTag: 'te-IN', gtxCode: 'te', aliases: ['tel', 'te', 'telugu'] },
  { code: 'gu', shortPrefix: 'Guj', label: '🇮🇳 Gujarati (ગુજરાતી)', langTag: 'gu-IN', gtxCode: 'gu', aliases: ['guj', 'gu', 'gujarati'] },
  { code: 'pa', shortPrefix: 'Pun', label: '🇮🇳 Punjabi (ਪੰਜਾਬੀ)', langTag: 'pa-IN', gtxCode: 'pa', aliases: ['pun', 'pa', 'pan', 'punjabi'] },
  { code: 'ne', shortPrefix: 'Nep', label: '🇳🇵 Nepali (नेपाली)', langTag: 'ne-NP', gtxCode: 'ne', aliases: ['nep', 'ne', 'nepali'] },
  { code: 'zh', shortPrefix: 'Chi', label: '🇨🇳 Chinese', langTag: 'zh-CN', gtxCode: 'zh-CN', aliases: ['chi', 'zh', 'chinese', 'mandarin'] },
  { code: 'ja', shortPrefix: 'Jap', label: '🇯🇵 Japanese', langTag: 'ja-JP', gtxCode: 'ja', aliases: ['jap', 'ja', 'jpn', 'japanese'] },
];

const EXTRA_SUBTITLE_LANG_META: Record<string, { code: string; label: string; langTag: string; gtxCode: string }> = {
  ind: { code: 'id', label: '🇮🇩 Indonesian', langTag: 'id-ID', gtxCode: 'id' },
  id: { code: 'id', label: '🇮🇩 Indonesian', langTag: 'id-ID', gtxCode: 'id' },
  indonesian: { code: 'id', label: '🇮🇩 Indonesian', langTag: 'id-ID', gtxCode: 'id' },
  ara: { code: 'ar', label: '🇸🇦 Arabic', langTag: 'ar-SA', gtxCode: 'ar' },
  ar: { code: 'ar', label: '🇸🇦 Arabic', langTag: 'ar-SA', gtxCode: 'ar' },
  arabic: { code: 'ar', label: '🇸🇦 Arabic', langTag: 'ar-SA', gtxCode: 'ar' },
  esp: { code: 'es', label: '🇪🇸 Spanish', langTag: 'es-ES', gtxCode: 'es' },
  es: { code: 'es', label: '🇪🇸 Spanish', langTag: 'es-ES', gtxCode: 'es' },
  spanish: { code: 'es', label: '🇪🇸 Spanish', langTag: 'es-ES', gtxCode: 'es' },
  tha: { code: 'th', label: '🇹🇭 Thai', langTag: 'th-TH', gtxCode: 'th' },
  th: { code: 'th', label: '🇹🇭 Thai', langTag: 'th-TH', gtxCode: 'th' },
  thai: { code: 'th', label: '🇹🇭 Thai', langTag: 'th-TH', gtxCode: 'th' },
  mal: { code: 'ml', label: '🇮🇳 Malayalam', langTag: 'ml-IN', gtxCode: 'ml' },
  ml: { code: 'ml', label: '🇮🇳 Malayalam', langTag: 'ml-IN', gtxCode: 'ml' },
  malayalam: { code: 'ml', label: '🇮🇳 Malayalam', langTag: 'ml-IN', gtxCode: 'ml' },
  kan: { code: 'kn', label: '🇮🇳 Kannada', langTag: 'kn-IN', gtxCode: 'kn' },
  kn: { code: 'kn', label: '🇮🇳 Kannada', langTag: 'kn-IN', gtxCode: 'kn' },
  kannada: { code: 'kn', label: '🇮🇳 Kannada', langTag: 'kn-IN', gtxCode: 'kn' },
  fre: { code: 'fr', label: '🇫🇷 French', langTag: 'fr-FR', gtxCode: 'fr' },
  fr: { code: 'fr', label: '🇫🇷 French', langTag: 'fr-FR', gtxCode: 'fr' },
  french: { code: 'fr', label: '🇫🇷 French', langTag: 'fr-FR', gtxCode: 'fr' },
};

export function resolveSubtitleLangMeta(rawToken: string): {
  code: string;
  shortPrefix: string;
  label: string;
  langTag: string;
  gtxCode: string;
} {
  const clean = (rawToken || '').trim().toLowerCase();
  for (const entry of SUBTITLE_LANGUAGE_CATALOG) {
    if (entry.code === clean || entry.aliases.includes(clean)) {
      return {
        code: entry.code,
        shortPrefix: entry.shortPrefix,
        label: entry.label,
        langTag: entry.langTag,
        gtxCode: entry.gtxCode,
      };
    }
  }
  if (EXTRA_SUBTITLE_LANG_META[clean]) {
    const extra = EXTRA_SUBTITLE_LANG_META[clean];
    return {
      ...extra,
      shortPrefix: clean.charAt(0).toUpperCase() + clean.slice(1, 3),
    };
  }
  const safeCode = clean.replace(/[^a-z0-9]/g, '') || 'hi';
  const titleLabel = safeCode.charAt(0).toUpperCase() + safeCode.slice(1);
  return {
    code: safeCode,
    shortPrefix: titleLabel.slice(0, 3),
    label: `🌐 ${titleLabel}`,
    langTag: safeCode.length === 2 ? `${safeCode}-${safeCode.toUpperCase()}` : `${safeCode}-IN`,
    gtxCode: safeCode,
  };
}

export interface ParsedSheetSubtitleEntry {
  code: string;
  label: string;
  langTag: string;
  epNum: number;
  url: string;
}

export function parseSheetSubtitleCell(
  sourceText: string,
  options: { isDedicatedSubtitleCol?: boolean } = {}
): ParsedSheetSubtitleEntry[] {
  if (!sourceText || !sourceText.trim()) return [];

  const isDedicated = Boolean(options.isDedicatedSubtitleCol);
  const results: ParsedSheetSubtitleEntry[] = [];
  const seenKeys = new Set<string>();

  const pushEntry = (rawLang: string, epNum: number, rawUrl: string) => {
    const cleanUrl = normalizeUniversalAssetUrl(rawUrl);
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl) || Number.isNaN(epNum)) return;
    const meta = resolveSubtitleLangMeta(rawLang);
    const dedupeKey = `${meta.code}:${epNum}:${cleanUrl}`;
    if (seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);
    results.push({
      code: meta.code,
      label: meta.label,
      langTag: meta.langTag,
      epNum,
      url: cleanUrl,
    });
  };

  // Reserved non-subtitle tokens so Audio/Telegram prefixes aren't misread when scanning fallback columns
  const nonSubTokens = new Set([
    'ep',
    'episode',
    'es',
    'stream',
    'hd',
    'fd',
    'os',
    'od',
    'http',
    'https',
    't1',
    't2',
    't3',
    ...(isDedicated ? [] : ['hindi', 'fan', 'orig', 'original']),
  ]);

  // 1. Verbose Sub Ep prefixes ("Sub Ep 1 = ...", "Subtitle 2 = ...", "SRT Ep 3: ...")
  const subEpRegex =
    /\b(?:sub|subtitle|subtitles|srt)\s*[-_#\s]*(?:ep(?:isode)?)?\s*[-_#]?\s*(\d+)\s*(?:[:=\-|]+\s*|\s+)(https?:\/\/[^\s,\n|"'<>]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = subEpRegex.exec(sourceText)) !== null) {
    pushEntry('hi', parseInt(m[1], 10), m[2]);
  }

  // 2. Language + optional "Ep" + Episode Number ("Hin1 = ...", "English 2 = ...", "Maithili Ep 1: ...")
  const langNumRegex =
    /\b([a-zA-Z]{2,20})\s*(?:ep(?:isode)?\s*)?[-_#]?\s*(\d+)\s*(?:[:=\-|]+\s*|\s+)(https?:\/\/[^\s,\n|"'<>]+)/gi;
  while ((m = langNumRegex.exec(sourceText)) !== null) {
    const token = m[1].toLowerCase();
    if (token === 'sub' || token === 'subtitle' || token === 'subtitles' || token === 'srt') {
      pushEntry('hi', parseInt(m[2], 10), m[3]);
      continue;
    }
    if ((token === 'ep' || token === 'episode' || token === 'e') && isDedicated) {
      pushEntry('hi', parseInt(m[2], 10), m[3]);
      continue;
    }
    if (nonSubTokens.has(token)) continue;
    pushEntry(token, parseInt(m[2], 10), m[3]);
  }

  // 3. Unnumbered language tags ("Hin = https://...", "Maithili = https://...", "English: https://...")
  const strippedNumbered = sourceText
    .replace(
      /\b(?:sub|subtitle|subtitles|srt)\s*[-_#\s]*(?:ep(?:isode)?)?\s*[-_#]?\s*\d+\s*(?:[:=\-|]+\s*|\s+)https?:\/\/[^\s,\n|"'<>]+/gi,
      ' '
    )
    .replace(
      /\b([a-zA-Z]{2,20})\s*(?:ep(?:isode)?\s*)?[-_#]?\s*\d+\s*(?:[:=\-|]+\s*|\s+)https?:\/\/[^\s,\n|"'<>]+/gi,
      ' '
    );

  const unnumberedLangRegex = /\b([a-zA-Z]{2,20})\b\s*[:=\-|]+\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
  while ((m = unnumberedLangRegex.exec(strippedNumbered)) !== null) {
    const token = m[1].toLowerCase();
    if (nonSubTokens.has(token)) continue;
    pushEntry(token, 1, m[2]);
  }

  // 4. Bare URLs: in dedicated Subtitle column accept any bare http(s) URL (defaulting to Hindi);
  // in fallback columns only match explicit .srt/.vtt/.md.srt URLs.
  const barePattern = isDedicated
    ? /https?:\/\/[^\s,\n|"'<>]+/gi
    : /https?:\/\/[^\s,\n|"'<>]+\.(?:md\.srt|srt|vtt)(?:[?#][^\s,\n|"'<>]*)?/gi;
  const bareMatches = sourceText.match(barePattern) || [];
  bareMatches.forEach((rawUrl) => {
    const norm = normalizeUniversalAssetUrl(rawUrl);
    if (!norm) return;
    if (results.some((r) => r.url === norm)) return;
    const epFromFile =
      rawUrl.match(/S\d{1,2}E(\d{1,3})/i) ||
      rawUrl.match(/\bep(?:isode)?[-_ ]?(\d{1,3})\b/i);
    const epNum = epFromFile ? parseInt(epFromFile[1], 10) : 1;
    pushEntry('hi', epNum, norm);
  });

  return results;
}

export function parseSheetAudioCell(rawAudioCell: string): {
  hindiAudioMap: Map<number, string>;
  fanDubAudioMap: Map<number, string>;
  origAudioMap: Map<number, string>;
  defaultAudioMap: Map<number, string>;
} {
  const hindiAudioMap = new Map<number, string>();
  const fanDubAudioMap = new Map<number, string>();
  const origAudioMap = new Map<number, string>();
  const defaultAudioMap = new Map<number, string>();
  if (!rawAudioCell || !rawAudioCell.trim()) {
    return { hindiAudioMap, fanDubAudioMap, origAudioMap, defaultAudioMap };
  }

  // Normalize wrapped lines where URL appears on the line after = or :
  const normalizedAudio = rawAudioCell.replace(/([=:])\s*[\r\n]+\s*(https?:\/\/)/gi, '$1 $2');

  // Strip subtitle tags & .srt/.vtt links before audio extraction (preserve Hin/FD/ED/HD/H/D/F/O/OD/OS/Ep/Es/A/Audio audio links)
  const cellWithoutSubtitles = normalizedAudio
    .replace(/\b(?:sub|subtitle|subtitles|srt)\s*[-_#\s]*ep(?:isode)?\s*[-_#]?\s*\d*\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi, ' ')
    .replace(/\b(?:[a-zA-Z0-9\s_-]{1,24})\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+\.(?:md\.srt|srt|vtt)(?:[?#][^\s,\n|"'<>]*)?/gi, ' ')
    .replace(/\b(?:eng|en|english|kor|ko|korean|urd|urdu|ben|bengali|mai|maithili|bho|bhojpuri|tam|tamil|tel|telugu|mar|marathi|guj|gujarati|pan|punjabi|chi|chinese|jpn|japanese|tha|thai|ind|ara|spa|fre|ger|ita|por|rus|vie|tur)\s*[-_#]?\s*\d*\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi, ' ')
    .replace(/https?:\/\/[^\s,\n|"'<>]+\.(?:md\.srt|srt|vtt)(?:[?#][^\s,\n|"'<>]*)?/gi, ' ');

  const normalizeAudioTarget = (u: string): string => {
    const trimmed = u.trim();
    if (!trimmed) return '';
    if (isExtractorAudioUrl(trimmed)) return trimmed;
    return normalizeUniversalAssetUrl(trimmed);
  };

  const hdPattern = /\b(?:hd|hindi\s*(?:ep(?:isode)?)?|hin(?:\s*ep(?:isode)?)?|h|d)\s*[-_#]?\s*(\d+)\s*[:=\-|]*\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
  const fdPattern = /\b(?:fd|ed|fan\s*(?:dub(?:bed)?)?(?:\s*ep(?:isode)?)?|f)\s*[-_#]?\s*(\d+)\s*[:=\-|]*\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
  const osPattern = /\b(?:os|od|orig(?:inal)?(?:\s*ep(?:isode)?)?|o)\s*[-_#]?\s*(\d+)\s*[:=\-|]*\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;

  let am: RegExpExecArray | null;
  while ((am = hdPattern.exec(cellWithoutSubtitles)) !== null) {
    const epNum = parseInt(am[1], 10);
    const aUrl = normalizeAudioTarget(am[2]);
    if (!Number.isNaN(epNum) && aUrl && !hindiAudioMap.has(epNum)) {
      hindiAudioMap.set(epNum, aUrl);
    }
  }

  while ((am = fdPattern.exec(cellWithoutSubtitles)) !== null) {
    const epNum = parseInt(am[1], 10);
    const aUrl = normalizeAudioTarget(am[2]);
    if (!Number.isNaN(epNum) && aUrl && !fanDubAudioMap.has(epNum)) {
      fanDubAudioMap.set(epNum, aUrl);
    }
  }

  while ((am = osPattern.exec(cellWithoutSubtitles)) !== null) {
    const epNum = parseInt(am[1], 10);
    const aUrl = normalizeAudioTarget(am[2]);
    if (!Number.isNaN(epNum) && aUrl && !origAudioMap.has(epNum)) {
      origAudioMap.set(epNum, aUrl);
    }
  }

  // Default / All Tracks fallback: Ep{N}, Es{N}, A{N}, Audio{N}
  const withoutTrackAudio = cellWithoutSubtitles
    .replace(hdPattern, ' ')
    .replace(fdPattern, ' ')
    .replace(osPattern, ' ');
  const epAudioRegex = /\b(?:ep(?:isode)?|es|audio|a)\s*[-_#]?\s*(\d+)\s*[:=\-|]*\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
  while ((am = epAudioRegex.exec(withoutTrackAudio)) !== null) {
    const epNum = parseInt(am[1], 10);
    const aUrl = normalizeAudioTarget(am[2]);
    if (!Number.isNaN(epNum) && aUrl && !defaultAudioMap.has(epNum)) {
      defaultAudioMap.set(epNum, aUrl);
    }
  }

  // S01E01 filename fallback
  const allRawAudioUrls = withoutTrackAudio.match(/https?:\/\/[^\s,\n|"'<>]+/g) || [];
  allRawAudioUrls.forEach((rawUrl) => {
    const seMatch = rawUrl.match(/S\d{1,2}E(\d{1,3})/i);
    if (seMatch) {
      const epNum = parseInt(seMatch[1], 10);
      const aUrl = normalizeAudioTarget(rawUrl);
      if (!Number.isNaN(epNum) && aUrl && !defaultAudioMap.has(epNum)) {
        defaultAudioMap.set(epNum, aUrl);
      }
    }
  });

  const hdUnnumbered = cellWithoutSubtitles.match(/\b(?:hd|hindi|hin)\b\s*[:=\-|]+\s*(https?:\/\/[^\s,\n|"'<>]+)/i);
  if (hdUnnumbered && !hindiAudioMap.has(1)) {
    hindiAudioMap.set(1, normalizeAudioTarget(hdUnnumbered[1]));
  }
  const fdUnnumbered = cellWithoutSubtitles.match(/\b(?:fd|ed|fan(?:\s*dub)?)\b\s*[:=\-|]+\s*(https?:\/\/[^\s,\n|"'<>]+)/i);
  if (fdUnnumbered && !fanDubAudioMap.has(1)) {
    fanDubAudioMap.set(1, normalizeAudioTarget(fdUnnumbered[1]));
  }
  const osUnnumbered = cellWithoutSubtitles.match(/\b(?:os|od|orig|original)\b\s*[:=\-|]+\s*(https?:\/\/[^\s,\n|"'<>]+)/i);
  if (osUnnumbered && !origAudioMap.has(1)) {
    origAudioMap.set(1, normalizeAudioTarget(osUnnumbered[1]));
  }

  if (hindiAudioMap.size === 0 && fanDubAudioMap.size === 0 && origAudioMap.size === 0 && defaultAudioMap.size === 0) {
    const singleRawAudio = cellWithoutSubtitles.match(/https?:\/\/[^\s,\n|"'<>]+/);
    if (singleRawAudio) {
      defaultAudioMap.set(1, normalizeAudioTarget(singleRawAudio[0]));
    }
  }

  return { hindiAudioMap, fanDubAudioMap, origAudioMap, defaultAudioMap };
}

const translatedCueMemCache = new Map<string, SubtitleCue[]>();
const TRANSLATED_SUBS_SESSION_KEY = 'asiaflix_translated_subs_v2';

export async function fetchSubtitleTextWithFallback(rawUrl: string): Promise<string> {
  const cleanUrl = normalizeSubtitleUrl(rawUrl);
  if (!cleanUrl) throw new Error('Empty subtitle URL');
  try {
    const directResp = await fetch(cleanUrl);
    if (directResp.ok) {
      const txt = await directResp.text();
      if (txt && txt.trim().length > 0) return txt;
    }
  } catch {
    // Direct CORS fetch failed, fall back to proxy
  }
  if (/^https?:\/\//i.test(cleanUrl)) {
    const proxyUrl = `/api/okru-proxy?url=${encodeURIComponent(cleanUrl)}`;
    const proxyResp = await fetch(proxyUrl);
    if (proxyResp.ok) {
      return await proxyResp.text();
    }
  }
  throw new Error('Subtitle fetch failed');
}

async function translateTextChunkGtx(text: string, targetLang: string): Promise<string> {
  // 1. Try server-side proxy first (zero CORS issues)
  if (typeof window !== 'undefined' && !window.location.hostname.includes('pages.dev')) {
    try {
      const proxyResp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });
      if (proxyResp.ok) {
        const json = (await proxyResp.json()) as { ok?: boolean; translatedText?: string };
        if (json?.ok && typeof json.translatedText === 'string' && json.translatedText.length > 0) {
          return json.translatedText;
        }
      }
    } catch {
      // Fall through to direct Google GTX endpoint
    }
  }

  // 2. Direct browser Google GTX endpoint
  const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
    targetLang
  )}&dt=t&q=${encodeURIComponent(text)}`;
  const resp = await fetch(endpoint);
  if (!resp.ok) throw new Error(`GTX translate error ${resp.status}`);
  const data = (await resp.json()) as unknown[];
  const sentences = Array.isArray(data?.[0]) ? (data[0] as unknown[][]) : [];
  return sentences.map((s) => (typeof s?.[0] === 'string' ? s[0] : '')).join('');
}

export async function translateSubtitleCues(
  sourceCues: SubtitleCue[],
  targetGtxCode: string,
  cacheKey?: string
): Promise<SubtitleCue[]> {
  if (!sourceCues || sourceCues.length === 0) return [];
  const cleanTarget = (targetGtxCode || '').trim();
  if (!cleanTarget) return sourceCues;

  const fullCacheKey = cacheKey
    ? `${cacheKey}::${cleanTarget}`
    : `${cleanTarget}:${sourceCues.length}:${sourceCues[0]?.text.slice(0, 32)}`;

  const memHit = translatedCueMemCache.get(fullCacheKey);
  if (memHit && memHit.length === sourceCues.length) return memHit;

  const sessHit = readSessionCacheEntry<SubtitleCue[]>(TRANSLATED_SUBS_SESSION_KEY, fullCacheKey);
  if (sessHit && Array.isArray(sessHit) && sessHit.length === sourceCues.length) {
    translatedCueMemCache.set(fullCacheKey, sessHit);
    return sessHit;
  }

  const SEP_TOKEN = '\n@@AFP@@\n';
  const resultCues: SubtitleCue[] = new Array(sourceCues.length);
  const batches: Array<{ startIdx: number; items: SubtitleCue[] }> = [];

  let i = 0;
  while (i < sourceCues.length) {
    const batch: SubtitleCue[] = [];
    let charLen = 0;
    const startIdx = i;
    while (i < sourceCues.length && batch.length < 16) {
      const piece = sourceCues[i].text.replace(/\n+/g, ' ').trim();
      if (batch.length > 0 && charLen + piece.length > 1250) break;
      batch.push(sourceCues[i]);
      charLen += piece.length + 12;
      i++;
    }
    batches.push({ startIdx, items: batch });
  }

  // Run up to 3 translation batches concurrently for snappy response
  const CONCURRENCY = 3;
  let anyBatchSucceeded = false;

  for (let b = 0; b < batches.length; b += CONCURRENCY) {
    const group = batches.slice(b, b + CONCURRENCY);
    await Promise.all(
      group.map(async ({ startIdx, items }) => {
        const joined = items
          .map((c) => c.text.replace(/\n+/g, ' ').replace(/@@AFP@@/g, ' '))
          .join(SEP_TOKEN);
        try {
          const translatedJoined = await translateTextChunkGtx(joined, cleanTarget);
          const splitParts = translatedJoined.split(/\s*@@\s*AFP\s*@@\s*/i);
          if (splitParts.length === items.length) {
            anyBatchSucceeded = true;
            items.forEach((c, idx) => {
              resultCues[startIdx + idx] = {
                ...c,
                text: (splitParts[idx] || c.text).trim(),
              };
            });
            return;
          }
          // Fallback: line-by-line within small mismatched batch
          const lineTranslated = await Promise.all(
            items.map(async (c) => {
              try {
                const t = await translateTextChunkGtx(c.text.replace(/\n+/g, ' '), cleanTarget);
                if (t && t.trim()) anyBatchSucceeded = true;
                return t.trim() || c.text;
              } catch {
                return c.text;
              }
            })
          );
          items.forEach((c, idx) => {
            resultCues[startIdx + idx] = { ...c, text: lineTranslated[idx] };
          });
        } catch {
          items.forEach((c, idx) => {
            resultCues[startIdx + idx] = c;
          });
        }
      })
    );
  }

  if (anyBatchSucceeded) {
    translatedCueMemCache.set(fullCacheKey, resultCues);
    writeSessionCacheEntry(TRANSLATED_SUBS_SESSION_KEY, fullCacheKey, resultCues, 60 * 60 * 1000);
  }
  return resultCues;
}

export interface ParsedSheetClipEntry {
  index: number;
  label: string;
  url: string;
}

export function parseSheetClipsCell(rawClipsCell: string): ParsedSheetClipEntry[] {
  if (!rawClipsCell || !rawClipsCell.trim()) return [];
  const normalized = rawClipsCell.replace(/([=:])\s*[\r\n]+\s*(https?:\/\/)/gi, '$1 $2');
  const results: ParsedSheetClipEntry[] = [];
  const seenUrls = new Set<string>();

  const pushClip = (index: number, label: string, rawUrl: string) => {
    const cleanUrl = normalizeUniversalAssetUrl(rawUrl);
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl) || seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    results.push({ index, label, url: cleanUrl });
  };

  // Match Cs1 = ..., Clip 1 = ..., C1 = ...
  const taggedRegex = /\b(?:cs|clip\s*s?|c)\s*[-_#]?\s*(\d+)\s*[:=\-|]*\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = taggedRegex.exec(normalized)) !== null) {
    const num = parseInt(m[1], 10);
    pushClip(num, `VIP Clip #${num}`, m[2]);
  }

  // Also capture any bare direct video/extractor URLs in the Clips column
  const bareUrls = normalized.match(/https?:\/\/[^\s,\n|"'<>]+/gi) || [];
  let autoIdx = results.length + 1;
  bareUrls.forEach((raw) => {
    const norm = normalizeUniversalAssetUrl(raw);
    if (!norm || seenUrls.has(norm)) return;
    if (/\.(mp4|m4v|webm|mov|m3u8)(\?|$)/i.test(norm) || /(?:ok\.ru|odnoklassniki\.ru|vk\.com|vkvideo\.ru|archive\.org|catbox\.moe|huggingface\.co|hf\.co)/i.test(norm)) {
      pushClip(autoIdx, `VIP Clip #${autoIdx}`, raw);
      autoIdx++;
    }
  });

  return results.sort((a, b) => a.index - b.index);
}

// ============================================================
// 1. SMART OFFLINE DOWNLOAD VAULT (CacheStorage + IndexedDB)
// ============================================================
export const ASIAFLIX_OFFLINE_CACHE = 'asiaflix_offline_vault';
export const OFFLINE_VAULT_DB_NAME = 'asiaflix_offline_vault_db';
export const OFFLINE_VAULT_META_KEY = 'asiaflix_offline_vault_meta_v1';
export const OFFLINE_VAULT_UPDATED_EVENT = 'asiaflix-offline-vault-updated';

export interface OfflineVaultItem {
  key: string; // `${dramaId}::ep${epNum}::${track}`
  dramaId: string;
  dramaTitle: string;
  poster: string;
  epNum: number;
  track: string;
  quality: string;
  cachedVideoUrl: string;
  cachedAudioUrl?: string;
  cachedSubUrl?: string;
  sizeBytes: number;
  downloadedAt: number;
}

function readOfflineMetaSync(): OfflineVaultItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_VAULT_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.key === 'string') : [];
  } catch {
    return [];
  }
}

function writeOfflineMetaSync(items: OfflineVaultItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_VAULT_META_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(OFFLINE_VAULT_UPDATED_EVENT, { detail: items }));
  } catch {
    // ignore storage errors
  }
}

function openOfflineIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(OFFLINE_VAULT_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('downloads')) {
          db.createObjectStore('downloads', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function getOfflineDownloadsSync(): OfflineVaultItem[] {
  return readOfflineMetaSync().sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export async function getOfflineDownloads(): Promise<OfflineVaultItem[]> {
  const local = readOfflineMetaSync();
  const db = await openOfflineIdb();
  if (!db) return local.sort((a, b) => b.downloadedAt - a.downloadedAt);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('downloads', 'readonly');
      const store = tx.objectStore('downloads');
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as OfflineVaultItem[]) : [];
        if (rows.length > 0) {
          writeOfflineMetaSync(rows);
          resolve(rows.sort((a, b) => b.downloadedAt - a.downloadedAt));
        } else {
          resolve(local.sort((a, b) => b.downloadedAt - a.downloadedAt));
        }
      };
      req.onerror = () => resolve(local.sort((a, b) => b.downloadedAt - a.downloadedAt));
    } catch {
      resolve(local.sort((a, b) => b.downloadedAt - a.downloadedAt));
    }
  });
}

async function saveOfflineItemMeta(item: OfflineVaultItem): Promise<void> {
  const existing = readOfflineMetaSync().filter((x) => x.key !== item.key);
  const next = [item, ...existing];
  writeOfflineMetaSync(next);

  const db = await openOfflineIdb();
  if (!db) return;
  try {
    const tx = db.transaction('downloads', 'readwrite');
    tx.objectStore('downloads').put(item);
  } catch {
    // ignore idb errors
  }
}

export async function deleteOfflineDownload(key: string): Promise<OfflineVaultItem[]> {
  const current = readOfflineMetaSync();
  const target = current.find((x) => x.key === key);
  const next = current.filter((x) => x.key !== key);
  writeOfflineMetaSync(next);

  if (target && typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(ASIAFLIX_OFFLINE_CACHE);
      await cache.delete(target.cachedVideoUrl);
      if (target.cachedAudioUrl) await cache.delete(target.cachedAudioUrl);
      if (target.cachedSubUrl) await cache.delete(target.cachedSubUrl);
    } catch {
      // ignore cache errors
    }
  }

  const db = await openOfflineIdb();
  if (db) {
    try {
      const tx = db.transaction('downloads', 'readwrite');
      tx.objectStore('downloads').delete(key);
    } catch {
      // ignore idb errors
    }
  }

  return next;
}

export function makeOfflineVaultKey(dramaId: string, epNum: number, track: string): string {
  return `${dramaId}::ep${epNum}::${track}`;
}

export async function resolveOfflineCachedStream(cacheUrl: string): Promise<string | null> {
  if (typeof caches === 'undefined' || !cacheUrl) return null;
  try {
    const cache = await caches.open(ASIAFLIX_OFFLINE_CACHE);
    const match = await cache.match(cacheUrl);
    if (!match) return null;
    const blob = await match.blob();
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function formatBytesReadable(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export async function downloadEpisodeToOfflineVault(params: {
  dramaId: string;
  dramaTitle: string;
  poster: string;
  epNum: number;
  track: string;
  quality: string;
  rawVideoUrl: string;
  rawAudioUrl?: string;
  rawSubUrl?: string;
  onProgress?: (pct: number) => void;
}): Promise<{ ok: boolean; item?: OfflineVaultItem; error?: string }> {
  const { dramaId, dramaTitle, poster, epNum, track, quality, rawVideoUrl, rawAudioUrl, rawSubUrl, onProgress } = params;
  if (typeof caches === 'undefined') {
    return { ok: false, error: 'Offline CacheStorage is not available in this browser.' };
  }

  try {
    onProgress?.(4);
    let targetVideoUrl = rawVideoUrl;
    const meta = resolveUniversalVideoSource(rawVideoUrl, 0);
    if (meta.asyncProvider?.provider === 'archive') {
      const direct = await resolveArchiveOrgDirectStream(meta.asyncProvider.id);
      if (direct) targetVideoUrl = direct;
    } else if (meta.asyncProvider?.provider === 'okru' || meta.asyncProvider?.provider === 'vk') {
      const extracted = await resolveOkRuOrVkNativeStream(meta.asyncProvider.rawUrl);
      if (extracted.ok && extracted.streams.length > 0) {
        const wantHeight = quality.includes('480') ? 480 : quality.includes('720') ? 720 : 1080;
        const picked =
          extracted.streams.find((s) => s.height === wantHeight) ||
          extracted.streams.find((s) => s.height <= wantHeight) ||
          extracted.streams[0];
        if (picked?.proxiedUrl) targetVideoUrl = picked.proxiedUrl;
        else if (extracted.proxiedHlsUrl) targetVideoUrl = extracted.proxiedHlsUrl;
      }
    } else if (meta.type === 'video' && meta.src) {
      targetVideoUrl = meta.src;
    }

    if (!/^https?:\/\/|^\//i.test(targetVideoUrl)) {
      return { ok: false, error: 'No direct stream URL available to download offline.' };
    }

    onProgress?.(10);
    const cache = await caches.open(ASIAFLIX_OFFLINE_CACHE);
    const cacheSafeVideoUrl = buildProxiedMediaUrl(targetVideoUrl);

    const fetchWithFallback = async (urlToFetch: string): Promise<Response> => {
      try {
        const res = await fetch(urlToFetch);
        if (res.ok) return res;
      } catch {
        // retry via proxy
      }
      const proxied = urlToFetch.includes('/api/okru-proxy') ? urlToFetch : buildProxiedMediaUrl(urlToFetch);
      const res2 = await fetch(proxied);
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      return res2;
    };

    const videoResp = await fetchWithFallback(cacheSafeVideoUrl);
    const contentLength = Number(videoResp.headers.get('content-length') || 0);
    const contentType = videoResp.headers.get('content-type') || 'video/mp4';

    let finalSizeBytes = 0;
    if (videoResp.body && typeof videoResp.body.getReader === 'function') {
      const reader = videoResp.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          if (contentLength > 0) {
            const pct = Math.min(92, 10 + Math.round((received / contentLength) * 82));
            onProgress?.(pct);
          } else {
            onProgress?.(Math.min(88, 12 + Math.round(received / (1024 * 1024))));
          }
        }
      }
      finalSizeBytes = received;
      const mergedBlob = new Blob(chunks as BlobPart[], { type: contentType });
      await cache.put(
        cacheSafeVideoUrl,
        new Response(mergedBlob, {
          status: 200,
          headers: { 'Content-Type': contentType, 'Content-Length': String(finalSizeBytes) },
        })
      );
    } else {
      const blob = await videoResp.blob();
      finalSizeBytes = blob.size;
      await cache.put(
        cacheSafeVideoUrl,
        new Response(blob, {
          status: 200,
          headers: { 'Content-Type': contentType, 'Content-Length': String(finalSizeBytes) },
        })
      );
    }

    onProgress?.(94);

    let cachedAudioUrl: string | undefined;
    if (rawAudioUrl && /^https?:\/\//i.test(rawAudioUrl)) {
      try {
        const audioRes = await resolveExternalAudioStream(rawAudioUrl);
        if (audioRes.ok && audioRes.src) {
          const audResp = await fetchWithFallback(audioRes.src);
          const audBlob = await audResp.blob();
          if (audBlob.size > 0) {
            finalSizeBytes += audBlob.size;
            cachedAudioUrl = audioRes.src;
            await cache.put(
              cachedAudioUrl,
              new Response(audBlob, { status: 200, headers: { 'Content-Type': audBlob.type || 'audio/mp4' } })
            );
          }
        }
      } catch {
        // optional audio cache failure is non-fatal
      }
    }

    let cachedSubUrl: string | undefined;
    if (rawSubUrl && /^https?:\/\//i.test(rawSubUrl)) {
      try {
        const subFetchUrl = normalizeSubtitleUrl(rawSubUrl);
        const subResp = await fetchWithFallback(subFetchUrl);
        const subBlob = await subResp.blob();
        if (subBlob.size > 0) {
          finalSizeBytes += subBlob.size;
          cachedSubUrl = rawSubUrl;
          await cache.put(
            cachedSubUrl,
            new Response(subBlob, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
          );
        }
      } catch {
        // optional sub cache failure is non-fatal
      }
    }

    onProgress?.(100);
    const key = makeOfflineVaultKey(dramaId, epNum, track);
    const item: OfflineVaultItem = {
      key,
      dramaId,
      dramaTitle,
      poster,
      epNum,
      track,
      quality,
      cachedVideoUrl: cacheSafeVideoUrl,
      cachedAudioUrl,
      cachedSubUrl,
      sizeBytes: Math.max(finalSizeBytes, 1024),
      downloadedAt: Date.now(),
    };
    await saveOfflineItemMeta(item);
    return { ok: true, item };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Download failed';
    return { ok: false, error: msg };
  }
}

// ============================================================
// 2. WIKIPEDIA ACTOR & CAST PROFILE HUB HELPER
// ============================================================
export interface ActorWikiProfile {
  name: string;
  bio: string;
  photoUrl?: string;
  wikiUrl?: string;
}

const actorWikiMemCache = new Map<string, ActorWikiProfile>();
const ACTOR_WIKI_SESSION_KEY = 'asiaflix_actor_wiki_v1';

export async function fetchActorWikiProfile(actorName: string): Promise<ActorWikiProfile> {
  const cleanName = actorName.trim();
  const key = cleanName.toLowerCase();
  if (!cleanName) {
    return { name: actorName, bio: 'Featured cast member on AsiaFlix Prime.' };
  }
  const mem = actorWikiMemCache.get(key);
  if (mem) return mem;

  const sess = readSessionCacheEntry<ActorWikiProfile>(ACTOR_WIKI_SESSION_KEY, key);
  if (sess) {
    actorWikiMemCache.set(key, sess);
    return sess;
  }

  try {
    const resp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName.replace(/\s+/g, '_'))}`
    );
    if (resp.ok) {
      const data = (await resp.json()) as {
        title?: string;
        extract?: string;
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
        content_urls?: { desktop?: { page?: string } };
      };
      if (data && (data.extract || data.thumbnail?.source)) {
        const profile: ActorWikiProfile = {
          name: data.title || cleanName,
          bio: data.extract || `${cleanName} is a featured Asian drama actor.`,
          photoUrl: data.thumbnail?.source || data.originalimage?.source,
          wikiUrl: data.content_urls?.desktop?.page,
        };
        actorWikiMemCache.set(key, profile);
        writeSessionCacheEntry(ACTOR_WIKI_SESSION_KEY, key, profile, 6 * 60 * 60 * 1000);
        return profile;
      }
    }
  } catch {
    // fallback below
  }

  const fallback: ActorWikiProfile = {
    name: cleanName,
    bio: `${cleanName} stars in popular Asian dramas available to stream on AsiaFlix Prime.`,
  };
  actorWikiMemCache.set(key, fallback);
  return fallback;
}

// ============================================================
// 3. AUTO-SKIP INTRO PREFERENCE HELPER
// ============================================================
export const AUTO_SKIP_INTRO_STORAGE_KEY = 'asiaflix_auto_skip_intro_v1';

export function getAutoSkipIntroPref(profileDefault?: boolean): boolean {
  if (typeof window === 'undefined') return Boolean(profileDefault);
  try {
    const raw = localStorage.getItem(AUTO_SKIP_INTRO_STORAGE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    // ignore
  }
  return Boolean(profileDefault);
}

export function setAutoSkipIntroPref(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_SKIP_INTRO_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}




