import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DramaItem, EpisodeItem, WatchlistEntry, WatchlistStatus, ReleaseNotification, SupportTicket, AudioType, DramaCategory, DramaStatus, WeekendSettings, HeroBannerSlide, TelegramBotSettings } from './types/drama';
import { INITIAL_DRAMAS, INITIAL_NOTIFICATIONS, INITIAL_TICKETS, INITIAL_HERO_BANNERS } from './data/initialCatalog';
import { SakuraCanvas } from './components/SakuraCanvas';
import { MarqueeNotice } from './components/MarqueeNotice';
import { AudienceNotificationBanner } from './components/AudienceNotificationBanner';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { SpotlightBar } from './components/SpotlightBar';
import { WeekendMegaLineupSection } from './components/WeekendMegaLineupSection';
import { FilterBar } from './components/FilterBar';
import { DramaRow } from './components/DramaRow';
import { DramaCard } from './components/DramaCard';
import { DramaDetailModal } from './components/DramaDetailModal';
import { WatchlistDrawer } from './components/WatchlistDrawer';
import { NotificationDrawer } from './components/NotificationDrawer';
import { RequestDramaModal } from './components/RequestDramaModal';
import { SupportDeskModal } from './components/SupportDeskModal';
import { ArcadeHubModal } from './components/ArcadeHubModal';
import { AdminStudioModal } from './components/AdminStudioModal';
import { PolicySafetySection } from './components/PolicySafetySection';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { 
  fetchDramasFromSupabase, 
  fetchNotificationsFromSupabase, 
  getActiveSupabaseUser 
} from './services/supabaseService';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR4prDqYUbk87MvTOWLhH9X85aCr9bbVqdI-F6y4raT3sFqvuuPg0o9IkwQ9kzBK4VGFOiDybluNfdm/pub?output=csv";

