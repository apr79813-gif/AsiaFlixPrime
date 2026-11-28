import { DramaItem, EpisodeItem } from '../types/drama';

export type DayShort = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export const DAYS_ORDER: DayShort[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DAY_FULL_NAMES: Record<DayShort, string> = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

const DAY_ALIAS_MAP: Record<string, DayShort> = {
  sun: 'Sun', sunday: 'Sun',
  mon: 'Mon', monday: 'Mon',
  tue: 'Tue', tues: 'Tue', tuesday: 'Tue',
  wed: 'Wed', wednesday: 'Wed',
  thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu',
  fri: 'Fri', friday: 'Fri',
  sat: 'Sat', saturday: 'Sat',
};

export function getTodayShortName(): DayShort {
  const dayIndex = new Date().getDay();
  return DAYS_ORDER[dayIndex] || 'Mon';
}

export function getTodayFullName(): string {
  return DAY_FULL_NAMES[getTodayShortName()];
}

/**
 * Checks whether a drama with the given schedule text airs on a particular day of the week.
 * Supports ranges (e.g. "Mon-Tue", "Fri-Sat", "Sun-Mon"), multiple days ("Mon & Fri", "Wed / Thu"),
 * single days ("Every Sat (2 Eps)", "Friday"), and "Daily".
 */
export function isDramaAiringOnDay(
  scheduleStr: string | undefined,
  targetDay: DayShort | string
): boolean {
  if (!scheduleStr || !scheduleStr.trim()) return false;
  const s = scheduleStr.toLowerCase().trim();

  // Daily releases air every day
  if (s.includes('daily') || s.includes('everyday') || s.includes('all days')) {
    return true;
  }

  const normalizedTarget: DayShort = (DAY_ALIAS_MAP[targetDay.toLowerCase()] || targetDay) as DayShort;
  const targetIndex = DAYS_ORDER.indexOf(normalizedTarget);
  if (targetIndex === -1) return false;

  // 1. Direct name match (e.g. "Mon" in "Mon & Fri" or "Monday")
  const targetAliases = Object.entries(DAY_ALIAS_MAP)
    .filter(([, short]) => short === normalizedTarget)
    .map(([alias]) => alias);

  for (const alias of targetAliases) {
    const wordRegex = new RegExp(`(^|[^a-z])${alias}([^a-z]|$)`, 'i');
    if (wordRegex.test(s)) {
      return true;
    }
  }

  // 2. Range match (e.g. "Mon-Tue", "Tue-Wed", "Fri-Sat", "Sat-Sun", "Sun-Mon")
  const rangeRegex = /(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\s*[-–—to]+\s*(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)/gi;
  let match: RegExpExecArray | null;

  while ((match = rangeRegex.exec(s)) !== null) {
    const startShort = DAY_ALIAS_MAP[match[1].toLowerCase()];
    const endShort = DAY_ALIAS_MAP[match[2].toLowerCase()];

    if (startShort && endShort) {
      const startIndex = DAYS_ORDER.indexOf(startShort);
      const endIndex = DAYS_ORDER.indexOf(endShort);

      if (startIndex <= endIndex) {
        if (targetIndex >= startIndex && targetIndex <= endIndex) return true;
      } else {
        // Range wraps around weekend (e.g. Fri-Sun, Sat-Mon, Sun-Tue)
        if (targetIndex >= startIndex || targetIndex <= endIndex) return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether a drama has an episode dropping today.
 */
export function isAiringToday(scheduleStr: string | undefined): boolean {
  return isDramaAiringOnDay(scheduleStr, getTodayShortName());
}

export interface TrackEpisodeCounts {
  t1Ep: number;
  t2Ep: number;
  t3Ep: number;
  totalEp: number;
  hasHindiLink: boolean;
  hasFanDubLink: boolean;
  hasOrigLink: boolean;
}

function episodeHasAnyLink(ep: EpisodeItem): boolean {
  return Boolean(
    (ep.telegramUrl && ep.telegramUrl.toLowerCase().includes('http')) ||
      (ep.streamLink && ep.streamLink.toLowerCase().includes('http')) ||
      (ep.hindiFanDubStreamLink && ep.hindiFanDubStreamLink.toLowerCase().includes('http')) ||
      (ep.engSubStreamLink && ep.engSubStreamLink.toLowerCase().includes('http'))
  );
}

function getHighestEpisodeNumber(eps: EpisodeItem[]): number {
  let maxEp = 0;
  for (const ep of eps) {
    if (!episodeHasAnyLink(ep)) continue;
    if (typeof ep.episodeNumber === 'number') {
      if (ep.episodeNumber > maxEp) maxEp = ep.episodeNumber;
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
  return maxEp;
}

/**
 * Calculates exact highest uploaded episode number per audio track (Hindi Dub, Fan Dub, Original)
 * alongside planned total episodes so multi-track ongoing dramas never confuse users.
 */
export function getTrackEpisodeCounts(drama: DramaItem): TrackEpisodeCounts {
  const eps = drama.episodes || [];

  const hindiEps = eps.filter((e) => e.audio === 'Hindi Dubbed');
  const fanEps = eps.filter((e) => e.audio === 'Hindi Fan Dubbed' || e.audio === 'Fan Dubbed');
  const origEps = eps.filter((e) => e.audio === 'Original / Eng Sub');

  let t1Ep = getHighestEpisodeNumber(hindiEps);
  let t2Ep = getHighestEpisodeNumber(fanEps);
  let t3Ep = getHighestEpisodeNumber(origEps);

  if (drama.activeTrackSchedules && drama.activeTrackSchedules.length > 0) {
    for (const track of drama.activeTrackSchedules) {
      if (track.isComingSoon || !track.currentEp) continue;
      if (track.key === 't1' && t1Ep === 0) t1Ep = track.currentEp;
      if (track.key === 't2' && t2Ep === 0) t2Ep = track.currentEp;
      if (track.key === 't3' && t3Ep === 0) t3Ep = track.currentEp;
    }
  }

  let totalEp = drama.totalEpisodes || 0;
  if (totalEp === 0 && drama.details) {
    const detEpMatch = drama.details.match(/(\d+)\s*(?:ep|episode)/i);
    if (detEpMatch) totalEp = parseInt(detEpMatch[1], 10);
  }

  const hasHindiLink = Boolean(
    (drama.telegramHindi && drama.telegramHindi.toLowerCase().includes('http')) ||
      (drama.movieStreamLink && drama.movieStreamLink.toLowerCase().includes('http')) ||
      hindiEps.some((e) => episodeHasAnyLink(e)) ||
      drama.availableAudios?.some((a) => a.toLowerCase().includes('hindi') && !a.toLowerCase().includes('fan'))
  );
  const hasFanDubLink = Boolean(
    (drama.telegramFanDub && drama.telegramFanDub.toLowerCase().includes('http')) ||
      (drama.movieFanDubStreamLink && drama.movieFanDubStreamLink.toLowerCase().includes('http')) ||
      fanEps.some((e) => episodeHasAnyLink(e)) ||
      drama.availableAudios?.some((a) => a.toLowerCase().includes('fan'))
  );
  const hasOrigLink = Boolean(
    (drama.telegramOrig && drama.telegramOrig.toLowerCase().includes('http')) ||
      (drama.movieEngSubStreamLink && drama.movieEngSubStreamLink.toLowerCase().includes('http')) ||
      origEps.some((e) => episodeHasAnyLink(e)) ||
      drama.availableAudios?.some((a) => a.toLowerCase().includes('orig') || a.toLowerCase().includes('sub'))
  );

  return {
    t1Ep,
    t2Ep,
    t3Ep,
    totalEp,
    hasHindiLink,
    hasFanDubLink,
    hasOrigLink,
  };
}

/**
 * Formats a Date/timestamp deterministically as "DD/MM/YYYY • hh:mm AM/PM".
 */
export function formatPermanentTimestamp(dateInput: Date | number | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} • ${hoursStr}:${minutes} ${ampm}`;
}

export const EPISODE_REMINDERS_STORAGE_KEY = 'asiaflix_episode_reminders_v1';
export const EPISODE_REMINDERS_UPDATED_EVENT = 'asiaflix-episode-reminders-updated';

export interface EpisodeReminderItem {
  dramaId: string;
  title: string;
  poster: string;
  schedule: string;
  addedAt: number;
}

export function getEpisodeReminders(): EpisodeReminderItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EPISODE_REMINDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((r) => r && typeof r.dramaId === 'string')
      : [];
  } catch {
    return [];
  }
}

export function isDramaReminded(dramaId: string): boolean {
  return getEpisodeReminders().some((r) => r.dramaId === dramaId);
}

export function toggleEpisodeReminder(drama: {
  id: string;
  title: string;
  poster: string;
  schedule?: string;
}): { reminded: boolean; list: EpisodeReminderItem[] } {
  const current = getEpisodeReminders();
  const exists = current.some((r) => r.dramaId === drama.id);
  const next = exists
    ? current.filter((r) => r.dramaId !== drama.id)
    : [
        {
          dramaId: drama.id,
          title: drama.title,
          poster: drama.poster,
          schedule: drama.schedule || 'Weekly Drop 7:00 PM IST',
          addedAt: Date.now(),
        },
        ...current,
      ];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(EPISODE_REMINDERS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(EPISODE_REMINDERS_UPDATED_EVENT, { detail: next }));
    } catch {
      // ignore storage errors
    }
  }
  return { reminded: !exists, list: next };
}

function parseDropHourMinute(scheduleStr: string): { hour: number; minute: number } {
  const timeMatch = scheduleStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!timeMatch) {
    return { hour: 19, minute: 0 }; // Default 7:00 PM
  }
  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = timeMatch[3].toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  return { hour, minute };
}

export function getNextEpisodeDropDate(scheduleStr: string | undefined, nowDate: Date = new Date()): Date | null {
  if (!scheduleStr || !scheduleStr.trim()) return null;
  const { hour, minute } = parseDropHourMinute(scheduleStr);

  // Check up to next 8 days (0 = today .. 7 = next week)
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(nowDate.getTime());
    candidate.setDate(nowDate.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);

    const shortDay = DAYS_ORDER[candidate.getDay()];
    if (isDramaAiringOnDay(scheduleStr, shortDay) && candidate.getTime() > nowDate.getTime()) {
      return candidate;
    }
  }

  // Fallback for generic ongoing strings like "New Episode Weekly"
  if (/ongoing|weekly|every\s*week|new\s*ep/i.test(scheduleStr)) {
    const nextSat = new Date(nowDate.getTime());
    const daysUntilSat = (6 - nowDate.getDay() + 7) % 7 || 7;
    nextSat.setDate(nowDate.getDate() + daysUntilSat);
    nextSat.setHours(hour, minute, 0, 0);
    return nextSat;
  }

  return null;
}

export function formatDropCountdown(
  targetDate: Date | null,
  nowMs: number = Date.now()
): { days: number; hours: number; minutes: number; seconds: number; formatted: string } | null {
  if (!targetDate) return null;
  const diff = Math.max(0, targetDate.getTime() - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    days,
    hours,
    minutes,
    seconds,
    formatted: `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`,
  };
}

