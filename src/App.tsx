import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DramaItem, EpisodeItem, WatchlistEntry, WatchlistStatus, ReleaseNotification, SupportTicket, AudioType, DramaCategory, DramaStatus, WeekendSettings, HeroBannerSlide, TelegramBotSettings } from './types/drama';
import { INITIAL_DRAMAS, INITIAL_NOTIFICATIONS, INITIAL_TICKETS, INITIAL_HERO_BANNERS } from './data/initialCatalog';
import { SakuraCanvas, ParticleMode } from './components/SakuraCanvas';
import { MarqueeNotice } from './components/MarqueeNotice';
import { AudienceNotificationBanner } from './components/AudienceNotificationBanner';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Search, X, Play, Star, Clock, Film } from 'lucide-react';
import { HeroBanner } from './components/HeroBanner';
import { SpotlightBar } from './components/SpotlightBar';
import { LiveIssueBoard } from './components/LiveIssueBoard';
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
import { AdBannerSlot } from './components/AdBannerSlot';
import { FloatingPopupAd } from './components/FloatingPopupAd';
import {
  sendNativeBrowserNotification,
  registerServiceWorker,
  requestBrowserNotificationPermission,
  syncShownIdsToServiceWorker,
} from './services/notificationService';
import { getTrackEpisodeCounts, formatPermanentTimestamp } from './services/scheduleHelper';
import { createDramaSlug, parseDeepLinkFromLocation } from './services/urlHelper';
import { 
  fetchDramasFromSupabase, 
  fetchNotificationsFromSupabase, 
  insertNotificationIntoSupabase,
  createNotificationInSupabase,
  fetchSheetSnapshotFromSupabase,
  saveSheetSnapshotToSupabase,
  cleanupOldSpamNotificationsFromSupabase,
  deleteNotificationFromSupabase,
  clearAllNotificationsFromSupabase,
  syncUserAccountWithSupabase,
  saveUserWatchlistToSupabase,
  getActiveSupabaseUser,
  AdConfig,
  getLocalAdConfig,
  fetchAdConfigFromSupabase,
  saveAdConfigToSupabase
} from './services/supabaseService';

export const OFFICIAL_SITE_URL = 'https://asiaflixprime.pages.dev';
const DEFAULT_DOC_TITLE = 'AsiaFlix Prime — K-Drama & Movies VIP Portal';
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1uz-4QI_K5VGhWeqgx32jZnZffaB0oTGCpbS9hmxEN8U/export?format=csv&gid=0";

const isHollyBollyTitle = (d: DramaItem): boolean => {
  const cat = (d.category || '').toLowerCase();
  const sub = (d.subCategory || '').toLowerCase();
  const country = (d.country || '').toLowerCase();
  const title = (d.title || '').toLowerCase();
  return (
    cat === 'holly/bolly' ||
    cat.includes('holly') ||
    cat.includes('bolly') ||
    sub.includes('holly') ||
    sub.includes('bolly') ||
    sub.includes('indian') ||
    country.includes('india') ||
    country.includes('usa') ||
    country.includes('uk') ||
    title.includes('ramayana') ||
    title.includes('hanuman') ||
    title.includes('dhamaal')
  );
};

const isAsianMovieTitle = (d: DramaItem): boolean => {
  if (isHollyBollyTitle(d)) return false;
  const cat = (d.category || '').toLowerCase();
  const sub = (d.subCategory || '').toLowerCase();
  return (
    d.category === 'Asian Movies' ||
    cat === 'movies' ||
    sub.includes('asian movie') ||
    sub.includes('movie') ||
    Boolean(d.isMovie)
  );
};

