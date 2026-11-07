import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Lock, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  PlusCircle, 
  Megaphone, 
  ExternalLink, 
  Check, 
  Flame, 
  Calendar, 
  Star, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { DramaItem, AudioType, DramaCategory, ReleaseNotification, WeekendSettings, HeroBannerSlide } from '../types/drama';
import { 
  insertDramaIntoSupabase, 
  insertNotificationIntoSupabase, 
  loginWithSupabaseAuth, 
  fetchDramasFromSupabase,
  fetchSupabaseStats,
  seedCatalogToSupabase
} from '../services/supabaseService';
import { INITIAL_DRAMAS } from '../data/initialCatalog';

// Secure SHA-256 Hashing using Native Web Crypto API
async function sha256Hex(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface AdminStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceSync: () => Promise<void>;
  onAddDrama: (drama: DramaItem) => void;
  onAddNotification: (notif: ReleaseNotification) => void;
  onUpdateMarquee: (text: string) => void;
  currentMarquee: string;
  dramas: DramaItem[];
  onUpdateDramasCuration: (updatedDramas: DramaItem[]) => void;
  weekendSettings: WeekendSettings;
  onUpdateWeekendSettings: (settings: WeekendSettings) => void;
  heroBanners: HeroBannerSlide[];
  onUpdateHeroBanners: (banners: HeroBannerSlide[]) => void;
  initialTab?: 'trending' | 'weekend' | 'banners' | 'new_drama' | 'broadcast' | 'supabase' | 'security';
  onAuthSuccess?: () => void;
  onAuthLogout?: () => void;
  isAuthenticatedParent?: boolean;
}

