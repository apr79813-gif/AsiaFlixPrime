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
