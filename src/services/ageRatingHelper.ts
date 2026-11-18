export interface AgeRatingMeta {
  label: string;
  is18Plus: boolean;
  pillClass: string;
}

export function getAgeRatingMeta(ageRating?: string, fallback: string = 'UA 16+'): AgeRatingMeta {
  const raw = (ageRating || fallback).trim();
  const upper = raw.toUpperCase();

  // 1. A (18+) / Adult
  if (raw.includes('18') || upper.includes('ADULT') || /\bA\s*\(/.test(upper) || upper === 'A') {
    return {
      label: '🔞 A (18+)',
      is18Plus: true,
      pillClass:
        'bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white border border-red-400/70 shadow-[0_0_12px_rgba(229,9,20,0.55)] font-black',
    };
  }

  // 2. PG-13
  if (upper.includes('PG')) {
    return {
      label: raw,
      is18Plus: false,
      pillClass:
        'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    };
  }

  // 3. UA 13+ (includes 13+ and not PG)
  if (raw.includes('13+')) {
    return {
      label: raw,
      is18Plus: false,
      pillClass:
        'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    };
  }

  // 4. UA 16+ (or default)
  return {
    label: raw || 'UA 16+',
    is18Plus: false,
    pillClass:
      'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
  };
}
