import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DramaItem, EpisodeItem, WatchlistEntry, WatchlistStatus, ReleaseNotification, SupportTicket, AudioType, DramaCategory, DramaStatus, WeekendSettings, HeroBannerSlide, TelegramBotSettings } from './types/drama';
import { INITIAL_DRAMAS, INITIAL_NOTIFICATIONS, INITIAL_TICKETS, INITIAL_HERO_BANNERS } from './data/initialCatalog';
import { SakuraCanvas } from './components/SakuraCanvas';
import { MarqueeNotice } from './components/MarqueeNotice';
import { AudienceNotificationBanner } from './components/AudienceNotificationBanner';
import { Navbar } from './components/Navbar';
import { Home, Search, X, Play, Star, Clock, Film } from 'lucide-react';
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
import { Footer } from './components/Footer';
import { LiveToastNotification } from './components/LiveToastNotification';
import { 
  fetchDramasFromSupabase, 
  fetchNotificationsFromSupabase, 
  insertNotificationIntoSupabase,
  fetchSheetSnapshotFromSupabase,
  saveSheetSnapshotToSupabase,
  syncUserAccountWithSupabase,
  saveUserWatchlistToSupabase,
  getActiveSupabaseUser 
} from './services/supabaseService';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1uz-4QI_K5VGhWeqgx32jZnZffaB0oTGCpbS9hmxEN8U/export?format=csv&gid=0";