const detectPhoneOrPortrait = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isPortrait =
    window.innerHeight > window.innerWidth ||
    (window.screen && window.screen.height > window.screen.width);
  const isTouch =
    navigator.maxTouchPoints > 0 ||
    'ontouchstart' in window ||
    window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isNarrow = window.outerWidth <= 1024 || window.innerWidth <= 1024;
  return isPortrait || isTouch || isMobileUA || isNarrow;
};

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

  // --- READ NOTIFICATION IDS STATE (PERSISTED LOCALLY & IN SUPABASE CLOUD) ---
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('asiaflix_read_notif_ids_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((id) => typeof id === 'string');
      } catch {}
    }
    return [];
  });
  const readNotifIdsRef = useRef<string[]>(readNotifIds);
  useEffect(() => {
    readNotifIdsRef.current = readNotifIds;
  }, [readNotifIds]);

  const applyReadStateToNotifs = (
    list: ReleaseNotification[],
    ids: string[] = readNotifIdsRef.current
  ): ReleaseNotification[] => {
    const readSet = new Set(ids);
    return list.map((n) => ({
      ...n,
      isRead: Boolean(n.isRead || readSet.has(n.id)),
    }));
  };

  // --- NOTIFICATIONS STATE ---
  const [notifications, setNotifications] = useState<ReleaseNotification[]>(() => {
    const saved = localStorage.getItem('asiaflix_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const readSet = new Set(readNotifIdsRef.current);
          return parsed.map((n: ReleaseNotification) => ({
            ...n,
            isRead: Boolean(n.isRead || readSet.has(n.id)),
          }));
        }
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }
    return [];
  });

  // --- FLOATING LIVE PUSH NOTIFICATION TOAST QUEUE & PER-DEVICE ALERT TRACKING ---
  const [toastQueue, setToastQueue] = useState<ReleaseNotification[]>([]);
  const activeToastNotif = toastQueue[0] || null;
  const handleDismissToast = React.useCallback(() => {
    setToastQueue((prev) => prev.slice(1));
  }, []);

  const deviceAlertedIdsRef = useRef<Set<string>>((() => {
    try {
      const saved = localStorage.getItem('asiaflix_device_alerted_ids_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === 'string'));
      }
    } catch {}
    return new Set<string>();
  })());

  const dramasRef = useRef<DramaItem[]>(dramas);
  useEffect(() => {
    dramasRef.current = dramas;
  }, [dramas]);

  const enqueueDeviceAlerts = React.useCallback((candidateNotifs: ReleaseNotification[]) => {
    if (!candidateNotifs || candidateNotifs.length === 0) return;

    const cutoffMs = Date.now() - 48 * 60 * 60 * 1000;
    const readSet = new Set(readNotifIdsRef.current);

    const priorityScore = (n: ReleaseNotification) => {
      if (n.type === 'new_episode' || n.type === 'new_drama') return 0;
      if (n.type === 'fix') return 1;
      if (n.type === 'issue') return 2;
      return 3;
    };

    const unalerted = candidateNotifs
      .filter((n) => {
        if (!n || !n.id) return false;
        if (n.isRead || readSet.has(n.id)) return false;
        if (deviceAlertedIdsRef.current.has(n.id)) return false;
        if (n.createdAtMs && n.createdAtMs < cutoffMs) return false;
        return true;
      })
      .sort((a, b) => {
        const pDiff = priorityScore(a) - priorityScore(b);
        if (pDiff !== 0) return pDiff;
        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      })
      .slice(0, 4);

    if (unalerted.length === 0) return;

    unalerted.forEach((n) => deviceAlertedIdsRef.current.add(n.id));
    const persistedArr = Array.from(deviceAlertedIdsRef.current).slice(-400);
    deviceAlertedIdsRef.current = new Set(persistedArr);
    try {
      localStorage.setItem('asiaflix_device_alerted_ids_v2', JSON.stringify(persistedArr));
    } catch {}

    const enrichedAlerts = unalerted.map((n) => {
      const matchedDrama = n.posterUrl
        ? null
        : dramasRef.current.find(
            (d) =>
              (n.dramaId && d.id === n.dramaId) ||
              d.title.toLowerCase() === n.title.toLowerCase() ||
              n.title.toLowerCase().includes(d.title.toLowerCase())
          );
      const posterUrl = n.posterUrl || matchedDrama?.poster;

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        sendNativeBrowserNotification(n.title, n.message, posterUrl, n.id);
      }

      return posterUrl && !n.posterUrl ? { ...n, posterUrl } : n;
    });

    setToastQueue((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = enrichedAlerts.filter((e) => !existingIds.has(e.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });

    syncShownIdsToServiceWorker([...persistedArr, ...readNotifIdsRef.current]);
  }, []);

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
  const watchlistRef = useRef<WatchlistEntry[]>(watchlist);
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

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
  const watchedEpisodesRef = useRef<Record<string, (number | string)[]>>(watchedEpisodesMap);
  useEffect(() => {
    watchedEpisodesRef.current = watchedEpisodesMap;
  }, [watchedEpisodesMap]);

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
  const supabaseUserRef = useRef<{ id: string; email: string } | null>(supabaseUser);
  useEffect(() => {
    supabaseUserRef.current = supabaseUser;
  }, [supabaseUser]);

  const markNotificationIdsAsRead = (idsToMark: string[], syncCloud = true) => {
    const validIds = idsToMark.filter(Boolean);
    if (validIds.length === 0) return;

    const nextSet = new Set([...readNotifIdsRef.current, ...validIds]);
    const nextIds = Array.from(nextSet);

    if (nextIds.length !== readNotifIdsRef.current.length) {
      readNotifIdsRef.current = nextIds;
      setReadNotifIds(nextIds);
      localStorage.setItem('asiaflix_read_notif_ids_v1', JSON.stringify(nextIds));

      if (syncCloud && supabaseUserRef.current?.email) {
        saveUserWatchlistToSupabase(
          supabaseUserRef.current.email,
          watchlistRef.current,
          watchedEpisodesRef.current,
          nextIds
        );
      }
    }

    setNotifications((prev) =>
      prev.map((n) => (nextSet.has(n.id) ? { ...n, isRead: true } : n))
    );
  };

  const handleUserChange = (
    user: any | null,
    cloudWatchlist?: WatchlistEntry[],
    cloudWatchedEpisodesMap?: Record<string, (number | string)[]>,
    cloudReadNotifIds?: string[]
  ) => {
    setSupabaseUser(user);
    supabaseUserRef.current = user;
    if (user && user.email) {
      localStorage.setItem('asiaflix_logged_in_user_v1', JSON.stringify(user));
      const nextWatchlist = cloudWatchlist && cloudWatchlist.length > 0 ? cloudWatchlist : watchlistRef.current;
      const nextWatched =
        cloudWatchedEpisodesMap && Object.keys(cloudWatchedEpisodesMap).length > 0
          ? cloudWatchedEpisodesMap
          : watchedEpisodesRef.current;

      if (cloudWatchlist && cloudWatchlist.length > 0) {
        setWatchlist(cloudWatchlist);
      }
      if (cloudWatchedEpisodesMap && Object.keys(cloudWatchedEpisodesMap).length > 0) {
        setWatchedEpisodesMap(cloudWatchedEpisodesMap);
      }

      const mergedReadIds = Array.from(new Set([...readNotifIdsRef.current, ...(cloudReadNotifIds || [])]));
      readNotifIdsRef.current = mergedReadIds;
      setReadNotifIds(mergedReadIds);
      localStorage.setItem('asiaflix_read_notif_ids_v1', JSON.stringify(mergedReadIds));
      setNotifications((prev) => applyReadStateToNotifs(prev, mergedReadIds));

      if (mergedReadIds.length > (cloudReadNotifIds?.length || 0)) {
        saveUserWatchlistToSupabase(user.email, nextWatchlist, nextWatched, mergedReadIds);
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        requestBrowserNotificationPermission();
      }
      syncShownIdsToServiceWorker(mergedReadIds);
    } else {
      localStorage.removeItem('asiaflix_logged_in_user_v1');
    }
  };

  // --- SUPPORT TICKETS ---
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);

  // --- MARQUEE NOTICE TEXT ---
  const [marqueeText, setMarqueeText] = useState('Weekend Mega Lineup is Active! New Hindi Dubbed Episodes Dropping Sat & Sun 7:00 PM IST • Zero Ads.');

  // --- FALLING PARTICLE AMBIENCE MODE ('snow' | 'sakura' | 'embers' | 'off') ---
  const [particleMode, setParticleMode] = useState<ParticleMode>(() => {
    const saved = localStorage.getItem('asiaflix_particle_mode');
    if (saved === 'snow' || saved === 'sakura' || saved === 'embers' || saved === 'off') {
      return saved;
    }
    return 'snow';
  });

  useEffect(() => {
    localStorage.setItem('asiaflix_particle_mode', particleMode);
  }, [particleMode]);

  const handleCycleParticleMode = () => {
    const order: ParticleMode[] = ['snow', 'sakura', 'embers', 'off'];
    setParticleMode((prev) => order[(order.indexOf(prev) + 1) % order.length]);
  };

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // --- MODAL & DEEP-LINK ROUTING STATES ---
  const [selectedDrama, setSelectedDrama] = useState<DramaItem | null>(null);
  const [deepLinkEpisode, setDeepLinkEpisode] = useState<number | null>(() => {
    return parseDeepLinkFromLocation()?.epNum ?? null;
  });
  const pendingDeepLinkRef = useRef(parseDeepLinkFromLocation());
  const isHandlingPopStateRef = useRef<boolean>(false);
  const savedScrollYRef = useRef<number>(0);

  const findDramaBySlug = (list: DramaItem[], slug: string): DramaItem | undefined => {
    const cleanSlug = (slug || '').toLowerCase().trim();
    if (!cleanSlug) return undefined;
    return (
      list.find((d) => createDramaSlug(d) === cleanSlug) ||
      list.find((d) => d.id.toLowerCase() === cleanSlug || d.id.toLowerCase() === `sheet-${cleanSlug}`) ||
      list.find((d) => createDramaSlug(d).replace(/-\d{4}$/, '') === cleanSlug.replace(/-\d{4}$/, ''))
    );
  };

  const handleOpenDrama = (drama: DramaItem, epOverride: number | null = null) => {
    if (!selectedDrama) {
      savedScrollYRef.current = window.scrollY;
    }
    setDeepLinkEpisode(epOverride);
    setSelectedDrama(drama);
    const slug = createDramaSlug(drama);
    const targetPath = epOverride !== null ? `/watch/${slug}/ep-${epOverride}` : `/watch/${slug}`;
    document.title =
      epOverride !== null
        ? `Ep ${epOverride} • ${drama.title} | AsiaFlix Prime`
        : `${drama.title} — Watch Online in HD | AsiaFlix Prime`;
    if (!isHandlingPopStateRef.current && window.location.pathname !== targetPath) {
      window.history.pushState({ dramaSlug: slug, epNum: epOverride }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleActiveEpisodeChange = (epNum: number | null) => {
    if (!selectedDrama) return;
    const slug = createDramaSlug(selectedDrama);
    const targetPath = epNum !== null ? `/watch/${slug}/ep-${epNum}` : `/watch/${slug}`;
    document.title =
      epNum !== null
        ? `Ep ${epNum} • ${selectedDrama.title} | AsiaFlix Prime`
        : `${selectedDrama.title} — Watch Online in HD | AsiaFlix Prime`;
    if (!isHandlingPopStateRef.current && window.location.pathname !== targetPath) {
      window.history.pushState({ dramaSlug: slug, epNum }, '', targetPath);
    }
  };

  const handleCloseDrama = () => {
    const restoreY = savedScrollYRef.current;
    pendingDeepLinkRef.current = null;
    setDeepLinkEpisode(null);
    setSelectedDrama(null);
    document.title = DEFAULT_DOC_TITLE;
    if (!isHandlingPopStateRef.current && (window.location.pathname !== '/' || window.location.search)) {
      window.history.pushState({}, '', '/');
    }
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: restoreY, behavior: 'auto' });
    });
  };
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isInstantSearchOpen, setIsInstantSearchOpen] = useState(false);
  const [instantSearchQuery, setInstantSearchQuery] = useState('');
  const [instantFilter, setInstantFilter] = useState<'All' | 'Hindi Dubbed' | 'Hindi Fan Dubbed' | 'Original / Eng Sub' | 'K-Drama' | 'C-Drama' | 'Movies' | 'Other Series'>('All');
  const [adminInitialTab, setAdminInitialTab] = useState<'trending' | 'weekend' | 'banners' | 'new_drama' | 'broadcast' | 'sheets' | 'supabase' | 'ads' | 'security'>('trending');

  // --- CLOUD-SYNCED AD CONFIGURATION STATE ---
  const [adConfig, setAdConfig] = useState<AdConfig>(() => getLocalAdConfig());

  const handleUpdateAdConfig = async (nextConfig: AdConfig) => {
    setAdConfig(nextConfig);
    return await saveAdConfigToSupabase(nextConfig);
  };

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

  // --- ADMIN AUTH STATE (Persistent across session & localStorage) ---
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return (
      sessionStorage.getItem('asiaflix_admin_session') === 'true' ||
      sessionStorage.getItem('asiaflix_admin_unlocked') === 'true' ||
      localStorage.getItem('asiaflix_admin_unlocked') === 'true'
    );
  });

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('asiaflix_admin_session', 'true');
    sessionStorage.setItem('asiaflix_admin_unlocked', 'true');
    localStorage.setItem('asiaflix_admin_unlocked', 'true');
  };

  const handleAdminAuthLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('asiaflix_admin_session');
    sessionStorage.removeItem('asiaflix_admin_unlocked');
    localStorage.removeItem('asiaflix_admin_unlocked');
  };

  const handleOpenAdminWithTab = (tab: 'trending' | 'weekend' | 'banners' | 'new_drama' | 'broadcast' | 'sheets' | 'supabase' | 'ads' | 'security') => {
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
      saveUserWatchlistToSupabase(supabaseUser.email, watchlist, watchedEpisodesMap, readNotifIdsRef.current);
    }
  }, [watchlist, supabaseUser?.email]);

  useEffect(() => {
    localStorage.setItem('asiaflix_watched_episodes_v3', JSON.stringify(watchedEpisodesMap));
    if (supabaseUser?.email) {
      saveUserWatchlistToSupabase(supabaseUser.email, watchlist, watchedEpisodesMap, readNotifIdsRef.current);
    }
  }, [watchedEpisodesMap, supabaseUser?.email]);

  useEffect(() => {
    localStorage.setItem('asiaflix_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Immediately mark notifications as read & sync to localStorage + Supabase when NotificationDrawer opens
  useEffect(() => {
    if (isNotificationsOpen && notifications.some((n) => !n.isRead)) {
      markNotificationIdsAsRead(notifications.map((n) => n.id));
    }
  }, [isNotificationsOpen, notifications]);

  useEffect(() => {
    localStorage.setItem('asiaflix_google_sheet_url_v4', googleSheetUrl);
  }, [googleSheetUrl]);

  useEffect(() => {
    localStorage.setItem('asiaflix_telegram_bot_settings_v1', JSON.stringify(telegramBotSettings));
  }, [telegramBotSettings]);

  useEffect(() => {
    localStorage.setItem('asiaflix_catalog_layout_mode_v1', catalogLayoutMode);
  }, [catalogLayoutMode]);

  // Auto-resolve /watch/:slug[/ep-:epNum] deep links whenever catalog syncs
  useEffect(() => {
    dramasRef.current = dramas;

    const pending = pendingDeepLinkRef.current;
    if (pending && dramas.length > 0) {
      const matched = findDramaBySlug(dramas, pending.slug);
      if (matched) {
        pendingDeepLinkRef.current = null;
        setDeepLinkEpisode(pending.epNum);
        setSelectedDrama(matched);
        document.title =
          pending.epNum !== null
            ? `Ep ${pending.epNum} • ${matched.title} | AsiaFlix Prime`
            : `${matched.title} — Watch Online in HD | AsiaFlix Prime`;
        return;
      }
    }

    if (selectedDrama) {
      const updatedSelected = dramas.find((d) => d.id === selectedDrama.id);
      if (updatedSelected && updatedSelected !== selectedDrama) {
        setSelectedDrama(updatedSelected);
      }
    }
  }, [dramas]);

  // Handle Browser Back / Forward buttons (popstate) cleanly for /watch/... deep links
  useEffect(() => {
    const handlePopState = () => {
      isHandlingPopStateRef.current = true;
      const parsed = parseDeepLinkFromLocation();
      if (!parsed) {
        pendingDeepLinkRef.current = null;
        setDeepLinkEpisode(null);
        setSelectedDrama(null);
        document.title = DEFAULT_DOC_TITLE;
      } else {
        const matched = findDramaBySlug(dramasRef.current, parsed.slug);
        if (matched) {
          pendingDeepLinkRef.current = null;
          setSelectedDrama(matched);
          setDeepLinkEpisode(parsed.epNum);
          document.title =
            parsed.epNum !== null
              ? `Ep ${parsed.epNum} • ${matched.title} | AsiaFlix Prime`
              : `${matched.title} — Watch Online in HD | AsiaFlix Prime`;
        } else {
          pendingDeepLinkRef.current = parsed;
        }
      }
      window.setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Initial sync: Restore cloud watchlist & read notifications if user is logged in, then sync catalog & notifications
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
              if (res.readNotifIds && res.readNotifIds.length > 0) {
                const mergedReadIds = Array.from(new Set([...readNotifIdsRef.current, ...res.readNotifIds]));
                readNotifIdsRef.current = mergedReadIds;
                setReadNotifIds(mergedReadIds);
                localStorage.setItem('asiaflix_read_notif_ids_v1', JSON.stringify(mergedReadIds));
                setNotifications((prev) => applyReadStateToNotifs(prev, mergedReadIds));
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
          supabaseUserRef.current = userObj;
          localStorage.setItem('asiaflix_logged_in_user_v1', JSON.stringify(userObj));
          syncUserAccountWithSupabase(u.email, undefined, 'fetch').then((res) => {
            if (res.success && res.readNotifIds && res.readNotifIds.length > 0) {
              const mergedReadIds = Array.from(new Set([...readNotifIdsRef.current, ...res.readNotifIds]));
              readNotifIdsRef.current = mergedReadIds;
              setReadNotifIds(mergedReadIds);
              localStorage.setItem('asiaflix_read_notif_ids_v1', JSON.stringify(mergedReadIds));
              setNotifications((prev) => applyReadStateToNotifs(prev, mergedReadIds));
            }
          });
        }
      });
    }

    syncCatalogAndNotifs();
  }, []);

  // Register background Service Worker & auto-request OS notification permission on first interaction
  useEffect(() => {
    registerServiceWorker();

    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const handleFirstInteraction = () => {
      window.removeEventListener('click', handleFirstInteraction, true);
      window.removeEventListener('touchstart', handleFirstInteraction, true);
      if ('Notification' in window && Notification.permission === 'default') {
        requestBrowserNotificationPermission();
      }
    };

    window.addEventListener('click', handleFirstInteraction, { capture: true, once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { capture: true, once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction, true);
      window.removeEventListener('touchstart', handleFirstInteraction, true);
    };
  }, []);

  // Auto-trigger on-screen toast queue & native phone push notification for un-alerted notifications
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      enqueueDeviceAlerts(notifications);
    }, 900);
    return () => clearTimeout(timer);
  }, [notifications, enqueueDeviceAlerts]);

  // Background live sync: silently poll Google Sheet and Supabase ad/notifications every 45 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchGoogleSheetData();
      fetchAdConfigFromSupabase().then((cfg) => setAdConfig(cfg)).catch(() => {});
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
      // Fetch live Ad Configuration from Supabase (__AD_CONFIG__)
      const sbAdConfig = await fetchAdConfigFromSupabase();
      setAdConfig(sbAdConfig);

      // Purge any old spam notifications from Supabase
      await cleanupOldSpamNotificationsFromSupabase();

      const sbNotifs = await fetchNotificationsFromSupabase();
      if (sbNotifs) {
        const mergedNotifs = applyReadStateToNotifs(sbNotifs);
        setNotifications(mergedNotifs);
        localStorage.setItem('asiaflix_notifications', JSON.stringify(mergedNotifs));
      }
    } catch {
      // Silent fallback
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

  // Normalize direct video/audio media URLs (e.g. convert HuggingFace /blob/ pages into direct /resolve/ media streams)
  const normalizeDirectMediaUrl = (rawUrl: string): string => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return '';
    if (trimmed.includes('huggingface.co') && trimmed.includes('/blob/')) {
      return trimmed.replace('/blob/', '/resolve/');
    }
    return trimmed;
  };

  // Helper to parse multi-line or single episode links + Es1/Es2/Es3 stream links from T1/T2/T3 columns
  const parseTrackEpisodesAndStreams = (
    rawText: string,
    audio: AudioType,
    dramaId: string,
    cleanTitle: string,
    isFilm: boolean,
    detailsRaw?: string
  ): { episodes: EpisodeItem[]; movieStreamUrl?: string } => {
    if (!rawText || !rawText.trim()) return { episodes: [] };

    const audioLabel = audio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : audio;
    const isT1 = audio === 'Hindi Dubbed';
    const isT2 = audio === 'Hindi Fan Dubbed' || audio === 'Fan Dubbed';
    const isT3 = audio === 'Original / Eng Sub';

    const assignStream = (ep: EpisodeItem, url: string) => {
      if (!url) return;
      if (isT1) ep.streamLink = url;
      else if (isT2) ep.hindiFanDubStreamLink = url;
      else if (isT3) ep.engSubStreamLink = url;
    };

    // 1. Extract numbered Es1, Es2, Es 1, ES1, Es-1, Stream1, Stream 1 links across entire cell
    const streamMap = new Map<number, string>();
    const numberedStreamRegex = /\b(?:es|stream)\s*[-_#]?\s*(\d+)\s*[:=\-|]?\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
    let sm: RegExpExecArray | null;
    while ((sm = numberedStreamRegex.exec(rawText)) !== null) {
      const epNum = parseInt(sm[1], 10);
      const sUrl = normalizeDirectMediaUrl(sm[2]);
      if (!Number.isNaN(epNum) && sUrl && !streamMap.has(epNum)) {
        streamMap.set(epNum, sUrl);
      }
    }

    // 2. Extract unnumbered single-cell / movie stream link (e.g. "Es = https://..." or "Stream: https://...")
    const textWithoutNumberedStreams = rawText.replace(
      /\b(?:es|stream)\s*[-_#]?\s*\d+\s*[:=\-|]?\s*https?:\/\/[^\s,\n|"'<>]+/gi,
      ' '
    );
    const unnumberedStreamMatch = textWithoutNumberedStreams.match(
      /\b(?:es|stream)\b\s*[:=\-|]*\s*(https?:\/\/[^\s,\n|"'<>]+)/i
    );
    const unnumberedStreamUrl = unnumberedStreamMatch ? normalizeDirectMediaUrl(unnumberedStreamMatch[1]) : undefined;

    const rawLines = rawText.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    const episodes: EpisodeItem[] = [];

    rawLines.forEach((line, idx) => {
      // Strip Es/Stream clauses from line before extracting Telegram URL so Es URLs are never misread as Telegram URLs
      const lineForTelegram = line
        .replace(/\b(?:es|stream)\s*(?:[-_#]?\s*\d+)?\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi, ' ')
        .trim();

      if (!lineForTelegram) return;

      const urlMatch = lineForTelegram.match(/https?:\/\/[^\s"',|<>]+/);
      if (!urlMatch) return;
      const url = urlMatch[0];

      // Match explicit episode range or episode number (e.g. "Ep 1-3", "Episodes 7-10", "Ep 4", "Part 2", "E05")
      const rangeMatch =
        lineForTelegram.match(/(?:ep|episode|part|e)\s*[:=\.\-]?\s*(\d+\s*-\s*\d+)/i) ||
        lineForTelegram.match(/^(\d+\s*-\s*\d+)\s*[:=\.\-]/);
      const singleMatch =
        lineForTelegram.match(/(?:ep|episode|part|e)\s*[:=\.\-]?\s*(\d+)/i) ||
        lineForTelegram.match(/^(\d+)\s*[:=\.\-]/);

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
        const telegramOnlyLineCount = rawLines.filter(
          (l) =>
            l
              .replace(/\b(?:es|stream)\s*(?:[-_#]?\s*\d+)?\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi, ' ')
              .match(/https?:\/\/[^\s"',|<>]+/) !== null
        ).length;
        const isMulti = telegramOnlyLineCount > 1;
        const fallbackEp = isFilm ? 'Full Movie' : isMulti ? idx + 1 : 'Full Series Batch';
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

    // 3. Merge Es<N> stream links into matching episodes or create stream-only episode entries
    streamMap.forEach((sUrl, epNum) => {
      const targetEp =
        episodes.find((ep) => ep.episodeNumber === epNum) ||
        (isFilm && epNum === 1 && episodes.length === 1 ? episodes[0] : undefined);

      if (targetEp) {
        assignStream(targetEp, sUrl);
      } else {
        const newEp: EpisodeItem = {
          id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${epNum}`,
          episodeNumber: epNum,
          title: isFilm ? `${cleanTitle} (1080p FHD Movie)` : `${cleanTitle} — Episode ${epNum} (${audioLabel})`,
          audio,
          telegramUrl: '',
          duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
          quality: '1080p FHD',
          isMerged: false,
          format: isFilm ? 'movie' : 'single',
        };
        assignStream(newEp, sUrl);
        episodes.push(newEp);
      }
    });

    // 4. Attach unnumbered movie/single stream URL (e.g. Es = https://...) to Episode 1 / Full Movie
    if (unnumberedStreamUrl) {
      const targetEp =
        episodes.find((ep) => ep.episodeNumber === 1 || ep.episodeNumber === 'Full Movie') || episodes[0];
      if (targetEp) {
        assignStream(targetEp, unnumberedStreamUrl);
      } else {
        const newEp: EpisodeItem = {
          id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${isFilm ? 'movie' : '1'}`,
          episodeNumber: isFilm ? 'Full Movie' : 1,
          title: isFilm ? `${cleanTitle} (1080p FHD Movie)` : `${cleanTitle} — Episode 1 (${audioLabel})`,
          audio,
          telegramUrl: '',
          duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
          quality: '1080p FHD',
          isMerged: false,
          format: isFilm ? 'movie' : 'single',
        };
        assignStream(newEp, unnumberedStreamUrl);
        episodes.push(newEp);
      }
    }

    // 5. Sort numeric episodes cleanly in ascending order
    episodes.sort((a, b) => {
      const aNum = typeof a.episodeNumber === 'number' ? a.episodeNumber : parseInt(String(a.episodeNumber), 10);
      const bNum = typeof b.episodeNumber === 'number' ? b.episodeNumber : parseInt(String(b.episodeNumber), 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      if (!Number.isNaN(aNum)) return -1;
      if (!Number.isNaN(bNum)) return 1;
      return 0;
    });

    const movieStreamUrl =
      unnumberedStreamUrl ||
      streamMap.get(1) ||
      (isFilm ? Array.from(streamMap.values())[0] : undefined);

    return { episodes, movieStreamUrl };
  };

  const fetchGoogleSheetData = async (targetUrl?: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    setSheetSyncState((prev) => ({ ...prev, isSyncing: true }));
    const rawUrl = targetUrl || googleSheetUrl || SHEET_CSV_URL;
    const sheetIdMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : '1uz-4QI_K5VGhWeqgx32jZnZffaB0oTGCpbS9hmxEN8U';
    const ts = Date.now();

    const candidateUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=0&t=${ts}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0&t=${ts}`,
      `/assets/aistudio/AsiaFlix_Catalog_5a28a2f8`,
    ];

    try {
      let text = '';
      for (const candidate of candidateUrls) {
        try {
          const res = await fetch(candidate, { cache: 'no-store' });
          if (res.ok) {
            const body = await res.text();
            if (body && body.length >= 50 && !body.trim().startsWith('<!DOCTYPE') && !body.trim().startsWith('<html')) {
              text = body;
              break;
            }
          }
        } catch {
          // Silent fallback
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

      const findHeaderCol = (matchers: Array<(h: string) => boolean>, fallbackIdx = -1): number => {
        for (const matcher of matchers) {
          const found = header.findIndex(matcher);
          if (found >= 0) return found;
        }
        return fallbackIdx;
      };

      const isNotEpCol = (h: string) => !/\b(ep|eps|episode|episodes)\b/i.test(h);

      const titleIdx = findHeaderCol([(h) => h === 'title' || h === 'name', (h) => h.includes('title')]);
      const catIdx = findHeaderCol([(h) => h === 'category', (h) => !h.includes('sub') && h.includes('category')]);
      const countryIdx = findHeaderCol([(h) => h === 'country' || h === 'origin', (h) => h.includes('country')]);
      const ageRatingIdx = findHeaderCol([(h) => h.includes('age')]);
      const posterIdx = findHeaderCol([(h) => h.includes('poster') || h === 'image' || h.includes('cover')]);
      const audioIdx = findHeaderCol(
        [
          (h) => h === 'audio' || h === 'custom audio' || h.includes('audio track'),
          (h) => h.includes('audio') && !h.includes('sub'),
        ],
        !header[13] || header[13].includes('audio') ? 13 : -1
      );
      const thumbnailIdx = findHeaderCol(
        [
          (h) => h === 'thumbnail' || h === 'thumb',
          (h) => h.includes('thumbnail') || h.includes('thumb url'),
        ],
        header[14] && (header[14].includes('thumbnail') || header[14] === 'thumb') ? 14 : -1
      );
      const subCategoryIdx = findHeaderCol([
        (h) => h.includes('sub-category') || h.includes('sub category') || h.includes('sub-genre') || h.includes('content type'),
      ]);
      const synopsisIdx = findHeaderCol([(h) => h.includes('synopsis') || h.includes('desc') || h.includes('plot')]);
      const castIdx = findHeaderCol([(h) => h.includes('lead cast') || h.includes('cast') || h.includes('actor')]);
      const ratingIdx = findHeaderCol([(h) => h === 'rating' || h === 'score']);
      const tagsIdx = findHeaderCol([(h) => h.includes('hashtag') || h.includes('hastag') || h.includes('tags')]);
      const detailsIdx = findHeaderCol([(h) => h === 'details' || h.includes('detail')]);

      // Telegram / Stream 1, 2, 3 indices (header-aware so shifted columns never collide with T1 Ep / T2 Ep / T3 Ep)
      const telegramHindiIdx = findHeaderCol([
        (h) => h === 't1' || h === 'telegram 1' || h === 'telegram1',
        (h) => isNotEpCol(h) && (h.includes('telegram 1') || h.includes('telegram1') || h.startsWith('t1 ')),
        (h) => isNotEpCol(h) && h.includes('hindi') && !h.includes('fan'),
      ]);
      const telegramFanDubIdx = findHeaderCol([
        (h) => h === 't2' || h === 'telegram 2' || h === 'telegram2',
        (h) => isNotEpCol(h) && (h.includes('telegram 2') || h.includes('telegram2') || h.startsWith('t2 ')),
        (h) => isNotEpCol(h) && h.includes('fan'),
      ]);
      const telegramOrigIdx = findHeaderCol([
        (h) => h === 't3' || h === 'telegram 3' || h === 'telegram3',
        (h) => isNotEpCol(h) && (h.includes('telegram 3') || h.includes('telegram3') || h.startsWith('t3 ')),
        (h) => isNotEpCol(h) && (h.includes('orig') || h.includes('eng sub')),
      ]);

      const scheduleIdx = findHeaderCol([(h) => h.includes('schedule') || h.includes('shedule')]);
      const statusIdx = findHeaderCol([(h) => h === 'status' || h.includes('status')]);
      const bannerIdx = findHeaderCol([(h) => h.includes('hero banner') || h.includes('banner')]);
      const noticeIdx = findHeaderCol([(h) => h.includes('notice')]);
      const trendingIdx = findHeaderCol([
        (h) => h.includes('top trending') || h.includes('trending now') || h.includes('trending'),
      ]);
      const logoIdx = findHeaderCol([(h) => h.includes('logo')]);
      const weekendIdx = findHeaderCol([(h) => h.includes('weekend') || h.includes('lineup') || h.includes('mega')]);
      const issueFixedIdx = findHeaderCol([
        (h) => h === 'issuefixed' || h === 'issue fixed' || h.includes('issue fixed') || h === 'fixed' || h === 'resolved',
      ]);
      const issueIdx = findHeaderCol([
        (h) =>
          (h === 'issue' ||
            h === 'issues' ||
            h === 'reportedissue' ||
            h === 'reported issue' ||
            h === 'active issue' ||
            (h.includes('issue') && !h.includes('fix'))) &&
          header.indexOf(h) !== issueFixedIdx,
      ]);

      const normalizeSheetThumbnailUrl = (rawImgUrl: string): string => {
        const trimmedUrl = (rawImgUrl || '').trim();
        if (!/^https?:\/\//i.test(trimmedUrl)) return '';
        const driveFileMatch =
          trimmedUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
          trimmedUrl.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
        if (driveFileMatch) {
          return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w1600`;
        }
        return trimmedUrl;
      };

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
        const countryVal = countryIdx >= 0 ? row[countryIdx]?.trim() || '' : '';
        const ageRating = ageRatingIdx >= 0 ? row[ageRatingIdx]?.trim() || '' : '';
        const poster = posterIdx >= 0 ? row[posterIdx]?.trim() || '' : '';
        const rawAudioCell = audioIdx >= 0 ? row[audioIdx]?.trim() || '' : '';
        const rawThumbnailCell = thumbnailIdx >= 0 ? row[thumbnailIdx]?.trim() || '' : '';

        // Parse Column N (Audio) -> HD1/HD2... (Hindi Dub), FD1/FD2... (Fan Dub), OS1/OS2... (Original/Eng Sub)
        const hindiAudioMap = new Map<number, string>();
        const fanDubAudioMap = new Map<number, string>();
        const origAudioMap = new Map<number, string>();

        if (rawAudioCell) {
          const hdRegex = /\bhd\s*[-_#]?\s*(\d+)\s*[:=\-|]?\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
          let am: RegExpExecArray | null;
          while ((am = hdRegex.exec(rawAudioCell)) !== null) {
            const epNum = parseInt(am[1], 10);
            const aUrl = normalizeDirectMediaUrl(am[2]);
            if (!Number.isNaN(epNum) && aUrl && !hindiAudioMap.has(epNum)) {
              hindiAudioMap.set(epNum, aUrl);
            }
          }

          const fdRegex = /\bfd\s*[-_#]?\s*(\d+)\s*[:=\-|]?\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
          while ((am = fdRegex.exec(rawAudioCell)) !== null) {
            const epNum = parseInt(am[1], 10);
            const aUrl = normalizeDirectMediaUrl(am[2]);
            if (!Number.isNaN(epNum) && aUrl && !fanDubAudioMap.has(epNum)) {
              fanDubAudioMap.set(epNum, aUrl);
            }
          }

          const osRegex = /\bos\s*[-_#]?\s*(\d+)\s*[:=\-|]?\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
          while ((am = osRegex.exec(rawAudioCell)) !== null) {
            const epNum = parseInt(am[1], 10);
            const aUrl = normalizeDirectMediaUrl(am[2]);
            if (!Number.isNaN(epNum) && aUrl && !origAudioMap.has(epNum)) {
              origAudioMap.set(epNum, aUrl);
            }
          }

          // Generic Ep1/Ep2 fallback inside Audio column (only after stripping HD/FD/OS tokens) -> Hindi Dubbed
          const withoutTrackAudio = rawAudioCell.replace(
            /\b(?:hd|fd|os)\s*[-_#]?\s*\d*\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi,
            ' '
          );
          const epAudioRegex = /\b(?:ep|episode|e)\s*[-_#]?\s*(\d+)\s*[:=\-|]?\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
          while ((am = epAudioRegex.exec(withoutTrackAudio)) !== null) {
            const epNum = parseInt(am[1], 10);
            const aUrl = normalizeDirectMediaUrl(am[2]);
            if (!Number.isNaN(epNum) && aUrl && !hindiAudioMap.has(epNum)) {
              hindiAudioMap.set(epNum, aUrl);
            }
          }

          // Unnumbered track prefixes or single direct movie/episode URL
          const hdUnnumbered = rawAudioCell.match(/\bhd\b\s*[:=\-|]+\s*(https?:\/\/[^\s,\n|"'<>]+)/i);
          if (hdUnnumbered && !hindiAudioMap.has(1)) {
            hindiAudioMap.set(1, normalizeDirectMediaUrl(hdUnnumbered[1]));
          }
          const fdUnnumbered = rawAudioCell.match(/\bfd\b\s*[:=\-|]+\s*(https?:\/\/[^\s,\n|"'<>]+)/i);
          if (fdUnnumbered && !fanDubAudioMap.has(1)) {
            fanDubAudioMap.set(1, normalizeDirectMediaUrl(fdUnnumbered[1]));
          }
          const osUnnumbered = rawAudioCell.match(/\bos\b\s*[:=\-|]+\s*(https?:\/\/[^\s,\n|"'<>]+)/i);
          if (osUnnumbered && !origAudioMap.has(1)) {
            origAudioMap.set(1, normalizeDirectMediaUrl(osUnnumbered[1]));
          }

          if (hindiAudioMap.size === 0 && fanDubAudioMap.size === 0 && origAudioMap.size === 0) {
            const singleRawAudio = rawAudioCell.match(/https?:\/\/[^\s,\n|"'<>]+/);
            if (singleRawAudio) {
              hindiAudioMap.set(1, normalizeDirectMediaUrl(singleRawAudio[0]));
            }
          }
        }

        let parsedDefaultThumbnail: string | undefined;
        let parsedEpisodeThumbnails: Record<number, string> | undefined;
        if (rawThumbnailCell) {
          const epThumbMap: Record<number, string> = {};
          const epThumbRegex = /\b(?:ep|episode|es)\s*[-_#]?\s*(\d+)\s*[:=\-|]?\s*(https?:\/\/[^\s,\n|"'<>]+)/gi;
          let tm: RegExpExecArray | null;
          let firstEpThumb: string | undefined;
          while ((tm = epThumbRegex.exec(rawThumbnailCell)) !== null) {
            const epNum = parseInt(tm[1], 10);
            const normalizedThumb = normalizeSheetThumbnailUrl(tm[2]);
            if (!Number.isNaN(epNum) && normalizedThumb) {
              if (!epThumbMap[epNum]) epThumbMap[epNum] = normalizedThumb;
              if (!firstEpThumb) firstEpThumb = normalizedThumb;
            }
          }

          if (Object.keys(epThumbMap).length > 0) {
            parsedEpisodeThumbnails = epThumbMap;
            parsedDefaultThumbnail = firstEpThumb;
          } else {
            const directThumbMatch = rawThumbnailCell.match(/https?:\/\/[^\s"',|<>]+/);
            if (directThumbMatch) {
              const normalizedDirect = normalizeSheetThumbnailUrl(directThumbMatch[0]);
              if (normalizedDirect) {
                parsedDefaultThumbnail = normalizedDirect;
              }
            }
          }
        }

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
        const issueVal = issueIdx >= 0 ? row[issueIdx]?.trim() || '' : '';
        const issueFixedVal = issueFixedIdx >= 0 ? row[issueFixedIdx]?.trim() || '' : '';

        // Check if Movie or Holly/Bolly
        const catLower = categoryRaw.toLowerCase();
        const subLower = subCategory.toLowerCase();
        const countryLower = countryVal.toLowerCase();
        const titleLower = cleanTitle.toLowerCase();
        const isHollyBollyRow =
          catLower === 'holly/bolly' ||
          catLower.includes('bolly') ||
          catLower.includes('holly') ||
          subLower.includes('bolly') ||
          subLower.includes('holly') ||
          subLower.includes('indian') ||
          countryLower.includes('india') ||
          countryLower.includes('usa') ||
          countryLower.includes('uk') ||
          titleLower.includes('ramayana') ||
          titleLower.includes('hanuman') ||
          titleLower.includes('dhamaal');
        const isFilm = catLower.includes('movie') || catLower.includes('film') || catLower.includes('bolly') || catLower.includes('holly') ||
          subLower.includes('movie') || subLower.includes('film') ||
          Boolean(detailsRaw && detailsRaw.includes(':') && !detailsRaw.toLowerCase().includes('ep'));

        let dramaCategory: DramaCategory = 'K-Drama';
        if (isHollyBollyRow) dramaCategory = 'Hollywood / Bollywood';
        else if (catLower.includes('c-drama') || catLower.includes('chinese')) dramaCategory = 'C-Drama';
        else if (catLower.includes('movie') || catLower.includes('film')) dramaCategory = 'Asian Movies';
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

        const extractFirstUrl = (text: string) => {
          const withoutStreams = text.replace(
            /\b(?:es|stream)\s*(?:[-_#]?\s*\d+)?\s*[:=\-|]*\s*https?:\/\/[^\s,\n|"'<>]+/gi,
            ' '
          );
          const telegramM = withoutStreams.match(/https?:\/\/[^\s"',|<>]+/);
          if (telegramM) return telegramM[0];
          const anyM = text.match(/https?:\/\/[^\s"',|<>]+/);
          return anyM ? anyM[0] : text;
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

        // Parse multi-line or single episode links + Es1/Es2/Es3 stream links from all 3 columns
        const hindiParsed = hasHindiHttp
          ? parseTrackEpisodesAndStreams(tHindi, 'Hindi Dubbed', dramaId, cleanTitle, isFilm, detailsRaw)
          : { episodes: [] };
        const fanParsed = hasFanDubHttp
          ? parseTrackEpisodesAndStreams(tFanDub, 'Hindi Fan Dubbed', dramaId, cleanTitle, isFilm, detailsRaw)
          : { episodes: [] };
        const origParsed = hasOrigHttp
          ? parseTrackEpisodesAndStreams(tOrig, 'Original / Eng Sub', dramaId, cleanTitle, isFilm, detailsRaw)
          : { episodes: [] };

        const hindiEpisodes = hindiParsed.episodes;
        const fanEpisodes = fanParsed.episodes;
        const origEpisodes = origParsed.episodes;

        // Smart Video + Audio Pairing across Track 1 (HD), Track 2 (FD), Track 3 (OS)
        const getEpNumValue = (ep: EpisodeItem): number | null => {
          if (typeof ep.episodeNumber === 'number') return ep.episodeNumber;
          if (ep.episodeNumber === 'Full Movie' || (isFilm && String(ep.episodeNumber).toLowerCase().includes('movie'))) {
            return 1;
          }
          const m = String(ep.episodeNumber).match(/(\d+)/);
          return m ? parseInt(m[1], 10) : null;
        };

        const findEpByNum = (list: EpisodeItem[], epNum: number): EpisodeItem | undefined =>
          list.find((ep) => getEpNumValue(ep) === epNum) ||
          (isFilm && epNum === 1 && list.length === 1 ? list[0] : undefined);

        const allPairableEpNums = new Set<number>();
        hindiEpisodes.forEach((ep) => { const n = getEpNumValue(ep); if (n !== null) allPairableEpNums.add(n); });
        fanEpisodes.forEach((ep) => { const n = getEpNumValue(ep); if (n !== null) allPairableEpNums.add(n); });
        origEpisodes.forEach((ep) => { const n = getEpNumValue(ep); if (n !== null) allPairableEpNums.add(n); });
        hindiAudioMap.forEach((_, n) => allPairableEpNums.add(n));
        fanDubAudioMap.forEach((_, n) => allPairableEpNums.add(n));
        origAudioMap.forEach((_, n) => allPairableEpNums.add(n));

        const createBorrowedEpisode = (audio: AudioType, epNum: number): EpisodeItem => {
          const audioLabel = audio === 'Fan Dubbed' ? 'Hindi Fan Dubbed' : audio;
          return {
            id: `ep-${dramaId}-${audio.replace(/[^a-z0-9]/gi, '')}-${isFilm ? 'movie' : epNum}`,
            episodeNumber: isFilm ? 'Full Movie' : epNum,
            title: isFilm ? `${cleanTitle} (1080p FHD Movie)` : `${cleanTitle} — Episode ${epNum} (${audioLabel})`,
            audio,
            telegramUrl: '',
            duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
            quality: '1080p FHD',
            isMerged: false,
            format: isFilm ? 'movie' : 'single',
          };
        };

        Array.from(allPairableEpNums)
          .sort((a, b) => a - b)
          .forEach((epNum) => {
            let hEp = findEpByNum(hindiEpisodes, epNum);
            let fEp = findEpByNum(fanEpisodes, epNum);
            let oEp = findEpByNum(origEpisodes, epNum);

            const fallbackVideoForEp =
              oEp?.engSubStreamLink ||
              hEp?.streamLink ||
              fEp?.hindiFanDubStreamLink ||
              (isFilm && epNum === 1
                ? origParsed.movieStreamUrl || hindiParsed.movieStreamUrl || fanParsed.movieStreamUrl
                : undefined);

            const hdAudioUrl = hindiAudioMap.get(epNum);
            if (hdAudioUrl) {
              if (!hEp) {
                hEp = createBorrowedEpisode('Hindi Dubbed', epNum);
                hindiEpisodes.push(hEp);
              }
              hEp.hindiCustomAudioLink = hdAudioUrl;
              if (!hEp.streamLink && fallbackVideoForEp) {
                hEp.streamLink = fallbackVideoForEp;
              }
            }

            const fdAudioUrl = fanDubAudioMap.get(epNum);
            if (fdAudioUrl) {
              if (!fEp) {
                fEp = createBorrowedEpisode('Hindi Fan Dubbed', epNum);
                fanEpisodes.push(fEp);
              }
              fEp.fanDubCustomAudioLink = fdAudioUrl;
              if (!fEp.hindiFanDubStreamLink && fallbackVideoForEp) {
                fEp.hindiFanDubStreamLink = fallbackVideoForEp;
              }
            }

            const osAudioUrl = origAudioMap.get(epNum);
            if (osAudioUrl) {
              if (!oEp) {
                oEp = createBorrowedEpisode('Original / Eng Sub', epNum);
                origEpisodes.push(oEp);
              }
              oEp.origCustomAudioLink = osAudioUrl;
              if (!oEp.engSubStreamLink && fallbackVideoForEp) {
                oEp.engSubStreamLink = fallbackVideoForEp;
              }
            }
          });

        const sortTrackEpisodes = (list: EpisodeItem[]) => {
          list.sort((a, b) => {
            const aNum = typeof a.episodeNumber === 'number' ? a.episodeNumber : parseInt(String(a.episodeNumber), 10);
            const bNum = typeof b.episodeNumber === 'number' ? b.episodeNumber : parseInt(String(b.episodeNumber), 10);
            if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
            if (!Number.isNaN(aNum)) return -1;
            if (!Number.isNaN(bNum)) return 1;
            return 0;
          });
        };
        sortTrackEpisodes(hindiEpisodes);
        sortTrackEpisodes(fanEpisodes);
        sortTrackEpisodes(origEpisodes);

        const resolvedMovieHindiStream =
          hindiParsed.movieStreamUrl ||
          (isFilm && hindiAudioMap.size > 0
            ? hindiEpisodes[0]?.streamLink || origParsed.movieStreamUrl || fanParsed.movieStreamUrl
            : undefined);
        const resolvedMovieFanDubStream =
          fanParsed.movieStreamUrl ||
          (isFilm && fanDubAudioMap.size > 0
            ? fanEpisodes[0]?.hindiFanDubStreamLink || origParsed.movieStreamUrl || hindiParsed.movieStreamUrl
            : undefined);
        const resolvedMovieOrigStream =
          origParsed.movieStreamUrl ||
          (isFilm && origAudioMap.size > 0
            ? origEpisodes[0]?.engSubStreamLink || hindiParsed.movieStreamUrl || fanParsed.movieStreamUrl
            : undefined);

        // Available audios strictly from T1/T2/T3 http links OR playable paired streams with Column N custom audio
        const hasHindiPlayable =
          hasHindiHttp || hindiEpisodes.some((ep) => Boolean(ep.streamLink)) || Boolean(resolvedMovieHindiStream);
        const hasFanDubPlayable =
          hasFanDubHttp || fanEpisodes.some((ep) => Boolean(ep.hindiFanDubStreamLink)) || Boolean(resolvedMovieFanDubStream);
        const hasOrigPlayable =
          hasOrigHttp || origEpisodes.some((ep) => Boolean(ep.engSubStreamLink)) || Boolean(resolvedMovieOrigStream);

        const availableAudios: AudioType[] = [];
        if (hasHindiPlayable) availableAudios.push('Hindi Dubbed');
        if (hasFanDubPlayable) availableAudios.push('Hindi Fan Dubbed');
        if (hasOrigPlayable) availableAudios.push('Original / Eng Sub');

        const filteredComingSoonAudios = comingSoonAudios.filter((a) => {
          if (a === 'Hindi Dubbed' && hasHindiPlayable) return false;
          if ((a === 'Hindi Fan Dubbed' || a === 'Fan Dubbed') && hasFanDubPlayable) return false;
          if (a === 'Original / Eng Sub' && hasOrigPlayable) return false;
          return true;
        });

        const defaultAudio: AudioType =
          availableAudios[0] || (filteredComingSoonAudios[0] ? filteredComingSoonAudios[0] : 'Hindi Dubbed');

        const applyEpisodeThumbnails = (eps: EpisodeItem[]) => {
          eps.forEach((ep) => {
            const epNum =
              typeof ep.episodeNumber === 'number'
                ? ep.episodeNumber
                : parseInt(String(ep.episodeNumber).match(/(\d+)/)?.[1] || '0', 10);
            const matchedThumb =
              (epNum > 0 && parsedEpisodeThumbnails?.[epNum]) || parsedDefaultThumbnail;
            if (matchedThumb) {
              ep.thumbnailUrl = matchedThumb;
            }
          });
        };

        const parsedEpisodes = [...hindiEpisodes, ...fanEpisodes, ...origEpisodes];
        applyEpisodeThumbnails(parsedEpisodes);

        // Parse total planned episodes from Details (e.g. "10 Episodes" -> 10, "24 Episodes" -> 24)
        let plannedTotal = 0;
        if (detailsRaw) {
          const m = detailsRaw.match(/(\d+)\s*(?:ep|episode)/i) || detailsRaw.match(/(\d+)/);
          if (m) plannedTotal = parseInt(m[1], 10);
        }

        const computeTrackStats = (eps: EpisodeItem[]) => {
          let maxEp = 0;
          let hasExplicitEp = false;
          let isFullPack = false;

          eps.forEach((ep) => {
            if (typeof ep.episodeNumber === 'number') {
              hasExplicitEp = true;
              if (ep.episodeNumber > maxEp) maxEp = ep.episodeNumber;
            } else if (typeof ep.episodeNumber === 'string') {
              const rangeParts = ep.episodeNumber.match(/(\d+)\s*-\s*(\d+)/);
              if (rangeParts) {
                hasExplicitEp = true;
                const endNum = parseInt(rangeParts[2], 10);
                if (endNum > maxEp) maxEp = endNum;
              } else {
                const singleInStr = ep.episodeNumber.match(/(\d+)/);
                if (singleInStr) {
                  hasExplicitEp = true;
                  const n = parseInt(singleInStr[1], 10);
                  if (n > maxEp) maxEp = n;
                } else {
                  isFullPack = true;
                }
              }
            }
          });

          return { maxEp, hasExplicitEp, isFullPack };
        };

        const parseActiveTrackSchedules = (
          schedStr: string,
          allEps: EpisodeItem[],
          t1Val: string | undefined,
          t2Val: string | undefined,
          t3Val: string | undefined,
          csAudios: AudioType[] | undefined,
          plannedTotalVal: number,
          isMovieVal: boolean
        ) => {
          const cleanSched = (schedStr || '').trim();
          if (!cleanSched) return [];

          const prefixRegex = /\b(t1|t2|t3|hindi\s*dub(?:bed)?|fan\s*dub(?:bed)?|orig(?:inal)?)\b\s*[:=\-]?\s*([^,|;\n]+)/gi;
          const perTrackMap: Partial<Record<'t1' | 't2' | 't3', string>> = {};
          let hasPerTrackPrefixes = false;
          let m: RegExpExecArray | null;

          while ((m = prefixRegex.exec(cleanSched)) !== null) {
            hasPerTrackPrefixes = true;
            const tag = m[1].toLowerCase();
            const val = m[2].trim();
            if (!val) continue;
            if (tag === 't1' || tag.startsWith('hindi')) {
              perTrackMap.t1 = val;
            } else if (tag === 't2' || tag.startsWith('fan')) {
              perTrackMap.t2 = val;
            } else if (tag === 't3' || tag.startsWith('orig')) {
              perTrackMap.t3 = val;
            }
          }

          const tracksConfig: Array<{
            key: 't1' | 't2' | 't3';
            audio: AudioType;
            shortLabel: string;
            rawVal: string | undefined;
            eps: EpisodeItem[];
            isCs: boolean;
          }> = [
            {
              key: 't1',
              audio: 'Hindi Dubbed',
              shortLabel: 'Hindi',
              rawVal: t1Val,
              eps: allEps.filter((e) => e.audio === 'Hindi Dubbed'),
              isCs: Boolean(csAudios?.includes('Hindi Dubbed')),
            },
            {
              key: 't2',
              audio: 'Hindi Fan Dubbed',
              shortLabel: 'Fan Dub',
              rawVal: t2Val,
              eps: allEps.filter((e) => e.audio === 'Hindi Fan Dubbed' || e.audio === 'Fan Dubbed'),
              isCs: Boolean(csAudios?.some((a) => a.toLowerCase().includes('fan'))),
            },
            {
              key: 't3',
              audio: 'Original / Eng Sub',
              shortLabel: 'Orig',
              rawVal: t3Val,
              eps: allEps.filter((e) => e.audio === 'Original / Eng Sub'),
              isCs: Boolean(csAudios?.includes('Original / Eng Sub')),
            },
          ];

          const activeList: NonNullable<DramaItem['activeTrackSchedules']> = [];

          tracksConfig.forEach((tr) => {
            const hasHttpLink = Boolean(tr.rawVal && tr.rawVal.toLowerCase().includes('http'));
            const stats = computeTrackStats(tr.eps);
            const trackMaxEp = stats.maxEp;
            const isFullPack = stats.isFullPack;
            const isComingSoon = tr.isCs && !hasHttpLink;

            const isCompleted = !isComingSoon && hasHttpLink && (
              (plannedTotalVal > 0 && trackMaxEp >= plannedTotalVal) ||
              isFullPack ||
              isMovieVal
            );
            if (isCompleted) return;

            const isOngoing = hasHttpLink && trackMaxEp > 0 && (plannedTotalVal === 0 || trackMaxEp < plannedTotalVal) && !isFullPack;
            if (!isOngoing && !isComingSoon) return;

            const scheduleText = hasPerTrackPrefixes
              ? (perTrackMap[tr.key] || '')
              : cleanSched;

            if (!scheduleText) return;

            activeList.push({
              key: tr.key,
              audio: tr.audio,
              shortLabel: tr.shortLabel,
              scheduleText,
              currentEp: trackMaxEp,
              totalEp: plannedTotalVal,
              isComingSoon,
            });
          });

          return activeList;
        };

        // Find highest uploaded episode number and explicit episode tags across all tracks
        const overallStats = computeTrackStats(parsedEpisodes);
        const maxUploadedEp = overallStats.maxEp;
        const hasExplicitEpNumbers = overallStats.hasExplicitEp;
        const hasSingleFullPack = overallStats.isFullPack;

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
          if (parsedDefaultThumbnail && !prev.thumbnailUrl) {
            prev.thumbnailUrl = parsedDefaultThumbnail;
          }
          if (parsedEpisodeThumbnails) {
            prev.episodeThumbnails = { ...(prev.episodeThumbnails || {}), ...parsedEpisodeThumbnails };
          }
          if (detailsRaw && !prev.details) prev.details = detailsRaw;
          if (scheduleRaw && !prev.schedule) prev.schedule = scheduleRaw;
          else if (scheduleRaw && prev.schedule && !prev.schedule.includes(scheduleRaw)) {
            prev.schedule = `${prev.schedule}, ${scheduleRaw}`;
          }
          if (statusText && !prev.statusText) prev.statusText = statusText;
          if (ageRating && !prev.ageRating) prev.ageRating = ageRating;
          if (subCategory && !prev.subCategory) prev.subCategory = subCategory;
          if (issueVal && !prev.issueText) prev.issueText = issueVal;
          if (issueFixedVal && !prev.issueFixedText) prev.issueFixedText = issueFixedVal;
          if (dramaStatus === 'Now Streaming (Ongoing)') {
            prev.status = 'Now Streaming (Ongoing)';
          }
          availableAudios.forEach((a) => {
            if (!prev.availableAudios.includes(a)) prev.availableAudios.push(a);
          });
          if (filteredComingSoonAudios.length > 0) {
            const filteredCs = filteredComingSoonAudios.filter((a) => {
              if (a === 'Hindi Dubbed' && (prev.telegramHindi || prev.episodes.some((e) => e.audio === 'Hindi Dubbed' && Boolean(e.streamLink)))) return false;
              if ((a === 'Hindi Fan Dubbed' || a === 'Fan Dubbed') && (prev.telegramFanDub || prev.episodes.some((e) => (e.audio === 'Hindi Fan Dubbed' || e.audio === 'Fan Dubbed') && Boolean(e.hindiFanDubStreamLink)))) return false;
              if (a === 'Original / Eng Sub' && (prev.telegramOrig || prev.episodes.some((e) => e.audio === 'Original / Eng Sub' && Boolean(e.engSubStreamLink)))) return false;
              return true;
            });
            prev.comingSoonAudios = Array.from(new Set([...(prev.comingSoonAudios || []), ...filteredCs]));
          }
          if (parsedCast.length > 0) {
            prev.leadCast = Array.from(new Set([...(prev.leadCast || []), ...parsedCast]));
          }
          if (parsedTags.length > 0) {
            prev.hashtags = Array.from(new Set([...(prev.hashtags || []), ...parsedTags]));
          }
          // Merge parsed episodes avoiding duplicates while combining Telegram, Stream & Custom Audio links
          const existingEpById = new Map(prev.episodes.map((e) => [e.id, e]));
          parsedEpisodes.forEach((ep) => {
            const existing = existingEpById.get(ep.id);
            if (!existing) {
              prev.episodes.push(ep);
              existingEpById.set(ep.id, ep);
            } else {
              if (ep.telegramUrl && !existing.telegramUrl) existing.telegramUrl = ep.telegramUrl;
              if (ep.streamLink && !existing.streamLink) existing.streamLink = ep.streamLink;
              if (ep.hindiFanDubStreamLink && !existing.hindiFanDubStreamLink) existing.hindiFanDubStreamLink = ep.hindiFanDubStreamLink;
              if (ep.engSubStreamLink && !existing.engSubStreamLink) existing.engSubStreamLink = ep.engSubStreamLink;
              if (ep.hindiCustomAudioLink && !existing.hindiCustomAudioLink) existing.hindiCustomAudioLink = ep.hindiCustomAudioLink;
              if (ep.fanDubCustomAudioLink && !existing.fanDubCustomAudioLink) existing.fanDubCustomAudioLink = ep.fanDubCustomAudioLink;
              if (ep.origCustomAudioLink && !existing.origCustomAudioLink) existing.origCustomAudioLink = ep.origCustomAudioLink;
              if (ep.thumbnailUrl && !existing.thumbnailUrl) existing.thumbnailUrl = ep.thumbnailUrl;
            }
          });
          if (prev.thumbnailUrl || prev.episodeThumbnails) {
            prev.episodes.forEach((ep) => {
              if (!ep.thumbnailUrl) {
                const epNum =
                  typeof ep.episodeNumber === 'number'
                    ? ep.episodeNumber
                    : parseInt(String(ep.episodeNumber).match(/(\d+)/)?.[1] || '0', 10);
                const fallbackThumb = (epNum > 0 && prev.episodeThumbnails?.[epNum]) || prev.thumbnailUrl;
                if (fallbackThumb) ep.thumbnailUrl = fallbackThumb;
              }
            });
          }
          if (resolvedMovieHindiStream && !prev.movieStreamLink) prev.movieStreamLink = resolvedMovieHindiStream;
          if (resolvedMovieFanDubStream && !prev.movieFanDubStreamLink) prev.movieFanDubStreamLink = resolvedMovieFanDubStream;
          if (resolvedMovieOrigStream && !prev.movieEngSubStreamLink) prev.movieEngSubStreamLink = resolvedMovieOrigStream;
          if (prev.episodes.length > (prev.totalEpisodes || 0)) {
            prev.totalEpisodes = prev.episodes.length;
          }
          // Recompute activeTrackSchedules for merged item
          let prevPlannedTotal = 0;
          if (prev.details) {
            const pm = prev.details.match(/(\d+)\s*(?:ep|episode)/i) || prev.details.match(/(\d+)/);
            if (pm) prevPlannedTotal = parseInt(pm[1], 10);
          }
          prev.activeTrackSchedules = parseActiveTrackSchedules(
            prev.schedule || '',
            prev.episodes,
            prev.telegramHindi,
            prev.telegramFanDub,
            prev.telegramOrig,
            prev.comingSoonAudios,
            prevPlannedTotal,
            Boolean(prev.isMovie)
          );
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
                thumbnailUrl: parsedDefaultThumbnail || parsedEpisodeThumbnails?.[1],
                duration: detailsRaw || (isFilm ? 'Full Movie' : '1080p FHD'),
                quality: '1080p FHD',
                isMerged: !isFilm,
                format: isFilm ? ('movie' as const) : ('merged' as const),
              },
            ];

        const activeTrackSchedules = parseActiveTrackSchedules(
          scheduleRaw,
          dramaEpisodes,
          hasHindiHttp ? tHindi : undefined,
          hasFanDubHttp ? tFanDub : undefined,
          hasOrigHttp ? tOrig : undefined,
          filteredComingSoonAudios.length > 0 ? filteredComingSoonAudios : undefined,
          plannedTotal,
          isFilm
        );

        const item: DramaItem = {
          id: dramaId,
          title: cleanTitle,
          category: dramaCategory,
          country: countryVal || undefined,
          releaseYear,
          status: dramaStatus,
          statusText: statusText || undefined,
          ageRating: ageRating || undefined,
          subCategory: effectiveSubCategory || undefined,
          rating: ratingVal || 9.2,
          poster: (poster && poster.startsWith('http')) ? poster : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700',
          backdrop: (poster && poster.startsWith('http')) ? poster : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
          thumbnailUrl: parsedDefaultThumbnail,
          episodeThumbnails: parsedEpisodeThumbnails,
          synopsis: synopsisVal || `Watch ${cleanTitle} in high definition on AsiaFlix Prime Private Channel.`,
          cast: parsedCast.length > 0 ? Array.from(new Set(parsedCast)) : ['AsiaFlix Exclusive'],
          tags: parsedTags.length > 0 
            ? Array.from(new Set(parsedTags)) 
            : Array.from(new Set([dramaCategory, defaultAudio, subCategory].filter(Boolean))),
          scheduleInfo: scheduleRaw || detailsRaw || '2026 VIP Release',
          availableAudios,
          defaultAudio,
          comingSoonAudios: filteredComingSoonAudios.length > 0 ? filteredComingSoonAudios : undefined,
          activeTrackSchedules,
          isFeatured: isTrendingInSheet,
          isTrending: isTrendingInSheet || true,
          isSpotlight: isTrendingInSheet,
          spotlightTag: isTrendingInSheet ? '🔥 TOP TRENDING' : undefined,
          isWeekendLineup: isWeekendRow,
          weekendSlot: isWeekendRow ? 'Sat & Sun Drop' : undefined,
          totalEpisodes: totalEpCount,
          qualityBadge: subCategory || '1080p FHD',
          telegramUrl: primaryLink,
          movieStreamLink: resolvedMovieHindiStream,
          movieFanDubStreamLink: resolvedMovieFanDubStream,
          movieEngSubStreamLink: resolvedMovieOrigStream,
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
          issueText: issueVal || undefined,
          issueFixedText: issueFixedVal || undefined,
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
            // First time / fresh baseline: save baseline snapshot silently to Supabase without blasting notifications
            await saveSheetSnapshotToSupabase(currentSnapshot);
          } else {
            const columnsConfig = [
              { key: 't1' as const, name: 'Hindi Dubbed' },
              { key: 't2' as const, name: 'Hindi Fan Dubbed' },
              { key: 't3' as const, name: 'Original / Eng Sub' },
            ];

            const pendingInserts: Array<{ title: string; message: string }> = [];

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
                  pendingInserts.push({
                    title: d.title,
                    message: `${col.name} Coming Soon!`,
                  });
                }
                // 2. Column changed from 'none' or 'coming_soon' to 'streaming'
                else if ((oldCol.state === 'none' || oldCol.state === 'coming_soon') && currCol.state === 'streaming') {
                  if (currCol.maxEp > 0) {
                    pendingInserts.push({
                      title: d.title,
                      message: `${col.name} Ep ${currCol.maxEp} Added`,
                    });
                  } else {
                    pendingInserts.push({
                      title: d.title,
                      message: `${col.name} Full ${d.isMovie ? 'Movie' : 'Series'} Added`,
                    });
                  }
                }
                // 3. Column was already 'streaming' and col.maxEp > oldCol.maxEp (or col.epCount > oldCol.epCount)
                else if (currCol.state === 'streaming' && oldCol.state === 'streaming') {
                  if (currCol.maxEp > oldCol.maxEp || currCol.epCount > oldCol.epCount) {
                    const epNum = currCol.maxEp > 0 ? currCol.maxEp : currCol.epCount;
                    pendingInserts.push({
                      title: d.title,
                      message: `${col.name} Ep ${epNum} Added`,
                    });
                  }
                }
              }
            }

            // Only insert notifications if 1 to 3 items were updated (protects against bulk blasts)
            if (pendingInserts.length > 0 && pendingInserts.length <= 3) {
              for (const item of pendingInserts) {
                await insertNotificationIntoSupabase(item.title, item.message);
              }
            }

            // Save updated snapshot back to Supabase
            await saveSheetSnapshotToSupabase(currentSnapshot);
          }

          // Compare local Google Sheet episode counts (t1:X|t2:Y|t3:Z) against asiaflix_sheet_ep_snapshot_v2
          const currLocalEpSnap: Record<string, string> = {};
          const localEpNotifs: ReleaseNotification[] = [];
          let prevLocalEpSnap: Record<string, string> | null = null;
          try {
            const rawEpSnap = localStorage.getItem('asiaflix_sheet_ep_snapshot_v2');
            if (rawEpSnap) {
              const parsedSnap = JSON.parse(rawEpSnap);
              if (parsedSnap && typeof parsedSnap === 'object') prevLocalEpSnap = parsedSnap;
            }
          } catch {
            prevLocalEpSnap = null;
          }

          const nowMs = Date.now();
          const nowPermTs = formatPermanentTimestamp(new Date(nowMs));

          uniqueParsed.forEach((d) => {
            const { t1Ep, t2Ep, t3Ep } = getTrackEpisodeCounts(d);
            currLocalEpSnap[d.id] = `t1:${t1Ep}|t2:${t2Ep}|t3:${t3Ep}`;

            if (prevLocalEpSnap && prevLocalEpSnap[d.id]) {
              const m = prevLocalEpSnap[d.id].match(/t1:(\d+)\|t2:(\d+)\|t3:(\d+)/);
              if (m) {
                const prevT1 = parseInt(m[1], 10) || 0;
                const prevT2 = parseInt(m[2], 10) || 0;
                const prevT3 = parseInt(m[3], 10) || 0;

                if (t1Ep > prevT1) {
                  localEpNotifs.push({
                    id: `sheet-ep-${d.id}-t1-ep${t1Ep}`,
                    title: d.title,
                    message: `Hindi Dubbed Ep ${t1Ep} Added`,
                    timestamp: nowPermTs,
                    createdAtMs: nowMs,
                    isRead: false,
                    type: 'new_episode',
                    audioType: 'Hindi Dubbed',
                    dramaId: d.id,
                    posterUrl: d.poster,
                  });
                }
                if (t2Ep > prevT2) {
                  localEpNotifs.push({
                    id: `sheet-ep-${d.id}-t2-ep${t2Ep}`,
                    title: d.title,
                    message: `Hindi Fan Dubbed Ep ${t2Ep} Added`,
                    timestamp: nowPermTs,
                    createdAtMs: nowMs,
                    isRead: false,
                    type: 'new_episode',
                    audioType: 'Hindi Fan Dubbed',
                    dramaId: d.id,
                    posterUrl: d.poster,
                  });
                }
                if (t3Ep > prevT3) {
                  localEpNotifs.push({
                    id: `sheet-ep-${d.id}-t3-ep${t3Ep}`,
                    title: d.title,
                    message: `Original / Eng Sub Ep ${t3Ep} Added`,
                    timestamp: nowPermTs,
                    createdAtMs: nowMs,
                    isRead: false,
                    type: 'new_episode',
                    audioType: 'Original / Eng Sub',
                    dramaId: d.id,
                    posterUrl: d.poster,
                  });
                }
              }
            }
          });

          try {
            localStorage.setItem('asiaflix_sheet_ep_snapshot_v2', JSON.stringify(currLocalEpSnap));
          } catch {}

          // Refresh notifications from Supabase so every browser gets live cloud updates (preserving seen/read state)
          const cloudNotifs = await fetchNotificationsFromSupabase();

          // Save newly detected local episode drops to Supabase if not already present
          if (localEpNotifs.length > 0 && localEpNotifs.length <= 5) {
            for (const epNotif of localEpNotifs) {
              const alreadyInCloud = (cloudNotifs || []).some(
                (c) =>
                  c.title.trim().toLowerCase() === epNotif.title.trim().toLowerCase() &&
                  c.message.trim().toLowerCase() === epNotif.message.trim().toLowerCase()
              );
              if (!alreadyInCloud) {
                await createNotificationInSupabase(epNotif.title, epNotif.message);
              }
            }
          }

          // Load permanent timestamps store for Column T (Issue) & Column U (Issue Fixed)
          let issueTimestampsMap: Record<string, { label: string; ms: number } | string> = {};
          try {
            const savedTs = localStorage.getItem('asiaflix_issue_timestamps_v2');
            if (savedTs) {
              const parsedTs = JSON.parse(savedTs);
              if (parsedTs && typeof parsedTs === 'object') issueTimestampsMap = parsedTs;
            }
          } catch {
            issueTimestampsMap = {};
          }

          const parseBracketTs = (raw: string) => {
            const match = raw.match(/\[([^\]]+)\]/);
            if (!match) return { cleanText: raw.trim(), customTs: '' };
            const customTs = match[1].trim();
            const cleanText = raw.replace(/\s*\[[^\]]+\]\s*/g, ' ').trim();
            return { cleanText, customTs };
          };

          const sheetIssueNotifs: ReleaseNotification[] = [];
          const newIssuesToPushSupabase: Array<{ title: string; message: string }> = [];

          uniqueParsed.forEach((d) => {
            if (d.issueFixedText && d.issueFixedText.trim()) {
              const rawFixed = d.issueFixedText.trim();
              const { cleanText, customTs } = parseBracketTs(rawFixed);
              const notifId = `sheet-fixed-${d.id}-${rawFixed}`;
              const notifTitle = `✅ Issue Fixed: ${d.title}`;

              const cloudMatch = (cloudNotifs || []).find(
                (c) =>
                  c.id === notifId ||
                  (c.title.trim().toLowerCase() === notifTitle.trim().toLowerCase() &&
                    (c.message.trim().toLowerCase() === cleanText.toLowerCase() ||
                      c.message.trim().toLowerCase() === rawFixed.toLowerCase()))
              );

              const storedEntry = issueTimestampsMap[notifId];
              let resolvedLabel = '';
              let resolvedMs = nowMs;

              if (customTs) {
                resolvedLabel = customTs;
                resolvedMs = typeof storedEntry === 'object' && storedEntry ? storedEntry.ms : nowMs;
              } else if (cloudMatch) {
                resolvedLabel = cloudMatch.timestamp;
                resolvedMs = cloudMatch.createdAtMs || nowMs;
                issueTimestampsMap[notifId] = { label: resolvedLabel, ms: resolvedMs };
              } else if (storedEntry) {
                resolvedLabel = typeof storedEntry === 'string' ? storedEntry : storedEntry.label;
                resolvedMs = typeof storedEntry === 'string' ? nowMs : storedEntry.ms;
              } else {
                resolvedLabel = formatPermanentTimestamp(new Date(nowMs));
                resolvedMs = nowMs;
                issueTimestampsMap[notifId] = { label: resolvedLabel, ms: resolvedMs };
                newIssuesToPushSupabase.push({ title: notifTitle, message: cleanText });
              }

              sheetIssueNotifs.push({
                id: notifId,
                title: notifTitle,
                message: cleanText,
                timestamp: resolvedLabel,
                createdAtMs: resolvedMs,
                isRead: Boolean(cloudMatch && readNotifIdsRef.current.includes(cloudMatch.id)),
                type: 'fix',
                dramaId: d.id,
                posterUrl: d.poster,
                badge: '✅ ISSUE FIXED',
              });
            }

            if (d.issueText && d.issueText.trim()) {
              const rawIssue = d.issueText.trim();
              const { cleanText, customTs } = parseBracketTs(rawIssue);
              const notifId = `sheet-issue-${d.id}-${rawIssue}`;
              const notifTitle = `⚠️ Issue Reported: ${d.title}`;
              const notifMessage = `${cleanText} (Our team is fixing this right now)`;

              const cloudMatch = (cloudNotifs || []).find(
                (c) =>
                  c.id === notifId ||
                  (c.title.trim().toLowerCase() === notifTitle.trim().toLowerCase() &&
                    (c.message.trim().toLowerCase() === notifMessage.toLowerCase() ||
                      c.message.trim().toLowerCase().includes(cleanText.toLowerCase())))
              );

              const storedEntry = issueTimestampsMap[notifId];
              let resolvedLabel = '';
              let resolvedMs = nowMs;

              if (customTs) {
                resolvedLabel = customTs;
                resolvedMs = typeof storedEntry === 'object' && storedEntry ? storedEntry.ms : nowMs;
              } else if (cloudMatch) {
                resolvedLabel = cloudMatch.timestamp;
                resolvedMs = cloudMatch.createdAtMs || nowMs;
                issueTimestampsMap[notifId] = { label: resolvedLabel, ms: resolvedMs };
              } else if (storedEntry) {
                resolvedLabel = typeof storedEntry === 'string' ? storedEntry : storedEntry.label;
                resolvedMs = typeof storedEntry === 'string' ? nowMs : storedEntry.ms;
              } else {
                resolvedLabel = formatPermanentTimestamp(new Date(nowMs));
                resolvedMs = nowMs;
                issueTimestampsMap[notifId] = { label: resolvedLabel, ms: resolvedMs };
                newIssuesToPushSupabase.push({ title: notifTitle, message: notifMessage });
              }

              sheetIssueNotifs.push({
                id: notifId,
                title: notifTitle,
                message: notifMessage,
                timestamp: resolvedLabel,
                createdAtMs: resolvedMs,
                isRead: Boolean(cloudMatch && readNotifIdsRef.current.includes(cloudMatch.id)),
                type: 'issue',
                dramaId: d.id,
                posterUrl: d.poster,
                badge: '⚠️ UNDER FIX',
              });
            }
          });

          try {
            localStorage.setItem('asiaflix_issue_timestamps_v2', JSON.stringify(issueTimestampsMap));
          } catch {}

          // Push newly created first-time sheet issues/fixes once to Supabase
          if (newIssuesToPushSupabase.length > 0 && newIssuesToPushSupabase.length <= 8) {
            for (const item of newIssuesToPushSupabase) {
              await createNotificationInSupabase(item.title, item.message);
            }
          }

          // Deduplicate combined notifications (deterministic sheet alerts + Supabase rows) while keeping read state
          const combinedRaw = [...localEpNotifs, ...sheetIssueNotifs, ...(cloudNotifs || [])];
          const dedupedMap = new Map<string, ReleaseNotification>();
          const seenTitleMsg = new Set<string>();

          combinedRaw.forEach((n) => {
            if (dedupedMap.has(n.id)) return;
            const sig = `${n.title.trim().toLowerCase()}||${n.message.trim().toLowerCase()}`;
            if (seenTitleMsg.has(sig)) return;
            seenTitleMsg.add(sig);
            dedupedMap.set(n.id, n);
          });

          const mergedAllNotifs = applyReadStateToNotifs(Array.from(dedupedMap.values()));

          if (mergedAllNotifs.length > 0) {
            setNotifications(mergedAllNotifs);
            localStorage.setItem('asiaflix_notifications', JSON.stringify(mergedAllNotifs));
            enqueueDeviceAlerts(mergedAllNotifs);
          }
        } catch {
          // Silent cloud notification sync catch
        }
      }

      setSheetSyncState({
        isSyncing: false,
        lastSyncedCount: uniqueParsed.length,
        lastSyncedTime: new Date().toLocaleTimeString(),
      });

      return { success: true, count: uniqueParsed.length };
    } catch (err: any) {
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
    markNotificationIdsAsRead(notifications.map((n) => n.id));
  };

  const handleClearAllNotifications = async () => {
    setNotifications([]);
    localStorage.removeItem('asiaflix_notifications');
    try {
      await clearAllNotificationsFromSupabase();
    } catch (e) {
      console.warn('Error clearing notifications from Supabase:', e);
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await deleteNotificationFromSupabase(notifId);
    } catch (e) {
      console.warn('Error deleting notification from Supabase:', e);
    }
  };

  const handleSelectNotification = (notif: ReleaseNotification) => {
    markNotificationIdsAsRead([notif.id]);
    if (notif.dramaId) {
      const drama = dramas.find((d) => d.id === notif.dramaId);
      if (drama) handleOpenDrama(drama);
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
        if (selectedCategory === 'Asian Movies' || selectedCategory === 'Movies') {
          if (!isAsianMovieTitle(d)) return false;
        } else if (selectedCategory === 'Hollywood / Bollywood' || selectedCategory === 'Holly/Bolly') {
          if (!isHollyBollyTitle(d)) return false;
        } else if (selectedCategory === 'Other Series' || selectedCategory === 'J-Drama') {
          const isMovie = d.isMovie || d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie');
          const isOther =
            !isMovie &&
            !isHollyBollyTitle(d) &&
            d.category !== 'K-Drama' &&
            d.category !== 'C-Drama' &&
            d.category !== 'Asian Movies' &&
            d.category !== 'Hollywood / Bollywood';
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

  // Weekly Episode Drops & Airing Lineup items (STRICT: only titles that have active per-track schedules)
  const weekendDramas = useMemo(() => {
    const seen = new Set<string>();
    return dramas.filter((d) => {
      if (!d || !d.id || seen.has(d.id)) return false;
      const hasActiveSchedules = Boolean(d.activeTrackSchedules && d.activeTrackSchedules.length > 0);
      if (hasActiveSchedules) {
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
  
  // STRICT: Only include titles that actually have active streaming links in their respective column (T1, T2, T3)
  const hindiDubbedList = useMemo(() => dramas.filter((d) => 
    Boolean(d.telegramHindi && d.telegramHindi.toLowerCase().includes('http'))
  ), [dramas]);
  const fanDubbedList = useMemo(() => dramas.filter((d) => 
    Boolean(d.telegramFanDub && d.telegramFanDub.toLowerCase().includes('http'))
  ), [dramas]);
  const origEngSubList = useMemo(() => dramas.filter((d) => 
    Boolean(d.telegramOrig && d.telegramOrig.toLowerCase().includes('http'))
  ), [dramas]);
  const kdramaList = useMemo(() => dramas.filter((d) => d.category === 'K-Drama'), [dramas]);
  const cdramaList = useMemo(() => dramas.filter((d) => d.category === 'C-Drama'), [dramas]);
  const otherSeriesList = useMemo(() => dramas.filter((d) => {
    const isMovie = d.isMovie || d.category === 'Asian Movies' || d.category.toLowerCase().includes('movie');
    return !isMovie && !isHollyBollyTitle(d) && d.category !== 'K-Drama' && d.category !== 'C-Drama' && d.category !== 'Asian Movies' && d.category !== 'Hollywood / Bollywood';
  }), [dramas]);
  const asianMoviesList = useMemo(() => dramas.filter((d) => isAsianMovieTitle(d)), [dramas]);
  const hollyBollyList = useMemo(() => dramas.filter((d) => isHollyBollyTitle(d)), [dramas]);
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
    pendingDeepLinkRef.current = null;
    setDeepLinkEpisode(null);
    setSelectedDrama(null);
    document.title = DEFAULT_DOC_TITLE;
    if (!isHandlingPopStateRef.current && (window.location.pathname !== '/' || window.location.search)) {
      window.history.pushState({}, '', '/');
    }
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
  const [isPhoneDevice, setIsPhoneDevice] = useState<boolean>(() => detectPhoneOrPortrait());

  useEffect(() => {
    const updatePhoneState = () => setIsPhoneDevice(detectPhoneOrPortrait());
    updatePhoneState();
    window.addEventListener('resize', updatePhoneState);
    window.addEventListener('orientationchange', updatePhoneState);
    return () => {
      window.removeEventListener('resize', updatePhoneState);
      window.removeEventListener('orientationchange', updatePhoneState);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex flex-col relative selection:bg-[#e50914] selection:text-white w-full">
      {/* Crisp Falling Particle Ambience Canvas */}
      <SakuraCanvas enabled={particleMode !== 'off'} mode={particleMode} />

      {selectedDrama ? (
        <div className="w-full min-w-full min-h-screen bg-[#050508] relative z-50">
          <DramaDetailModal
            drama={selectedDrama}
            initialEpisode={deepLinkEpisode}
            onActiveEpisodeChange={handleActiveEpisodeChange}
            onClose={handleCloseDrama}
            onToggleWatchlist={handleToggleWatchlist}
            isWatchlisted={isDramaWatchlisted(selectedDrama.id)}
            watchlistStatus={getDramaWatchlistStatus(selectedDrama.id)}
            watchedEpisodes={watchedEpisodesMap[selectedDrama.id] || []}
            onToggleEpisodeWatched={handleToggleEpisodeWatched}
            onMoveToFront={handleMoveDramaToFront}
            isAdminAuthenticated={isAdminAuthenticated}
            isTopOne={dramas[0]?.id === selectedDrama.id || selectedDrama.spotlightTag === 'TOP #1'}
            onSubscribeDubAlert={handleSubscribeDubAlert}
            onReportIssue={() => {
              handleCloseDrama();
              setIsSupportOpen(true);
            }}
          />
        </div>
      ) : (
        <>
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
        sakuraEnabled={particleMode !== 'off'}
        particleMode={particleMode}
        onToggleSakura={handleCycleParticleMode}
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
      <section className="bg-gradient-to-r from-[#0d0d14] via-[#14121c] to-[#0d0d14] border-b border-white/[0.06] py-3 px-4 sm:px-6 lg:px-8 relative z-30">
        <div className="max-w-[1600px] mx-auto flex items-center justify-center sm:justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 sm:gap-3.5 mx-auto flex-nowrap shrink-0">
            {/* Perk 1: 100% Free Access */}
            <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 backdrop-blur-md shadow-md transition-all shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-[14px] font-black text-white tracking-wide whitespace-nowrap">100% Free Access</span>
            </div>

            {/* Perk 2: Fast Cloud Stream */}
            <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 backdrop-blur-md shadow-md transition-all shrink-0">
              <span className="text-sm">⚡</span>
              <span className="text-[14px] font-black text-white tracking-wide whitespace-nowrap">Fast Cloud Stream</span>
            </div>

            {/* Perk 3: Zero Ads / Direct Cloud Links */}
            <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-red-500/15 to-pink-500/15 hover:from-red-500/25 hover:to-pink-500/25 border border-red-500/30 backdrop-blur-md shadow-md transition-all shrink-0">
              <span className="text-sm">{adConfig.enabled ? '⚡' : '🛡️'}</span>
              <span className="text-[14px] font-black text-red-200 tracking-wide whitespace-nowrap">
                {adConfig.enabled ? 'Direct Cloud Links' : 'Zero Ads / No Token'}
              </span>
            </div>

            {/* Perk 4: Weekend Drops */}
            <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 backdrop-blur-md shadow-md transition-all shrink-0">
              <span className="text-sm">🌸</span>
              <span className="text-[14px] font-black text-amber-300 tracking-wide whitespace-nowrap">Weekend Drops 7 PM</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cinematic Hero Banner Carousel */}
      <HeroBanner
        featuredDramas={featuredDramas}
        banners={heroBanners}
        onSelectDrama={handleOpenDrama}
        onToggleWatchlist={handleToggleWatchlist}
        isWatchlisted={isDramaWatchlisted}
        onOpenAdminBanners={() => handleOpenAdminWithTab('banners')}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Top Trending Spotlight Strip */}
      <SpotlightBar
        spotlightDramas={spotlightDramas}
        onSelectDrama={handleOpenDrama}
        onOpenAdminSpotlight={() => handleOpenAdminWithTab('trending')}
        isAdminAuthenticated={isAdminAuthenticated}
        isPhoneDevice={isPhoneDevice}
      />

      {/* Live Issue & Issue Fixed Notice Board (Directly Powered by Sheet Column T & U) */}
      <LiveIssueBoard
        dramas={dramas}
        onSelectDrama={handleOpenDrama}
        onOpenSupport={() => setIsSupportOpen(true)}
        isPhoneDevice={isPhoneDevice}
      />

      {/* Weekend Mega Lineup Special Section */}
      <WeekendMegaLineupSection
        weekendDramas={weekendDramas}
        onSelectDrama={handleOpenDrama}
        onToggleWatchlist={handleToggleWatchlist}
        isWatchlisted={isDramaWatchlisted}
        onOpenAdminWeekend={() => handleOpenAdminWithTab('weekend')}
        announcementText={weekendSettings.announcement}
        timingText={weekendSettings.timing}
        isActive={weekendSettings.isActive}
        isAdminAuthenticated={isAdminAuthenticated}
        isPhoneDevice={isPhoneDevice}
      />

      {/* AD SLOT 1: HOME 728x90 LEADERBOARD BANNER (Right below WeekendMegaLineupSection) */}
      <AdBannerSlot slot="home" adConfig={adConfig} isPhoneDevice={isPhoneDevice} />

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
        isPhoneDevice={isPhoneDevice}
      />

      {/* MAIN CATALOG CONTENT */}
      <main className="flex-1 pb-16 w-full">
        {/* If search query or specific filter is active: show isolated instant search results */}
        {searchQuery.trim() !== '' || selectedAudio !== 'all' || selectedCategory !== 'all' || selectedYear !== 'all' || selectedStatus !== 'all' ? (
          <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-12 w-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`font-black text-white flex items-center gap-2 ${isPhoneDevice ? 'text-2xl' : 'text-xl'}`}>
                  <span>Filtered Releases</span>
                  <span className={`font-bold text-zinc-400 bg-white/10 px-2.5 py-0.5 rounded-full ${isPhoneDevice ? 'text-sm' : 'text-xs'}`}>
                    {filteredDramas.length} Results
                  </span>
                </h2>
                <p className={`text-zinc-400 mt-1 ${isPhoneDevice ? 'text-sm' : 'text-xs'}`}>
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
                className={`font-bold text-red-400 hover:text-red-300 underline ${isPhoneDevice ? 'text-sm' : 'text-xs'}`}
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
              <div
                className={isPhoneDevice ? '' : 'grid grid-cols-6 gap-4'}
                style={
                  isPhoneDevice
                    ? {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '22px',
                      }
                    : undefined
                }
              >
                {filteredDramas.map((drama, idx) => (
                  <DramaCard
                    key={drama.id}
                    drama={drama}
                    onSelect={handleOpenDrama}
                    onToggleWatchlist={handleToggleWatchlist}
                    isWatchlisted={isDramaWatchlisted(drama.id)}
                    rank={idx + 1}
                    isTopOne={idx === 0}
                    activeAudioContext={selectedAudio}
                    rowAudioContext={
                      selectedAudio === 'Hindi Dubbed'
                        ? 'hindi'
                        : selectedAudio === 'Fan Dubbed'
                        ? 'fandub'
                        : selectedAudio === 'Original / Eng Sub'
                        ? 'orig'
                        : undefined
                    }
                    isComingSoonContext={selectedStatus === 'Coming Soon'}
                    isPhoneDevice={isPhoneDevice}
                    isGrid={true}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* STANDARD CURATED OTT ROWS */
          <div className={isPhoneDevice ? 'space-y-12' : 'space-y-4'}>
            {/* 1. Continue Watching (if user has active progress) */}
            {continueWatchingDramas.length > 0 && (
              <DramaRow
                id="sec-continue-watching"
                title="Continue Watching"
                subtitle="Pick up where you left off"
                icon="▶️"
                dramas={continueWatchingDramas}
                onSelectDrama={handleOpenDrama}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
                isPhoneDevice={isPhoneDevice}
              />
            )}

            {/* 2. Personalized Recommended for You */}
            <DramaRow
              id="sec-recommended"
              title="Recommended for You"
              subtitle="Personalized VIP picks tailored to your taste"
              icon="🎯"
              dramas={recommendedDramas}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 3. Coming Soon & Premieres */}
            <DramaRow
              id="sec-coming-soon"
              title="Coming Soon & Upcoming Premieres"
              subtitle="Upcoming Asian blockbuster premieres for 2026"
              icon="🌸🔥"
              dramas={comingSoonDramas}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isComingSoonContext={true}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 3. Trending Now (Curated VIP Picks) */}
            <DramaRow
              id="sec-trending"
              title="Trending Now (Top VIP Binge Picks)"
              subtitle="Curated popular series with high bit-rate audio"
              icon="🐰🔥"
              dramas={trendingDramas}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 4. Hindi Dubbed Collection (Clean VIP Audio) */}
            {hindiDubbedList.length > 0 && (
              <DramaRow
                id="sec-hindi-dubbed"
                title="Hindi Dubbed Collection (VIP Audio)"
                subtitle="Clean studio dubbing in crystal clear 1080p FHD"
                icon="🔊✨"
                dramas={hindiDubbedList}
                onSelectDrama={handleOpenDrama}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
                activeAudioContext="Hindi Dubbed"
                rowAudioContext="hindi"
                isPhoneDevice={isPhoneDevice}
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
                onSelectDrama={handleOpenDrama}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
                activeAudioContext="Hindi Fan Dubbed"
                rowAudioContext="fandub"
                isPhoneDevice={isPhoneDevice}
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
                onSelectDrama={handleOpenDrama}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
                activeAudioContext="Original / Eng Sub"
                rowAudioContext="orig"
                isPhoneDevice={isPhoneDevice}
              />
            )}

            {/* 6. Ongoing Drops & Latest */}
            <DramaRow
              id="sec-ongoing"
              title="Ongoing Drops & Latest Releases"
              subtitle="Fresh episodes uploaded every Saturday & Sunday 7:00 PM"
              icon="✨🆕"
              dramas={ongoingDramas}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 7. K-Dramas (Korean) */}
            <DramaRow
              id="sec-kdrama"
              title="K-Dramas (Korean)"
              subtitle="Heartwarming romances, thrilling revenge, and comedy in clean Hindi audio"
              icon="🇰🇷🌸"
              dramas={kdramaList}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 7. C-Dramas (Chinese) */}
            <DramaRow
              id="sec-cdrama"
              title="C-Dramas (Chinese)"
              subtitle="Top sweet romance, wuxia, and modern acoustic series"
              icon="🇨🇳✨"
              dramas={cdramaList}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 🌐 Other Series (J-Drama, T-Drama & More) */}
            {otherSeriesList.length > 0 && (
              <DramaRow
                id="sec-other-series"
                title="🌐 Other Series (J-Drama, T-Drama & More)"
                subtitle="Captivating Japanese, Taiwanese, Thai, and regional Asian dramas"
                icon="🌐✨"
                dramas={otherSeriesList}
                onSelectDrama={handleOpenDrama}
                onToggleWatchlist={handleToggleWatchlist}
                isWatchlisted={isDramaWatchlisted}
                isPhoneDevice={isPhoneDevice}
              />
            )}

            {/* 8. Asian Blockbuster Movies */}
            <DramaRow
              id="sec-asian-movies"
              title="Asian Movies & Blockbusters in Hindi Dubbed 1080p"
              subtitle="Complete full-length cinematic experiences"
              icon="🎬🍿"
              dramas={asianMoviesList.length > 0 ? asianMoviesList : dramas.filter((d) => !isHollyBollyTitle(d) && d.totalEpisodes === 1)}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 9. Hollywood & Bollywood in Hindi Dubbed */}
            <DramaRow
              id="sec-holly-bolly"
              title="Hollywood & Bollywood in Hindi Dubbed"
              subtitle="Epic action and supernatural adventures"
              icon="🍿🎬"
              dramas={hollyBollyList}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />

            {/* 10. Completed Full Series (Binge Ready) */}
            <DramaRow
              id="sec-completed"
              title="Completed Full Series (Binge Ready)"
              subtitle="All episodes available for non-stop weekend marathon"
              icon="🟢✨"
              dramas={completedList}
              onSelectDrama={handleOpenDrama}
              onToggleWatchlist={handleToggleWatchlist}
              isWatchlisted={isDramaWatchlisted}
              isPhoneDevice={isPhoneDevice}
            />
          </div>
        )}

        {/* AD SLOT 3: PRE-FOOTER NATIVE BANNER (Right above PolicySafetySection) */}
        <AdBannerSlot slot="footer" adConfig={adConfig} isPhoneDevice={isPhoneDevice} />

        {/* Channel Policy & Safety Section */}
        <PolicySafetySection adsEnabled={adConfig.enabled} />
      </main>

      {/* Footer */}
      <Footer
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenRequest={() => setIsRequestOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* ALWAYS-VISIBLE FLOATING QUICK ACTION DOCK (HOME FEED ONLY) */}
      <MobileBottomNav
        onGoHome={handleGoHome}
        onFocusSearch={() => setIsInstantSearchOpen(true)}
      />
        </>
      )}

      {/* --- MODALS & DRAWERS --- */}

      {/* 2. Watchlist Drawer */}
      <WatchlistDrawer
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        watchlist={watchlist}
        allDramas={dramas}
        onSelectDrama={handleOpenDrama}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
        onUpdateStatus={handleUpdateWatchlistStatus}
        supabaseUser={supabaseUser}
        onUserChange={handleUserChange}
        watchedEpisodesMap={watchedEpisodesMap}
        readNotifIds={readNotifIds}
      />

      {/* 3. Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotifsAsRead}
        onClearAll={handleClearAllNotifications}
        onDeleteNotification={handleDeleteNotification}
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
        onSelectDrama={handleOpenDrama}
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
          adConfig={adConfig}
          onUpdateAdConfig={handleUpdateAdConfig}
        />
      )}

      {/* 8. Instant Search Popup Modal */}

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
                  return !isMovie && !isHollyBollyTitle(d) && d.category !== 'K-Drama' && d.category !== 'C-Drama' && d.category !== 'Asian Movies' && d.category !== 'Hollywood / Bollywood';
                }
                if (instantFilter === 'Movies') {
                  return isAsianMovieTitle(d);
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
                            handleOpenDrama(d);
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
        onOpenDrama={handleOpenDrama}
        onDismiss={handleDismissToast}
      />

      {/* 11. FLOATING & CENTER VIP POP-UP AD SYSTEM */}
      <FloatingPopupAd
        adConfig={adConfig}
        isDramaModalOpen={Boolean(selectedDrama)}
        isPlayerOpen={Boolean(selectedDrama)}
        isAdminOpen={isAdminOpen}
        isPhoneDevice={isPhoneDevice}
      />
    </div>
  );
}
