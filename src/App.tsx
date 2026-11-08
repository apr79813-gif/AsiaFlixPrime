import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DramaItem, EpisodeItem, WatchlistEntry, WatchlistStatus, ReleaseNotification, SupportTicket, AudioType, WeekendSettings, HeroBannerSlide, TelegramBotSettings } from './types/drama';
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
    const savedCurated = localStorage.getItem('asiaflix_curated_dramas_v2');
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
    localStorage.setItem('asiaflix_curated_dramas_v2', JSON.stringify(updatedDramas));
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

  // Merge external items (Supabase / Google Sheets) without ever pushing custom or curated titles down
  const mergePreservingCuratedAndCustom = (incoming: DramaItem[]) => {
    setDramas((prev) => {
      // 1. Get custom dramas from storage
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

      const existingIds = new Set<string>();
      const result: DramaItem[] = [];

      // Custom items ALWAYS at index 0 (sabse pehle)
      customDramas.forEach((c) => {
        if (!existingIds.has(c.id)) {
          result.push(c);
          existingIds.add(c.id);
        }
      });

      // Current in-memory list (which preserves user's move-to-front / curation order)
      prev.forEach((d) => {
        if (!existingIds.has(d.id)) {
          result.push(d);
          existingIds.add(d.id);
        }
      });

      // Any incoming items from Sheet / Supabase appended at the end
      incoming.forEach((item) => {
        if (!existingIds.has(item.id)) {
          result.push(item);
          existingIds.add(item.id);
        }
      });

      localStorage.setItem('asiaflix_curated_dramas_v2', JSON.stringify(result));
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

    // Sheet sync fallback
    await fetchGoogleSheetData();
  };

  // Parse CSV function with robust delimiter and newline support
  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r\n|\r|\n/);
    const rows: string[][] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const row: string[] = [];
      let inQuotes = false;
      let token = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(token.trim());
          token = '';
        } else {
          token += char;
        }
      }
      row.push(token.trim());
      rows.push(row);
    }
    return rows;
  };

  const fetchGoogleSheetData = async (targetUrl?: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    const url = targetUrl || googleSheetUrl || SHEET_CSV_URL;
    try {
      let text = '';
      try {
        const res = await fetch(url);
        if (res.ok) {
          text = await res.text();
        }
      } catch (netErr) {
        console.warn('Network fetch from Google Sheet URL failed, trying local fallback:', netErr);
      }

      // If online sheet failed or returned empty, load the direct catalog asset
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
        return { success: false, error: 'Google Sheet fetch failed and local catalog unavailable.' };
      }

      const rows = parseCSV(text);
      if (rows.length < 2) {
        return { success: false, error: 'Google Sheet khali hai ya koi rows nahi mili.' };
      }

      const header = rows[0].map((h) => h.toLowerCase().trim());
      const titleIdx = header.findIndex((h) => h === 'title' || h.includes('name'));
      const catIdx = header.findIndex((h) => h.includes('category') || h.includes('type'));
      const audioIdx = header.findIndex((h) => h.includes('audio') || h.includes('dub'));
      const posterIdx = header.findIndex((h) => h.includes('poster') || h.includes('image'));

      // 1. Telegram 1: Hindi Dubbed link
      const telegramHindiIdx = header.findIndex((h) => 
        h.includes('telegram (hindi)') || 
        h.includes('telegram 1') || 
        h.includes('telegram1') || 
        h.includes('hindi link') ||
        (h.startsWith('telegram') && !h.includes('2') && !h.includes('3') && !h.includes('fan') && !h.includes('orig'))
      );

      // 2. Telegram 2: Fan Dubbed link
      const telegramFanDubIdx = header.findIndex((h) => 
        h.includes('telegram2') || 
        h.includes('telegram 2') || 
        h.includes('fan dub') || 
        h.includes('fan-dub') || 
        h.includes('fandub')
      );

      // 3. Telegram 3: Original / Eng Sub link
      const telegramOrigIdx = header.findIndex((h) => 
        h.includes('telegram3') || 
        h.includes('telegram 3') || 
        h.includes('orig') || 
        h.includes('eng sub') || 
        h.includes('sub')
      );

      const statusIdx = header.findIndex((h) => h === 'status');
      
      // 4. Details column: Holds episode count / runtime e.g. "16 Episodes", "1:44:00", "2:14:19", "Full Movie"
      const detailsIdx = header.findIndex((h) => h === 'details' || h.includes('detail') || h.includes('runtime') || h.includes('episode count'));
      
      // 5. Schedule column: Holds release day/time schedule e.g. "Sat & Sun 7:00 PM IST" or blank if completed
      const scheduleIdx = header.findIndex((h) => h === 'schedule' || h.includes('shedule') || h.includes('timing'));

      const badgeIdx = header.findIndex((h) => h === 'badge');
      const noticeIdx = header.findIndex((h) => h === 'notice');
      const trendingIdx = header.findIndex((h) => h.includes('spotlight') || (h.includes('trending') && !h.includes('binge') && !h.includes('now')));
      const trendingNowIdx = header.findIndex((h) => h.includes('trending now') || h.includes('binge'));
      const logoIdx = header.findIndex((h) => h === 'logo');
      const bannerIdx = header.findIndex((h) => h.includes('banner') || h.includes('hero'));
      const synopsisIdx = header.findIndex((h) => h.includes('synopsis') || h.includes('desc') || h.includes('plot'));
      const ratingIdx = header.findIndex((h) => h.includes('rating') || h.includes('score'));
      const weekendIdx = header.findIndex((h) => h.includes('weekend') || h.includes('lineup') || h.includes('mega'));

      // Scan all rows for global sheet settings (Notice, Trending list, Logo URL)
      let foundNotice = '';
      let foundTrendingTitles: string[] = [];
      let foundLogoUrl = '';

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!foundNotice && noticeIdx >= 0 && row[noticeIdx]?.trim()) {
          foundNotice = row[noticeIdx].trim();
        }
        if (trendingIdx >= 0 && row[trendingIdx]?.trim()) {
          const splitTitles = row[trendingIdx]
            .split(',')
            .map((t) => t.trim().toLowerCase().replace(/\s*\(\d{4}\)/g, '').replace(/[^a-z0-9]/g, ' ').trim())
            .filter(Boolean);
          foundTrendingTitles.push(...splitTitles);
        }
        if (trendingNowIdx >= 0 && row[trendingNowIdx]?.trim()) {
          const splitNow = row[trendingNowIdx]
            .split(',')
            .map((t) => t.trim().toLowerCase().replace(/\s*\(\d{4}\)/g, '').replace(/[^a-z0-9]/g, ' ').trim())
            .filter(Boolean);
          foundTrendingTitles.push(...splitNow);
        }
        if (!foundLogoUrl && logoIdx >= 0 && row[logoIdx]?.trim()) {
          let rawLogo = row[logoIdx].trim();
          if (rawLogo.includes('github.com') && rawLogo.includes('/blob/')) {
            rawLogo = rawLogo.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
          }
          foundLogoUrl = rawLogo;
        }
      }

      foundTrendingTitles = Array.from(new Set(foundTrendingTitles));

      if (foundNotice) {
        setMarqueeText(foundNotice);
      }
      if (foundLogoUrl) {
        setCustomLogoUrl(foundLogoUrl);
      }

      const parsedDramasMap = new Map<string, DramaItem>();
      const parsedHeroBanners: HeroBannerSlide[] = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const title = row[titleIdx >= 0 ? titleIdx : 0];
        if (!title || !title.trim()) continue;

        const category = row[catIdx >= 0 ? catIdx : 1] || 'K-Drama';
        const audio = (row[audioIdx >= 0 ? audioIdx : 2] || 'Hindi Dubbed') as AudioType;
        const poster = row[posterIdx >= 0 ? posterIdx : 3];

        // 3 Dedicated Telegram Links
        const linkHindi = (telegramHindiIdx >= 0 ? row[telegramHindiIdx]?.trim() : '') || '';
        const linkFanDub = (telegramFanDubIdx >= 0 ? row[telegramFanDubIdx]?.trim() : '') || '';
        const linkOrig = (telegramOrigIdx >= 0 ? row[telegramOrigIdx]?.trim() : '') || '';

        // Fallback primary Telegram link
        const primaryTelegram = (
          (linkHindi && linkHindi.startsWith('http')) ? linkHindi :
          (linkFanDub && linkFanDub.startsWith('http')) ? linkFanDub :
          (linkOrig && linkOrig.startsWith('http')) ? linkOrig :
          (telegramHindiIdx >= 0 && row[telegramHindiIdx]?.trim().startsWith('http')) ? row[telegramHindiIdx].trim() :
          'https://t.me/+yJH68LvfrT9hZDVl'
        );

        const statusRaw = row[statusIdx >= 0 ? statusIdx : 7] || 'Now Streaming (Ongoing)';
        const detailsVal = (detailsIdx >= 0 ? row[detailsIdx]?.trim() : '') || '';
        const scheduleVal = (scheduleIdx >= 0 ? row[scheduleIdx]?.trim() : '') || '';
        const badgeVal = (badgeIdx >= 0 ? row[badgeIdx]?.trim() : '') || '';
        const synopsisVal = (synopsisIdx >= 0 ? row[synopsisIdx]?.trim() : '') || '';
        const ratingVal = ratingIdx >= 0 && row[ratingIdx]?.trim() ? parseFloat(row[ratingIdx]) : 9.3;
        const isBannerRow = bannerIdx >= 0 && (row[bannerIdx]?.trim().toLowerCase() === 'yes' || row[bannerIdx]?.trim().toLowerCase() === 'true');
        const isWeekendRow = weekendIdx >= 0 && (row[weekendIdx]?.trim().toLowerCase() === 'yes' || row[weekendIdx]?.trim().toLowerCase() === 'true');

        const cleanTitle = title.trim();
        const normalizedTitle = cleanTitle.toLowerCase().replace(/\s*\(\d{4}\)/g, '').replace(/[^a-z0-9]/g, ' ').trim();

        // Check if explicitly featured in Trending column of the sheet
        const isTrendingInSheet = foundTrendingTitles.some((t) => {
          return normalizedTitle === t || normalizedTitle.includes(t) || t.includes(normalizedTitle);
        });

        // Find matching initial drama by title
        const existing = INITIAL_DRAMAS.find((d) => {
          const existingNorm = d.title.toLowerCase().replace(/\s*\(\d{4}\)/g, '').replace(/[^a-z0-9]/g, ' ').trim();
          return existingNorm === normalizedTitle || existingNorm.includes(normalizedTitle) || normalizedTitle.includes(existingNorm);
        });

        const dramaId = existing ? existing.id : `sheet-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        // Determine release year from title or row
        const yearMatch = cleanTitle.match(/\b(20\d\d)\b/);
        const releaseYear = existing?.releaseYear || (yearMatch ? parseInt(yearMatch[1]) : 2026);

        // Map category safely
        let dramaCategory = existing?.category;
        if (!dramaCategory) {
          const catLower = category.toLowerCase();
          if (catLower.includes('c-drama') || catLower.includes('chinese')) dramaCategory = 'C-Drama';
          else if (catLower.includes('movie') || catLower.includes('film')) dramaCategory = 'Asian Movies';
          else if (catLower.includes('bolly') || catLower.includes('holly')) dramaCategory = 'Hollywood / Bollywood';
          else if (catLower.includes('j-drama') || catLower.includes('japanese')) dramaCategory = 'J-Drama';
          else if (catLower.includes('sci-fi')) dramaCategory = 'Sci-Fi Series';
          else dramaCategory = 'K-Drama';
        }

        const effectivePoster = (poster && poster.startsWith('http')) ? poster : existing?.poster || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';

        // Build list of audios for this drama
        const initialAudios: AudioType[] = [];
        if ((linkHindi && linkHindi.startsWith('http')) || audio === 'Hindi Dubbed' || badgeVal.toLowerCase().includes('hindi')) {
          initialAudios.push('Hindi Dubbed');
        }
        if ((linkFanDub && linkFanDub.startsWith('http')) || audio === 'Fan Dubbed' || audio.toLowerCase().includes('fan') || badgeVal.toLowerCase().includes('fan')) {
          initialAudios.push('Fan Dubbed');
        }
        if ((linkOrig && linkOrig.startsWith('http')) || audio.toLowerCase().includes('original') || audio.toLowerCase().includes('eng sub') || badgeVal.toLowerCase().includes('eng sub') || badgeVal.toLowerCase().includes('sub')) {
          initialAudios.push('Original / Eng Sub');
        }
        if (initialAudios.length === 0) {
          initialAudios.push(audio || 'Hindi Dubbed');
        }

        // Determine effective scheduleInfo display string
        let effectiveScheduleInfo = '';
        if (scheduleVal) {
          effectiveScheduleInfo = scheduleVal;
        } else if (detailsVal) {
          effectiveScheduleInfo = detailsVal;
        } else if (statusRaw.includes('Completed')) {
          effectiveScheduleInfo = 'Full Series';
        } else {
          effectiveScheduleInfo = '2026 Drops';
        }

        // Build individual audio episode items for direct access
        const initialEpisodes: EpisodeItem[] = [];

        if (linkHindi && linkHindi.startsWith('http')) {
          initialEpisodes.push({
            id: `ep-${dramaId}-hindi`,
            episodeNumber: 'Telegram 1',
            title: `${cleanTitle} · Hindi Dubbed 1080p`,
            audio: 'Hindi Dubbed',
            telegramUrl: linkHindi,
            duration: detailsVal || '1080p FHD',
            quality: '1080p FHD',
            isMerged: true,
          });
        }
        if (linkFanDub && linkFanDub.startsWith('http')) {
          initialEpisodes.push({
            id: `ep-${dramaId}-fandub`,
            episodeNumber: 'Telegram 2',
            title: `${cleanTitle} · Fan Dubbed 1080p`,
            audio: 'Fan Dubbed',
            telegramUrl: linkFanDub,
            duration: detailsVal || '1080p FHD',
            quality: '1080p FHD',
            isMerged: true,
          });
        }
        if (linkOrig && linkOrig.startsWith('http')) {
          initialEpisodes.push({
            id: `ep-${dramaId}-orig`,
            episodeNumber: 'Telegram 3',
            title: `${cleanTitle} · Original Audio / Eng Sub`,
            audio: 'Original / Eng Sub',
            telegramUrl: linkOrig,
            duration: detailsVal || '1080p FHD',
            quality: '1080p FHD',
            isMerged: true,
          });
        }

        if (initialEpisodes.length === 0) {
          initialEpisodes.push({
            id: `ep-${dramaId}-main`,
            episodeNumber: 'Latest Drop',
            title: `${cleanTitle} · ${audio || 'Hindi Dubbed'}`,
            audio: audio || 'Hindi Dubbed',
            telegramUrl: primaryTelegram,
            duration: detailsVal || scheduleVal || '1080p FHD',
            quality: '1080p FHD',
            isMerged: true,
          });
        }

        if (parsedDramasMap.has(dramaId)) {
          // MERGE multiple audio rows into single drama card to eliminate duplicates
          const existingEntry = parsedDramasMap.get(dramaId)!;

          if (linkHindi && linkHindi.startsWith('http')) {
            existingEntry.telegramHindi = linkHindi;
            if (!existingEntry.availableAudios.includes('Hindi Dubbed')) {
              existingEntry.availableAudios.push('Hindi Dubbed');
            }
          }
          if (linkFanDub && linkFanDub.startsWith('http')) {
            existingEntry.telegramFanDub = linkFanDub;
            if (!existingEntry.availableAudios.includes('Fan Dubbed')) {
              existingEntry.availableAudios.push('Fan Dubbed');
            }
          }
          if (linkOrig && linkOrig.startsWith('http')) {
            existingEntry.telegramOriginal = linkOrig;
            if (!existingEntry.availableAudios.includes('Original / Eng Sub')) {
              existingEntry.availableAudios.push('Original / Eng Sub');
            }
          }

          if (detailsVal && !existingEntry.details) {
            existingEntry.details = detailsVal;
          }
          if (scheduleVal && !existingEntry.schedule) {
            existingEntry.schedule = scheduleVal;
            existingEntry.scheduleInfo = scheduleVal;
          }

          if (poster && poster.startsWith('http') && (!existingEntry.poster || existingEntry.poster.includes('unsplash'))) {
            existingEntry.poster = poster;
            existingEntry.backdrop = poster;
          }

          initialEpisodes.forEach((newEp) => {
            const epExists = existingEntry.episodes.some((e) => e.telegramUrl === newEp.telegramUrl && e.audio === newEp.audio);
            if (!epExists) {
              existingEntry.episodes.push(newEp);
            }
          });

          continue;
        }

        parsedDramasMap.set(dramaId, {
          id: dramaId,
          title: cleanTitle,
          originalTitle: existing?.originalTitle,
          category: dramaCategory,
          releaseYear,
          status: (statusRaw.includes('Completed') ? 'Completed (Full Series)' : statusRaw.includes('Coming') || statusRaw.includes('Upcoming') ? 'Coming Soon' : 'Now Streaming (Ongoing)'),
          rating: ratingVal || existing?.rating || 9.2,
          poster: effectivePoster,
          backdrop: existing?.backdrop || effectivePoster,
          synopsis: synopsisVal || existing?.synopsis || `Stream ${cleanTitle} in clean audio on AsiaFlix Prime Private Channel.`,
          cast: existing?.cast || ['AsiaFlix Exclusive'],
          tags: existing?.tags || ['Asian Drama', audio, badgeVal].filter(Boolean),
          details: detailsVal || existing?.details || '16 Episodes',
          schedule: scheduleVal || existing?.schedule || '',
          scheduleInfo: effectiveScheduleInfo,
          availableAudios: existing?.availableAudios ? Array.from(new Set([...existing.availableAudios, ...initialAudios])) : initialAudios,
          defaultAudio: (linkHindi ? 'Hindi Dubbed' : linkFanDub ? 'Fan Dubbed' : linkOrig ? 'Original / Eng Sub' : audio) || 'Hindi Dubbed',
          isFeatured: isTrendingInSheet || existing?.isFeatured || false,
          isTrending: isTrendingInSheet || existing?.isTrending || true,
          isSpotlight: isTrendingInSheet || existing?.isSpotlight || false,
          spotlightTag: isTrendingInSheet ? '🔥 TOP TRENDING' : existing?.spotlightTag,
          isWeekendLineup: isWeekendRow || existing?.isWeekendLineup || false,
          weekendSlot: isWeekendRow ? 'Saturday Drop - 7:00 PM' : existing?.weekendSlot,
          totalEpisodes: existing?.totalEpisodes || 16,
          qualityBadge: badgeVal || '1080p FHD',
          telegramUrl: primaryTelegram,
          telegramHindi: linkHindi || (audio === 'Hindi Dubbed' ? primaryTelegram : undefined),
          telegramFanDub: linkFanDub || (audio === 'Fan Dubbed' ? primaryTelegram : undefined),
          telegramOriginal: linkOrig || (audio.includes('Original') ? primaryTelegram : undefined),
          episodes: existing?.episodes && existing.episodes.length > 2 ? existing.episodes : initialEpisodes,
        });

        if (isBannerRow) {
          parsedHeroBanners.push({
            id: `banner-${dramaId}`,
            title: cleanTitle,
            backdropUrl: effectivePoster,
            posterUrl: effectivePoster,
            audio,
            category: dramaCategory,
            releaseYear,
            rating: ratingVal || 9.8,
            scheduleInfo: effectiveScheduleInfo || '1080p FHD',
            synopsis: synopsisVal || `Watch ${cleanTitle} exclusively on AsiaFlix Prime.`,
            badge: '🔥 VIP PICK',
            telegramUrl: primaryTelegram,
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

      // Ensure all rich initial dramas are also included if not in sheet
      INITIAL_DRAMAS.forEach((initial) => {
        if (!parsedDramasMap.has(initial.id)) {
          parsedDramasMap.set(initial.id, initial);
        }
      });

      const uniqueParsed = Array.from(parsedDramasMap.values());
      if (uniqueParsed.length > 0) {
        mergePreservingCuratedAndCustom(uniqueParsed);
      }

      return { success: true, count: parsedDramasMap.size };
    } catch (err: any) {
      console.warn('Google Sheets live sync notice: using verified catalog cache', err);
      return { success: false, error: err.message || 'Google Sheet fetch failed.' };
    }
  };

  const handleUpdateGoogleSheetUrl = async (newUrl: string) => {
    setGoogleSheetUrl(newUrl);
    return await fetchGoogleSheetData(newUrl);
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
      localStorage.setItem('asiaflix_curated_dramas_v2', JSON.stringify(updated));
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
      localStorage.setItem('asiaflix_curated_dramas_v2', JSON.stringify(updated));
      return updated;
    });
  };

  // --- FILTERED DRAMAS ENGINE ---
  const filteredDramas = useMemo(() => {
    const list = dramas.filter((d: DramaItem) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesOriginal = d.originalTitle?.toLowerCase().includes(q) || false;
        const matchesCast = d.cast?.some((c) => c.toLowerCase().includes(q)) || false;
        const matchesTags = d.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        if (!matchesTitle && !matchesOriginal && !matchesCast && !matchesTags) {
          return false;
        }
      }

      // 2. Audio Filter
      if (selectedAudio !== 'all') {
        const hasAudio = d.availableAudios.some((a) => a.toLowerCase().includes(selectedAudio.toLowerCase()));
        if (!hasAudio && !d.defaultAudio.toLowerCase().includes(selectedAudio.toLowerCase())) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== 'all') {
        if (d.category !== selectedCategory) {
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
        if (d.status !== selectedStatus) {
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

  // Top Trending Spotlight items (strictly honors user's isSpotlight curation)
  const spotlightDramas = useMemo(() => {
    const seen = new Set<string>();
    const customSpotlights = dramas.filter((d) => d.isSpotlight && !seen.has(d.id) && seen.add(d.id));
    if (customSpotlights.length > 0) return customSpotlights;
    const trendings = dramas.filter((d) => d.isTrending && !seen.has(d.id) && seen.add(d.id));
    if (trendings.length > 0) return trendings.slice(0, 4);
    return dramas.slice(0, 4);
  }, [dramas]);

  // Weekend Mega Lineup items (strictly honors user's isWeekendLineup curation)
  const weekendDramas = useMemo(() => {
    const seen = new Set<string>();
    const curated = dramas.filter((d) => d.isWeekendLineup && !seen.has(d.id) && seen.add(d.id));
    if (curated.length > 0) return curated;
    return dramas.filter((d) =>
      (d.scheduleInfo?.toLowerCase().includes('sat') ||
        d.scheduleInfo?.toLowerCase().includes('sun') ||
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

  // Recommended for You (Smart suggestion engine)
  const recommendedDramas = useMemo(() => {
    // If user has watchlist entries, suggest similar genres
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

    // Default top rated Hindi Dubbed recommendation
    return dramas.filter((d) => d.rating >= 9.0).slice(0, 10);
  }, [dramas, watchlist]);

  // Section Collections
  const comingSoonDramas = useMemo(() => dramas.filter((d) => d.status.includes('Coming Soon')), [dramas]);
  const trendingDramas = useMemo(() => {
    const seen = new Set<string>();
    const curatedTrending = dramas.filter((d) => d.isTrending && !seen.has(d.id) && seen.add(d.id));
    if (curatedTrending.length > 0) return curatedTrending;
    return dramas.filter((d) => d.status.includes('Ongoing') && !seen.has(d.id) && seen.add(d.id));
  }, [dramas]);
  const ongoingDramas = useMemo(() => dramas.filter((d) => d.status.includes('Ongoing')), [dramas]);
  const hindiDubbedList = useMemo(() => dramas.filter((d) => d.availableAudios.some((a) => a.toLowerCase().includes('hindi'))), [dramas]);
  const fanDubbedList = useMemo(() => dramas.filter((d) => d.availableAudios.some((a) => a.toLowerCase().includes('fan'))), [dramas]);
  const kdramaList = useMemo(() => dramas.filter((d) => d.category === 'K-Drama'), [dramas]);
  const cdramaList = useMemo(() => dramas.filter((d) => d.category === 'C-Drama'), [dramas]);
  const asianMoviesList = useMemo(() => dramas.filter((d) => d.category === 'Asian Movies'), [dramas]);
  const hollyBollyList = useMemo(() => dramas.filter((d) => d.category === 'Hollywood / Bollywood'), [dramas]);
  const completedList = useMemo(() => dramas.filter((d) => d.status.includes('Completed')), [dramas]);

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