export default function App() {
  // --- GOOGLE SHEETS DYNAMIC URL STATE ---
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    return localStorage.getItem('asiaflix_google_sheet_url_v4') || SHEET_CSV_URL;
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

    // 2. Load curated dramas from v4 cache
    const savedCurated = localStorage.getItem('asiaflix_curated_dramas_v4');
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

    // Website catalog comes 100% from Google Sheet rows (do not fallback to INITIAL_DRAMAS)
    return customList;
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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }
    return [];
  });

  // --- FLOATING LIVE PUSH NOTIFICATION TOAST POPUP STATE ---
  const [activeToastNotif, setActiveToastNotif] = useState<ReleaseNotification | null>(null);

  // --- WATCHLIST STATE (CLEAN & CLOUD-SYNCABLE) ---
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => {
    const saved = localStorage.getItem('asiaflix_watchlist_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing watchlist:', e);
      }
    }
    return [];
  });

  // --- WATCHED EPISODES MAPPING (dramaId -> array of episodeNumber) ---
  const [watchedEpisodesMap, setWatchedEpisodesMap] = useState<Record<string, (number | string)[]>>(() => {
    const saved = localStorage.getItem('asiaflix_watched_episodes_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
        console.error('Error parsing watched episodes:', e);
      }
    }
    return {};
  });

  // --- SUPABASE & CLOUD USER ACCOUNT STATE ---
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; email: string } | null>(() => {
    const saved = localStorage.getItem('asiaflix_logged_in_user_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      } catch {}
    }
    return null;
  });

  const handleUserChange = (
    user: any | null,
    cloudWatchlist?: WatchlistEntry[],
    cloudWatchedEpisodesMap?: Record<string, (number | string)[]>
  ) => {
    setSupabaseUser(user);
    if (user && user.email) {
      localStorage.setItem('asiaflix_logged_in_user_v1', JSON.stringify(user));
      if (cloudWatchlist && cloudWatchlist.length > 0) {
        setWatchlist(cloudWatchlist);
      }
      if (cloudWatchedEpisodesMap && Object.keys(cloudWatchedEpisodesMap).length > 0) {
        setWatchedEpisodesMap(cloudWatchedEpisodesMap);
      }
    } else {
      localStorage.removeItem('asiaflix_logged_in_user_v1');
    }
  };

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
  const [isInstantSearchOpen, setIsInstantSearchOpen] = useState(false);
  const [instantSearchQuery, setInstantSearchQuery] = useState('');
  const [instantFilter, setInstantFilter] = useState<'All' | 'Hindi Dubbed' | 'Hindi Fan Dubbed' | 'Original / Eng Sub' | 'K-Drama' | 'C-Drama' | 'Movies' | 'Other Series'>('All');
  const [adminInitialTab, setAdminInitialTab] = useState<'trending' | 'weekend' | 'banners' | 'new_drama' | 'broadcast' | 'supabase' | 'security'>('trending');

  // --- HOMEPAGE HERO BANNERS / BACKGROUND POSTERS STATE ---
  const [heroBanners, setHeroBanners] = useState<HeroBannerSlide[]>(() => {
    const saved = localStorage.getItem('asiaflix_hero_banners_v5');
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
    return [];
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
    localStorage.setItem('asiaflix_curated_dramas_v4', JSON.stringify(updatedDramas));
  };

  // Persistent storage effects
  useEffect(() => {
    localStorage.setItem('asiaflix_hero_banners_v5', JSON.stringify(heroBanners));
  }, [heroBanners]);

  useEffect(() => {
    localStorage.setItem('asiaflix_weekend_settings_v2', JSON.stringify(weekendSettings));
    if (weekendSettings.noticeText) {
      setMarqueeText(weekendSettings.noticeText);
    }
  }, [weekendSettings]);

  useEffect(() => {
    localStorage.setItem('asiaflix_watchlist_v3', JSON.stringify(watchlist));
    if (supabaseUser?.email) {
      saveUserWatchlistToSupabase(supabaseUser.email, watchlist, watchedEpisodesMap);
    }
  }, [watchlist, supabaseUser?.email]);

  useEffect(() => {
    localStorage.setItem('asiaflix_watched_episodes_v3', JSON.stringify(watchedEpisodesMap));
    if (supabaseUser?.email) {
      saveUserWatchlistToSupabase(supabaseUser.email, watchlist, watchedEpisodesMap);
    }
  }, [watchedEpisodesMap, supabaseUser?.email]);

  useEffect(() => {
    localStorage.setItem('asiaflix_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('asiaflix_google_sheet_url_v4', googleSheetUrl);
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

  // Force 100% exact Laptop layout on phones & small screens (1360px proportional scaling)
  useEffect(() => {
    const applyDesktopScale = () => {
      document.body.style.minWidth = '1360px';
      if (window.innerWidth < 1360) {
        const scale = window.innerWidth / 1360;
        (document.documentElement.style as any).zoom = String(scale);
      } else {
        (document.documentElement.style as any).zoom = '1';
      }
    };

    applyDesktopScale();
    window.addEventListener('resize', applyDesktopScale);
    return () => {
      window.removeEventListener('resize', applyDesktopScale);
      document.body.style.minWidth = '';
      (document.documentElement.style as any).zoom = '1';
    };
  }, []);

  // Initial sync: Restore cloud watchlist if user is logged in, then sync catalog & notifications
  useEffect(() => {
    const savedUserStr = localStorage.getItem('asiaflix_logged_in_user_v1');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.email) {
          syncUserAccountWithSupabase(savedUser.email, undefined, 'fetch').then((res) => {
            if (res.success) {
              if (res.watchlist && res.watchlist.length > 0) {
                setWatchlist(res.watchlist);
              }
              if (res.watchedEpisodesMap && Object.keys(res.watchedEpisodesMap).length > 0) {
                setWatchedEpisodesMap(res.watchedEpisodesMap);
              }
            }
          });
        }
      } catch (e) {
        console.warn('Error restoring user session:', e);
      }
    } else {
      // Also check native Supabase auth session if present
      getActiveSupabaseUser().then((u) => {
        if (u && u.email) {
          const userObj = { id: u.id, email: u.email };
          setSupabaseUser(userObj);
          localStorage.setItem('asiaflix_logged_in_user_v1', JSON.stringify(userObj));
        }
      });
    }

    syncCatalogAndNotifs();
  }, []);

  // Auto-trigger live toast for fresh notification 2.5s after page load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notifications.length > 0) {
        const lastToastId = sessionStorage.getItem('asiaflix_last_toast_id');
        const latestNotif = notifications[0];
        if (latestNotif && latestNotif.id !== lastToastId) {
          sessionStorage.setItem('asiaflix_last_toast_id', latestNotif.id);
          setActiveToastNotif(latestNotif);
        }
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [notifications]);

  // Background live sync: silently poll Google Sheet and Supabase notifications every 45 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchGoogleSheetData();
    }, 45000);
    return () => clearInterval(pollInterval);
  }, []);

  // --- GOOGLE SHEET SYNC STATE ---
  const [sheetSyncState, setSheetSyncState] = useState<{
    isSyncing: boolean;
    lastSyncedCount: number;
    lastSyncedTime: string;
    error?: string;
  }>(() => ({
    isSyncing: false,
    lastSyncedCount: 0,
    lastSyncedTime: 'Ready',
  }));

  // Merge external items (Google Sheets):
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

      localStorage.setItem('asiaflix_curated_dramas_v4', JSON.stringify(result));
      return result;
    });
  };

  const syncCatalogAndNotifs = async () => {
    try {
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
      console.warn('Supabase notifications sync caught:', e);
    }

    // Direct Sheet sync with cache busting - website catalog comes 100% from Google Sheet
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

    const audioLabel = audio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : audio;

    const episodes: EpisodeItem[] = [];

    rawLines.forEach((line, idx) => {
      const urlMatch = line.match(/https?:\/\/[^\s"',]+/);
      if (!urlMatch) return;
      const url = urlMatch[0];

      // Match explicit episode range or episode number (e.g. "Ep 1-3", "Episodes 7-10", "Ep 4", "Part 2", "E05")
      const rangeMatch = line.match(/(?:ep|episode|part|e)\s*[:=\.\-]?\s*(\d+\s*-\s*\d+)/i) ||
                         line.match(/^(\d+\s*-\s*\d+)\s*[:=\.\-]/);
      const singleMatch = line.match(/(?:ep|episode|part|e)\s*[:=\.\-]?\s*(\d+)/i) || 
                          line.match(/^(\d+)\s*[:=\.\-]/);

      if (rangeMatch) {
        const epRange = rangeMatch[1].replace(/\s+/g, '');
        episodes.push({
          id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${epRange}`,
          episodeNumber: epRange,
          title: `${cleanTitle} — Episodes ${epRange} (${audioLabel})`,
          audio,
          telegramUrl: url,
          duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
          quality: '1080p FHD',
          isMerged: true,
          format: 'merged',
        });
      } else if (singleMatch) {
        const epNum = parseInt(singleMatch[1], 10);
        episodes.push({
          id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${epNum}`,
          episodeNumber: epNum,
          title: isFilm ? `${cleanTitle} (1080p FHD Movie)` : `${cleanTitle} — Episode ${epNum} (${audioLabel})`,
          audio,
          telegramUrl: url,
          duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
          quality: '1080p FHD',
          isMerged: false,
          format: isFilm ? 'movie' : 'single',
        });
      } else {
        // Direct link without explicit Ep label (e.g. "https://t.me/c/...") -> Master Pack / Full Series / Movie
        const isMulti = rawLines.length > 1;
        const fallbackEp = isFilm ? 'Full Movie' : isMulti ? (idx + 1) : 'Full Series Batch';
        episodes.push({
          id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${isMulti ? idx + 1 : 'batch'}`,
          episodeNumber: fallbackEp,
          title: isFilm
            ? `${cleanTitle} (1080p FHD Movie)`
            : isMulti
            ? `${cleanTitle} — Episode ${idx + 1} (${audioLabel})`
            : `${cleanTitle} — Full Series Batch (${audioLabel})`,
          audio,
          telegramUrl: url,
          duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
          quality: '1080p FHD',
          isMerged: !isFilm,
          format: isFilm ? 'movie' : isMulti ? 'single' : 'merged',
        });
      }
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

      // Find header row dynamically (by looking for the row where a cell equals 'title')
      let headerRowIdx = rows.findIndex((row) => row.some((cell) => cell.trim().toLowerCase() === 'title'));
      if (headerRowIdx === -1) headerRowIdx = 0;
      const header = rows[headerRowIdx].map((h) => h.toLowerCase().trim());
      
      const titleIdx = header.findIndex((h) => h === 'title' || h === 'name');
      const catIdx = header.findIndex((h) => h === 'category');
      const ageRatingIdx = header.findIndex((h) => h.includes('age'));
      const posterIdx = header.findIndex((h) => h.includes('poster') || h.includes('image'));
      const subCategoryIdx = header.findIndex((h) => h.includes('sub-category') || h.includes('sub category') || h.includes('sub-genre') || h.includes('content type'));
      const synopsisIdx = header.findIndex((h) => h.includes('synopsis') || h.includes('desc') || h.includes('plot'));
      const castIdx = header.findIndex((h) => h.includes('lead cast') || h.includes('cast') || h.includes('actor'));
      const ratingIdx = header.findIndex((h) => h === 'rating' || h === 'score');
      const tagsIdx = header.findIndex((h) => h.includes('hashtag') || h.includes('hastag') || h.includes('tags'));
      const detailsIdx = header.findIndex((h) => h === 'details' || h.includes('detail'));
      
      // Telegram 1, 2, 3 indices
      const telegramHindiIdx = header.findIndex((h) => h.includes('telegram 1') || h.includes('telegram1') || h === 't1' || h.includes('hindi'));
      const telegramFanDubIdx = header.findIndex((h) => h.includes('telegram 2') || h.includes('telegram2') || h === 't2' || h.includes('fan'));
      const telegramOrigIdx = header.findIndex((h) => h.includes('telegram 3') || h.includes('telegram3') || h === 't3' || h.includes('orig'));
      
      const scheduleIdx = header.findIndex((h) => h.includes('schedule') || h.includes('shedule'));
      const statusIdx = header.findIndex((h) => h === 'status' || h.includes('status'));
      const bannerIdx = header.findIndex((h) => h.includes('hero banner') || h.includes('banner'));
      const noticeIdx = header.findIndex((h) => h.includes('notice'));
      const trendingIdx = header.findIndex((h) => h.includes('top trending') || h.includes('trending now') || h.includes('trending'));
      const logoIdx = header.findIndex((h) => h.includes('logo'));
      const weekendIdx = header.findIndex((h) => h.includes('weekend') || h.includes('lineup') || h.includes('mega'));

      // Global sheet settings (Notice, Trending list, Logo URL)
      let foundNotice = '';
      let foundTrendingTitles: string[] = [];
      let foundLogoUrl = '';

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
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
            rawLogo = "https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png";
          }
          foundLogoUrl = rawLogo;
        }
      }

      if (foundNotice) setMarqueeText(foundNotice);
      if (foundLogoUrl) setCustomLogoUrl(foundLogoUrl);

      const parsedDramasMap = new Map<string, DramaItem>();
      const parsedHeroBanners: HeroBannerSlide[] = [];

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        const title = row[titleIdx >= 0 ? titleIdx : 0];
        if (!title || !title.trim()) continue;

        const cleanTitle = title.trim();
        const normalizedKey = cleanTitle.toLowerCase().replace(/\s*\(\d{4}\)/g, '').replace(/[^a-z0-9]/g, ' ').trim();
        const dramaId = `sheet-${normalizedKey.replace(/\s+/g, '-')}`;

        // Extract Telegram 1, 2, 3
        const tHindi = telegramHindiIdx >= 0 ? row[telegramHindiIdx]?.trim() || '' : '';
        const tFanDub = telegramFanDubIdx >= 0 ? row[telegramFanDubIdx]?.trim() || '' : '';
        const tOrig = telegramOrigIdx >= 0 ? row[telegramOrigIdx]?.trim() || '' : '';

        const hasHindiHttp = Boolean(tHindi && (tHindi.startsWith('http') || tHindi.includes('http')));
        const hasFanDubHttp = Boolean(tFanDub && (tFanDub.startsWith('http') || tFanDub.includes('http')));
        const hasOrigHttp = Boolean(tOrig && (tOrig.startsWith('http') || tOrig.includes('http')));

        const isComingSoonPattern = /coming\s*soon|upcoming|soon/i;
        const isHindiComingSoon = !hasHindiHttp && isComingSoonPattern.test(tHindi);
        const isFanDubComingSoon = !hasFanDubHttp && isComingSoonPattern.test(tFanDub);
        const isOrigComingSoon = !hasOrigHttp && isComingSoonPattern.test(tOrig);

        const hasAnyHttp = hasHindiHttp || hasFanDubHttp || hasOrigHttp;
        const hasAnyComingSoon = isHindiComingSoon || isFanDubComingSoon || isOrigComingSoon;

        // Skip row if ALL THREE have neither http nor coming soon
        if (!hasAnyHttp && !hasAnyComingSoon) {
          continue;
        }

        // Track comingSoonAudios
        const comingSoonAudios: AudioType[] = [];
        if (isHindiComingSoon) comingSoonAudios.push('Hindi Dubbed');
        if (isFanDubComingSoon) comingSoonAudios.push('Hindi Fan Dubbed');
        if (isOrigComingSoon) comingSoonAudios.push('Original / Eng Sub');

        const categoryRaw = catIdx >= 0 ? row[catIdx]?.trim() || 'K-Drama' : 'K-Drama';
        const ageRating = ageRatingIdx >= 0 ? row[ageRatingIdx]?.trim() || '' : '';
        const poster = posterIdx >= 0 ? row[posterIdx]?.trim() || '' : '';
        const subCategory = subCategoryIdx >= 0 ? row[subCategoryIdx]?.trim() || '' : '';
        const synopsisVal = synopsisIdx >= 0 ? row[synopsisIdx]?.trim() || '' : '';
        const castRaw = castIdx >= 0 ? row[castIdx]?.trim() || '' : '';
        const ratingVal = ratingIdx >= 0 && row[ratingIdx]?.trim() ? parseFloat(row[ratingIdx]) : 9.3;
        const tagsRaw = tagsIdx >= 0 ? row[tagsIdx]?.trim() || '' : '';
        const detailsRaw = detailsIdx >= 0 ? row[detailsIdx]?.trim() || '' : '';
        const scheduleRaw = scheduleIdx >= 0 ? row[scheduleIdx]?.trim() || '' : '';
        
        // STRICT HERO BANNER RULE: Only include if explicitly set to yes, true, 1, or valid image/http URL
        const rawBannerVal = bannerIdx >= 0 ? row[bannerIdx]?.trim().toLowerCase() || '' : '';
        const isBannerRow = rawBannerVal === 'yes' || 
          rawBannerVal === 'true' || 
          rawBannerVal === '1' || 
          rawBannerVal.startsWith('http');

        const isWeekendRow = weekendIdx >= 0 && (row[weekendIdx]?.trim().toLowerCase() === 'yes' || row[weekendIdx]?.trim().toLowerCase() === 'true' || row[weekendIdx]?.trim() === '1');

        // Check if Movie
        const catLower = categoryRaw.toLowerCase();
        const subLower = subCategory.toLowerCase();
        const isFilm = catLower.includes('movie') || catLower.includes('film') || catLower.includes('bolly') || catLower.includes('holly') ||
          subLower.includes('movie') || subLower.includes('film') ||
          Boolean(detailsRaw && detailsRaw.includes(':') && !detailsRaw.toLowerCase().includes('ep'));

        let dramaCategory: DramaCategory = 'K-Drama';
        if (catLower.includes('c-drama') || catLower.includes('chinese')) dramaCategory = 'C-Drama';
        else if (catLower.includes('movie') || catLower.includes('film')) dramaCategory = 'Asian Movies';
        else if (catLower.includes('bolly') || catLower.includes('holly')) dramaCategory = 'Hollywood / Bollywood';
        else if (catLower.includes('k-drama') || catLower.includes('korean')) dramaCategory = 'K-Drama';
        else dramaCategory = 'Other Series';

        // Preserve specific label (like J-Drama, Thai Drama) in subCategory if not explicitly given
        const effectiveSubCategory = subCategory || (
          catLower.includes('j-drama') || catLower.includes('japan')
            ? 'J-Drama'
            : catLower.includes('thai') || catLower.includes('t-drama')
            ? 'Thai Drama'
            : categoryRaw && !['K-Drama', 'C-Drama', 'Other Series'].includes(categoryRaw)
            ? categoryRaw
            : ''
        );

        // Parse lead cast
        const parsedCast = castRaw 
          ? castRaw.split(',').map((c) => c.trim()).filter(Boolean)
          : [];

        // Parse hashtags
        const parsedTags = tagsRaw 
          ? tagsRaw.split(/[\s,]+/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
          : [];

        // Check if Trending
        const isTrendingInSheet = foundTrendingTitles.some((t) => {
          return normalizedKey === t || normalizedKey.includes(t) || t.includes(normalizedKey);
        });

        // Available audios strictly from which of T1, T2, T3 have http links
        const availableAudios: AudioType[] = [];
        if (hasHindiHttp) availableAudios.push('Hindi Dubbed');
        if (hasFanDubHttp) availableAudios.push('Hindi Fan Dubbed');
        if (hasOrigHttp) availableAudios.push('Original / Eng Sub');

        const defaultAudio: AudioType = availableAudios[0] || (comingSoonAudios[0] ? comingSoonAudios[0] : 'Hindi Dubbed');

        const extractFirstUrl = (text: string) => {
          const m = text.match(/https?:\/\/[^\s"',]+/);
          return m ? m[0] : text;
        };

        const primaryLink = hasHindiHttp
          ? extractFirstUrl(tHindi)
          : hasFanDubHttp
          ? extractFirstUrl(tFanDub)
          : hasOrigHttp
          ? extractFirstUrl(tOrig)
          : 'https://t.me/+yJH68LvfrT9hZDVl';

        const yearMatch = cleanTitle.match(/\b(20\d\d)\b/);
        const releaseYear = yearMatch ? parseInt(yearMatch[1], 10) : 2026;

        // Parse multi-line or single episode links from all 3 Telegram columns
        const hindiEpisodes = hasHindiHttp ? parseTelegramEpisodeLinks(tHindi, 'Hindi Dubbed', dramaId, cleanTitle, isFilm, detailsRaw) : [];
        const fanEpisodes = hasFanDubHttp ? parseTelegramEpisodeLinks(tFanDub, 'Hindi Fan Dubbed', dramaId, cleanTitle, isFilm, detailsRaw) : [];
        const origEpisodes = hasOrigHttp ? parseTelegramEpisodeLinks(tOrig, 'Original / Eng Sub', dramaId, cleanTitle, isFilm, detailsRaw) : [];

        const parsedEpisodes = [...hindiEpisodes, ...fanEpisodes, ...origEpisodes];

        // Parse total planned episodes from Details (e.g. "10 Episodes" -> 10, "24 Episodes" -> 24)
        let plannedTotal = 0;
        if (detailsRaw) {
          const m = detailsRaw.match(/(\d+)\s*(?:ep|episode)/i) || detailsRaw.match(/(\d+)/);
          if (m) plannedTotal = parseInt(m[1], 10);
        }

        // Find highest uploaded episode number and explicit episode tags
        let maxUploadedEp = 0;
        let hasExplicitEpNumbers = false;
        let hasSingleFullPack = false;

        parsedEpisodes.forEach((ep) => {
          if (typeof ep.episodeNumber === 'number') {
            hasExplicitEpNumbers = true;
            if (ep.episodeNumber > maxUploadedEp) maxUploadedEp = ep.episodeNumber;
          } else if (typeof ep.episodeNumber === 'string') {
            const rangeParts = ep.episodeNumber.match(/(\d+)\s*-\s*(\d+)/);
            if (rangeParts) {
              hasExplicitEpNumbers = true;
              const endNum = parseInt(rangeParts[2], 10);
              if (endNum > maxUploadedEp) maxUploadedEp = endNum;
            } else {
              const singleInStr = ep.episodeNumber.match(/(\d+)/);
              if (singleInStr) {
                hasExplicitEpNumbers = true;
                const n = parseInt(singleInStr[1], 10);
                if (n > maxUploadedEp) maxUploadedEp = n;
              } else {
                hasSingleFullPack = true;
              }
            }
          }
        });

        // AUTOMATIC STATUS DETECTION (Requirement 3):
        // Single direct pack links (without explicit Ep tags) or full series links -> Completed (Full Series)
        let dramaStatus: DramaStatus = 'Completed (Full Series)';
        let statusText = isFilm ? 'Completed (Full Movie)' : 'Completed (Full Series)';

        if (!hasAnyHttp && hasAnyComingSoon) {
          dramaStatus = 'Coming Soon';
          statusText = 'Coming Soon';
        } else if (isFilm) {
          dramaStatus = 'Completed (Full Series)';
          statusText = 'Completed (Full Movie)';
        } else if (hasExplicitEpNumbers && plannedTotal > 0 && maxUploadedEp < plannedTotal && !hasSingleFullPack) {
          dramaStatus = 'Now Streaming (Ongoing)';
          statusText = `Now Streaming Ep ${maxUploadedEp}`;
        } else if (hasExplicitEpNumbers && plannedTotal === 0 && maxUploadedEp > 0 && !hasSingleFullPack) {
          dramaStatus = 'Now Streaming (Ongoing)';
          statusText = `Now Streaming Ep ${maxUploadedEp}`;
        } else {
          dramaStatus = 'Completed (Full Series)';
          statusText = 'Completed (Full Series)';
        }

        let totalEpCount = plannedTotal > 0 ? plannedTotal : parsedEpisodes.length > 0 ? parsedEpisodes.length : (isFilm ? 1 : 16);

        // If title already seen in another row
        if (parsedDramasMap.has(dramaId)) {
          const prev = parsedDramasMap.get(dramaId)!;
          if (hasHindiHttp && !prev.telegramHindi) prev.telegramHindi = tHindi;
          if (hasFanDubHttp && !prev.telegramFanDub) prev.telegramFanDub = tFanDub;
          if (hasOrigHttp && !prev.telegramOrig) prev.telegramOrig = tOrig;
          if (poster && poster.startsWith('http') && !prev.poster.startsWith('http')) {
            prev.poster = poster;
            prev.backdrop = poster;
          }
          if (detailsRaw && !prev.details) prev.details = detailsRaw;
          if (scheduleRaw && !prev.schedule) prev.schedule = scheduleRaw;
          if (statusText && !prev.statusText) prev.statusText = statusText;
          if (ageRating && !prev.ageRating) prev.ageRating = ageRating;
          if (subCategory && !prev.subCategory) prev.subCategory = subCategory;
          if (dramaStatus === 'Now Streaming (Ongoing)') {
            prev.status = 'Now Streaming (Ongoing)';
          }
          availableAudios.forEach((a) => {
            if (!prev.availableAudios.includes(a)) prev.availableAudios.push(a);
          });
          if (comingSoonAudios.length > 0) {
            prev.comingSoonAudios = Array.from(new Set([...(prev.comingSoonAudios || []), ...comingSoonAudios]));
          }
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
          // Move duplicate drama to the latest position in the map
          parsedDramasMap.delete(dramaId);
          parsedDramasMap.set(dramaId, prev);
          continue;
        }

        // Build episodes array
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

        const item: DramaItem = {
          id: dramaId,
          title: cleanTitle,
          category: dramaCategory,
          releaseYear,
          status: dramaStatus,
          statusText: statusText || undefined,
          ageRating: ageRating || undefined,
          subCategory: effectiveSubCategory || undefined,
          rating: ratingVal || 9.2,
          poster: (poster && poster.startsWith('http')) ? poster : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700',
          backdrop: (poster && poster.startsWith('http')) ? poster : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
          synopsis: synopsisVal || `Watch ${cleanTitle} in high definition on AsiaFlix Prime Private Channel.`,
          cast: parsedCast.length > 0 ? Array.from(new Set(parsedCast)) : ['AsiaFlix Exclusive'],
          tags: parsedTags.length > 0 
            ? Array.from(new Set(parsedTags)) 
            : Array.from(new Set([dramaCategory, defaultAudio, subCategory].filter(Boolean))),
          scheduleInfo: scheduleRaw || detailsRaw || '2026 VIP Release',
          availableAudios,
          defaultAudio,
          comingSoonAudios: comingSoonAudios.length > 0 ? comingSoonAudios : undefined,
          isFeatured: isTrendingInSheet,
          isTrending: isTrendingInSheet || true,
          isSpotlight: isTrendingInSheet,
          spotlightTag: isTrendingInSheet ? '🔥 TOP TRENDING' : undefined,
          isWeekendLineup: isWeekendRow,
          weekendSlot: isWeekendRow ? 'Sat & Sun Drop' : undefined,
          totalEpisodes: totalEpCount,
          qualityBadge: subCategory || '1080p FHD',
          telegramUrl: primaryLink,
          episodes: dramaEpisodes,
          
          // Google Sheet Fields
          telegramHindi: hasHindiHttp ? tHindi : undefined,
          telegramFanDub: hasFanDubHttp ? tFanDub : undefined,
          telegramOrig: hasOrigHttp ? tOrig : undefined,
          details: detailsRaw,
          schedule: scheduleRaw,
          leadCast: parsedCast,
          hashtags: parsedTags,
          isMovie: isFilm,
        };

        parsedDramasMap.set(dramaId, item);

        if (isBannerRow) {
          const customBannerBackdrop = rawBannerVal.startsWith('http') ? row[bannerIdx].trim() : item.backdrop;
          parsedHeroBanners.push({
            id: `banner-${dramaId}`,
            title: cleanTitle,
            backdropUrl: customBannerBackdrop,
            posterUrl: item.poster,
            audio: defaultAudio,
            category: dramaCategory,
            releaseYear,
            rating: item.rating,
            scheduleInfo: detailsRaw || scheduleRaw || '1080p FHD',
            synopsis: item.synopsis,
            badge: subCategory || '🔥 VIP PICK',
            telegramUrl: primaryLink,
            isActive: true,
            dramaId: item.id,
          });
        }
      }

      // 100% strict control from Google Sheet: reverse parsedHeroBanners so newest added slide appears first
      if (parsedHeroBanners.length > 0) {
        parsedHeroBanners.reverse();
        setHeroBanners(parsedHeroBanners);
      }

      // Reverse catalog array so the bottom-most row of the Google Sheet appears FIRST (#1) everywhere
      const uniqueParsed = Array.from(parsedDramasMap.values()).reverse();
      if (uniqueParsed.length > 0) {
        mergePreservingCuratedAndCustom(uniqueParsed);

        // --- GLOBAL SUPABASE AUTO-NOTIFICATIONS FOR GOOGLE SHEET UPDATES ---
        try {
          // Helper to get highest episode number and episode count
          const getEpStats = (eps: EpisodeItem[]) => {
            let maxEp = 0;
            eps.forEach((ep) => {
              if (typeof ep.episodeNumber === 'number') {
                if (ep.episodeNumber > maxEp) maxEp = ep.episodeNumber;
              } else if (typeof ep.episodeNumber === 'string') {
                const rangeParts = ep.episodeNumber.match(/(\d+)\s*-\s*(\d+)/);
                if (rangeParts) {
                  const endNum = parseInt(rangeParts[2], 10);
                  if (endNum > maxEp) maxEp = endNum;
                } else {
                  const singleMatch = ep.episodeNumber.match(/(\d+)/);
                  if (singleMatch) {
                    const n = parseInt(singleMatch[1], 10);
                    if (n > maxEp) maxEp = n;
                  }
                }
              }
            });
            return { maxEp, epCount: eps.length };
          };

          const isComingSoonPattern = /coming\s*soon|upcoming|soon/i;

          // Track T1 (Hindi Dubbed), T2 (Hindi Fan Dubbed), and T3 (Original / Eng Sub) SEPARATELY
          const currentSnapshot: Record<string, {
            title: string;
            isMovie: boolean;
            t1: { state: 'streaming' | 'coming_soon' | 'none'; maxEp: number; epCount: number };
            t2: { state: 'streaming' | 'coming_soon' | 'none'; maxEp: number; epCount: number };
            t3: { state: 'streaming' | 'coming_soon' | 'none'; maxEp: number; epCount: number };
          }> = {};

          uniqueParsed.forEach((d) => {
            const hindiEpisodes = d.episodes.filter((e) => e.audio === 'Hindi Dubbed');
            const fanEpisodes = d.episodes.filter((e) => e.audio === 'Hindi Fan Dubbed' || e.audio === 'Fan Dubbed');
            const origEpisodes = d.episodes.filter((e) => e.audio === 'Original / Eng Sub');

            const hasHindiHttp = Boolean(d.telegramHindi && d.telegramHindi.toLowerCase().includes('http'));
            const hasFanDubHttp = Boolean(d.telegramFanDub && d.telegramFanDub.toLowerCase().includes('http'));
            const hasOrigHttp = Boolean(d.telegramOrig && d.telegramOrig.toLowerCase().includes('http'));

            const isHindiComingSoon = !hasHindiHttp && (Boolean(d.comingSoonAudios?.includes('Hindi Dubbed')) || isComingSoonPattern.test(d.telegramHindi || ''));
            const isFanDubComingSoon = !hasFanDubHttp && (Boolean(d.comingSoonAudios?.some((a) => a.toLowerCase().includes('fan'))) || isComingSoonPattern.test(d.telegramFanDub || ''));
            const isOrigComingSoon = !hasOrigHttp && (Boolean(d.comingSoonAudios?.includes('Original / Eng Sub')) || isComingSoonPattern.test(d.telegramOrig || ''));

            const hindiStats = getEpStats(hindiEpisodes);
            const fanStats = getEpStats(fanEpisodes);
            const origStats = getEpStats(origEpisodes);

            currentSnapshot[d.id] = {
              title: d.title,
              isMovie: Boolean(d.isMovie),
              t1: {
                state: hasHindiHttp ? 'streaming' : isHindiComingSoon ? 'coming_soon' : 'none',
                maxEp: hindiStats.maxEp,
                epCount: hindiStats.epCount,
              },
              t2: {
                state: hasFanDubHttp ? 'streaming' : isFanDubComingSoon ? 'coming_soon' : 'none',
                maxEp: fanStats.maxEp,
                epCount: fanStats.epCount,
              },
              t3: {
                state: hasOrigHttp ? 'streaming' : isOrigComingSoon ? 'coming_soon' : 'none',
                maxEp: origStats.maxEp,
                epCount: origStats.epCount,
              },
            };
          });

          // Fetch previous snapshot from Supabase hidden system row
          const prevSnapshot = await fetchSheetSnapshotFromSupabase();

          if (!prevSnapshot || Object.keys(prevSnapshot).length === 0) {
            // First time: save baseline snapshot to Supabase and purge old Coming Soon notifications
            await saveSheetSnapshotToSupabase(currentSnapshot);
            setNotifications((prev) =>
              prev.filter(
                (n) =>
                  !n.title.toLowerCase().includes('coming soon') &&
                  !n.message.toLowerCase().includes('coming soon')
              )
            );
          } else {
            const columnsConfig = [
              { key: 't1' as const, name: 'Hindi Dubbed' },
              { key: 't2' as const, name: 'Hindi Fan Dubbed' },
              { key: 't3' as const, name: 'Original / Eng Sub' },
            ];

            // Compare each audio column (t1, t2, t3) independently against prevSnapshot[d.id]
            for (const d of uniqueParsed) {
              const curr = currentSnapshot[d.id];
              if (!curr) continue;
              const oldEntry = prevSnapshot[d.id];

              for (const col of columnsConfig) {
                const currCol = curr[col.key];

                // Extract old column state (with backward compatibility for previous snapshot format)
                let oldCol: { state: 'streaming' | 'coming_soon' | 'none'; maxEp: number; epCount: number } = {
                  state: 'none',
                  maxEp: 0,
                  epCount: 0,
                };

                if (oldEntry) {
                  if (oldEntry[col.key]) {
                    oldCol = oldEntry[col.key];
                  } else if (Array.isArray(oldEntry.audios)) {
                    const hasOldAudio = oldEntry.audios.some((a: string) =>
                      a.toLowerCase().includes(col.name.toLowerCase().slice(0, 5))
                    );
                    if (hasOldAudio) {
                      oldCol = {
                        state: 'streaming',
                        maxEp: oldEntry.maxEp || 0,
                        epCount: oldEntry.epCount || 0,
                      };
                    }
                  }
                }

                // 1. Column changed from 'none' to 'coming_soon'
                if (oldCol.state === 'none' && currCol.state === 'coming_soon') {
                  await insertNotificationIntoSupabase(
                    d.title,
                    `${col.name} Coming Soon!`
                  );
                }
                // 2. Column changed from 'none' or 'coming_soon' to 'streaming'
                else if ((oldCol.state === 'none' || oldCol.state === 'coming_soon') && currCol.state === 'streaming') {
                  if (currCol.maxEp > 0) {
                    await insertNotificationIntoSupabase(
                      d.title,
                      `${col.name} Ep ${currCol.maxEp} Added`
                    );
                  } else {
                    await insertNotificationIntoSupabase(
                      d.title,
                      `${col.name} Full ${d.isMovie ? 'Movie' : 'Series'} Added`
                    );
                  }
                }
                // 3. Column was already 'streaming' and col.maxEp > oldCol.maxEp (or col.epCount > oldCol.epCount)
                else if (currCol.state === 'streaming' && oldCol.state === 'streaming') {
                  if (currCol.maxEp > oldCol.maxEp || currCol.epCount > oldCol.epCount) {
                    const epNum = currCol.maxEp > 0 ? currCol.maxEp : currCol.epCount;
                    await insertNotificationIntoSupabase(
                      d.title,
                      `${col.name} Ep ${epNum} Added`
                    );
                  }
                }
              }
            }

            // Save updated snapshot back to Supabase
            await saveSheetSnapshotToSupabase(currentSnapshot);
          }

          // Refresh notifications from Supabase so every browser gets live cloud updates
          const cloudNotifs = await fetchNotificationsFromSupabase();
          if (cloudNotifs && cloudNotifs.length > 0) {
            setNotifications(cloudNotifs);
            localStorage.setItem('asiaflix_notifications', JSON.stringify(cloudNotifs));

            // Trigger floating live toast if the top notification is new
            const lastToastId = sessionStorage.getItem('asiaflix_last_toast_id');
            const latestNotif = cloudNotifs[0];
            if (latestNotif && latestNotif.id !== lastToastId) {
              sessionStorage.setItem('asiaflix_last_toast_id', latestNotif.id);
              setActiveToastNotif(latestNotif);
            }
          }
        } catch (notifErr) {
          console.warn('Error syncing cloud notifications with Supabase:', notifErr);
        }
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
            dramaTitle: drama.title,
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
          const dramaObj = dramas.find((d) => d.id === dramaId);
          return [
            {
              dramaId,
              dramaTitle: dramaObj?.title,
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
      localStorage.setItem('asiaflix_curated_dramas_v4', JSON.stringify(updated));
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
      localStorage.setItem('asiaflix_curated_dramas_v4', JSON.stringify(updated));
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
        const isMovie = d.isMovie || d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie');
        if (selectedCategory === 'Asian Movies') {
          if (!isMovie) return false;
        } else if (selectedCategory === 'Hollywood / Bollywood') {
          const isHollyBolly = d.category === 'Hollywood / Bollywood' || d.category.toLowerCase().includes('bolly') || d.category.toLowerCase().includes('holly');
          if (!isHollyBolly) return false;
        } else if (selectedCategory === 'Other Series' || selectedCategory === 'J-Drama') {
          const isOther = !isMovie && d.category !== 'K-Drama' && d.category !== 'C-Drama' && d.category !== 'Asian Movies' && d.category !== 'Hollywood / Bollywood';
          if (!isOther) return false;
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

  // Weekly Episode Drops & Airing Lineup items
  const weekendDramas = useMemo(() => {
    const seen = new Set<string>();
    return dramas.filter((d) => {
      if (!d || !d.id || seen.has(d.id)) return false;

      const hasExplicitSchedule = Boolean(d.schedule && d.schedule.trim());
      const isActivelyOngoing = d.status === 'Now Streaming (Ongoing)' || Boolean(d.statusText && d.statusText.includes('Now Streaming'));
      const isCompleted = d.status.includes('Completed') || d.status.includes('Full');

      // Completed series are excluded unless they explicitly have a schedule defined in the Sheet
      if (isCompleted && !hasExplicitSchedule) {
        return false;
      }

      if (hasExplicitSchedule || isActivelyOngoing || d.isWeekendLineup) {
        seen.add(d.id);
        return true;
      }

      return false;
    });
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
    Boolean(d.telegramFanDub || d.availableAudios.some((a) => a.toLowerCase().includes('fan')) || d.defaultAudio.toLowerCase().includes('fan') || d.comingSoonAudios?.some((a) => a.toLowerCase().includes('fan')))
  ), [dramas]);
  const origEngSubList = useMemo(() => dramas.filter((d) => 
    Boolean(d.telegramOrig || d.availableAudios.some((a) => a.toLowerCase().includes('orig') || a.toLowerCase().includes('sub')) || d.defaultAudio.toLowerCase().includes('orig') || d.comingSoonAudios?.includes('Original / Eng Sub'))
  ), [dramas]);
  const kdramaList = useMemo(() => dramas.filter((d) => d.category === 'K-Drama'), [dramas]);
  const cdramaList = useMemo(() => dramas.filter((d) => d.category === 'C-Drama'), [dramas]);
  const otherSeriesList = useMemo(() => dramas.filter((d) => {
    const isMovie = d.isMovie || d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie');
    return !isMovie && d.category !== 'K-Drama' && d.category !== 'C-Drama' && d.category !== 'Asian Movies' && d.category !== 'Hollywood / Bollywood';
  }), [dramas]);
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

  const handleGoHome = () => {
    setSearchQuery('');
    setInstantSearchQuery('');
    setInstantFilter('All');
    setSelectedAudio('all');
    setSelectedCategory('all');
    setSelectedYear('all');
    setSelectedStatus('all');
    setSelectedDrama(null);
    setIsWatchlistOpen(false);
    setIsNotificationsOpen(false);
    setIsRequestOpen(false);
    setIsSupportOpen(false);
    setIsArcadeOpen(false);
    setIsAdminOpen(false);
    setIsInstantSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex flex-col relative selection:bg-[#e50914] selection:text-white">
      {/* Sakura Petal Floating Canvas */}
      <SakuraCanvas enabled={sakuraEnabled} />

      {/* Top Notice Running Marquee */}
      <MarqueeNotice noticeText={marqueeText} isLiveSynced={true} />

      {/* Audience Instant Push & Telegram Bot Alerts Banner (Clean & Non-overlapping) */}
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
        onOpenSearch={() => setIsInstantSearchOpen(true)}
        onOpenSearchModal={() => setIsInstantSearchOpen(true)}
        onGoHome={handleGoHome}
      />

      {/* VIP Perks Bar - Horizontal Strip Below Navbar & Above Hero Banner */}
      <section className="bg-gradient-to-r from-[#0d0d14] via-[#14121c] to-[#0d0d14] border-b border-white/[0.06] py-2.5 px-4 sm:px-6 lg:px-8 relative z-30">
        <div className="max-w-[1600px] mx-auto flex items-center justify-center sm:justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2.5 sm:gap-3 mx-auto flex-nowrap shrink-0">
            {/* Perk 1: 100% Free Access */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-xs font-black text-white tracking-wide whitespace-nowrap">100% Free Access</span>
            </div>

            {/* Perk 2: Fast Cloud Stream */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all shrink-0">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-black text-white tracking-wide whitespace-nowrap">Fast Cloud Stream</span>
            </div>

            {/* Perk 3: Zero Ads / No Token */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-pink-500/10 hover:from-red-500/20 hover:to-pink-500/20 border border-red-500/25 backdrop-blur-md shadow-[0_2px_10px_rgba(229,9,20,0.2)] transition-all shrink-0">
              <span className="text-xs">🛡️</span>
              <span className="text-xs font-black text-red-200 tracking-wide whitespace-nowrap">Zero Ads / No Token</span>
            </div>

            {/* Perk 4: Weekend Drops */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 backdrop-blur-md shadow-[0_2px_10px_rgba(245,158,11,0.2)] transition-all shrink-0">
              <span className="text-xs">🌸</span>
              <span className="text-xs font-black text-amber-300 tracking-wide whitespace-nowrap">Weekend Drops 7 PM</span>
            </div>
          </div>
        </div>
      </section>

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
          <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-12">
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
              <div className="grid grid-cols-6 gap-4">
                {filteredDramas.map((drama, idx) => (
                  <DramaCard
                    key={drama.id}
                    drama={drama}
                    onSelect={(d) => setSelectedDrama(d)}
                    onToggleWatchlist={handleToggleWatchlist}
                    isWatchlisted={isDramaWatchlisted(drama.id)}
                    rank={idx + 1}
                    isTopOne={idx === 0}
                    activeAudioContext={selectedAudio}
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
                activeAudioContext="Hindi Dubbed"
              />
            )}

            {/* 5. Hindi Fan Dubbed & Special Dubs */}
            {fanDubbedList.length > 0 && (
              <DramaRow
                id="sec-fan-dubbed"
                title="Hindi Fan Dubbed Collection"
                subtitle="Community voice projects and fast releases in Hindi audio"
                icon="🎙️🌸"
                dramas={fanDubbedList}
                onSelectDrama={(d) => setSelectedDrama(d)}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
                activeAudioContext="Hindi Fan Dubbed"
              />
            )}

            {/* Original Audio / Eng Sub Collection */}
            {origEngSubList.length > 0 && (
              <DramaRow
                id="sec-orig-sub"
                title="Original Audio / Eng Sub Collection"
                subtitle="Authentic native audio with high quality English subtitles in 1080p FHD"
                icon="💬🌐"
                dramas={origEngSubList}
                onSelectDrama={(d) => setSelectedDrama(d)}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
                activeAudioContext="Original / Eng Sub"
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

            {/* 🌐 Other Series (J-Drama, T-Drama & More) */}
            {otherSeriesList.length > 0 && (
              <DramaRow
                id="sec-other-series"
                title="🌐 Other Series (J-Drama, T-Drama & More)"
                subtitle="Captivating Japanese, Taiwanese, Thai, and regional Asian dramas"
                icon="🌐✨"
                dramas={otherSeriesList}
                onSelectDrama={(d) => setSelectedDrama(d)}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
              />
            )}

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
        onUserChange={handleUserChange}
        watchedEpisodesMap={watchedEpisodesMap}
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

      {/* 8. ALWAYS-VISIBLE FLOATING QUICK ACTION DOCK (HOME & SEARCH - ALL DEVICES) */}
      <aside 
        aria-label="Quick Navigation Dock" 
        className="fixed bottom-16 right-6 z-50 flex items-center gap-2.5 p-2 rounded-2xl bg-[#111218]/95 backdrop-blur-xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.85)]"
      >
        {/* Floating Home Button */}
        <button
          onClick={handleGoHome}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-[#e50914] text-white text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer group"
          title="Return to Home & Reset All Filters"
        >
          <Home className="w-4 h-4 text-zinc-300 group-hover:text-white" />
          <span className="font-bold">Home</span>
        </button>

        {/* Floating Search Button */}
        <button
          onClick={() => setIsInstantSearchOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 text-white text-xs font-black shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Instant Search Dramas, Movies, and Cast"
        >
          <Search className="w-4 h-4" />
          <span className="font-bold">Search</span>
        </button>
      </aside>

      {/* 9. INSTANT SEARCH POPUP MODAL (ALWAYS ACCESSIBLE ACROSS ALL DEVICES) */}
      {isInstantSearchOpen && (
        <div 
          onClick={() => setIsInstantSearchOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-20 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#111218] rounded-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[85vh] animate-slide-down"
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/[0.03]">
              <Search className="w-5 h-5 text-red-500 shrink-0" />
              <input
                type="text"
                autoFocus
                value={instantSearchQuery}
                onChange={(e) => setInstantSearchQuery(e.target.value)}
                placeholder="Search Asian dramas, movies, actors, or genres..."
                className="w-full bg-transparent text-white text-sm sm:text-base font-semibold outline-none placeholder-zinc-500"
              />
              {instantSearchQuery && (
                <button
                  onClick={() => setInstantSearchQuery('')}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsInstantSearchOpen(false)}
                className="px-2.5 py-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 text-xs font-bold shrink-0 ml-1 border border-white/10"
              >
                Esc
              </button>
            </div>

            {/* Quick Audio & Category Filter Pills */}
            <div className="px-4 py-2.5 border-b border-white/10 bg-black/40 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="text-zinc-500 font-bold shrink-0 text-[11px] uppercase tracking-wider mr-1">Filter:</span>
              {([
                { id: 'All', label: 'All', icon: '✨' },
                { id: 'Hindi Dubbed', label: 'Hindi Dubbed', icon: '🇮🇳' },
                { id: 'Hindi Fan Dubbed', label: 'Hindi Fan Dubbed', icon: '🎙️' },
                { id: 'Original / Eng Sub', label: 'Original / Eng Sub', icon: '💬' },
                { id: 'K-Drama', label: 'K-Drama', icon: '🇰🇷' },
                { id: 'C-Drama', label: 'C-Drama', icon: '🇨🇳' },
                { id: 'Other Series', label: 'Other Series', icon: '🌐' },
                { id: 'Movies', label: 'Movies', icon: '🎬' },
              ] as const).map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setInstantFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    instantFilter === pill.id
                      ? 'bg-[#e50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.5)] border border-red-500/50 scale-105'
                      : 'bg-white/[0.05] hover:bg-white/10 text-zinc-300 border border-white/10'
                  }`}
                >
                  {pill.icon && <span>{pill.icon}</span>}
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>

            {/* Instant Filter Results Header */}
            {(() => {
              const q = instantSearchQuery.trim().toLowerCase();
              const matchingResults = dramas.filter((d) => {
                // Text search matching
                if (q) {
                  const matches = (
                    d.title.toLowerCase().includes(q) ||
                    d.category.toLowerCase().includes(q) ||
                    (d.subCategory && d.subCategory.toLowerCase().includes(q)) ||
                    (d.leadCast && d.leadCast.some((c) => c.toLowerCase().includes(q))) ||
                    (d.hashtags && d.hashtags.some((t) => t.toLowerCase().includes(q))) ||
                    (d.synopsis && d.synopsis.toLowerCase().includes(q)) ||
                    (d.details && d.details.toLowerCase().includes(q))
                  );
                  if (!matches) return false;
                }

                // Quick filter pill matching
                if (instantFilter === 'All') return true;
                if (instantFilter === 'Hindi Dubbed') {
                  return Boolean(d.telegramHindi) || d.availableAudios.some((a) => a.toLowerCase().includes('hindi') && !a.toLowerCase().includes('fan')) || d.defaultAudio === 'Hindi Dubbed';
                }
                if (instantFilter === 'Hindi Fan Dubbed') {
                  return Boolean(d.telegramFanDub) || d.availableAudios.some((a) => a.toLowerCase().includes('fan')) || d.defaultAudio.toLowerCase().includes('fan');
                }
                if (instantFilter === 'Original / Eng Sub') {
                  return Boolean(d.telegramOrig) || d.availableAudios.some((a) => a.toLowerCase().includes('original') || a.toLowerCase().includes('eng')) || d.defaultAudio.toLowerCase().includes('original');
                }
                if (instantFilter === 'K-Drama') {
                  return d.category === 'K-Drama';
                }
                if (instantFilter === 'C-Drama') {
                  return d.category === 'C-Drama';
                }
                if (instantFilter === 'Other Series') {
                  const isMovie = d.isMovie || d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie');
                  return !isMovie && d.category !== 'K-Drama' && d.category !== 'C-Drama' && d.category !== 'Asian Movies' && d.category !== 'Hollywood / Bollywood';
                }
                if (instantFilter === 'Movies') {
                  return d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie') || d.isMovie;
                }
                return true;
              });

              return (
                <>
                  <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs text-zinc-400">
                    <span>Found <strong className="text-white font-bold">{matchingResults.length}</strong> matching titles</span>
                    <button
                      onClick={() => {
                        setSearchQuery(instantSearchQuery);
                        if (instantFilter === 'Hindi Dubbed' || instantFilter === 'Hindi Fan Dubbed' || instantFilter === 'Original / Eng Sub') {
                          setSelectedAudio(instantFilter);
                        } else if (instantFilter === 'K-Drama' || instantFilter === 'C-Drama' || instantFilter === 'Other Series') {
                          setSelectedCategory(instantFilter);
                        } else if (instantFilter === 'Movies') {
                          setSelectedCategory('Asian Movies');
                        }
                        setIsInstantSearchOpen(false);
                        window.scrollTo({ top: 480, behavior: 'smooth' });
                      }}
                      className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                    >
                      View on Home Grid →
                    </button>
                  </div>

                  {/* Instant Results List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {matchingResults.length === 0 ? (
                      <div className="py-12 text-center text-zinc-400">
                        <p className="text-sm font-bold text-zinc-300">
                          {instantSearchQuery ? `No drama found for "${instantSearchQuery}"` : `No titles found for "${instantFilter}" filter`}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">Try another title, actor name, or request it to be uploaded.</p>
                        <button
                          onClick={() => {
                            setIsInstantSearchOpen(false);
                            setIsRequestOpen(true);
                          }}
                          className="mt-3 px-3 py-1.5 rounded-xl bg-[#e50914] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          Request This Title
                        </button>
                      </div>
                    ) : (
                      matchingResults.slice(0, 30).map((d) => (
                        <div
                          key={`search-res-${d.id}`}
                          onClick={() => {
                            setSelectedDrama(d);
                            setIsInstantSearchOpen(false);
                          }}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-red-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={d.poster}
                              alt={d.title}
                              referrerPolicy="no-referrer"
                              className="w-10 h-14 rounded-lg object-cover shrink-0 bg-zinc-900 border border-white/10"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700";
                              }}
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-red-400 transition-colors truncate">
                                {d.title}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400 flex-wrap">
                                <span className="text-white font-bold">{d.category}</span>
                                <span>•</span>
                                <span className="text-amber-300 font-bold flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                                  {d.rating}
                                </span>
                                <span>•</span>
                                <span className="text-sky-400 font-bold">{d.details || `${d.releaseYear}`}</span>
                              </div>
                              {d.subCategory && (
                                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{d.subCategory}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] bg-red-600/20 text-red-300 px-2 py-0.5 rounded font-bold">
                              {d.defaultAudio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : d.defaultAudio}
                            </span>
                            <button
                              className="p-2 rounded-lg bg-white/10 group-hover:bg-[#e50914] text-white transition-colors"
                              title="View Episodes & Telegram Links"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 10. PHONE-STYLE FLOATING LIVE PUSH NOTIFICATION TOAST POPUP */}
      <LiveToastNotification
        notification={activeToastNotif}
        drama={
          activeToastNotif
            ? dramas.find((d) => 
                (activeToastNotif.dramaId && d.id === activeToastNotif.dramaId) ||
                d.title.toLowerCase() === activeToastNotif.title.toLowerCase() ||
                activeToastNotif.title.toLowerCase().includes(d.title.toLowerCase())
              ) || null
            : null
        }
        onOpenDrama={(drama) => setSelectedDrama(drama)}
        onDismiss={() => setActiveToastNotif(null)}
      />
    </div>
  );
}
