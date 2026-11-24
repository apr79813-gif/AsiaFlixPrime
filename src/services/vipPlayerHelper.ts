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
      .trim();

    if (textLines) {
      cues.push({ id: cues.length + 1, start, end, text: textLines });
    }
  }

  return cues
    .sort((a, b) => a.start - b.start)
    .map((cue, idx) => ({ ...cue, id: idx + 1 }));
}
