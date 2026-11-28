export type AudioType = 'Hindi Dubbed' | 'Hindi Fan Dubbed' | 'Fan Dubbed' | 'Original / Eng Sub';

export type MoodFilterType = 'all' | 'romance' | 'thriller' | 'fantasy' | 'short';

export interface SubtitleTrack {
  label: string;
  url: string;
}

export interface SubtitleTrackItem {
  code: string;
  label: string;
  langTag: string;
  url: string;
}

export type DramaCategory = 
  | 'K-Drama' 
  | 'C-Drama' 
  | 'Asian Movies' 
  | 'Hollywood / Bollywood' 
  | 'Other Series'
  | 'J-Drama'
  | 'Sci-Fi Series';

export type DramaStatus = 'Now Streaming (Ongoing)' | 'Completed (Full Series)' | 'Coming Soon';

export interface EpisodeItem {
  id: string;
  episodeNumber: number | string;
  title: string;
  audio: AudioType;
  telegramUrl: string;
  streamLink?: string;
  hindiFanDubStreamLink?: string;
  engSubStreamLink?: string;
  hindiCustomAudioLink?: string;
  fanDubCustomAudioLink?: string;
  origCustomAudioLink?: string;
  subtitles?: Record<string, SubtitleTrackItem>;
  subtitleLink?: string;
  subtitleTracks?: SubtitleTrack[];
  duration?: string;
  quality?: string;
  thumbnailUrl?: string;
  isMerged?: boolean;
  format?: 'single' | 'batch' | 'merged' | 'movie';
}

export interface ClipItem {
  id: string;
  dramaId: string;
  title: string;
  label?: string;
  episodeNumber?: number;
  streamUrl: string;
  externalAudioUrl?: string;
  poster: string;
  backdrop: string;
  thumbnailUrl?: string;
  startTime?: number;
  endTime?: number;
  scenes?: Array<{ start: number; duration: number; hook?: string }>;
  audio?: AudioType;
  sourceType: 'sheet' | 'auto';
  category: DramaCategory;
  tags: string[];
  synopsis: string;
  telegramUrl?: string;
}

export interface VipProfile {
  id: string;
  name: string;
  contact: string;
  pinOrPassword?: string;
  avatar: string;
  defaultAudio: AudioType;
  preferredSubLang?: string;
  autoPlayNext?: boolean;
  autoSkipIntro?: boolean;
  dataSaverDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DramaItem {
  id: string;
  title: string;
  originalTitle?: string;
  category: DramaCategory;
  releaseYear: number;
  status: DramaStatus;
  rating: number; // e.g. 9.3
  poster: string;
  backdrop: string;
  thumbnailUrl?: string;
  episodeThumbnails?: Record<number, string>;
  subtitles?: Record<string, SubtitleTrackItem>;
  subtitleLink?: string;
  subtitleTracks?: SubtitleTrack[];
  synopsis: string;
  cast: string[];
  tags: string[];
  scheduleInfo: string; // fallback string
  availableAudios: AudioType[];
  defaultAudio: AudioType;
  isFeatured?: boolean;
  isTrending?: boolean;
  isSpotlight?: boolean;
  isWeekendLineup?: boolean;
  weekendSlot?: string;
  spotlightRank?: number;
  trendingRank?: number;
  spotlightTag?: string;
  totalEpisodes?: number;
  episodes: EpisodeItem[];
  clips?: ClipItem[];
  telegramUrl: string; // Direct Telegram post URL (primary)
  movieStreamLink?: string;
  movieFanDubStreamLink?: string;
  movieEngSubStreamLink?: string;
  qualityBadge: string; // "1080p FHD"
  
  // --- GOOGLE SHEET COLUMNS (TELEGRAM 1, 2, 3 & NEW SECTIONS) ---
  country?: string;            // Optional country/origin label from sheet
  statusText?: string;         // Exact text from Sheet's Status column (e.g. "Now Streaming Ep 6")
  ageRating?: string;          // From "Age Rating / Age Group"
  subCategory?: string;        // From "Content Type / Sub-Genre (Sub-Category)"
  telegramHindi?: string;      // Telegram 1 (Hindi Dubbed)
  telegramFanDub?: string;     // Telegram 2 (Fan Dub)
  telegramOrig?: string;       // Telegram 3 (Orig / Eng Sub)
  details?: string;            // Episode count or Movie runtime (e.g. "16 Episodes", "1:44:00")
  schedule?: string;           // Weekly drop schedule (e.g. "Sat & Sun 7:00 PM IST", "Sat-Sat", blank when completed)
  leadCast?: string[];         // Lead actors parsed from sheet
  hashtags?: string[];         // Hashtags parsed from sheet (e.g. ["#Kdrama", "#Romance"])
  isMovie?: boolean;           // true if film/movie without multiple episodic drops
  comingSoonAudios?: AudioType[]; // Audios promised or in dubbing phase but link not yet dropped
  issueText?: string;          // Column T: Reported / Active Issue
  issueFixedText?: string;     // Column U: Issue Fixed / Resolved
  activeTrackSchedules?: Array<{
    key: 't1' | 't2' | 't3';
    audio: AudioType;
    shortLabel: string;
    scheduleText: string;
    currentEp: number;
    totalEp: number;
    isComingSoon: boolean;
  }>;
}

export interface WeekendSettings {
  isActive: boolean;
  title: string;
  announcement: string;
  timing: string;
  noticeText: string;
}

export type WatchlistStatus = 'want_to_watch' | 'watching' | 'completed' | 'dropped';

export interface WatchlistEntry {
  dramaId: string;
  dramaTitle?: string;
  status: WatchlistStatus;
  watchedEpisodes: (number | string)[];
  addedAt: number;
  lastUpdated: number;
}

export interface ReleaseNotification {
  id: string;
  title: string;
  dramaId?: string;
  message: string;
  audioType?: AudioType;
  badge?: string;
  posterUrl?: string;
  timestamp: string;
  createdAtMs?: number;
  isRead: boolean;
  type: 'new_episode' | 'new_drama' | 'fhd_remaster' | 'announcement' | 'issue' | 'fix';
}

export interface SupportTicket {
  id: string;
  title: string;
  category: string;
  user: string;
  issue: string;
  reply: string;
  status: 'Resolved' | 'Updated' | 'In Progress';
  date: string;
}

export interface HeroBannerSlide {
  id: string;
  title: string;
  backdropUrl: string;
  posterUrl?: string;
  audio?: string;
  category?: string;
  releaseYear?: number | string;
  rating?: number | string;
  scheduleInfo?: string;
  synopsis: string;
  telegramUrl: string;
  badge?: string;
  dramaId?: string;
  isActive?: boolean;
}

export interface TelegramBotSettings {
  botUsername: string; // e.g. "asiaflix_request_bot"
  botToken: string; // e.g. "123456:ABC-DEF..."
  channelId: string; // e.g. "@asiaflixprime" or "-100123456789"
  isEnabled: boolean;
}

export interface GoogleSheetSettings {
  sheetCsvUrl: string;
  autoSync: boolean;
  lastSyncedAt?: number;
  lastRowCount?: number;
}