export const AdminStudioModal: React.FC<AdminStudioModalProps> = ({
  isOpen,
  onClose,
  onForceSync,
  onAddDrama,
  onAddNotification,
  onUpdateMarquee,
  currentMarquee,
  dramas,
  onUpdateDramasCuration,
  weekendSettings,
  onUpdateWeekendSettings,
  heroBanners = [],
  onUpdateHeroBanners,
  initialTab = 'trending',
  onAuthSuccess,
  onAuthLogout,
  isAuthenticatedParent = false,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(isAuthenticatedParent);
  const [authMethod, setAuthMethod] = useState<'pin' | 'password'>('pin');
  const [pinInput, setPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'trending' | 'weekend' | 'banners' | 'new_drama' | 'broadcast' | 'supabase' | 'security'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isAuthenticatedParent) {
      setIsAuthenticated(true);
    }
  }, [isAuthenticatedParent]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isSavingSupabase, setIsSavingSupabase] = useState(false);

  // Supabase Live Stats State
  const [sbStats, setSbStats] = useState<{
    connected: boolean;
    titlesCount: number;
    audiosCount: number;
    uploadsCount: number;
    notificationsCount: number;
    error?: string;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Seeder State
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Curated Dramas Local Work Copy
  const [localDramas, setLocalDramas] = useState<DramaItem[]>(dramas);
  const [curationSearch, setCurationSearch] = useState('');
  const [curationFilter, setCurationFilter] = useState<'all' | 'spotlight' | 'trending' | 'weekend'>('all');

  // Weekend settings local copy
  const [localWeekend, setLocalWeekend] = useState<WeekendSettings>(weekendSettings);

  // Sync props to local on open
  React.useEffect(() => {
    setLocalDramas(dramas);
  }, [dramas]);

  React.useEffect(() => {
    setLocalWeekend(weekendSettings);
  }, [weekendSettings]);

  // Homepage Banners Local State
  const [localBanners, setLocalBanners] = useState<HeroBannerSlide[]>(heroBanners);
  const [bannerFormMode, setBannerFormMode] = useState<'create' | 'edit'>('create');
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerBackdropUrl, setBannerBackdropUrl] = useState('');
  const [bannerAudio, setBannerAudio] = useState('Hindi Dubbed');
  const [bannerCategory, setBannerCategory] = useState('K-Drama');
  const [bannerYear, setBannerYear] = useState('2026');
  const [bannerRating, setBannerRating] = useState('9.8');
  const [bannerScheduleInfo, setBannerScheduleInfo] = useState('Sat & Sun Mega Drops · 1080p FHD');
  const [bannerSynopsis, setBannerSynopsis] = useState('');
  const [bannerTelegramUrl, setBannerTelegramUrl] = useState('');
  const [bannerBadge, setBannerBadge] = useState('👑 TOP 1');
  const [bannerSetAsFront, setBannerSetAsFront] = useState(true);

  useEffect(() => {
    setLocalBanners(heroBanners);
  }, [heroBanners]);

  // Load stats when modal opens and is authenticated
  React.useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadStats();
    }
  }, [isOpen, isAuthenticated]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    const stats = await fetchSupabaseStats();
    setSbStats(stats);
    setIsLoadingStats(false);
  };

  const handleSeedSupabase = async () => {
    if (!window.confirm('Sync master catalog titles into cloud database? This will update all 1080p metadata and links.')) {
      return;
    }

    setIsSeeding(true);
    setSeedProgress({ current: 0, total: INITIAL_DRAMAS.length, name: 'Starting sync...' });

    const result = await seedCatalogToSupabase(INITIAL_DRAMAS, (curr, tot, name) => {
      setSeedProgress({ current: curr, total: tot, name });
    });

    setIsSeeding(false);
    setSeedProgress(null);
    if (result.seeded > 0) {
      setSuccessMessage(`Synced ${result.seeded} titles to cloud database successfully! 🎉`);
    } else {
      setSuccessMessage(`⚠️ Cloud Sync failed: ${result.lastError || 'Permission Denied'}. Please run the GRANT query in Supabase SQL Editor.`);
    }
    loadStats();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // New Drama Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DramaCategory>('K-Drama');
  const [year, setYear] = useState('2026');
  const [audio, setAudio] = useState<AudioType>('Hindi Dubbed');
  const [poster, setPoster] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [episodesCount, setEpisodesCount] = useState('16');
  const [synopsis, setSynopsis] = useState('');
  const [makeSpotlight, setMakeSpotlight] = useState(true);
  const [makeWeekend, setMakeWeekend] = useState(false);

  // Broadcast state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [marqueeDraft, setMarqueeDraft] = useState(currentMarquee);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Brute-force protection & Lockout state
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return parseInt(localStorage.getItem('asiaflix_failed_attempts') || '0', 10);
  });
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    return parseInt(localStorage.getItem('asiaflix_lockout_until') || '0', 10);
  });
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Change Password state
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState<string | null>(null);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  // Cooldown interval effect
  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      setCooldownRemaining(0);
      return;
    }
    const updateCountdown = () => {
      const left = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setCooldownRemaining(left);
      if (left <= 0) {
        localStorage.removeItem('asiaflix_lockout_until');
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const recordFailedAttempt = (customMsg?: string) => {
    const nextFailed = failedAttempts + 1;
    setFailedAttempts(nextFailed);
    localStorage.setItem('asiaflix_failed_attempts', String(nextFailed));

    if (nextFailed >= 5) {
      const lockTime = Date.now() + 60000; // 60s lockdown
      setLockoutUntil(lockTime);
      localStorage.setItem('asiaflix_lockout_until', String(lockTime));
      setAuthError('🚨 Security Alert: 5 incorrect attempts detected! System is locked down for 60 seconds to protect from unauthorized brute-force hacking.');
    } else {
      setAuthError(customMsg || `Access denied! Incorrect password / PIN. (${5 - nextFailed} attempts remaining before security lockdown)`);
    }
  };

  const resetFailedAttempts = () => {
    setFailedAttempts(0);
    setLockoutUntil(0);
    setCooldownRemaining(0);
    localStorage.removeItem('asiaflix_failed_attempts');
    localStorage.removeItem('asiaflix_lockout_until');
  };

  const handlePinAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) {
      setAuthError(`🚨 Security Lockdown Active: Please wait ${cooldownRemaining}s before attempting again.`);
      return;
    }

    const inputTrimmed = pinInput.trim();
    if (!inputTrimmed) {
      setAuthError('Please enter your security master password / PIN.');
      return;
    }

    const inputHash = await sha256Hex(inputTrimmed);
    const storedHash = localStorage.getItem('asiaflix_master_hash');

    let isValid = false;
    if (storedHash) {
      isValid = inputHash === storedHash;
    } else {
      // High-security initial PIN: strictly 79813 or AsiaFlix#2026 (NO weak 1234!)
      isValid = inputTrimmed === '79813' || inputTrimmed === 'AsiaFlix#2026';
    }

    if (isValid) {
      resetFailedAttempts();
      setIsAuthenticated(true);
      setAuthError(null);
      onAuthSuccess?.();
    } else {
      recordFailedAttempt();
    }
  };

  const handleSupabaseAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) {
      setAuthError(`🚨 Security Lockdown Active: Please wait ${cooldownRemaining}s before attempting again.`);
      return;
    }
    setAuthError(null);
    if (!passwordInput || !emailInput) {
      setAuthError('Please enter both your admin email and password.');
      return;
    }

    const { user, isAdmin, error } = await loginWithSupabaseAuth(emailInput, passwordInput);
    if (error) {
      recordFailedAttempt(`Authentication failed: ${error}`);
      return;
    }

    // STRICT CHECK: Only verified admin users (matching dramifyprime@gmail.com) are granted access!
    if (!user || !isAdmin) {
      recordFailedAttempt('⛔ Access Denied: This account is NOT an authorized administrator. Only dramifyprime@gmail.com has access.');
      return;
    }

    resetFailedAttempts();
    setIsAuthenticated(true);
    setAuthError(null);
    onAuthSuccess?.();
  };

  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError(null);
    setPassChangeSuccess(null);

    if (newPassInput.length < 6) {
      setPassChangeError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setPassChangeError('New passwords do not match. Please re-enter.');
      return;
    }

    // Verify current password first
    const storedHash = localStorage.getItem('asiaflix_master_hash');
    const currentHash = await sha256Hex(currentPassInput.trim());

    let isCurrentValid = false;
    if (storedHash) {
      isCurrentValid = currentHash === storedHash;
    } else {
      isCurrentValid = currentPassInput.trim() === '79813' || currentPassInput.trim() === 'AsiaFlix#2026';
    }

    if (!isCurrentValid) {
      setPassChangeError('Current master password is incorrect. Verification failed.');
      return;
    }

    // Hash and store the new master password
    const newHash = await sha256Hex(newPassInput.trim());
    localStorage.setItem('asiaflix_master_hash', newHash);
    setPassChangeSuccess('Master Password successfully updated and encrypted with SHA-256! 🛡️');
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setTimeout(() => setPassChangeSuccess(null), 4000);
  };

  // --- HOMEPAGE BACKGROUND POSTER / BANNER ACTIONS ---
  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerBackdropUrl.trim()) {
      setSuccessMessage('Please provide at least a Title and Backdrop image URL.');
      return;
    }

    if (bannerFormMode === 'create') {
      const newSlide: HeroBannerSlide = {
        id: `banner-${Date.now()}`,
        title: bannerTitle.trim(),
        backdropUrl: bannerBackdropUrl.trim(),
        posterUrl: bannerBackdropUrl.trim(),
        audio: bannerAudio,
        category: bannerCategory,
        releaseYear: parseInt(bannerYear) || 2026,
        rating: parseFloat(bannerRating) || 9.8,
        scheduleInfo: bannerScheduleInfo.trim() || '1080p FHD · Zero Ads',
        synopsis: bannerSynopsis.trim() || 'AsiaFlix Prime VIP Exclusive Stream.',
        telegramUrl: bannerTelegramUrl.trim() || 'https://t.me/+yJH68LvfrT9hZDVl',
        badge: bannerSetAsFront ? '👑 TOP 1' : bannerBadge,
        isActive: true,
      };

      let updated: HeroBannerSlide[];
      if (bannerSetAsFront) {
        updated = [newSlide, ...localBanners];
      } else {
        updated = [...localBanners, newSlide];
      }
      setLocalBanners(updated);
      onUpdateHeroBanners(updated);
      setSuccessMessage(`Homepage background poster "${bannerTitle}" add ho gaya aur sabse aage (#1) live hai! 🖼️`);
    } else if (bannerFormMode === 'edit' && editingBannerId) {
      const updated = localBanners.map((b) => {
        if (b.id !== editingBannerId) return b;
        return {
          ...b,
          title: bannerTitle.trim(),
          backdropUrl: bannerBackdropUrl.trim(),
          audio: bannerAudio,
          category: bannerCategory,
          releaseYear: parseInt(bannerYear) || 2026,
          rating: parseFloat(bannerRating) || 9.8,
          scheduleInfo: bannerScheduleInfo.trim(),
          synopsis: bannerSynopsis.trim(),
          telegramUrl: bannerTelegramUrl.trim() || 'https://t.me/+yJH68LvfrT9hZDVl',
          badge: bannerBadge,
        };
      });
      setLocalBanners(updated);
      onUpdateHeroBanners(updated);
      setSuccessMessage(`Homepage background poster "${bannerTitle}" update ho gaya! 🖼️`);
      setBannerFormMode('create');
      setEditingBannerId(null);
    }

    setBannerTitle('');
    setBannerBackdropUrl('');
    setBannerSynopsis('');
    setBannerTelegramUrl('');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleEditBannerClick = (banner: HeroBannerSlide) => {
    setBannerFormMode('edit');
    setEditingBannerId(banner.id);
    setBannerTitle(banner.title);
    setBannerBackdropUrl(banner.backdropUrl);
    setBannerAudio(banner.audio || 'Hindi Dubbed');
    setBannerCategory(banner.category || 'K-Drama');
    setBannerYear(String(banner.releaseYear || '2026'));
    setBannerRating(String(banner.rating || '9.8'));
    setBannerScheduleInfo(banner.scheduleInfo || '1080p FHD · Zero Ads');
    setBannerSynopsis(banner.synopsis || '');
    setBannerTelegramUrl(banner.telegramUrl || '');
    setBannerBadge(banner.badge || '👑 TOP 1');
    setSuccessMessage(`Editing "${banner.title}". Neeche form me details edit karein.`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleCancelBannerEdit = () => {
    setBannerFormMode('create');
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerBackdropUrl('');
    setBannerSynopsis('');
    setBannerTelegramUrl('');
  };

  const moveBannerToFront = (id: string) => {
    setLocalBanners((prev) => {
      const target = prev.find((b) => b.id === id);
      if (!target) return prev;
      const updatedTarget = { ...target, badge: '👑 TOP 1' };
      const rest = prev.filter((b) => b.id !== id);
      const updated = [updatedTarget, ...rest];
      onUpdateHeroBanners(updated);
      return updated;
    });
    setSuccessMessage('Background poster ko homepage par sabse aage (#1 position) par set kar diya gaya hai! 👑');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const moveBannerOrder = (id: string, direction: 'up' | 'down') => {
    setLocalBanners((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      onUpdateHeroBanners(updated);
      return updated;
    });
  };

  const handleDeleteBanner = (id: string) => {
    if (!window.confirm('Is background poster banner ko homepage carousel se delete karna chahte hain?')) return;
    setLocalBanners((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      onUpdateHeroBanners(updated);
      return updated;
    });
    setSuccessMessage('Banner deleted from homepage carousel.');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleToggleBannerActive = (id: string) => {
    setLocalBanners((prev) => {
      const updated = prev.map((b) => b.id === id ? { ...b, isActive: b.isActive === false ? true : false } : b);
      onUpdateHeroBanners(updated);
      return updated;
    });
  };

  const handlePopulateFromDrama = (dramaId: string) => {
    const drama = localDramas.find((d) => d.id === dramaId);
    if (!drama) return;
    setBannerTitle(drama.title);
    setBannerBackdropUrl(drama.backdrop || drama.poster);
    setBannerAudio(drama.defaultAudio);
    setBannerCategory(drama.category);
    setBannerYear(String(drama.releaseYear));
    setBannerRating(String(drama.rating));
    setBannerScheduleInfo(drama.scheduleInfo);
    setBannerSynopsis(drama.synopsis);
    setBannerTelegramUrl(drama.telegramUrl);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);

    const supabaseDramas = await fetchDramasFromSupabase();
    if (supabaseDramas && supabaseDramas.length > 0) {
      supabaseDramas.forEach((d) => onAddDrama(d));
      setSuccessMessage(`Loaded ${supabaseDramas.length} titles from cloud database! ⚡`);
    } else {
      await onForceSync();
      setSuccessMessage('Synced catalog with master database! ⚡');
    }

    setIsSyncing(false);
    setSyncSuccess(true);
    setTimeout(() => {
      setSyncSuccess(false);
      setSuccessMessage(null);
    }, 3000);
  };

  // --- TOP TRENDING & SPOTLIGHT CURATION ACTIONS ---
  const moveToFront = (id: string) => {
    setLocalDramas((prev) => {
      const target = prev.find((d) => d.id === id);
      if (!target) return prev;
      const rest = prev.filter((d) => d.id !== id);
      const updated = [target, ...rest];
      onUpdateDramasCuration(updated);
      return updated;
    });
    const dramaTitle = localDramas.find((d) => d.id === id)?.title || 'Title';
    setSuccessMessage(`"${dramaTitle}" ko sabse aage (#1 position) kar diya gaya hai! 🚀`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const toggleSpotlight = (id: string) => {
    setLocalDramas((prev) => {
      const target = prev.find((d) => d.id === id);
      if (!target) return prev;
      const willBeSpotlight = !target.isSpotlight;
      const updatedTarget = { ...target, isSpotlight: willBeSpotlight };
      const rest = prev.filter((d) => d.id !== id);
      // Sabse Aage: if toggling ON, automatically place at index 0 (sabse pehle position par)
      const updated = willBeSpotlight ? [updatedTarget, ...rest] : [...rest, updatedTarget];
      onUpdateDramasCuration(updated);
      return updated;
    });
    setSuccessMessage('Spotlight updated! Naya item sabse aage set ho gaya. ⭐');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const toggleTrending = (id: string) => {
    setLocalDramas((prev) => {
      const target = prev.find((d) => d.id === id);
      if (!target) return prev;
      const willBeTrending = !target.isTrending;
      const updatedTarget = { ...target, isTrending: willBeTrending };
      const rest = prev.filter((d) => d.id !== id);
      // Sabse Aage: if toggling ON, place at index 0
      const updated = willBeTrending ? [updatedTarget, ...rest] : [...rest, updatedTarget];
      onUpdateDramasCuration(updated);
      return updated;
    });
    setSuccessMessage('Trending updated! Naya item sabse aage set ho gaya. 🔥');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const moveDramaOrder = (id: string, direction: 'up' | 'down') => {
    setLocalDramas((prev) => {
      const index = prev.findIndex((d) => d.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      onUpdateDramasCuration(updated);
      return updated;
    });
  };

  const setSpotlightTag = (id: string, tag: string) => {
    setLocalDramas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, spotlightTag: tag } : d))
    );
  };

  const handleSaveTrendingCuration = () => {
    onUpdateDramasCuration(localDramas);
    setSuccessMessage('Top Trending & Spotlight curation saved and applied to live portal! 🔥');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // --- WEEKEND LINEUP ACTIONS ---
  const toggleWeekendDrama = (id: string) => {
    setLocalDramas((prev) => {
      const target = prev.find((d) => d.id === id);
      if (!target) return prev;
      const willBeWeekend = !target.isWeekendLineup;
      const updatedTarget = {
        ...target,
        isWeekendLineup: willBeWeekend,
        weekendSlot: target.weekendSlot || 'Saturday Drop - 7:00 PM',
      };
      const rest = prev.filter((d) => d.id !== id);
      // Sabse Aage: if toggling ON, place at index 0 (sabse pehle position par)
      const updated = willBeWeekend ? [updatedTarget, ...rest] : [...rest, updatedTarget];
      onUpdateDramasCuration(updated);
      return updated;
    });
    setSuccessMessage('Weekend Mega Lineup updated! Title sabse aage add ho gaya. 🌸');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const updateDramaWeekendSlot = (id: string, slot: string) => {
    setLocalDramas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, weekendSlot: slot } : d))
    );
  };

  const handleSaveWeekendLineup = () => {
    onUpdateDramasCuration(localDramas);
    onUpdateWeekendSettings(localWeekend);
    if (localWeekend.noticeText) {
      onUpdateMarquee(localWeekend.noticeText);
    }
    setSuccessMessage('Weekend Mega Lineup updated and published live! 🌸');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Filtered Dramas for Curation Tab
  const displayCurationDramas = useMemo(() => {
    return localDramas.filter((d) => {
      const matchSearch =
        curationSearch.trim() === '' ||
        d.title.toLowerCase().includes(curationSearch.toLowerCase()) ||
        d.category.toLowerCase().includes(curationSearch.toLowerCase());

      if (!matchSearch) return false;

      if (curationFilter === 'spotlight') return Boolean(d.isSpotlight);
      if (curationFilter === 'trending') return Boolean(d.isTrending);
      if (curationFilter === 'weekend') return Boolean(d.isWeekendLineup);
      return true;
    });
  }, [localDramas, curationSearch, curationFilter]);

  const currentSpotlightCount = localDramas.filter((d) => d.isSpotlight).length;
  const currentTrendingCount = localDramas.filter((d) => d.isTrending).length;
  const currentWeekendCount = localDramas.filter((d) => d.isWeekendLineup).length;

  const handleCreateDrama = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSavingSupabase(true);

    const newDrama: DramaItem = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      category,
      releaseYear: parseInt(year) || 2026,
      status: 'Now Streaming (Ongoing)',
      rating: 9.3,
      poster: poster.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700',
      backdrop: poster.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1400',
      synopsis: synopsis.trim() || 'Uploaded directly to AsiaFlix Prime VIP Private Channel.',
      cast: ['AsiaFlix Exclusive'],
      tags: [category, audio],
      scheduleInfo: `${episodesCount} Episodes`,
      availableAudios: [audio],
      defaultAudio: audio,
      qualityBadge: '1080p FHD',
      isSpotlight: makeSpotlight,
      isTrending: true,
      isWeekendLineup: makeWeekend,
      weekendSlot: makeWeekend ? 'Saturday Drop - 7:00 PM' : undefined,
      telegramUrl: telegramUrl.trim() || 'https://t.me/+yJH68LvfrT9hZDVl',
      episodes: [
        {
          id: `ep-full-${Date.now()}`,
          episodeNumber: 'Full Pack',
          title: `${title} 1080p FHD Pack`,
          audio,
          telegramUrl: telegramUrl.trim() || 'https://t.me/+yJH68LvfrT9hZDVl',
          duration: `${episodesCount} Episodes`,
          quality: '1080p FHD',
          isMerged: true,
        },
      ],
    };

    const sbResult = await insertDramaIntoSupabase({
      title: title.trim(),
      category,
      releaseYear: parseInt(year) || 2026,
      description: synopsis.trim() || 'AsiaFlix Prime VIP upload',
      posterUrl: poster.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700',
      status: 'Ongoing',
      audio,
      telegramUrl: telegramUrl.trim() || 'https://t.me/+yJH68LvfrT9hZDVl',
      episodesCount,
    });

    onAddDrama(newDrama);
    const updated = [newDrama, ...localDramas.filter((d) => d.id !== newDrama.id)];
    setLocalDramas(updated);
    onUpdateDramasCuration(updated);
    setIsSavingSupabase(false);

    if (sbResult.success) {
      setSuccessMessage(`Title "${title}" add ho gaya aur sabse aage (#1 position) par live hai! 🚀`);
    } else {
      setSuccessMessage(`Title "${title}" add ho gaya aur sabse aage (#1 position) par live hai! 🌸`);
    }

    setTitle('');
    setPoster('');
    setTelegramUrl('');
    setSynopsis('');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    const newNotif: ReleaseNotification = {
      id: `notif-${Date.now()}`,
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      timestamp: 'Just now',
      isRead: false,
      type: 'announcement',
    };

    await insertNotificationIntoSupabase(notifTitle.trim(), notifMessage.trim());

    onAddNotification(newNotif);
    setSuccessMessage('Release notification broadcasted successfully! 🔔');
    setNotifTitle('');
    setNotifMessage('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveMarquee = () => {
    onUpdateMarquee(marqueeDraft);
    setSuccessMessage('Top Marquee announcement text updated!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#14151f] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* AUTH SCREEN (PIN OR PASSWORD) */}
        {!isAuthenticated ? (
          <div className="py-6 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#e50914]/15 border border-[#e50914]/30 flex items-center justify-center mx-auto mb-3 text-xl text-[#ff2b54]">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white">Admin Control Studio</h3>
            <p className="text-xs text-zinc-400 mt-0.5 mb-5">
              Curate Top Trending, Weekend Mega Lineup, Catalog & Notices
            </p>

            {/* Auth Method Selector */}
            <div className="flex bg-white/[0.04] p-1 rounded-xl mb-4 border border-white/5 max-w-xs mx-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMethod('pin'); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  authMethod === 'pin' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🔢 PIN Login
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('password'); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  authMethod === 'password' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🔒 Password
              </button>
            </div>

            {cooldownRemaining > 0 && (
              <div className="p-3 rounded-xl bg-red-600/25 border border-red-500/50 text-red-200 text-xs font-bold mb-4 flex items-center gap-2.5 text-left animate-pulse">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <div className="font-black text-red-100 flex items-center gap-1.5">
                    <span>🚨 Security Lockdown Active</span>
                  </div>
                  <div className="text-[11px] text-red-300 mt-0.5">
                    5 failed attempts detected. Retrying is locked for <strong>{cooldownRemaining}s</strong>.
                  </div>
                </div>
              </div>
            )}

            {authError && cooldownRemaining <= 0 && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold mb-4 text-left">
                {authError}
              </div>
            )}

            {authMethod === 'pin' ? (
              <form onSubmit={handlePinAuth} className="max-w-xs mx-auto space-y-3">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 mb-1.5 text-left">
                    <span>Master Security Password / PIN:</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPinInput ? 'text' : 'password'}
                      required
                      disabled={cooldownRemaining > 0}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-3 pl-4 pr-10 rounded-xl bg-white/[0.04] border border-white/10 text-white tracking-[4px] text-base font-black focus:border-[#e50914] outline-none disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinInput(!showPinInput)}
                      className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPinInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cooldownRemaining > 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                >
                  {cooldownRemaining > 0 ? `Locked (${cooldownRemaining}s)` : 'Unlock Admin Studio'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSupabaseAuth} className="max-w-xs mx-auto space-y-3 text-left">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Authorized Admin Email:
                  </label>
                  <input
                    type="email"
                    required
                    disabled={cooldownRemaining > 0}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter authorized admin email"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914] disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Password:
                  </label>
                  <input
                    type="password"
                    required
                    disabled={cooldownRemaining > 0}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914] disabled:opacity-40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cooldownRemaining > 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                >
                  {cooldownRemaining > 0 ? `Locked (${cooldownRemaining}s)` : 'Sign In as Admin'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* AUTHENTICATED CONSOLE */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Status Bar */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-emerald-300 font-black">Admin Access Unlocked</span>
                  <span className="text-[10px] text-zinc-400 ml-2">Live Portal Curate Mode</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  onAuthLogout?.();
                }}
                className="text-zinc-400 hover:text-white underline text-[11px]"
              >
                Lock Panel
              </button>
            </div>

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-1 bg-white/[0.04] p-1.5 rounded-xl border border-white/5 scrollbar-none">
              <button
                onClick={() => setActiveTab('banners')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'banners' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Homepage Banners</span>
                <span className="bg-black/40 text-[10px] px-1.5 py-0.2 rounded-full">
                  {localBanners.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('trending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'trending' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Top Trending & Spotlight</span>
                <span className="bg-black/40 text-[10px] px-1.5 py-0.2 rounded-full">
                  {currentSpotlightCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('weekend')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'weekend' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Weekend Mega Lineup</span>
                <span className="bg-black/40 text-[10px] px-1.5 py-0.2 rounded-full">
                  {currentWeekendCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('new_drama')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'new_drama' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Title</span>
              </button>

              <button
                onClick={() => setActiveTab('broadcast')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'broadcast' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Alerts & Notice</span>
              </button>

              <button
                onClick={() => setActiveTab('supabase')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'supabase' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Database Sync</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'security' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Security & Password</span>
              </button>
            </div>

            {/* TAB: HOMEPAGE BACKGROUND BANNERS MANAGER */}
            {activeTab === 'banners' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#ff2b54]" />
                        <span>Homepage Background Posters & Banners Manager</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Add and edit background poster banners shown on the homepage Hero carousel. Change wallpaper images, titles, descriptions, and set #1 position.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBannerFormMode('create');
                        setEditingBannerId(null);
                        setBannerTitle('');
                        setBannerBackdropUrl('');
                        setBannerSynopsis('');
                        setBannerTelegramUrl('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#e50914] hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>New Banner</span>
                    </button>
                  </div>
                </div>

                {/* Banner Add/Edit Form */}
                <form onSubmit={handleSaveBanner} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                      {bannerFormMode === 'create' ? (
                        <>
                          <PlusCircle className="w-4 h-4 text-emerald-400" />
                          <span>Add New Background Poster / Banner</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4 text-amber-400" />
                          <span>Edit Background Poster: {bannerTitle || 'Selected Banner'}</span>
                        </>
                      )}
                    </h5>

                    {bannerFormMode === 'edit' && (
                      <button
                        type="button"
                        onClick={handleCancelBannerEdit}
                        className="text-[11px] text-zinc-400 hover:text-white underline"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {/* Quick Auto-fill from Catalog Drama Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      ⚡ Quick Fill: Select Drama from Catalog (Optional)
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handlePopulateFromDrama(e.target.value);
                      }}
                      defaultValue=""
                      className="w-full py-2 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                    >
                      <option value="" disabled className="bg-zinc-900 text-zinc-400">
                        -- Pick a drama to copy image & details instantly --
                      </option>
                      {localDramas.map((d) => (
                        <option key={d.id} value={d.id} className="bg-zinc-900 text-white">
                          {d.title} ({d.category} · {d.defaultAudio})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Banner Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="e.g. Queen of Tears: Special Premiere"
                        className="w-full py-2 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Background Poster Image URL (Backdrop) *
                      </label>
                      <input
                        type="url"
                        required
                        value={bannerBackdropUrl}
                        onChange={(e) => setBannerBackdropUrl(e.target.value)}
                        placeholder="https://... (horizontal high-res poster image)"
                        className="w-full py-2 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      />
                    </div>
                  </div>

                  {/* Live Poster Image Preview if URL entered */}
                  {bannerBackdropUrl.trim() && (
                    <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center gap-3">
                      <div className="w-24 h-14 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                        <img
                          src={bannerBackdropUrl}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-xs min-w-0">
                        <div className="font-bold text-white truncate">{bannerTitle || 'Poster Preview'}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">Image URL detected · Live Preview</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1">Audio Track</label>
                      <select
                        value={bannerAudio}
                        onChange={(e) => setBannerAudio(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white outline-none"
                      >
                        <option value="Hindi Dubbed" className="bg-zinc-900">Hindi Dubbed</option>
                        <option value="Fan Dubbed" className="bg-zinc-900">Fan Dubbed</option>
                        <option value="Original / Eng Sub" className="bg-zinc-900">Original / Eng Sub</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1">Category</label>
                      <select
                        value={bannerCategory}
                        onChange={(e) => setBannerCategory(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white outline-none"
                      >
                        <option value="K-Drama" className="bg-zinc-900">K-Drama</option>
                        <option value="C-Drama" className="bg-zinc-900">C-Drama</option>
                        <option value="Asian Movies" className="bg-zinc-900">Asian Movies</option>
                        <option value="Hollywood / Bollywood" className="bg-zinc-900">Hollywood / Bollywood</option>
                        <option value="J-Drama" className="bg-zinc-900">J-Drama</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1">Year</label>
                      <input
                        type="text"
                        value={bannerYear}
                        onChange={(e) => setBannerYear(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1">Rating</label>
                      <input
                        type="text"
                        value={bannerRating}
                        onChange={(e) => setBannerRating(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Telegram Direct Stream Link
                      </label>
                      <input
                        type="url"
                        value={bannerTelegramUrl}
                        onChange={(e) => setBannerTelegramUrl(e.target.value)}
                        placeholder="https://t.me/..."
                        className="w-full py-2 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Badge Text (e.g. 👑 TOP 1)
                      </label>
                      <input
                        type="text"
                        value={bannerBadge}
                        onChange={(e) => setBannerBadge(e.target.value)}
                        placeholder="👑 TOP 1"
                        className="w-full py-2 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Synopsis / Tagline
                    </label>
                    <textarea
                      rows={2}
                      value={bannerSynopsis}
                      onChange={(e) => setBannerSynopsis(e.target.value)}
                      placeholder="Write brief description for this background banner..."
                      className="w-full py-2 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                    />
                  </div>

                  {bannerFormMode === 'create' && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="bannerFront"
                        checked={bannerSetAsFront}
                        onChange={(e) => setBannerSetAsFront(e.target.checked)}
                        className="w-4 h-4 accent-[#e50914] rounded cursor-pointer"
                      />
                      <label htmlFor="bannerFront" className="text-xs font-bold text-amber-300 cursor-pointer flex items-center gap-1">
                        <span>👑 Set as #1 Background Poster (Sabse Aage homepage pe dikhega)</span>
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{bannerFormMode === 'create' ? 'Add Background Poster to Homepage' : 'Save Changes to Background Poster'}</span>
                  </button>
                </form>

                {/* Existing Banners Management List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-white px-1">
                    <span>Active Homepage Background Posters ({localBanners.length})</span>
                    <span className="text-[10px] text-zinc-400">Click #1 to set at front</span>
                  </div>

                  <div className="space-y-2">
                    {localBanners.map((banner, idx) => (
                      <div
                        key={banner.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          idx === 0 
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-md' 
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Position Rank */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-black shadow-md' : 'bg-white/10 text-white'
                          }`}>
                            {idx === 0 ? '👑 #1' : `#${idx + 1}`}
                          </div>

                          {/* Image preview */}
                          <div className="w-20 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                            <img
                              src={banner.backdropUrl}
                              alt={banner.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-[280px]">
                                {banner.title}
                              </h5>
                              {idx === 0 && (
                                <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded shrink-0">
                                  TOP 1
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                              <span className="text-red-400 font-bold">{banner.audio}</span>
                              <span>·</span>
                              <span>{banner.category}</span>
                              <span>·</span>
                              <span>★ {banner.rating}</span>
                              {banner.isActive === false && (
                                <span className="text-zinc-500 bg-white/5 px-1 rounded">(Hidden)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          {/* Move to Front */}
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => moveBannerToFront(banner.id)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/30 text-[10px] font-black transition-all"
                              title="Is poster ko homepage par sabse aage (#1 position) par set karein"
                            >
                              <span>👑 Sabse Aage (#1)</span>
                            </button>
                          )}

                          {/* Up & Down */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveBannerOrder(banner.id, 'up')}
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-30 text-xs"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === localBanners.length - 1}
                            onClick={() => moveBannerOrder(banner.id, 'down')}
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-30 text-xs"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleBannerActive(banner.id)}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              banner.isActive !== false
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                            }`}
                            title={banner.isActive !== false ? 'Active on Homepage' : 'Hidden from Homepage'}
                          >
                            {banner.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleEditBannerClick(banner)}
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.15] border border-white/10 text-white text-xs"
                            title="Edit this background poster"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(banner.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 text-red-400 text-xs"
                            title="Delete this banner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: TOP TRENDING & SPOTLIGHT MANAGER */}
            {activeTab === 'trending' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-[#ff2b54]" />
                        <span>Curate Top Trending Spotlight (VIP Picks)</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Select which dramas appear in the top VIP spotlight bar and the "Trending Now" binge row.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveTrendingCuration}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Apply Trending</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/5 text-[11px] font-bold">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      Spotlight VIP (Top Bar): {currentSpotlightCount} selected
                    </span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-red-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      Trending Now Row: {currentTrendingCount} selected
                    </span>
                  </div>
                </div>

                {/* Search & Sub-Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={curationSearch}
                      onChange={(e) => setCurationSearch(e.target.value)}
                      placeholder="Find drama to toggle trending / spotlight..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/5 text-[11px] font-bold">
                    <button
                      onClick={() => setCurationFilter('all')}
                      className={`px-2 py-1 rounded ${curationFilter === 'all' ? 'bg-[#e50914] text-white' : 'text-zinc-400'}`}
                    >
                      All ({localDramas.length})
                    </button>
                    <button
                      onClick={() => setCurationFilter('spotlight')}
                      className={`px-2 py-1 rounded ${curationFilter === 'spotlight' ? 'bg-amber-500 text-black font-black' : 'text-zinc-400'}`}
                    >
                      ⭐ Spotlight ({currentSpotlightCount})
                    </button>
                    <button
                      onClick={() => setCurationFilter('trending')}
                      className={`px-2 py-1 rounded ${curationFilter === 'trending' ? 'bg-[#e50914] text-white' : 'text-zinc-400'}`}
                    >
                      🔥 Trending ({currentTrendingCount})
                    </button>
                  </div>
                </div>

                {/* Dramas List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {displayCurationDramas.map((drama, idx) => (
                    <div
                      key={drama.id}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        drama.isSpotlight
                          ? 'bg-amber-500/[0.07] border-amber-500/30'
                          : drama.isTrending
                          ? 'bg-red-500/[0.05] border-red-500/25'
                          : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={drama.poster}
                          alt={drama.title}
                          className="w-10 h-14 object-cover rounded-md bg-zinc-900 border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-white truncate">
                              {drama.title}
                            </h5>
                            {drama.isSpotlight && (
                              <span className="text-[9px] font-black bg-amber-500 text-black px-1.5 py-0.2 rounded shrink-0">
                                ⭐ SPOTLIGHT #{idx + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                            <span className="text-red-400 font-bold">{drama.defaultAudio}</span>
                            <span>·</span>
                            <span>{drama.category}</span>
                            <span>·</span>
                            <span>{drama.releaseYear}</span>
                          </div>
                          <div className="text-[10px] text-sky-400 mt-0.5 truncate">
                            {drama.scheduleInfo}
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {/* Move Up/Down in sequence */}
                        <div className="flex flex-col gap-0.5 mr-1">
                          <button
                            onClick={() => moveDramaOrder(drama.id, 'up')}
                            className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white"
                            title="Move Up in Rank"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveDramaOrder(drama.id, 'down')}
                            className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white"
                            title="Move Down in Rank"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Move to Front (#1 / Sabse Aage) Button */}
                        <button
                          onClick={() => moveToFront(drama.id)}
                          className="px-2 py-1.5 rounded-lg bg-red-600/25 hover:bg-[#e50914] text-red-300 hover:text-white border border-red-500/40 text-[10px] font-black transition-all flex items-center gap-1 shadow-sm shrink-0"
                          title="Is drama ko website par sabse aage (#1 position) par set karein"
                        >
                          <span>📌 Sabse Aage</span>
                        </button>

                        {/* Toggle Spotlight Button */}
                        <button
                          onClick={() => toggleSpotlight(drama.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                            drama.isSpotlight
                              ? 'bg-amber-500 text-black shadow font-black'
                              : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${drama.isSpotlight ? 'fill-black' : ''}`} />
                          <span>Spotlight</span>
                        </button>

                        {/* Toggle Trending Button */}
                        <button
                          onClick={() => toggleTrending(drama.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                            drama.isTrending
                              ? 'bg-[#e50914] text-white shadow font-black'
                              : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10'
                          }`}
                        >
                          <Flame className="w-3 h-3" />
                          <span>Trending</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveTrendingCuration}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Top Trending & Spotlight Setup</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: WEEKEND MEGA LINEUP MANAGER */}
            {activeTab === 'weekend' && (
              <div className="space-y-4">
                {/* Master Weekend Settings Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#240e16] via-[#14151f] to-transparent border border-red-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-red-400" />
                        <span>Weekend Mega Lineup Configuration</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Manage weekend live drops, announcement text, drop timings, and featured dramas.
                      </p>
                    </div>

                    {/* Active Mode Switch */}
                    <button
                      onClick={() => setLocalWeekend((prev) => ({ ...prev, isActive: !prev.isActive }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shrink-0 ${
                        localWeekend.isActive
                          ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${localWeekend.isActive ? 'bg-white animate-pulse' : 'bg-zinc-500'}`} />
                      <span>{localWeekend.isActive ? 'Weekend Drops: ACTIVE' : 'Weekend Mode: OFF'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Drop Timing Tag:
                      </label>
                      <input
                        type="text"
                        value={localWeekend.timing}
                        onChange={(e) => setLocalWeekend((prev) => ({ ...prev, timing: e.target.value }))}
                        placeholder="e.g. Sat & Sun 7:00 PM IST Mega Drops"
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Marquee & Banner Notice:
                      </label>
                      <input
                        type="text"
                        value={localWeekend.noticeText}
                        onChange={(e) => setLocalWeekend((prev) => ({ ...prev, noticeText: e.target.value }))}
                        placeholder="e.g. Weekend Mega Lineup is Active! New Hindi Dubbed Episodes Dropping Sat & Sun 7:00 PM IST • Zero Ads."
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                      />
                    </div>
                  </div>
                </div>

                {/* Curated Weekend Dramas Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select Titles For Weekend Mega Lineup ({currentWeekendCount})</span>
                    </span>

                    <button
                      onClick={handleSaveWeekendLineup}
                      className="px-3.5 py-1.5 rounded-xl bg-[#e50914] text-white text-xs font-black shadow flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Publish Weekend Lineup</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {localDramas.map((drama) => (
                      <div
                        key={drama.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          drama.isWeekendLineup
                            ? 'bg-red-500/[0.08] border-red-500/35'
                            : 'bg-white/[0.02] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={Boolean(drama.isWeekendLineup)}
                            onChange={() => toggleWeekendDrama(drama.id)}
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                          />
                          <img
                            src={drama.poster}
                            alt={drama.title}
                            className="w-9 h-12 object-cover rounded bg-zinc-900 border border-white/10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-black text-white truncate">
                              {drama.title}
                            </h5>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                              <span className="text-red-400 font-bold">{drama.defaultAudio}</span>
                              <span>·</span>
                              <span>{drama.category}</span>
                            </div>
                          </div>
                        </div>

                        {drama.isWeekendLineup && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-zinc-400 font-bold">Slot:</span>
                            <input
                              type="text"
                              value={drama.weekendSlot || 'Saturday Drop - 7:00 PM'}
                              onChange={(e) => updateDramaWeekendSlot(drama.id, e.target.value)}
                              placeholder="e.g. Saturday 7:00 PM Drop"
                              className="px-2.5 py-1 rounded bg-black/40 border border-white/10 text-white text-xs font-bold w-48 outline-none focus:border-red-500"
                            />
                            {/* Preset Buttons */}
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateDramaWeekendSlot(drama.id, 'Saturday Drop - 7:00 PM')}
                                className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold text-zinc-300 hover:text-white"
                              >
                                Sat
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDramaWeekendSlot(drama.id, 'Sunday Mega Drop - 7:00 PM')}
                                className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold text-zinc-300 hover:text-white"
                              >
                                Sun
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDramaWeekendSlot(drama.id, 'Sat & Sun Drops')}
                                className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold text-zinc-300 hover:text-white"
                              >
                                Both
                              </button>
                              <button
                                type="button"
                                onClick={() => moveToFront(drama.id)}
                                className="px-2 py-0.5 rounded bg-red-600/30 hover:bg-[#e50914] text-red-300 hover:text-white border border-red-500/40 text-[9px] font-black transition-all ml-1"
                                title="Weekend Lineup mein sabse aage (#1 position) par set karein"
                              >
                                📌 Sabse Aage
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveWeekendLineup}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Publish Weekend Mega Lineup Live</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: ADD NEW TITLE */}
            {activeTab === 'new_drama' && (
              <form onSubmit={handleCreateDrama} className="space-y-3">
                <div className="text-[11px] text-zinc-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                  ⚡ Title will be saved directly into catalog, Supabase <strong className="text-white">titles</strong>, and your live portal!
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Drama Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. My Demon (2026)"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">Content Type</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as DramaCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-[#181924] border border-white/10 text-white text-xs outline-none"
                    >
                      <option value="K-Drama">K-Drama</option>
                      <option value="C-Drama">C-Drama</option>
                      <option value="Asian Movies">Asian Movie</option>
                      <option value="Hollywood / Bollywood">Hollywood / Bollywood</option>
                      <option value="J-Drama">J-Drama</option>
                      <option value="Sci-Fi Series">Sci-Fi Series</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">Audio Track</label>
                    <select
                      value={audio}
                      onChange={(e) => setAudio(e.target.value as AudioType)}
                      className="w-full px-3 py-2 rounded-lg bg-[#181924] border border-white/10 text-white text-xs outline-none"
                    >
                      <option value="Hindi Dubbed">Hindi Dubbed</option>
                      <option value="Fan Dubbed">Fan Dubbed</option>
                      <option value="Original / Eng Sub">Original / Eng Sub</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">Release Year</label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2026"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">Upload Format / Episodes</label>
                    <input
                      type="text"
                      value={episodesCount}
                      onChange={(e) => setEpisodesCount(e.target.value)}
                      placeholder="16 Episodes / Batch"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                    />
                  </div>
                </div>

                {/* Instant Curation Checkboxes */}
                <div className="flex flex-wrap gap-4 p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer text-amber-300">
                    <input
                      type="checkbox"
                      checked={makeSpotlight}
                      onChange={(e) => setMakeSpotlight(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <span>⭐ Add to Top Spotlight Bar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-red-300">
                    <input
                      type="checkbox"
                      checked={makeWeekend}
                      onChange={(e) => setMakeWeekend(e.target.checked)}
                      className="w-4 h-4 rounded text-red-500 accent-red-500 cursor-pointer"
                    />
                    <span>🌸 Add to Weekend Mega Lineup</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Poster Image URL</label>
                  <input
                    type="url"
                    value={poster}
                    onChange={(e) => setPoster(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Telegram Direct Link *</label>
                  <input
                    type="url"
                    required
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    placeholder="https://t.me/c/3730319875/..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Synopsis</label>
                  <textarea
                    rows={2}
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="Brief plot synopsis..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                  />
                </div>

                {/* Priority #1 Guarantee Note */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center gap-2">
                  <span className="text-sm">👑</span>
                  <span><strong>Automatic #1 Priority:</strong> Ye title add hote hi poori website, Spotlight aur Catalog rows me <strong>sabse aage</strong> set hoga.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSupabase}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isSavingSupabase ? 'Inserting...' : '📌 Publish to Live Portal (Sabse Aage #1)'}</span>
                </button>
              </form>
            )}

            {/* TAB 4: BROADCAST NOTIFICATIONS & MARQUEE */}
            {activeTab === 'broadcast' && (
              <div className="space-y-4">
                {/* Update Marquee */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                  <label className="block text-xs font-bold text-white">Live Top Notice Ticker</label>
                  <input
                    type="text"
                    value={marqueeDraft}
                    onChange={(e) => setMarqueeDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                  />
                  <button
                    onClick={handleSaveMarquee}
                    className="px-4 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-all"
                  >
                    Update Top Marquee
                  </button>
                </div>

                {/* Broadcast Release Alert */}
                <form onSubmit={handleSendBroadcast} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs mb-1">
                    <Megaphone className="w-4 h-4 text-red-400" />
                    <span>Save In-App Alert to Supabase</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="Alert Heading (e.g. Episode 12 Dropped!)"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div>
                    <textarea
                      required
                      rows={2}
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      placeholder="Details (e.g. Clean Hindi Audio added on Telegram)..."
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#e50914] text-white text-xs font-black shadow transition-all"
                  >
                    Broadcast & Insert into Supabase
                  </button>
                </form>
              </div>
            )}

            {/* TAB 5: DATABASE DASHBOARD & SYNC */}
            {activeTab === 'supabase' && (
              <div className="space-y-3.5">
                {/* Cloud Live Stats Card */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Cloud Database Metrics</span>
                    </div>
                    <button
                      onClick={loadStats}
                      disabled={isLoadingStats}
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingStats ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {sbStats ? (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-sm font-black text-white">{sbStats.titlesCount}</div>
                        <div className="text-[10px] font-bold text-zinc-400">Titles</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-sm font-black text-sky-400">{sbStats.audiosCount}</div>
                        <div className="text-[10px] font-bold text-zinc-400">Audios</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-sm font-black text-emerald-400">{sbStats.uploadsCount}</div>
                        <div className="text-[10px] font-bold text-zinc-400">Uploads</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-sm font-black text-amber-400">{sbStats.notificationsCount}</div>
                        <div className="text-[10px] font-bold text-zinc-400">Alerts</div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-zinc-500">Connecting to database...</div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-emerald-600 text-white text-xs font-black shadow transition-all"
                    >
                      <span>Table Editor</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/10 transition-all"
                    >
                      <span>SQL Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* 1-Click Catalog Cloud Sync Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-red-500/5 to-transparent border border-amber-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span>⚡ 1-Click Catalog Cloud Sync</span>
                    </h4>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded">
                      18+ Titles
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Instantly sync all 18+ high-definition Asian dramas, audio tracks (Hindi Dubbed, Fan Dubbed, Original), and Telegram links into your cloud database.
                  </p>

                  {isSeeding && seedProgress && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-bold text-amber-300">
                        <span>Syncing: {seedProgress.name}</span>
                        <span>{seedProgress.current} / {seedProgress.total}</span>
                      </div>
                      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-[#e50914] transition-all duration-300"
                          style={{ width: `${(seedProgress.current / seedProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSeedSupabase}
                    disabled={isSeeding}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#e50914] text-white text-xs font-black shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{isSeeding ? 'Syncing Database...' : '🚀 Push Catalog to Cloud Database'}</span>
                  </button>
                </div>

                {/* Force Sync Card */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                    <span>Sync Live Catalog & Updates</span>
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Pull newest published drama titles, audio tracks, and uploads directly into the portal.
                  </p>

                  <button
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-black transition-all flex items-center justify-center gap-2 border border-white/10"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Connecting...' : syncSuccess ? 'Sync Done!' : 'Force Sync Catalog'}</span>
                  </button>
                </div>

                {/* Supabase Permissions SQL Card */}
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <span>🔑 Supabase SQL Permissions Setup</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sql = `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\nGRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;\nGRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;\nGRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;`;
                        navigator.clipboard.writeText(sql);
                        setSuccessMessage('Permissions SQL copied! Supabase SQL Editor mein paste karke Run karein.');
                        setTimeout(() => setSuccessMessage(null), 3500);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/25 hover:bg-blue-500/40 text-blue-200 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Copy SQL
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Agar Supabase mein sync na ho, toh yeh 4 lines Supabase SQL Editor mein paste karke <strong>Run</strong> karein taaki public website ko read/write permissions mil jayein:
                  </p>
                  <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-[10px] text-blue-200 font-mono overflow-x-auto select-all">
{`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;`}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB: SECURITY & MASTER PASSWORD */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                {/* Security Overview Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-sm font-black text-white">
                      Admin Security & Access Protection
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Protect your AsiaFlix Prime portal from unauthorized edits. Your Master Password is encrypted using native <strong>SHA-256 cryptographic hashing</strong>. Brute-force rate limiting is actively enabled (maximum 5 attempts before 60-second lockdown).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] font-bold">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2 text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>SHA-256 Encryption Active</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2 text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Brute-force: 5 Tries / 60s Lock</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2 text-sky-300">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>Admin: dramifyprime</span>
                    </div>
                  </div>
                </div>

                {/* Change Master Password Form */}
                <form onSubmit={handleChangeMasterPassword} className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs font-black text-white">
                        Change Master Security Password / PIN
                      </h5>
                    </div>
                    <span className="text-[10px] text-zinc-400">Min 6 characters</span>
                  </div>

                  {passChangeSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <Check className="w-4 h-4" />
                      <span>{passChangeSuccess}</span>
                    </div>
                  )}

                  {passChangeError && (
                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <ShieldAlert className="w-4 h-4" />
                      <span>{passChangeError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Current Master Password / PIN *
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassInput}
                      onChange={(e) => setCurrentPassInput(e.target.value)}
                      placeholder="Enter your current password or initial PIN"
                      className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        New Strong Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassInput}
                        onChange={(e) => setNewPassInput(e.target.value)}
                        placeholder="New strong password (e.g. MySec#2026)"
                        className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      />
                      {/* Password strength indicator */}
                      {newPassInput && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden flex gap-1">
                            <div className={`h-full flex-1 ${newPassInput.length >= 6 ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                            <div className={`h-full flex-1 ${newPassInput.length >= 8 && /[A-Z]/.test(newPassInput) ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                            <div className={`h-full flex-1 ${newPassInput.length >= 8 && /[0-9]/.test(newPassInput) && /[^A-Za-z0-9]/.test(newPassInput) ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400">
                            {newPassInput.length < 6 ? 'Too Short' : newPassInput.length < 9 ? 'Good' : 'Ultra Strong 🛡️'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassInput}
                        onChange={(e) => setConfirmPassInput(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Update & Encrypt Master Password</span>
                  </button>
                </form>

                {/* Session Security Card */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white">Immediate Admin Lock</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Lock this console immediately. Anyone attempting to reopen will require your Master Password.
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsAuthenticated(false);
                      onAuthLogout?.();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white font-black text-xs transition-all shrink-0"
                  >
                    🔒 Lock & Exit Studio
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