export default function App() {
  // --- GOOGLE SHEETS DYNAMIC URL STATE ---
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    return localStorage.getItem('asiaflix_google_sheet_url_v1') || SHEET_CSV_URL;
  });

  // --- CUSTOM BRAND LOGO URL (FROM SHEET OR SETTINGS) ---
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(() => {
    return localStorage.getItem('asiaflix_custom_logo_url') || '';
  });

  useEffect(() => {
    if (customLogoUrl) {
      localStorage.setItem('asiaflix_custom_logo_url', customLogoUrl);
    }
  }, [customLogoUrl]);

  // --- TELEGRAM BOT BROADCAST CONFIG STATE ---
  const [telegramBotSettings, setTelegramBotSettings] = useState<TelegramBotSettings>(() => {
    const saved = localStorage.getItem('asiaflix_telegram_bot_settings_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      botUsername: 'asiaflix_request_bot',
      botToken: '',
      channelId: '@asiaflixprime',
      isEnabled: true,
    };
  });

  // --- CATALOG VIEW LAYOUT MODE ('grid' | 'cinema' for laptop-style feed on phone) ---
  const [catalogLayoutMode, setCatalogLayoutMode] = useState<'grid' | 'cinema'>(() => {
    return (localStorage.getItem('asiaflix_catalog_layout_mode_v1') as 'grid' | 'cinema') || 'grid';
  });

  // --- DRAMA CATALOG STATE WITH CURATION RECOVERY ---
  const [dramas, setDramas] = useState<DramaItem[]>(() => {
    // 1. Load custom-added dramas
    const savedCustom = localStorage.getItem('asiaflix_custom_dramas');
    let customList: DramaItem[] = [];
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          customList = parsed.filter((p) => p && p.id && typeof p.id === 'string' && p.id.startsWith('custom-'));
        }
      } catch (e) {
        console.error('Error loading custom dramas:', e);
      }
    }

    // 2. Load curated dramas
    const savedCurated = localStorage.getItem('asiaflix_curated_dramas_v3');
    if (savedCurated) {
      try {
        const parsed = JSON.parse(savedCurated);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonCustomCurated = parsed.filter((p) => !customList.some((c) => c.id === p.id));
          return [...customList, ...nonCustomCurated];
        }
      } catch (e) {
        console.error('Error loading curated dramas:', e);
      }
    }

    if (customList.length > 0) {
      const nonCustomInitial = INITIAL_DRAMAS.filter((p) => !customList.some((c) => c.id === p.id));
      return [...customList, ...nonCustomInitial];
    }
    return INITIAL_DRAMAS;
  });

  // --- WEEKEND MEGA LINEUP SETTINGS ---
  const [weekendSettings, setWeekendSettings] = useState<WeekendSettings>(() => {
    const saved = localStorage.getItem('asiaflix_weekend_settings_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing weekend settings:', e);
      }
    }
    return {
      isActive: true,
      title: 'Weekend Mega Lineup is Active!',
      announcement: 'Weekend Mega Lineup is Active! New Hindi Dubbed Episodes Dropping Sat & Sun 7:00 PM IST • Zero Ads.',
      timing: 'Sat & Sun 7:00 PM IST Mega Drops',
      noticeText: '🌸 Weekend Mega Lineup is Active! New Hindi Dubbed Drops Sat & Sun 7:00 PM IST • Zero Ads. 100% Free VIP Network 🌸',
    };
  });

  // --- NOTIFICATIONS STATE ---
  const [notifications, setNotifications] = useState<ReleaseNotification[]>(() => {
    const saved = localStorage.getItem('asiaflix_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  // --- WATCHLIST STATE ---
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => {
    const saved = localStorage.getItem('asiaflix_watchlist_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing watchlist:', e);
      }
    }
    return [
      { dramaId: 'rain-or-shine', status: 'watching', watchedEpisodes: [1, 2, 3], addedAt: Date.now() - 86400000, lastUpdated: Date.now() },
      { dramaId: 'king-the-land', status: 'want_to_watch', watchedEpisodes: [], addedAt: Date.now() - 172800000, lastUpdated: Date.now() },
    ];
  });

  // --- WATCHED EPISODES MAPPING (dramaId -> array of episodeNumber) ---
  const [watchedEpisodesMap, setWatchedEpisodesMap] = useState<Record<string, (number | string)[]>>(() => {
    const saved = localStorage.getItem('asiaflix_watched_episodes_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing watched episodes:', e);
      }
    }
    return {
      'rain-or-shine': [1, 2, 3],
    };
  });

  // --- SUPPORT TICKETS ---
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);

  // --- MARQUEE NOTICE TEXT ---
  const [marqueeText, setMarqueeText] = useState('Weekend Mega Lineup is Active! New Hindi Dubbed Episodes Dropping Sat & Sun 7:00 PM IST • Zero Ads.');

  // --- SAKURA DRIFT TOGGLE ---
  const [sakuraEnabled, setSakuraEnabled] = useState(true);

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // --- MODAL STATES ---
  const [selectedDrama, setSelectedDrama] = useState<DramaItem | null>(null);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'trending' | 'weekend' | 'banners' | 'new_drama' | 'broadcast' | 'supabase' | 'security'>('trending');

  // --- HOMEPAGE HERO BANNERS / BACKGROUND POSTERS STATE ---
  const [heroBanners, setHeroBanners] = useState<HeroBannerSlide[]>(() => {
    const saved = localStorage.getItem('asiaflix_hero_banners_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing hero banners:', e);
      }
    }
    return INITIAL_HERO_BANNERS;
  });

  // --- ADMIN AUTH STATE (Persistent per session) ---
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('asiaflix_admin_session') === 'true';
  });

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('asiaflix_admin_session', 'true');
  };

  const handleAdminAuthLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('asiaflix_admin_session');
  };

  const handleOpenAdminWithTab = (tab: 'trending' | 'weekend' | 'banners' | 'new_drama' | 'broadcast' | 'supabase' | 'security') => {
    setAdminInitialTab(tab);
    setIsAdminOpen(true);
  };

  const handleUpdateDramasCuration = (updatedDramas: DramaItem[]) => {
    setDramas(updatedDramas);
    localStorage.setItem('asiaflix_curated_dramas_v3', JSON.stringify(updatedDramas));
  };

  // Persistent storage effects
  useEffect(() => {
    localStorage.setItem('asiaflix_hero_banners_v1', JSON.stringify(heroBanners));
  }, [heroBanners]);

  useEffect(() => {
    localStorage.setItem('asiaflix_weekend_settings_v2', JSON.stringify(weekendSettings));
    if (weekendSettings.noticeText) {
      setMarqueeText(weekendSettings.noticeText);
    }
  }, [weekendSettings]);

  useEffect(() => {
    localStorage.setItem('asiaflix_watchlist_v2', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('asiaflix_watched_episodes_v2', JSON.stringify(watchedEpisodesMap));
  }, [watchedEpisodesMap]);

  useEffect(() => {
    localStorage.setItem('asiaflix_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('asiaflix_google_sheet_url_v1', googleSheetUrl);
  }, [googleSheetUrl]);

  useEffect(() => {
    localStorage.setItem('asiaflix_telegram_bot_settings_v1', JSON.stringify(telegramBotSettings));
  }, [telegramBotSettings]);

  useEffect(() => {
    localStorage.setItem('asiaflix_catalog_layout_mode_v1', catalogLayoutMode);
  }, [catalogLayoutMode]);

  // Global Admin Shortcut (Ctrl+Shift+A or Alt+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- SUPABASE AUTH USER STATE ---
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);

  // Initial sync: Supabase Cloud first, then Sheet fallback
  useEffect(() => {
    getActiveSupabaseUser().then((u) => setSupabaseUser(u));
    syncCatalogAndNotifs();
  }, []);

  // --- GOOGLE SHEET SYNC STATE ---
  const [sheetSyncState, setSheetSyncState] = useState<{
    isSyncing: boolean;
    lastSyncedCount: number;
    lastSyncedTime: string;
    error?: string;
  }>(() => ({
    isSyncing: false,
    lastSyncedCount: 202,
    lastSyncedTime: 'Ready',
  }));

  // Merge external items (Google Sheets / Supabase):
  // Fresh Google Sheet data always takes 1st priority and completely overwrites old cached items.
  const mergePreservingCuratedAndCustom = (incoming: DramaItem[]) => {
    setDramas((prev) => {
      // 1. Get custom dramas from storage (preserve user-created custom dramas)
      const savedCustom = localStorage.getItem('asiaflix_custom_dramas');
      let customDramas: DramaItem[] = [];
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          if (Array.isArray(parsed)) {
            customDramas = parsed.filter((p) => p && p.id && typeof p.id === 'string' && p.id.startsWith('custom-'));
          }
        } catch (e) {
          console.error('Error parsing custom dramas:', e);
        }
      }

      const incomingIds = new Set(incoming.map((item) => item.id));
      const filteredCustom = customDramas.filter((c) => !incomingIds.has(c.id));
      const result = [...filteredCustom, ...incoming];

      localStorage.setItem('asiaflix_curated_dramas_v3', JSON.stringify(result));
      return result;
    });
  };

  const syncCatalogAndNotifs = async () => {
    try {
      const sbDramas = await fetchDramasFromSupabase();
      if (sbDramas && sbDramas.length > 0) {
        mergePreservingCuratedAndCustom(sbDramas);
      }

      const sbNotifs = await fetchNotificationsFromSupabase();
      if (sbNotifs && sbNotifs.length > 0) {
        setNotifications((prev) => {
          const notifMap = new Map<string, ReleaseNotification>();
          sbNotifs.forEach((n) => notifMap.set(n.id, n));
          prev.forEach((n) => {
            if (!notifMap.has(n.id)) notifMap.set(n.id, n);
          });
          return Array.from(notifMap.values());
        });
      }
    } catch (e) {
      console.warn('Supabase initial fetch caught:', e);
    }

    // Direct Sheet sync with cache busting
    await fetchGoogleSheetData();
  };

  // RFC 4180 compliant CSV parser that supports multiline cells and quotes
  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n of \r\n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }
    return rows;
  };

  // Helper to parse multi-line or single episode links from Telegram columns into separate EpisodeItem objects
  const parseTelegramEpisodeLinks = (
    rawText: string,
    audio: AudioType,
    dramaId: string,
    cleanTitle: string,
    isFilm: boolean,
    detailsRaw?: string
  ): EpisodeItem[] => {
    if (!rawText || !rawText.trim()) return [];

    const rawLines = rawText.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return [];

    if (rawLines.length === 1) {
      const singleLine = rawLines[0];
      const urlMatch = singleLine.match(/https?:\/\/[^\s"',]+/);
      const url = urlMatch ? urlMatch[0] : singleLine;
      if (!url.startsWith('http')) return [];

      const epMatch = singleLine.match(/(?:ep|episode|part|e)\s*[:=\-]?\s*(\d+)/i);
      const epNum = epMatch ? parseInt(epMatch[1]) : (isFilm ? 'Full Movie' : 'Batch / Latest Drop');
      const isSingleEp = Boolean(epMatch);

      return [
        {
          id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${epNum}`,
          episodeNumber: epNum,
          title: isFilm
            ? `${cleanTitle} (1080p FHD Movie)`
            : isSingleEp
            ? `${cleanTitle} · Episode ${epNum} (${audio})`
            : `${cleanTitle} · Master Pack (${audio})`,
          audio,
          telegramUrl: url,
          duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
          quality: '1080p FHD',
          isMerged: !isSingleEp && !isFilm,
          format: isFilm ? 'movie' : isSingleEp ? 'single' : 'merged',
        },
      ];
    }

    // Multiple lines: parse each line into an EpisodeItem
    const episodes: EpisodeItem[] = [];
    rawLines.forEach((line, idx) => {
      const urlMatch = line.match(/https?:\/\/[^\s"',]+/);
      if (!urlMatch) return;
      const url = urlMatch[0];

      const epMatch = line.match(/(?:ep|episode|part|e)\s*[:=\-]?\s*(\d+)/i) || line.match(/^(\d+)\s*[:=\.\-]/);
      const epNum = epMatch ? parseInt(epMatch[1]) : idx + 1;

      episodes.push({
        id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${epNum}`,
        episodeNumber: epNum,
        title: `${cleanTitle} · Episode ${epNum} (${audio})`,
        audio,
        telegramUrl: url,
        duration: detailsRaw || '1080p FHD',
        quality: '1080p FHD',
        isMerged: false,
        format: 'single',
      });
    });

    return episodes;
  };

  const fetchGoogleSheetData = async (targetUrl?: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    setSheetSyncState((prev) => ({ ...prev, isSyncing: true }));
    const baseUrl = targetUrl || googleSheetUrl || SHEET_CSV_URL;
    const cacheBusterUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

    try {
      let text = '';
      try {
        const res = await fetch(cacheBusterUrl, { cache: 'no-store' });
        if (res.ok) {
          text = await res.text();
        }
      } catch (netErr) {
        console.warn('Network fetch from Google Sheet URL failed, trying local catalog asset:', netErr);
      }

      // If online sheet failed or returned empty, load local updated catalog
      if (!text || text.length < 50) {
        try {
          const localRes = await fetch('/assets/aistudio/AsiaFlix_Catalog_5a28a2f8');
          if (localRes.ok) {
            text = await localRes.text();
          }
        } catch (localErr) {
          console.warn('Local catalog fallback failed:', localErr);
        }
      }

      if (!text) {
        setSheetSyncState((prev) => ({ ...prev, isSyncing: false, error: 'Failed to fetch catalog.' }));
        return { success: false, error: 'Google Sheet fetch failed and local catalog unavailable.' };
      }

      const rows = parseCSV(text);
      if (rows.length < 2) {
        setSheetSyncState((prev) => ({ ...prev, isSyncing: false, error: 'No rows in sheet.' }));
        return { success: false, error: 'Google Sheet khali hai ya koi rows nahi mili.' };
      }

      const header = rows[0].map((h) => h.toLowerCase().trim());
      
      const findColIdx = (keywords: string[]) => {
        for (let i = 0; i < header.length; i++) {
          const col = header[i];
          for (const kw of keywords) {
            if (col.includes(kw)) return i;
          }
        }
        return -1;
      };

      const titleIdx = findColIdx(['title', 'name']);
      const catIdx = findColIdx(['category', 'type']);
      const audioIdx = findColIdx(['audio', 'dub']);
      const posterIdx = findColIdx(['poster', 'image']);
      
      // Telegram 1, 2, 3 indices
      const telegramHindiIdx = findColIdx(['telegram (hindi)', 'telegram 1', 'hindi)']);
      const telegramFanDubIdx = findColIdx(['telegram2', 'fan dub', 'fandub']);
      const telegramOrigIdx = findColIdx(['telegram3', 'orig', 'sub']);
      const fallbackTelegramIdx = findColIdx(['telegram', 'link']);

      const statusIdx = findColIdx(['status']);
      const detailsIdx = findColIdx(['details', 'runtime', 'episode']);
      const scheduleIdx = findColIdx(['schedule', 'shedule']);
      const badgeIdx = findColIdx(['badge']);
      const bannerIdx = findColIdx(['hero banner', 'banner']);
      const synopsisIdx = findColIdx(['synopsis', 'desc', 'plot']);
      const ratingIdx = findColIdx(['rating', 'score']);
      const castIdx = findColIdx(['lead cast', 'cast', 'actor']);
      const tagsIdx = findColIdx(['hastags', 'hashtag', 'tags']);
      const noticeIdx = findColIdx(['notice']);
      const trendingIdx = findColIdx(['top trending', 'trending']);
      const logoIdx = findColIdx(['logo']);
      const weekendIdx = findColIdx(['weekend', 'lineup', 'mega']);

      // Global sheet settings (Notice, Trending list, Logo URL)
      let foundNotice = '';
      let foundTrendingTitles: string[] = [];
      let foundLogoUrl = '';

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!foundNotice && noticeIdx >= 0 && row[noticeIdx]?.trim()) {
          foundNotice = row[noticeIdx].trim();
        }
        if (foundTrendingTitles.length === 0 && trendingIdx >= 0 && row[trendingIdx]?.trim()) {
          foundTrendingTitles = row[trendingIdx]
            .split(',')
            .map((t) => t.trim().toLowerCase().replace(/\s*\(\d{4}\)/g, '').replace(/[^a-z0-9]/g, ' ').trim())
            .filter(Boolean);
        }
        if (!foundLogoUrl && logoIdx >= 0 && row[logoIdx]?.trim()) {
          let rawLogo = row[logoIdx].trim();
          if (rawLogo.includes('github.com') && rawLogo.includes('/blob/')) {
            rawLogo = rawLogo.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
          }
          foundLogoUrl = rawLogo;
        }
      }

      if (foundNotice) setMarqueeText(foundNotice);
      if (foundLogoUrl) setCustomLogoUrl(foundLogoUrl);

      const parsedDramasMap = new Map<string, DramaItem>();
      const parsedHeroBanners: HeroBannerSlide[] = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const title = row[titleIdx >= 0 ? titleIdx : 0];
        if (!title || !title.trim()) continue;

        const cleanTitle = title.trim();
        const normalizedKey = cleanTitle.toLowerCase().replace(/\s*\(\d{4}\)/g, '').replace(/[^a-z0-9]/g, ' ').trim();
        const dramaId = `sheet-${normalizedKey.replace(/\s+/g, '-')}`;

        const categoryRaw = row[catIdx >= 0 ? catIdx : 1] || 'K-Drama';
        const audioRaw = row[audioIdx >= 0 ? audioIdx : 2] || 'Hindi Dubbed';
        const poster = row[posterIdx >= 0 ? posterIdx : 3]?.trim() || '';

        // Extract Telegram 1, 2, 3
        let tHindi = telegramHindiIdx >= 0 ? row[telegramHindiIdx]?.trim() : '';
        let tFanDub = telegramFanDubIdx >= 0 ? row[telegramFanDubIdx]?.trim() : '';
        let tOrig = telegramOrigIdx >= 0 ? row[telegramOrigIdx]?.trim() : '';
        const generalTg = fallbackTelegramIdx >= 0 ? row[fallbackTelegramIdx]?.trim() : '';

        const statusRaw = row[statusIdx >= 0 ? statusIdx : 5] || 'Now Streaming (Ongoing)';
        const detailsRaw = detailsIdx >= 0 ? row[detailsIdx]?.trim() : '';
        const scheduleRaw = scheduleIdx >= 0 ? row[scheduleIdx]?.trim() : '';
        const badgeRaw = badgeIdx >= 0 ? row[badgeIdx]?.trim() : '';
        const synopsisVal = synopsisIdx >= 0 ? row[synopsisIdx]?.trim() : '';
        const ratingVal = ratingIdx >= 0 && row[ratingIdx]?.trim() ? parseFloat(row[ratingIdx]) : 9.3;
        const castRaw = castIdx >= 0 ? row[castIdx]?.trim() : '';
        const tagsRaw = tagsIdx >= 0 ? row[tagsIdx]?.trim() : '';
        const isBannerRow = bannerIdx >= 0 && (row[bannerIdx]?.trim().toLowerCase() === 'yes' || row[bannerIdx]?.trim().toLowerCase() === 'true');
        const isWeekendRow = weekendIdx >= 0 && (row[weekendIdx]?.trim().toLowerCase() === 'yes' || row[weekendIdx]?.trim().toLowerCase() === 'true');

        // Audio & Badge context for intelligent audio detection
        const audioContext = `${audioRaw} ${badgeRaw}`.toLowerCase();
        const isOrigSub = audioContext.includes('orig') || audioContext.includes('eng sub') || audioContext.includes('sub');
        const isFanDub = audioContext.includes('fan');

        // Fix audio detection: If a row has Original or Eng Sub in Audio/Badge and the link is in Column E (Telegram (Hindi)),
        // treat that link as Original / Eng Sub instead of forcing Hindi Dubbed!
        if (tHindi && (tHindi.startsWith('http') || tHindi.includes('https://'))) {
          if (isOrigSub && !tOrig) {
            tOrig = tHindi;
            tHindi = '';
          } else if (isFanDub && !tFanDub) {
            tFanDub = tHindi;
            tHindi = '';
          }
        }

        // If general/primary telegram col has link and row specifies audio type
        if (generalTg && (generalTg.startsWith('http') || generalTg.includes('https://'))) {
          if (isOrigSub && !tOrig) {
            tOrig = generalTg;
          } else if (isFanDub && !tFanDub) {
            tFanDub = generalTg;
          } else if (!tHindi && !isOrigSub && !isFanDub) {
            tHindi = generalTg;
          }
        }

        // Parse lead cast
        const parsedCast = castRaw 
          ? castRaw.split(',').map((c) => c.trim()).filter(Boolean)
          : [];

        // Parse hashtags
        const parsedTags = tagsRaw 
          ? tagsRaw.split(/[\s,]+/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
          : [];

        // Check if Movie
        const catLower = categoryRaw.toLowerCase();
        const isFilm = catLower.includes('movie') || catLower.includes('film') || catLower.includes('bolly') || catLower.includes('holly') ||
          Boolean(detailsRaw && (detailsRaw.includes(':') || detailsRaw.toLowerCase().includes('movie')));

        let dramaCategory: DramaCategory = 'K-Drama';
        if (catLower.includes('c-drama') || catLower.includes('chinese')) dramaCategory = 'C-Drama';
        else if (catLower.includes('movie') || catLower.includes('film')) dramaCategory = 'Asian Movies';
        else if (catLower.includes('bolly') || catLower.includes('holly')) dramaCategory = 'Hollywood / Bollywood';
        else if (catLower.includes('j-drama') || catLower.includes('japanese')) dramaCategory = 'J-Drama';
        else if (catLower.includes('sci-fi')) dramaCategory = 'Sci-Fi Series';

        // Check if Trending
        const isTrendingInSheet = foundTrendingTitles.some((t) => {
          return normalizedKey === t || normalizedKey.includes(t) || t.includes(normalizedKey);
        });

        // Determine mapped status
        let dramaStatus: DramaStatus = 'Now Streaming (Ongoing)';
        if (statusRaw.includes('Completed') || statusRaw.includes('Full')) {
          dramaStatus = 'Completed (Full Series)';
        } else if (statusRaw.includes('Coming') || statusRaw.includes('Upcoming')) {
          dramaStatus = 'Coming Soon';
        }

        // Available audios & coming soon audios
        const availableAudios: AudioType[] = [];
        const comingSoonAudios: AudioType[] = [];

        if (tHindi && (tHindi.startsWith('http') || tHindi.includes('https://'))) {
          availableAudios.push('Hindi Dubbed');
        } else if (audioContext.includes('hindi') && !isFanDub && (statusRaw.includes('Coming') || statusRaw.includes('Upcoming') || !tHindi)) {
          comingSoonAudios.push('Hindi Dubbed');
        }

        if (tFanDub && (tFanDub.startsWith('http') || tFanDub.includes('https://'))) {
          availableAudios.push('Fan Dubbed');
        } else if (isFanDub && (statusRaw.includes('Coming') || statusRaw.includes('Upcoming') || !tFanDub)) {
          comingSoonAudios.push('Fan Dubbed');
        }

        if (tOrig && (tOrig.startsWith('http') || tOrig.includes('https://'))) {
          availableAudios.push('Original / Eng Sub');
        } else if (isOrigSub && (statusRaw.includes('Coming') || statusRaw.includes('Upcoming') || !tOrig)) {
          comingSoonAudios.push('Original / Eng Sub');
        }

        // Default primary telegram link & audio
        const defaultAudio: AudioType = availableAudios[0] 
          || (isFanDub ? 'Fan Dubbed' : isOrigSub ? 'Original / Eng Sub' : 'Hindi Dubbed');

        const primaryLink = (defaultAudio === 'Original / Eng Sub' ? tOrig : defaultAudio === 'Fan Dubbed' ? tFanDub : tHindi)
          || tHindi || tFanDub || tOrig || generalTg || 'https://t.me/+yJH68LvfrT9hZDVl';

        const yearMatch = cleanTitle.match(/\b(20\d\d)\b/);
        const releaseYear = yearMatch ? parseInt(yearMatch[1]) : 2026;

        // Parse multi-line or single episode links from all 3 Telegram columns
        const hindiEpisodes = parseTelegramEpisodeLinks(tHindi, 'Hindi Dubbed', dramaId, cleanTitle, isFilm, detailsRaw);
        const fanEpisodes = parseTelegramEpisodeLinks(tFanDub, 'Fan Dubbed', dramaId, cleanTitle, isFilm, detailsRaw);
        const origEpisodes = parseTelegramEpisodeLinks(tOrig, 'Original / Eng Sub', dramaId, cleanTitle, isFilm, detailsRaw);

        const parsedEpisodes = [...hindiEpisodes, ...fanEpisodes, ...origEpisodes];

        // If title already seen in another row (e.g. Merry Berry Love or Four Hands, Two Sonatas):
        if (parsedDramasMap.has(dramaId)) {
          const prev = parsedDramasMap.get(dramaId)!;
          if (tHindi && !prev.telegramHindi) prev.telegramHindi = tHindi;
          if (tFanDub && !prev.telegramFanDub) prev.telegramFanDub = tFanDub;
          if (tOrig && !prev.telegramOrig) prev.telegramOrig = tOrig;
          if (poster && poster.startsWith('http') && !prev.poster.startsWith('http')) {
            prev.poster = poster;
            prev.backdrop = poster;
          }
          if (detailsRaw && !prev.details) prev.details = detailsRaw;
          if (scheduleRaw && !prev.schedule) prev.schedule = scheduleRaw;
          if (statusRaw.includes('Now Streaming') || statusRaw.includes('Ep')) {
            prev.status = 'Now Streaming (Ongoing)';
          }
          availableAudios.forEach((a) => {
            if (!prev.availableAudios.includes(a)) prev.availableAudios.push(a);
            prev.comingSoonAudios = prev.comingSoonAudios?.filter((cs) => cs !== a);
          });
          comingSoonAudios.forEach((cs) => {
            if (!prev.availableAudios.includes(cs) && !prev.comingSoonAudios?.includes(cs)) {
              prev.comingSoonAudios = [...(prev.comingSoonAudios || []), cs];
            }
          });
          if (parsedCast.length > 0) {
            prev.leadCast = Array.from(new Set([...(prev.leadCast || []), ...parsedCast]));
          }
          if (parsedTags.length > 0) {
            prev.hashtags = Array.from(new Set([...(prev.hashtags || []), ...parsedTags]));
          }
          // Merge parsed episodes avoiding duplicates
          const existingEpIds = new Set(prev.episodes.map((e) => e.id));
          parsedEpisodes.forEach((ep) => {
            if (!existingEpIds.has(ep.id)) {
              prev.episodes.push(ep);
              existingEpIds.add(ep.id);
            }
          });
          if (prev.episodes.length > (prev.totalEpisodes || 0)) {
            prev.totalEpisodes = prev.episodes.length;
          }
          continue;
        }

        // Build episodes array (either parsed multi-episodes or clean single/merged episode item)
        const dramaEpisodes: EpisodeItem[] = parsedEpisodes.length > 0
          ? parsedEpisodes
          : [
              {
                id: `ep-${dramaId}-1`,
                episodeNumber: isFilm ? 'Full Movie' : 'Batch / Latest Drop',
                title: isFilm ? `${cleanTitle} (1080p FHD Movie)` : `${cleanTitle} · Master Pack`,
                audio: defaultAudio,
                telegramUrl: primaryLink,
                duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
                quality: '1080p FHD',
                isMerged: !isFilm,
                format: isFilm ? ('movie' as const) : ('merged' as const),
              },
            ];

        const totalEpCount = isFilm 
          ? 1 
          : parsedEpisodes.length > 1 
          ? parsedEpisodes.length 
          : detailsRaw && detailsRaw.match(/(\d+)\s*ep/i) 
          ? parseInt(detailsRaw.match(/(\d+)\s*ep/i)![1]) 
          : 16;

        const item: DramaItem = {
          id: dramaId,
          title: cleanTitle,
          category: dramaCategory,
          releaseYear,
          status: dramaStatus,
          rating: ratingVal || 9.2,
          poster: (poster && poster.startsWith('http')) ? poster : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700',
          backdrop: (poster && poster.startsWith('http')) ? poster : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
          synopsis: synopsisVal || `Watch ${cleanTitle} in high definition on AsiaFlix Prime Private Channel.`,
          cast: parsedCast.length > 0 ? parsedCast : ['AsiaFlix Exclusive'],
          tags: parsedTags.length > 0 ? parsedTags : [dramaCategory, defaultAudio, badgeRaw].filter(Boolean),
          scheduleInfo: scheduleRaw || detailsRaw || '2026 VIP Release',
          availableAudios: availableAudios.length > 0 ? availableAudios : [defaultAudio],
          defaultAudio,
          isFeatured: isTrendingInSheet,
          isTrending: isTrendingInSheet || true,
          isSpotlight: isTrendingInSheet,
          spotlightTag: isTrendingInSheet ? '🔥 TOP TRENDING' : undefined,
          isWeekendLineup: isWeekendRow,
          weekendSlot: isWeekendRow ? 'Sat & Sun Drop' : undefined,
          totalEpisodes: totalEpCount,
          qualityBadge: badgeRaw || '1080p FHD',
          telegramUrl: primaryLink,
          episodes: dramaEpisodes,
          
          // New Google Sheet Fields
          telegramHindi: tHindi,
          telegramFanDub: tFanDub,
          telegramOrig: tOrig,
          details: detailsRaw,
          schedule: scheduleRaw,
          leadCast: parsedCast,
          hashtags: parsedTags,
          isMovie: isFilm,
          comingSoonAudios: comingSoonAudios.length > 0 ? comingSoonAudios : undefined,
        };

        parsedDramasMap.set(dramaId, item);

        if (isBannerRow) {
          parsedHeroBanners.push({
            id: `banner-${dramaId}`,
            title: cleanTitle,
            backdropUrl: item.backdrop,
            posterUrl: item.poster,
            audio: defaultAudio,
            category: dramaCategory,
            releaseYear,
            rating: item.rating,
            scheduleInfo: scheduleRaw || detailsRaw || '1080p FHD',
            synopsis: item.synopsis,
            badge: '🔥 VIP PICK',
            telegramUrl: primaryLink,
            isActive: true,
          });
        }
      }

      if (parsedHeroBanners.length > 0) {
        setHeroBanners((prev) => {
          const bannerIds = new Set(parsedHeroBanners.map((b) => b.id));
          const existingFiltered = prev.filter((b) => !bannerIds.has(b.id));
          return [...parsedHeroBanners, ...existingFiltered];
        });
      }

      const uniqueParsed = Array.from(parsedDramasMap.values());
      if (uniqueParsed.length > 0) {
        mergePreservingCuratedAndCustom(uniqueParsed);
      }

      setSheetSyncState({
        isSyncing: false,
        lastSyncedCount: uniqueParsed.length,
        lastSyncedTime: new Date().toLocaleTimeString(),
      });

      return { success: true, count: uniqueParsed.length };
    } catch (err: any) {
      console.warn('Google Sheets live sync error:', err);
      setSheetSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Sync failed',
      }));
      return { success: false, error: err.message || 'Google Sheet fetch failed.' };
    }
  };

  const handleUpdateGoogleSheetUrl = async (newUrl: string) => {
    setGoogleSheetUrl(newUrl);
    return await fetchGoogleSheetData(newUrl);
  };

  const handleSubscribeDubAlert = (dramaTitle: string, audio: string) => {
    const newNotif: ReleaseNotification = {
      id: `dub-alert-${Date.now()}`,
      title: `🔔 Subscribed to ${dramaTitle}`,
      message: `You are subscribed for ${audio} release alerts. We will ping you the moment links are live on Telegram!`,
      audioType: audio as AudioType,
      timestamp: 'Just now',
      isRead: false,
      type: 'announcement',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // --- WATCHLIST ACTIONS ---
  const handleToggleWatchlist = (drama: DramaItem, newStatus?: WatchlistStatus) => {
    setWatchlist((prev) => {
      const existing = prev.find((w) => w.dramaId === drama.id);
      if (existing) {
        if (newStatus && existing.status !== newStatus) {
          // Update status
          return prev.map((w) => (w.dramaId === drama.id ? { ...w, status: newStatus, lastUpdated: Date.now() } : w));
        }
        // Remove if clicking toggle without specific new status
        return prev.filter((w) => w.dramaId !== drama.id);
      } else {
        // Add new
        return [
          {
            dramaId: drama.id,
            status: newStatus || 'want_to_watch',
            watchedEpisodes: [],
            addedAt: Date.now(),
            lastUpdated: Date.now(),
          },
          ...prev,
        ];
      }
    });
  };

  const handleRemoveFromWatchlist = (dramaId: string) => {
    setWatchlist((prev) => prev.filter((w) => w.dramaId !== dramaId));
  };

  const handleUpdateWatchlistStatus = (dramaId: string, status: WatchlistStatus) => {
    setWatchlist((prev) =>
      prev.map((w) => (w.dramaId === dramaId ? { ...w, status, lastUpdated: Date.now() } : w))
    );
  };

  const handleToggleEpisodeWatched = (dramaId: string, episodeNum: number | string) => {
    setWatchedEpisodesMap((prev) => {
      const currentList = prev[dramaId] || [];
      const isAlready = currentList.includes(episodeNum);
      const updatedList = isAlready
        ? currentList.filter((n) => n !== episodeNum)
        : [...currentList, episodeNum];

      // Also ensure it is in the watchlist as 'watching'
      setWatchlist((wList) => {
        const found = wList.find((w) => w.dramaId === dramaId);
        if (!found) {
          return [
            {
              dramaId,
              status: 'watching',
              watchedEpisodes: updatedList,
              addedAt: Date.now(),
              lastUpdated: Date.now(),
            },
            ...wList,
          ];
        } else {
          return wList.map((w) =>
            w.dramaId === dramaId
              ? {
                  ...w,
                  status: w.status === 'want_to_watch' ? 'watching' : w.status,
                  watchedEpisodes: updatedList,
                  lastUpdated: Date.now(),
                }
              : w
          );
        }
      });

      return {
        ...prev,
        [dramaId]: updatedList,
      };
    });
  };

  const isDramaWatchlisted = (dramaId: string) => {
    return watchlist.some((w) => w.dramaId === dramaId);
  };

  const getDramaWatchlistStatus = (dramaId: string): WatchlistStatus => {
    const item = watchlist.find((w) => w.dramaId === dramaId);
    return item ? item.status : 'want_to_watch';
  };

  // --- NOTIFICATIONS ACTIONS ---
  const handleMarkAllNotifsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleSelectNotification = (notif: ReleaseNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    if (notif.dramaId) {
      const drama = dramas.find((d) => d.id === notif.dramaId);
      if (drama) setSelectedDrama(drama);
    }
  };

  const handleAddNotification = (newNotif: ReleaseNotification) => {
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleAddDrama = (newDrama: DramaItem) => {
    setDramas((prev) => {
      const rest = prev.filter((d) => d.id !== newDrama.id);
      // Sabse Aage at index 0 (#1 priority)
      const updated = [newDrama, ...rest];

      // Update custom storage
      const savedCustom = localStorage.getItem('asiaflix_custom_dramas');
      let customList: DramaItem[] = [];
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          if (Array.isArray(parsed)) customList = parsed;
        } catch (e) {
          console.error(e);
        }
      }
      const updatedCustom = [newDrama, ...customList.filter((d) => d.id !== newDrama.id)];
      localStorage.setItem('asiaflix_custom_dramas', JSON.stringify(updatedCustom));
      localStorage.setItem('asiaflix_curated_dramas_v3', JSON.stringify(updated));
      return updated;
    });
  };

  const handleMoveDramaToFront = (dramaId: string) => {
    setDramas((prev) => {
      const target = prev.find((d) => d.id === dramaId);
      if (!target) return prev;
      const rest = prev.filter((d) => d.id !== dramaId);
      const updatedTarget = {
        ...target,
        isSpotlight: true,
        isTrending: true,
      };
      // Sabse Aage at index 0
      const updated = [updatedTarget, ...rest];
      localStorage.setItem('asiaflix_curated_dramas_v3', JSON.stringify(updated));
      return updated;
    });
  };

  // --- FILTERED DRAMAS ENGINE ---
  const filteredDramas = useMemo(() => {
    const list = dramas.filter((d: DramaItem) => {
      // 1. Search Query (matches Title, Original, Lead Cast, Hashtags, Category, Details)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesOriginal = d.originalTitle?.toLowerCase().includes(q) || false;
        const matchesCast = (d.leadCast || d.cast)?.some((c) => c.toLowerCase().includes(q)) || false;
        const matchesTags = (d.hashtags || d.tags)?.some((t) => t.toLowerCase().includes(q)) || false;
        const matchesCategory = d.category.toLowerCase().includes(q);
        const matchesDetails = d.details?.toLowerCase().includes(q) || false;

        if (!matchesTitle && !matchesOriginal && !matchesCast && !matchesTags && !matchesCategory && !matchesDetails) {
          return false;
        }
      }

      // 2. Audio Filter (Telegram 1: Hindi, Telegram 2: Fan Dub, Telegram 3: Orig)
      if (selectedAudio !== 'all') {
        if (selectedAudio === 'Hindi Dubbed') {
          const hasHindi = Boolean(
            d.telegramHindi ||
            d.availableAudios.some((a) => a.toLowerCase().includes('hindi')) ||
            d.defaultAudio.toLowerCase().includes('hindi') ||
            d.comingSoonAudios?.includes('Hindi Dubbed')
          );
          if (!hasHindi) return false;
        } else if (selectedAudio === 'Fan Dubbed') {
          const hasFan = Boolean(
            d.telegramFanDub ||
            d.availableAudios.some((a) => a.toLowerCase().includes('fan')) ||
            d.defaultAudio.toLowerCase().includes('fan') ||
            d.comingSoonAudios?.includes('Fan Dubbed')
          );
          if (!hasFan) return false;
        } else if (selectedAudio === 'Original / Eng Sub') {
          const hasOrig = Boolean(
            d.telegramOrig ||
            d.availableAudios.some((a) => a.toLowerCase().includes('orig') || a.toLowerCase().includes('sub')) ||
            d.defaultAudio.toLowerCase().includes('orig') ||
            d.comingSoonAudios?.includes('Original / Eng Sub')
          );
          if (!hasOrig) return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'Asian Movies') {
          const isMovie = d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie') || d.isMovie;
          if (!isMovie) return false;
        } else if (selectedCategory === 'Hollywood / Bollywood') {
          const isHollyBolly = d.category === 'Hollywood / Bollywood' || d.category.toLowerCase().includes('bolly') || d.category.toLowerCase().includes('holly');
          if (!isHollyBolly) return false;
        } else if (selectedCategory === 'J-Drama') {
          const isJDrama = d.category === 'J-Drama' || d.category.toLowerCase().includes('japan');
          if (!isJDrama) return false;
        } else if (d.category !== selectedCategory) {
          return false;
        }
      }

      // 4. Release Year Filter
      if (selectedYear !== 'all') {
        if (d.releaseYear.toString() !== selectedYear) {
          return false;
        }
      }

      // 5. Status Filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'Coming Soon') {
          const isComing = d.status.includes('Coming') || d.status.includes('Upcoming') || (d.comingSoonAudios && d.comingSoonAudios.length > 0);
          if (!isComing) return false;
        } else if (selectedStatus === 'Now Streaming (Ongoing)') {
          const isOngoing = d.status.includes('Now Streaming') || d.status.includes('Ongoing') || d.status.includes('Streaming');
          if (!isOngoing) return false;
        } else if (selectedStatus === 'Completed (Full Series)') {
          const isCompleted = d.status.includes('Completed') || d.status.includes('Full');
          if (!isCompleted) return false;
        } else if (d.status !== selectedStatus) {
          return false;
        }
      }

      return true;
    });

    // Guarantee unique IDs across all search and filter views
    const seen = new Set<string>();
    return list.filter((d: DramaItem) => {
      if (!d || !d.id || seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [dramas, searchQuery, selectedAudio, selectedCategory, selectedYear, selectedStatus]);

  // Featured dramas for Hero Carousel (unique by ID)
  const featuredDramas = useMemo(() => {
    const seen = new Set<string>();
    const list = dramas.filter((d) => (d.isFeatured || d.isSpotlight) && !seen.has(d.id) && seen.add(d.id));
    return list.length > 0 ? list : Array.from(new Map(dramas.map((d) => [d.id, d])).values()).slice(0, 4);
  }, [dramas]);

  // Top Trending Spotlight items
  const spotlightDramas = useMemo(() => {
    const seen = new Set<string>();
    const customSpotlights = dramas.filter((d) => d.isSpotlight && !seen.has(d.id) && seen.add(d.id));
    if (customSpotlights.length > 0) return customSpotlights;
    const trendings = dramas.filter((d) => d.isTrending && !seen.has(d.id) && seen.add(d.id));
    if (trendings.length > 0) return trendings.slice(0, 4);
    return dramas.slice(0, 4);
  }, [dramas]);

  // Weekend Mega Lineup items
  const weekendDramas = useMemo(() => {
    const seen = new Set<string>();
    const curated = dramas.filter((d) => d.isWeekendLineup && !seen.has(d.id) && seen.add(d.id));
    if (curated.length > 0) return curated;
    return dramas.filter((d) =>
      (d.scheduleInfo?.toLowerCase().includes('sat') ||
        d.scheduleInfo?.toLowerCase().includes('sun') ||
        d.schedule?.toLowerCase().includes('sat') ||
        d.schedule?.toLowerCase().includes('sun') ||
        d.status.includes('Ongoing')) &&
      !seen.has(d.id) &&
      seen.add(d.id)
    );
  }, [dramas]);

  // Continue Watching dramas
  const continueWatchingDramas = useMemo(() => {
    const watchingIds = watchlist
      .filter((w) => w.status === 'watching' || w.watchedEpisodes.length > 0)
      .map((w) => w.dramaId);
    return dramas.filter((d) => watchingIds.includes(d.id));
  }, [dramas, watchlist]);

  // Recommended for You
  const recommendedDramas = useMemo(() => {
    const preferredGenres = new Set<string>();
    watchlist.forEach((w) => {
      const d = dramas.find((item) => item.id === w.dramaId);
      if (d) {
        d.tags.forEach((t) => preferredGenres.add(t.toLowerCase()));
      }
    });

    if (preferredGenres.size > 0) {
      const recs = dramas.filter((d) => {
        if (watchlist.some((w) => w.dramaId === d.id)) return false;
        return d.tags.some((t) => preferredGenres.has(t.toLowerCase())) || d.rating >= 9.2;
      });
      if (recs.length >= 3) return recs.slice(0, 10);
    }

    return dramas.filter((d) => d.rating >= 9.0).slice(0, 10);
  }, [dramas, watchlist]);

  // Section Collections
  const comingSoonDramas = useMemo(() => dramas.filter((d) => 
    d.status.includes('Coming') || d.status.includes('Upcoming') || (d.comingSoonAudios && d.comingSoonAudios.length > 0)
  ), [dramas]);
  const trendingDramas = useMemo(() => {
    const seen = new Set<string>();
    const curatedTrending = dramas.filter((d) => d.isTrending && !seen.has(d.id) && seen.add(d.id));
    if (curatedTrending.length > 0) return curatedTrending;
    return dramas.filter((d) => (d.status.includes('Ongoing') || d.status.includes('Now Streaming')) && !seen.has(d.id) && seen.add(d.id));
  }, [dramas]);
  const ongoingDramas = useMemo(() => dramas.filter((d) => d.status.includes('Ongoing') || d.status.includes('Now Streaming')), [dramas]);
  const hindiDubbedList = useMemo(() => dramas.filter((d) => 
    Boolean(d.telegramHindi || d.availableAudios.some((a) => a.toLowerCase().includes('hindi')) || d.defaultAudio.toLowerCase().includes('hindi') || d.comingSoonAudios?.includes('Hindi Dubbed'))
  ), [dramas]);
  const fanDubbedList = useMemo(() => dramas.filter((d) => 
    Boolean(d.telegramFanDub || d.availableAudios.some((a) => a.toLowerCase().includes('fan')) || d.defaultAudio.toLowerCase().includes('fan') || d.comingSoonAudios?.includes('Fan Dubbed'))
  ), [dramas]);
  const kdramaList = useMemo(() => dramas.filter((d) => d.category === 'K-Drama'), [dramas]);
  const cdramaList = useMemo(() => dramas.filter((d) => d.category === 'C-Drama'), [dramas]);
  const asianMoviesList = useMemo(() => dramas.filter((d) => 
    d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie') || d.isMovie
  ), [dramas]);
  const hollyBollyList = useMemo(() => dramas.filter((d) => 
    d.category === 'Hollywood / Bollywood' || d.category.toLowerCase().includes('bolly') || d.category.toLowerCase().includes('holly')
  ), [dramas]);
  const completedList = useMemo(() => dramas.filter((d) => d.status.includes('Completed') || d.status.includes('Full')), [dramas]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleFocusSearch = () => {
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex flex-col relative selection:bg-[#e50914] selection:text-white">
      {/* Sakura Petal Floating Canvas */}
      <SakuraCanvas enabled={sakuraEnabled} />

      {/* Top Notice Running Marquee */}
      <MarqueeNotice noticeText={marqueeText} isLiveSynced={true} />

      {/* Audience Instant Push & Telegram Bot Alerts Banner */}
      <AudienceNotificationBanner
        botUsername={telegramBotSettings.botUsername}
        onOpenNotificationsDrawer={() => setIsNotificationsOpen(true)}
      />

      {/* Header / Navbar */}
      <Navbar
        unreadNotifsCount={unreadCount}
        watchlistCount={watchlist.length}
        sakuraEnabled={sakuraEnabled}
        onToggleSakura={() => setSakuraEnabled(!sakuraEnabled)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        onOpenArcade={() => setIsArcadeOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenRequest={() => setIsRequestOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
        logoUrl={customLogoUrl}
        sheetSyncCount={dramas.length}
        isSheetSyncing={sheetSyncState.isSyncing}
        onRefreshSheet={() => fetchGoogleSheetData()}
      />

      {/* Cinematic Hero Banner Carousel */}
      <HeroBanner
        featuredDramas={featuredDramas}
        banners={heroBanners}
        onSelectDrama={(drama) => setSelectedDrama(drama)}
        onToggleWatchlist={handleToggleWatchlist}
        isWatchlisted={isDramaWatchlisted}
        onOpenAdminBanners={() => handleOpenAdminWithTab('banners')}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Top Trending Spotlight Strip */}
      <SpotlightBar
        spotlightDramas={spotlightDramas}
        onSelectDrama={(drama) => setSelectedDrama(drama)}
        onOpenAdminSpotlight={() => handleOpenAdminWithTab('trending')}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Weekend Mega Lineup Special Section */}
      <WeekendMegaLineupSection
        weekendDramas={weekendDramas}
        onSelectDrama={(drama) => setSelectedDrama(drama)}
        onToggleWatchlist={handleToggleWatchlist}
        isWatchlisted={isDramaWatchlisted}
        onOpenAdminWeekend={() => handleOpenAdminWithTab('weekend')}
        announcementText={weekendSettings.announcement}
        timingText={weekendSettings.timing}
        isActive={weekendSettings.isActive}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Catalog Search & Multi-Track Audio Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAudio={selectedAudio}
        onSelectAudio={setSelectedAudio}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        totalFilteredCount={filteredDramas.length}
      />

      {/* MAIN CATALOG CONTENT */}
      <main className="flex-1 pb-16">
        {/* If search query or specific filter is active: show isolated instant search results */}
        {searchQuery.trim() !== '' || selectedAudio !== 'all' || selectedCategory !== 'all' || selectedYear !== 'all' || selectedStatus !== 'all' ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>Filtered Releases</span>
                  <span className="text-xs font-bold text-zinc-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                    {filteredDramas.length} Results
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Matching: {searchQuery ? `"${searchQuery}" · ` : ''}
                  {selectedAudio !== 'all' ? `${selectedAudio} · ` : ''}
                  {selectedCategory !== 'all' ? `${selectedCategory} · ` : ''}
                  {selectedYear !== 'all' ? `Year ${selectedYear} · ` : ''}
                  {selectedStatus !== 'all' ? `${selectedStatus}` : ''}
                </p>
              </div>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAudio('all');
                  setSelectedCategory('all');
                  setSelectedYear('all');
                  setSelectedStatus('all');
                }}
                className="text-xs font-bold text-red-400 hover:text-red-300 underline"
              >
                Reset All Filters
              </button>
            </div>

            {filteredDramas.length === 0 ? (
              <div className="py-20 text-center bg-white/[0.02] border border-white/5 rounded-2xl p-8">
                <p className="text-base font-bold text-zinc-300">No drama or movie found matching your criteria.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Try searching for another title, or click "Request Drama" to ask the admin to upload it to the VIP channel!
                </p>
                <button
                  onClick={() => setIsRequestOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#e50914] text-white text-xs font-black shadow-lg"
                >
                  🎬 Request This Drama Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                {filteredDramas.map((drama, idx) => (
                  <DramaCard
                    key={drama.id}
                    drama={drama}
                    onSelect={(d) => setSelectedDrama(d)}
                    onToggleWatchlist={handleToggleWatchlist}
                    isWatchlisted={isDramaWatchlisted(drama.id)}
                    rank={idx + 1}
                    isTopOne={idx === 0}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* STANDARD CURATED OTT ROWS */
          <div className="space-y-4">
            {/* 1. Continue Watching (if user has active progress) */}
            {continueWatchingDramas.length > 0 && (
              <DramaRow
                id="sec-continue-watching"
                title="Continue Watching"
                subtitle="Pick up where you left off"
                icon="▶️"
                dramas={continueWatchingDramas}
                onSelectDrama={(d) => setSelectedDrama(d)}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
              />
            )}

            {/* 2. Personalized Recommended for You */}
            <DramaRow
              id="sec-recommended"
              title="Recommended for You"
              subtitle="Personalized VIP picks tailored to your taste"
              icon="🎯"
              dramas={recommendedDramas}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 3. Coming Soon & Premieres */}
            <DramaRow
              id="sec-coming-soon"
              title="Coming Soon & Upcoming Premieres"
              subtitle="Upcoming Asian blockbuster premieres for 2026"
              icon="🌸🔥"
              dramas={comingSoonDramas}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 3. Trending Now (Curated VIP Picks) */}
            <DramaRow
              id="sec-trending"
              title="Trending Now (Top VIP Binge Picks)"
              subtitle="Curated popular series with high bit-rate audio"
              icon="🐰🔥"
              dramas={trendingDramas}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 4. Hindi Dubbed Collection (Clean VIP Audio) */}
            {hindiDubbedList.length > 0 && (
              <DramaRow
                id="sec-hindi-dubbed"
                title="Hindi Dubbed Collection (VIP Audio)"
                subtitle="Clean studio dubbing in crystal clear 1080p FHD"
                icon="🔊✨"
                dramas={hindiDubbedList}
                onSelectDrama={(d) => setSelectedDrama(d)}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
              />
            )}

            {/* 5. Fan Dubbed & Special Dubs */}
            {fanDubbedList.length > 0 && (
              <DramaRow
                id="sec-fan-dubbed"
                title="Fan Dubbed & Exclusive Community Dubs"
                subtitle="Community voice projects and fast releases"
                icon="🎙️🌸"
                dramas={fanDubbedList}
                onSelectDrama={(d) => setSelectedDrama(d)}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
              />
            )}

            {/* 6. Ongoing Drops & Latest */}
            <DramaRow
              id="sec-ongoing"
              title="Ongoing Drops & Latest Releases"
              subtitle="Fresh episodes uploaded every Saturday & Sunday 7:00 PM"
              icon="✨🆕"
              dramas={ongoingDramas}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 7. K-Dramas (Korean) */}
            <DramaRow
              id="sec-kdrama"
              title="K-Dramas (Korean)"
              subtitle="Heartwarming romances, thrilling revenge, and comedy in clean Hindi audio"
              icon="🇰🇷🌸"
              dramas={kdramaList}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 7. C-Dramas (Chinese) */}
            <DramaRow
              id="sec-cdrama"
              title="C-Dramas (Chinese)"
              subtitle="Top sweet romance, wuxia, and modern acoustic series"
              icon="🇨🇳✨"
              dramas={cdramaList}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 8. Asian Blockbuster Movies */}
            <DramaRow
              id="sec-asian-movies"
              title="Asian Movies & Blockbusters in Hindi Dubbed 1080p"
              subtitle="Complete full-length cinematic experiences"
              icon="🎬🍿"
              dramas={asianMoviesList.length > 0 ? asianMoviesList : dramas.filter((d) => d.totalEpisodes === 1)}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 9. Hollywood & Bollywood in Hindi Dubbed */}
            <DramaRow
              id="sec-holly-bolly"
              title="Hollywood & Bollywood in Hindi Dubbed"
              subtitle="Epic action and supernatural adventures"
              icon="🍿🎬"
              dramas={hollyBollyList}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />

            {/* 10. Completed Full Series (Binge Ready) */}
            <DramaRow
              id="sec-completed"
              title="Completed Full Series (Binge Ready)"
              subtitle="All episodes available for non-stop weekend marathon"
              icon="🟢✨"
              dramas={completedList}
              onSelectDrama={(d) => setSelectedDrama(d)}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
            />
          </div>
        )}

        {/* Channel Policy & Safety Section */}
        <PolicySafetySection />
      </main>

      {/* Footer */}
      <Footer
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenRequest={() => setIsRequestOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onGoHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onFocusSearch={handleFocusSearch}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        onOpenArcade={() => setIsArcadeOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        watchlistCount={watchlist.length}
      />

      {/* --- MODALS & DRAWERS --- */}

      {/* 1. Drama Detail Modal */}
      {selectedDrama && (
        <DramaDetailModal
          drama={selectedDrama}
          onClose={() => setSelectedDrama(null)}
          onToggleWatchlist={handleToggleWatchlist}
          isWatchlisted={isDramaWatchlisted(selectedDrama.id)}
          watchlistStatus={getDramaWatchlistStatus(selectedDrama.id)}
          watchedEpisodes={watchedEpisodesMap[selectedDrama.id] || []}
          onToggleEpisodeWatched={handleToggleEpisodeWatched}
          onMoveToFront={handleMoveDramaToFront}
          isAdminAuthenticated={isAdminAuthenticated}
          isTopOne={dramas[0]?.id === selectedDrama.id || selectedDrama.spotlightTag === 'TOP #1'}
          onSubscribeDubAlert={handleSubscribeDubAlert}
        />
      )}

      {/* 2. Watchlist Drawer */}
      <WatchlistDrawer
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        watchlist={watchlist}
        allDramas={dramas}
        onSelectDrama={(d) => setSelectedDrama(d)}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
        onUpdateStatus={handleUpdateWatchlistStatus}
        supabaseUser={supabaseUser}
        onUserChange={setSupabaseUser}
      />

      {/* 3. Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotifsAsRead}
        onSelectNotification={handleSelectNotification}
        botUsername={telegramBotSettings.botUsername}
      />

      {/* 4. Request Drama Modal */}
      <RequestDramaModal
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
      />

      {/* 5. Support Desk Modal */}
      <SupportDeskModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        tickets={tickets}
      />

      {/* 6. Arcade Hub Modal */}
      <ArcadeHubModal
        isOpen={isArcadeOpen}
        onClose={() => setIsArcadeOpen(false)}
        dramas={dramas}
        onSelectDrama={(d) => setSelectedDrama(d)}
      />

      {/* 7. Admin Studio Modal */}
      {isAdminOpen && (
        <AdminStudioModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          onForceSync={syncCatalogAndNotifs}
          onAddDrama={handleAddDrama}
          onAddNotification={handleAddNotification}
          onUpdateMarquee={setMarqueeText}
          currentMarquee={marqueeText}
          dramas={dramas}
          onUpdateDramasCuration={handleUpdateDramasCuration}
          weekendSettings={weekendSettings}
          onUpdateWeekendSettings={setWeekendSettings}
          heroBanners={heroBanners}
          onUpdateHeroBanners={setHeroBanners}
          initialTab={adminInitialTab}
          isAuthenticatedParent={isAdminAuthenticated}
          onAuthSuccess={handleAdminAuthSuccess}
          onAuthLogout={handleAdminAuthLogout}
          googleSheetUrl={googleSheetUrl}
          onUpdateGoogleSheetUrl={handleUpdateGoogleSheetUrl}
          telegramBotSettings={telegramBotSettings}
          onUpdateTelegramBotSettings={setTelegramBotSettings}
        />
      )}
    </div>
  );
}
