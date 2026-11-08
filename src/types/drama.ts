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
  details?: string; // e.g. "16 Episodes", "1:44:00", "2:14:19", "Full Movie"
  schedule?: string; // e.g. "Sat & Sun 7:00 PM IST" or blank if completed
  scheduleInfo: string; // e.g. "Sat & Sun 7:00 PM" or "16/16 Episodes"
  availableAudios: AudioType[];
  defaultAudio: AudioType;
  telegramUrl: string; // Direct Telegram post URL (primary)
  telegramHindi?: string; // Telegram 1 (Hindi Dubbed) link
  telegramFanDub?: string; // Telegram 2 (Fan Dubbed) link
  telegramOriginal?: string; // Telegram 3 (Original / Eng Sub) link
  isFeatured?: boolean;
  isTrending?: boolean;
  isSpotlight?: boolean;
  isWeekendLineup?: boolean;
  weekendSlot?: string; // e.g. "Sat 7:00 PM Drop", "Sun 7:00 PM Mega Drop", "Weekend Full Binge"
  spotlightRank?: number;
  trendingRank?: number;
  spotlightTag?: string; // e.g. "VIP PICK", "TOP #1", "MEGA HIT"
  totalEpisodes?: number;
  episodes: EpisodeItem[];
  qualityBadge: string; // "1080p FHD"
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
