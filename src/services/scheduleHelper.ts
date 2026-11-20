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

function getHighestEpisodeNumber(eps: EpisodeItem[]): number {
  let maxEp = 0;
  for (const ep of eps) {
    if (!ep.telegramUrl || !ep.telegramUrl.toLowerCase().includes('http')) continue;
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
      hindiEps.some((e) => e.telegramUrl?.toLowerCase().includes('http')) ||
      drama.availableAudios?.some((a) => a.toLowerCase().includes('hindi') && !a.toLowerCase().includes('fan'))
  );
  const hasFanDubLink = Boolean(
    (drama.telegramFanDub && drama.telegramFanDub.toLowerCase().includes('http')) ||
      fanEps.some((e) => e.telegramUrl?.toLowerCase().includes('http')) ||
      drama.availableAudios?.some((a) => a.toLowerCase().includes('fan'))
  );
  const hasOrigLink = Boolean(
    (drama.telegramOrig && drama.telegramOrig.toLowerCase().includes('http')) ||
      origEps.some((e) => e.telegramUrl?.toLowerCase().includes('http')) ||
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
