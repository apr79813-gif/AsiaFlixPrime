export type AudioType = 'Hindi Dubbed' | 'Fan Dubbed' | 'Original / Eng Sub';

export type DramaCategory = 
  | 'K-Drama' 
  | 'C-Drama' 
  | 'Asian Movies' 
  | 'Hollywood / Bollywood' 
  | 'J-Drama'
  | 'Sci-Fi Series';

export type DramaStatus = 'Now Streaming (Ongoing)' | 'Completed (Full Series)' | 'Coming Soon';

export interface EpisodeItem {
  id: string;
  episodeNumber: number | string;
  title: string;
  audio: AudioType;
  telegramUrl: string;
  duration?: string;
  quality?: string;
  isMerged?: boolean;
  format?: 'single' | 'batch' | 'merged' | 'movie';
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
  telegramUrl: string; // Direct Telegram post URL (primary)
  qualityBadge: string; // "1080p FHD"
  
  // --- GOOGLE SHEET COLUMNS (TELEGRAM 1, 2, 3 & NEW SECTIONS) ---
  telegramHindi?: string;      // Telegram 1 (Hindi Dubbed)
  telegramFanDub?: string;     // Telegram 2 (Fan Dub)
  telegramOrig?: string;       // Telegram 3 (Orig / Eng Sub)
  details?: string;            // Episode count or Movie runtime (e.g. "16 Episodes", "1:44:00")
  schedule?: string;           // Weekly drop schedule (e.g. "Sat & Sun 7:00 PM IST", "Sat-Sat", blank when completed)
  leadCast?: string[];         // Lead actors parsed from sheet
  hashtags?: string[];         // Hashtags parsed from sheet (e.g. ["#Kdrama", "#Romance"])
  isMovie?: boolean;           // true if film/movie without multiple episodic drops
  comingSoonAudios?: AudioType[]; // Audios promised or in dubbing phase but link not yet dropped
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
  timestamp: string;
  isRead: boolean;
  type: 'new_episode' | 'new_drama' | 'fhd_remaster' | 'announcement';
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
