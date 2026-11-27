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
  url: string;
  proxiedUrl: string;
}

export interface ExtractedNativeStreamResult {
  ok: boolean;
  provider?: 'okru' | 'vk';
  id?: string;
  title?: string;
  hlsUrl?: string;
  proxiedHlsUrl?: string;
  streams: ExtractedQualityStream[];
  error?: string;
}

const archiveOrgResolvedCache = new Map<string, string>();
const okVkExtractedCache = new Map<string, ExtractedNativeStreamResult>();
const archiveOrgInflight = new Map<string, Promise<string | null>>();
const okVkInflight = new Map<string, Promise<ExtractedNativeStreamResult>>();

const ARCHIVE_SESSION_KEY = 'asiaflix_archive_stream_cache_v1';
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

export function getCachedArchiveOrgDirectStream(identifier: string): string | null {
  const cleanId = decodeURIComponent((identifier || '').trim());
  if (!cleanId) return null;
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

export async function resolveArchiveOrgDirectStream(identifier: string): Promise<string | null> {
  const cleanId = decodeURIComponent((identifier || '').trim());
  if (!cleanId) return null;

  const cached = getCachedArchiveOrgDirectStream(cleanId);
  if (cached) return cached;

  const existingInflight = archiveOrgInflight.get(cleanId);
  if (existingInflight) return existingInflight;

  const reqPromise = (async (): Promise<string | null> => {
    try {
      const resp = await fetch(`https://archive.org/metadata/${encodeURIComponent(cleanId)}`);
      if (!resp.ok) return null;
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

      if (videoFiles.length === 0) return null;

      const scoreFile = (f: (typeof videoFiles)[number]): number => {
        const name = (f.name || '').toLowerCase();
        const format = (f.format || '').toLowerCase();
        let score = 0;
        if (name.endsWith('.mp4')) score += 100000;
        else if (name.endsWith('.m4v') || name.endsWith('.webm')) score += 60000;
        else if (name.endsWith('.mkv') || name.endsWith('.mov')) score += 30000;

        if (format.includes('mpeg4') || format.includes('h.264') || format.includes('mp4')) score += 25000;
        if (f.source === 'derivative' && name.endsWith('.mp4')) score += 5000;
        const height = Number(f.height) || 0;
        score += height * 10;
        const sizeMb = Math.min(4000, (Number(f.size) || 0) / (1024 * 1024));
        score += sizeMb;
        return score;
      };

      videoFiles.sort((a, b) => scoreFile(b) - scoreFile(a));
      const best = videoFiles[0];
      if (!best?.name) return null;

      const encodedFilePath = best.name
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
      const directUrl = `https://archive.org/download/${encodeURIComponent(cleanId)}/${encodedFilePath}`;
      archiveOrgResolvedCache.set(cleanId, directUrl);
      writeSessionCacheEntry(ARCHIVE_SESSION_KEY, cleanId, directUrl, ARCHIVE_TTL_MS);
      return directUrl;
    } catch {
      return null;
    } finally {
      archiveOrgInflight.delete(cleanId);
    }
  })();

  archiveOrgInflight.set(cleanId, reqPromise);
  return reqPromise;
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

  // 3. Archive.org /details/ or /embed/ <id>(/<file>)? -> /download/<id>(/<file>)?
  const archiveMatch = trimmed.match(/^https?:\/\/(?:www\.)?archive\.org\/(?:details|embed|download)\/([^/?#]+)(\/[^?#]+)?/i);
  if (archiveMatch) {
    const id = archiveMatch[1];
    const filePart = archiveMatch[2] || '';
    trimmed = `https://archive.org/download/${id}${filePart}`;
  }

  // 4. Google Drive share URL -> direct download when used for audio/srt assets
  const gdriveDirectMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveDirectMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdriveDirectMatch[1]}`;
  }

  return trimmed;
}

export function isDeadExternalAudioUrl(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  const lower = rawUrl.trim().toLowerCase();
  return (
    lower.includes('huggingface.co/datasets/asiaflixprime/') &&
    /\.mp3(\?|$)/i.test(lower)
  );
}

export function sanitizeExternalAudioUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const normalized = normalizeUniversalAssetUrl(rawUrl);
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

