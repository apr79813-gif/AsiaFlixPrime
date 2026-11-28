import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Film,
  Globe,
  HardDrive,
  Heart,
  HelpCircle,
  History,
  Info,
  Lock,
  LogOut,
  Mail,
  Pencil,
  Play,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { AudioType, DramaItem, VipProfile, WatchlistEntry } from '../types/drama';
import {
  AUTO_SKIP_INTRO_STORAGE_KEY,
  OFFLINE_VAULT_UPDATED_EVENT,
  OfflineVaultItem,
  TIMESTAMPS_UPDATED_EVENT,
  VIP_STATS_UPDATED_EVENT,
  WATCH_TIMESTAMPS_STORAGE_KEY,
  WatchTimestampEntry,
  VipStats,
  deleteOfflineDownload,
  formatBytesReadable,
  formatTimeSeconds,
  getAutoSkipIntroPref,
  getOfflineDownloads,
  getOfflineDownloadsSync,
  getVipStats,
  getWatchTimestamps,
  setAutoSkipIntroPref,
} from '../services/vipPlayerHelper';
import {
  EPISODE_REMINDERS_UPDATED_EVENT,
  EpisodeReminderItem,
  formatDropCountdown,
  getEpisodeReminders,
  getNextEpisodeDropDate,
  toggleEpisodeReminder,
} from '../services/scheduleHelper';
import {
  LIKED_CLIPS_UPDATED_EVENT,
  StoredLikedClip,
  getLikedClipsList,
} from './ClipsFeedModal';
import { OFFICIAL_WATERMARK_LOGO_URL, useTransparentLogo } from './AnimatedChannelLogo';

export const VIP_PROFILE_STORAGE_KEY = 'asiaflix_vip_profile';
export const VIP_ACCOUNTS_REGISTRY_KEY = 'asiaflix_vip_accounts_v1';
export const VIP_NOTIFS_PREF_KEY = 'asiaflix_vip_notifs_enabled';
export const VIP_APP_LANG_KEY = 'asiaflix_vip_app_lang';
export const VIP_PROFILE_UPDATED_EVENT = 'asiaflix-vip-profile-updated';

export function loadVipProfile(): VipProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VIP_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VipProfile>;
    if (!parsed || typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
    return {
      id: parsed.id || `AFP-${Math.floor(100000 + Math.random() * 900000)}`,
      name: parsed.name.trim(),
      contact: typeof parsed.contact === 'string' ? parsed.contact.trim() : '',
      pinOrPassword: typeof parsed.pinOrPassword === 'string' ? parsed.pinOrPassword : '',
      avatar:
        typeof parsed.avatar === 'string' &&
        (parsed.avatar.startsWith('data:') || parsed.avatar.startsWith('http'))
          ? parsed.avatar
          : '',
      defaultAudio: (parsed.defaultAudio as AudioType) || 'Hindi Dubbed',
      preferredSubLang: typeof parsed.preferredSubLang === 'string' ? parsed.preferredSubLang : 'off',
      autoPlayNext: parsed.autoPlayNext !== false,
      autoSkipIntro:
        typeof parsed.autoSkipIntro === 'boolean'
          ? parsed.autoSkipIntro
          : getAutoSkipIntroPref(false),
      dataSaverDefault: Boolean(parsed.dataSaverDefault),
      createdAt: Number(parsed.createdAt) || Date.now(),
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveVipProfile(profile: VipProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIP_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    if (profile.contact) {
      const regRaw = localStorage.getItem(VIP_ACCOUNTS_REGISTRY_KEY);
      const reg = regRaw ? (JSON.parse(regRaw) as Record<string, VipProfile>) : {};
      reg[profile.contact.trim().toLowerCase()] = profile;
      localStorage.setItem(VIP_ACCOUNTS_REGISTRY_KEY, JSON.stringify(reg));
    }
    if (typeof profile.autoSkipIntro === 'boolean') {
      setAutoSkipIntroPref(profile.autoSkipIntro);
    }
    window.dispatchEvent(new CustomEvent(VIP_PROFILE_UPDATED_EVENT, { detail: profile }));
  } catch {
    // ignore storage errors
  }
}

export function clearVipProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VIP_PROFILE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(VIP_PROFILE_UPDATED_EVENT, { detail: null }));
  } catch {
    // ignore
  }
}

async function resizeImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('Empty image'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        const minSide = Math.min(img.naturalWidth || size, img.naturalHeight || size);
        const sx = Math.max(0, Math.floor(((img.naturalWidth || size) - minSide) / 2));
        const sy = Math.max(0, Math.floor(((img.naturalHeight || size) - minSide) / 2));
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        let out = '';
        try {
          out = canvas.toDataURL('image/webp', 0.82);
        } catch {
          out = '';
        }
        if (!out || !out.startsWith('data:image/webp')) {
          out = canvas.toDataURL('image/jpeg', 0.82);
        }
        resolve(out);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function getInitialMonogram(name?: string): string {
  const clean = (name || 'A').trim();
  return clean ? clean.charAt(0).toUpperCase() : 'A';
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceGate?: boolean;
  profile: VipProfile | null;
  onSaveProfile: (profile: VipProfile) => void;
  onSignOut?: () => void;
  dramas: DramaItem[];
  watchlistCount: number;
  watchlistEntries?: WatchlistEntry[];
  unreadNotifsCount?: number;
  onOpenWatchlist: () => void;
  onOpenNotifications?: () => void;
  onOpenSupport?: () => void;
  onOpenDrama: (drama: DramaItem, epNum?: number, track?: AudioType) => void;
  onOpenClipById: (clipId: string) => void;
  onInstallApp?: () => void;
  onOpenAppDownloadModal?: () => void;
  isAppInstalled?: boolean;
  onOpenAdmin?: () => void;
  isAdminAuthenticated?: boolean;
  customLogoUrl?: string;
}

type HubSubView = 'main' | 'history' | 'downloads' | 'liked' | 'reminders' | 'edit' | 'security' | 'about';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  forceGate = false,
  profile,
  onSaveProfile,
  onSignOut,
  dramas,
  watchlistCount,
  watchlistEntries = [],
  unreadNotifsCount = 0,
  onOpenWatchlist,
  onOpenNotifications,
  onOpenSupport,
  onOpenDrama,
  onOpenClipById,
  onInstallApp,
  onOpenAppDownloadModal,
  isAppInstalled = false,
  onOpenAdmin,
  isAdminAuthenticated = false,
  customLogoUrl,
}) => {
  const transparentLogoSrc = useTransparentLogo(customLogoUrl || OFFICIAL_WATERMARK_LOGO_URL);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Screen A state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [appLang, setAppLang] = useState<'en' | 'hi'>(() => {
    try {
      return localStorage.getItem(VIP_APP_LANG_KEY) === 'hi' ? 'hi' : 'en';
    } catch {
      return 'en';
    }
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VIP_NOTIFS_PREF_KEY) !== '0';
    } catch {
      return true;
    }
  });

  // Hub Subview
  const [subView, setSubView] = useState<HubSubView>('main');

  // Auth / Edit Form states
  const [nameInput, setNameInput] = useState(profile?.name || '');
  const [contactInput, setContactInput] = useState(profile?.contact || '');
  const [pinInput, setPinInput] = useState(profile?.pinOrPassword || '');
  const [avatarPhotoInput, setAvatarPhotoInput] = useState(profile?.avatar || '');
  const [audioInput, setAudioInput] = useState<AudioType>(profile?.defaultAudio || 'Hindi Dubbed');
  const [subLangInput, setSubLangInput] = useState(profile?.preferredSubLang || 'off');
  const [autoPlayNextInput, setAutoPlayNextInput] = useState<boolean>(profile?.autoPlayNext !== false);
  const [autoSkipIntroInput, setAutoSkipIntroInput] = useState<boolean>(() =>
    getAutoSkipIntroPref(profile?.autoSkipIntro)
  );
  const [dataSaverInput, setDataSaverInput] = useState<boolean>(Boolean(profile?.dataSaverDefault));
  const [savedNotice, setSavedNotice] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Live synced sections
  const [vipStats, setVipStats] = useState<VipStats>(() => getVipStats());
  const [likedClips, setLikedClips] = useState<StoredLikedClip[]>(() => getLikedClipsList());
  const [watchMap, setWatchMap] = useState<Record<string, WatchTimestampEntry>>(() =>
    getWatchTimestamps()
  );
  const [offlineItems, setOfflineItems] = useState<OfflineVaultItem[]>(() =>
    getOfflineDownloadsSync()
  );
  const [reminders, setReminders] = useState<EpisodeReminderItem[]>(() => getEpisodeReminders());
  const [countdownNowMs, setCountdownNowMs] = useState<number>(() => Date.now());

  // Top 12 highest-rated series for dynamic tilted Netflix-style collage
  const topRatedSeries = useMemo(() => {
    const sorted = [...dramas].sort(
      (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)
    );
    const base = sorted.slice(0, 12);
    if (base.length === 0) return [];
    const filled: DramaItem[] = [];
    for (let i = 0; i < 12; i++) {
      filled.push(base[i % base.length]);
    }
    return filled;
  }, [dramas]);

  useEffect(() => {
    if (!isOpen) return;
    setSubView('main');
    setAuthError(null);
    setShowForgotHint(false);
    if (profile) {
      setNameInput(profile.name);
      setContactInput(profile.contact);
      setPinInput(profile.pinOrPassword || '');
      setAvatarPhotoInput(profile.avatar || '');
      setAudioInput(profile.defaultAudio);
      setSubLangInput(profile.preferredSubLang || 'off');
      setAutoPlayNextInput(profile.autoPlayNext !== false);
      setAutoSkipIntroInput(getAutoSkipIntroPref(profile.autoSkipIntro));
      setDataSaverInput(Boolean(profile.dataSaverDefault));
    } else {
      setNameInput('');
      setContactInput('');
      setPinInput('');
      setAvatarPhotoInput('');
    }
    setPhotoError(null);
    setVipStats(getVipStats());
    setLikedClips(getLikedClipsList());
    setWatchMap(getWatchTimestamps());
    setReminders(getEpisodeReminders());
    void getOfflineDownloads().then(setOfflineItems);
  }, [isOpen, profile]);

  useEffect(() => {
    const syncStats = () => setVipStats(getVipStats());
    const syncLiked = () => setLikedClips(getLikedClipsList());
    const syncTimestamps = () => setWatchMap(getWatchTimestamps());
    const syncOffline = () => void getOfflineDownloads().then(setOfflineItems);
    const syncReminders = () => setReminders(getEpisodeReminders());
    const syncStorage = (e: StorageEvent) => {
      if (e.key === AUTO_SKIP_INTRO_STORAGE_KEY) {
        setAutoSkipIntroInput(getAutoSkipIntroPref());
      }
    };

    window.addEventListener(VIP_STATS_UPDATED_EVENT, syncStats);
    window.addEventListener(LIKED_CLIPS_UPDATED_EVENT, syncLiked);
    window.addEventListener(TIMESTAMPS_UPDATED_EVENT, syncTimestamps);
    window.addEventListener(OFFLINE_VAULT_UPDATED_EVENT, syncOffline);
    window.addEventListener(EPISODE_REMINDERS_UPDATED_EVENT, syncReminders);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener(VIP_STATS_UPDATED_EVENT, syncStats);
      window.removeEventListener(LIKED_CLIPS_UPDATED_EVENT, syncLiked);
      window.removeEventListener(TIMESTAMPS_UPDATED_EVENT, syncTimestamps);
      window.removeEventListener(OFFLINE_VAULT_UPDATED_EVENT, syncOffline);
      window.removeEventListener(EPISODE_REMINDERS_UPDATED_EVENT, syncReminders);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || subView !== 'reminders' || reminders.length === 0) return;
    const timer = window.setInterval(() => setCountdownNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, subView, reminders.length]);

  const dramaById = useMemo(() => {
    const map = new Map<string, DramaItem>();
    dramas.forEach((d) => map.set(d.id, d));
    return map;
  }, [dramas]);

  const watchHistoryItems = useMemo(() => {
    return Object.entries(watchMap)
      .map(([dramaId, entry]) => ({
        dramaId,
        drama: dramaById.get(dramaId),
        entry,
      }))
      .filter((item): item is { dramaId: string; drama: DramaItem; entry: WatchTimestampEntry } =>
        Boolean(item.drama)
      )
      .sort((a, b) => (b.entry.updatedAt || 0) - (a.entry.updatedAt || 0));
  }, [watchMap, dramaById]);

  const savedWatchlistDramas = useMemo(() => {
    return watchlistEntries
      .map((entry) => ({ entry, drama: dramaById.get(entry.dramaId) }))
      .filter((x): x is { entry: WatchlistEntry; drama: DramaItem } => Boolean(x.drama));
  }, [watchlistEntries, dramaById]);

  const toggleLanguagePref = () => {
    setAppLang((prev) => {
      const next = prev === 'en' ? 'hi' : 'en';
      try {
        localStorage.setItem(VIP_APP_LANG_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleNotificationsPref = () => {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VIP_NOTIFS_PREF_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      const compressed = await resizeImageFileToDataUrl(file);
      setAvatarPhotoInput(compressed);
      if (profile) {
        const updated: VipProfile = {
          ...profile,
          avatar: compressed,
          updatedAt: Date.now(),
        };
        saveVipProfile(updated);
        onSaveProfile(updated);
        setSavedNotice(true);
        window.setTimeout(() => setSavedNotice(false), 2000);
      }
    } catch {
      setPhotoError('Could not load photo. Please choose a JPG, PNG, or WebP image.');
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = contactInput.trim();
    if (!cleanEmail) {
      setAuthError('Please enter your email address or mobile number.');
      return;
    }

    if (authMode === 'signin') {
      try {
        const regRaw = localStorage.getItem(VIP_ACCOUNTS_REGISTRY_KEY);
        const reg = regRaw ? (JSON.parse(regRaw) as Record<string, VipProfile>) : {};
        const existing = reg[cleanEmail.toLowerCase()];
        if (existing) {
          if (existing.pinOrPassword && pinInput && existing.pinOrPassword !== pinInput) {
            setAuthError('Incorrect password. Tap "Forgot Password?" or try again.');
            return;
          }
          saveVipProfile({ ...existing, updatedAt: Date.now() });
          onSaveProfile({ ...existing, updatedAt: Date.now() });
          if (forceGate) onClose();
          return;
        }
      } catch {
        // ignore registry lookup failure
      }
    }

    const derivedName =
      authMode === 'signup' && nameInput.trim()
        ? nameInput.trim()
        : nameInput.trim() || cleanEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || 'AsiaFlix VIP';

    const nextProfile: VipProfile = {
      id: `AFP-${Math.floor(100000 + Math.random() * 900000)}`,
      name: derivedName,
      contact: cleanEmail,
      pinOrPassword: pinInput.trim(),
      avatar: avatarPhotoInput,
      defaultAudio: audioInput,
      preferredSubLang: subLangInput,
      autoPlayNext: autoPlayNextInput,
      autoSkipIntro: autoSkipIntroInput,
      dataSaverDefault: dataSaverInput,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveVipProfile(nextProfile);
    onSaveProfile(nextProfile);
    if (forceGate) onClose();
  };

  const handleSocialQuickAuth = (provider: 'Google' | 'Apple' | 'Discord') => {
    const cleanEmail = contactInput.trim() || `${provider.toLowerCase()}@asiaflix.vip`;
    const nextProfile: VipProfile = {
      id: `AFP-${Math.floor(100000 + Math.random() * 900000)}`,
      name: nameInput.trim() || `${provider} Member`,
      contact: cleanEmail,
      pinOrPassword: '',
      avatar: avatarPhotoInput,
      defaultAudio: 'Hindi Dubbed',
      preferredSubLang: 'off',
      autoPlayNext: true,
      autoSkipIntro: getAutoSkipIntroPref(false),
      dataSaverDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveVipProfile(nextProfile);
    onSaveProfile(nextProfile);
    if (forceGate) onClose();
  };

  const handleSaveHubSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;
    const cleanName = nameInput.trim() || profile.name;
    const nextProfile: VipProfile = {
      ...profile,
      name: cleanName,
      contact: contactInput.trim(),
      pinOrPassword: pinInput.trim(),
      avatar: avatarPhotoInput || profile.avatar,
      defaultAudio: audioInput,
      preferredSubLang: subLangInput,
      autoPlayNext: autoPlayNextInput,
      autoSkipIntro: autoSkipIntroInput,
      dataSaverDefault: dataSaverInput,
      updatedAt: Date.now(),
    };
    saveVipProfile(nextProfile);
    onSaveProfile(nextProfile);
    setSubView('main');
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2200);
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(WATCH_TIMESTAMPS_STORAGE_KEY);
      setWatchMap({});
      window.dispatchEvent(new CustomEvent(TIMESTAMPS_UPDATED_EVENT));
    } catch {
      // ignore
    }
  };

  const handleDeleteOffline = async (key: string) => {
    const updated = await deleteOfflineDownload(key);
    setOfflineItems(updated);
  };

  const handleSignOutClick = () => {
    clearVipProfile();
    onSignOut?.();
    setSubView('main');
  };

  if (!isOpen) return null;

  const isValidPhoto = (val?: string) =>
    Boolean(val && (val.startsWith('data:image/') || /^https?:\/\//i.test(val)));

  // ============================================================
  // SCREEN A: "Welcome Back!" LOGIN / SIGN-UP + DYNAMIC COLLAGE
  // ============================================================
  if (!profile) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome Back - AsiaFlix Prime"
        className="fixed inset-0 z-[105] bg-[#050509] overflow-y-auto flex flex-col items-center"
      >
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoFileChange}
          className="hidden"
        />

        {/* Upper 48% Dynamic Highest-Rated Tilted Netflix-Style Mosaic Collage */}
        <div className="relative w-full h-[38vh] min-h-[250px] max-h-[380px] overflow-hidden shrink-0 bg-[#050509]">
          <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 gap-2 -rotate-6 scale-110 opacity-85 pointer-events-none">
            {topRatedSeries.map((d, idx) => (
              <div
                key={`collage-${d.id}-${idx}`}
                className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/10"
              >
                <img
                  src={idx % 3 === 1 && d.backdrop ? d.backdrop : d.poster}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Dark Obsidian-Crimson Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#050509]/80 to-[#050509] pointer-events-none" />

          {/* Top Bar Controls over Collage */}
          <div className="relative z-20 max-w-md mx-auto w-full px-4 pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/15 text-zinc-200 hover:text-white text-xs font-bold cursor-pointer"
            >
              {appLang === 'hi' ? 'बाद में' : 'Skip'}
            </button>

            <button
              type="button"
              onClick={toggleLanguagePref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white text-xs font-bold cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#ff1e56]" />
              <span>{appLang === 'hi' ? 'हिंदी' : 'English'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
          </div>

          {/* Neon Crimson-Pink Bottom Edge Wave */}
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="absolute bottom-0 inset-x-0 w-full h-12 pointer-events-none"
          >
            <defs>
              <linearGradient id="afpCollageWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e50914" />
                <stop offset="50%" stopColor="#ff1e56" />
                <stop offset="100%" stopColor="#ff7a00" />
              </linearGradient>
            </defs>
            <path
              d="M0,45 Q360,115 720,55 T1440,50 L1440,120 L0,120 Z"
              fill="#050509"
            />
            <path
              d="M0,45 Q360,115 720,55 T1440,50"
              fill="none"
              stroke="url(#afpCollageWave)"
              strokeWidth="3"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Auth Form Body */}
        <div className="relative z-20 w-full max-w-md px-5 pb-10 -mt-6 space-y-5">
          {/* Centered Brand Header */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="flex items-center gap-2">
              <img
                src={transparentLogoSrc}
                alt="AsiaFlix Prime"
                referrerPolicy="no-referrer"
                style={{
                  filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 16px rgba(255,42,133,0.75))',
                  mixBlendMode: 'screen',
                  background: 'transparent',
                }}
                className="w-11 h-11 object-contain"
              />
              <div className="flex items-baseline gap-1 text-2xl font-black tracking-tight">
                <span className="text-white">AsiaFlix</span>
                <span className="bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] bg-clip-text text-transparent">
                  Prime
                </span>
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-400 tracking-wide">
              Watch. Explore. Enjoy.
            </p>
            <div className="w-14 h-1 rounded-full bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] shadow-[0_0_12px_rgba(255,30,86,0.7)]" />
            <h1 className="text-2xl sm:text-3xl font-black text-white pt-1.5">
              {authMode === 'signin'
                ? appLang === 'hi'
                  ? 'वापसी पर स्वागत है!'
                  : 'Welcome Back!'
                : appLang === 'hi'
                ? 'अपना VIP अकाउंट बनाएं'
                : 'Create Your VIP Account'}
            </h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {/* Sign-Up Only: Gallery Photo Upload & Full Name */}
            {authMode === 'signup' && (
              <>
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full bg-[#0b0c14]/90 border-2 border-dashed border-[#ff1e56]/60 hover:border-[#ff1e56] flex items-center justify-center overflow-hidden transition-all cursor-pointer group"
                    title="Upload Your Profile Photo"
                  >
                    {isValidPhoto(avatarPhotoInput) ? (
                      <img
                        src={avatarPhotoInput}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : nameInput.trim() ? (
                      <span className="w-full h-full bg-gradient-to-br from-[#e50914] via-[#ff1e56] to-[#ff7a00] flex items-center justify-center text-2xl font-black text-white">
                        {getInitialMonogram(nameInput)}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 text-zinc-400 group-hover:text-white">
                        <Camera className="w-5 h-5 text-[#ff1e56]" />
                        <span className="text-[9px] font-bold">Upload</span>
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white border border-[#050509] flex items-center justify-center shadow">
                      <Camera className="w-3 h-3" />
                    </span>
                  </button>
                  <span className="text-[11px] font-semibold text-zinc-400">
                    📷 Upload Your Profile Photo (from Gallery)
                  </span>
                  {photoError && <p className="text-[11px] text-[#ff4d6d] font-bold">{photoError}</p>}
                </div>

                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={appLang === 'hi' ? 'पूरा नाम' : 'Full Name'}
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-[#0b0c14]/90 border border-white/12 focus:border-[#ff1e56] outline-none text-sm font-semibold text-white placeholder:text-zinc-500 transition-colors"
                  />
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={64}
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder={appLang === 'hi' ? 'ईमेल एड्रेस या मोबाइल' : 'Email Address'}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-[#0b0c14]/90 border border-white/12 focus:border-[#ff1e56] outline-none text-sm font-semibold text-white placeholder:text-zinc-500 transition-colors"
              />
            </div>

            {/* Password with Show/Hide Eye Toggle */}
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={32}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder={appLang === 'hi' ? 'पासवर्ड' : 'Password'}
                  className="w-full pl-10 pr-11 py-3.5 rounded-2xl bg-[#0b0c14]/90 border border-white/12 focus:border-[#ff1e56] outline-none text-sm font-semibold text-white placeholder:text-zinc-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotHint((v) => !v)}
                  className="text-xs font-bold text-[#ff1e56] hover:text-[#ff7a00] cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {showForgotHint && (
                <div className="p-3 rounded-xl bg-[#0b0c14]/90 border border-[#ff1e56]/40 text-[11px] text-zinc-300 leading-relaxed">
                  Local VIP accounts are stored securely on your device. To reset your password, switch to{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setShowForgotHint(false);
                    }}
                    className="text-[#ff1e56] font-bold underline cursor-pointer"
                  >
                    Sign Up
                  </button>{' '}
                  or enter your email and create a fresh account.
                </div>
              )}
            </div>

            {authError && (
              <p className="text-xs font-bold text-[#ff4d6d] bg-[#1a070d] border border-[#e50914]/40 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}

            {/* Primary Gradient Sign In / Sign Up CTA */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] text-white text-sm font-black shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/12" />
            <span className="text-[11px] font-semibold text-zinc-400">Or continue with</span>
            <div className="h-px flex-1 bg-white/12" />
          </div>

          {/* 3-Column Social Login Row */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleSocialQuickAuth('Google')}
              className="py-2.5 px-2 rounded-2xl bg-[#0b0c14]/90 hover:border-[#ff1e56]/50 border border-white/12 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="font-black text-[#ff7a00]">G</span>
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialQuickAuth('Apple')}
              className="py-2.5 px-2 rounded-2xl bg-[#0b0c14]/90 hover:border-[#ff1e56]/50 border border-white/12 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="font-black"></span>
              <span>Apple</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialQuickAuth('Discord')}
              className="py-2.5 px-2 rounded-2xl bg-[#0b0c14]/90 hover:border-[#ff1e56]/50 border border-white/12 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>👾</span>
              <span>Discord</span>
            </button>
          </div>

          {/* Bottom Mode Switcher & Security Footer */}
          <div className="text-center space-y-2.5 pt-1">
            <p className="text-xs text-zinc-400 font-medium">
              {authMode === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError(null);
                    }}
                    className="font-black text-[#ff1e56] hover:text-[#ff7a00] cursor-pointer"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError(null);
                    }}
                    className="font-black text-[#ff1e56] hover:text-[#ff7a00] cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff1e56]" />
              <span>Your data is safe with us</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SCREEN B: LOGGED-IN PROFILE HUB
  // ============================================================
  const activePhoto = avatarPhotoInput || profile.avatar;
  const topRatedBackdrop =
    topRatedSeries[0]?.backdrop || topRatedSeries[0]?.poster || '';
  const watchedCount = Math.max(vipStats.episodesCompleted, watchHistoryItems.length);
  const watchTimeLabel =
    vipStats.totalMinutes >= 60
      ? `${Math.floor(vipStats.totalMinutes / 60)}h+`
      : `${Math.max(1, vipStats.totalMinutes)}m`;
  const latestWatched = watchHistoryItems[0] || null;
  const latestRemainingMins =
    latestWatched && latestWatched.entry.duration > 0
      ? Math.max(
          1,
          Math.round((latestWatched.entry.duration - latestWatched.entry.currentTime) / 60)
        )
      : 42;
  const latestProgressPct =
    latestWatched && latestWatched.entry.duration > 0
      ? Math.min(
          100,
          Math.max(8, Math.round((latestWatched.entry.currentTime / latestWatched.entry.duration) * 100))
        )
      : 32;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AsiaFlix Prime Profile Hub"
      className="fixed inset-0 z-[100] bg-[#050509] overflow-y-auto flex flex-col items-center"
    >
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      <div className="relative w-full max-w-2xl min-h-full pb-12 flex flex-col">
        {/* Top Blurred #1 Highest-Rated Drama Backdrop Header */}
        <div className="relative w-full pt-4 pb-6 px-4 sm:px-6 overflow-hidden">
          {topRatedBackdrop && (
            <img
              src={topRatedBackdrop}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute inset-0 w-full h-full object-cover blur-xl opacity-45 scale-110"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-[#050509]/85 to-[#050509]" />

          {/* Top Bar */}
          <div className="relative z-20 flex items-center justify-between gap-3">
            {subView !== 'main' ? (
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0b0c14]/90 border border-white/12 text-white text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <img
                  src={transparentLogoSrc}
                  alt="AsiaFlix Prime"
                  referrerPolicy="no-referrer"
                  style={{
                    filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 12px rgba(255,42,133,0.75))',
                    mixBlendMode: 'screen',
                    background: 'transparent',
                  }}
                  className="w-8 h-8 object-contain"
                />
                <div className="flex items-baseline gap-1 text-base font-black tracking-tight">
                  <span className="text-white">AsiaFlix</span>
                  <span className="bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] bg-clip-text text-transparent">
                    Prime
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {savedNotice && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNotifications();
                  }}
                  className="relative w-9 h-9 rounded-full bg-[#0b0c14]/90 border border-white/12 text-white flex items-center justify-center hover:border-[#ff1e56]/50 cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white text-[9px] font-black flex items-center justify-center">
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSubView('edit')}
                className="w-9 h-9 rounded-full bg-[#0b0c14]/90 border border-white/12 text-white flex items-center justify-center hover:border-[#ff1e56]/50 cursor-pointer"
                aria-label="Profile Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#0b0c14]/90 border border-white/12 text-white flex items-center justify-center hover:bg-[#e50914] cursor-pointer"
                aria-label="Close Profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Avatar + Identity Header */}
          {subView === 'main' && (
            <div className="relative z-10 flex flex-col items-center text-center pt-5 space-y-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full border-2 border-[#ff1e56] p-0.5 bg-[#050509] shadow-[0_0_25px_rgba(229,9,20,0.5)] cursor-pointer group"
                title="Change Profile Photo"
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#e50914] via-[#ff1e56] to-[#ff7a00] flex items-center justify-center">
                  {isValidPhoto(activePhoto) ? (
                    <img
                      src={activePhoto}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-black text-white">
                      {getInitialMonogram(profile.name)}
                    </span>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gradient-to-r from-[#e50914] to-[#ff1e56] border-2 border-[#050509] text-white flex items-center justify-center shadow-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </span>
              </button>

              {photoError && <p className="text-xs text-[#ff4d6d] font-bold">{photoError}</p>}

              <div className="space-y-0.5 pt-1">
                <h2 className="text-xl sm:text-2xl font-black text-white inline-flex items-center gap-1.5">
                  <span>{profile.name}</span>
                  <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                  {profile.contact || 'Tap Edit Profile to add your email'}
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff1e56]/15 border border-[#ff1e56]/50 text-pink-100 text-[11px] font-black shadow-[0_0_18px_rgba(255,30,86,0.25)]">
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Premium Member</span>
              </span>
            </div>
          )}
        </div>

        {/* Sub-Views or Main Hub Content */}
        <div className="px-4 sm:px-6 space-y-6 flex-1">
          {subView === 'main' && (
            <>
              {/* 3-Column Stats Bar */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSubView('history')}
                  className="p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12 hover:border-[#ff1e56]/50 text-center space-y-1 cursor-pointer transition-colors"
                >
                  <div className="inline-flex items-center justify-center gap-1 text-base sm:text-lg font-black text-white">
                    <Play className="w-3.5 h-3.5 text-[#ff1e56] fill-[#ff1e56]" />
                    <span>{watchedCount}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-400">Watched</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWatchlist();
                  }}
                  className="p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12 hover:border-[#ff1e56]/50 text-center space-y-1 cursor-pointer transition-colors"
                >
                  <div className="inline-flex items-center justify-center gap-1 text-base sm:text-lg font-black text-white">
                    <Bookmark className="w-3.5 h-3.5 text-[#ff7a00] fill-[#ff7a00]" />
                    <span>{watchlistCount}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-400">In Watchlist</p>
                </button>

                <div className="p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12 text-center space-y-1">
                  <div className="inline-flex items-center justify-center gap-1 text-base sm:text-lg font-black text-white">
                    <Clock className="w-3.5 h-3.5 text-[#ff1e56]" />
                    <span>{watchTimeLabel}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-400">Watch Time</p>
                </div>
              </div>

              {/* Continue Watching Featured Card */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-white">Continue Watching</h3>
                  <button
                    type="button"
                    onClick={() => setSubView('history')}
                    className="inline-flex items-center gap-0.5 text-xs font-bold text-[#ff1e56] hover:text-[#ff7a00] cursor-pointer"
                  >
                    <span>See All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {latestWatched ? (
                  <div
                    onClick={() => {
                      onClose();
                      onOpenDrama(
                        latestWatched.drama,
                        latestWatched.entry.ep || 1,
                        latestWatched.entry.track || 'Hindi Dubbed'
                      );
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12 hover:border-[#ff1e56]/50 cursor-pointer group transition-all"
                  >
                    <div className="w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                      <img
                        src={
                          latestWatched.drama.backdrop ||
                          latestWatched.drama.thumbnailUrl ||
                          latestWatched.drama.poster
                        }
                        alt={latestWatched.drama.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <h4 className="text-sm font-black text-white truncate">
                          {latestWatched.drama.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-semibold">
                          S1 E{latestWatched.entry.ep || 1} • {latestRemainingMins} min remaining
                        </p>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/12 overflow-hidden">
                        <div
                          style={{ width: `${latestProgressPct}%` }}
                          className="h-full bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Resume watching"
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(229,9,20,0.45)] cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#0b0c14]/90 border border-white/12 text-xs text-zinc-400 text-center">
                    Start watching any series and your exact resume point will appear here.
                  </div>
                )}
              </div>

              {/* My Watchlist Horizontal 3-Column Row */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-white">My Watchlist</h3>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWatchlist();
                    }}
                    className="inline-flex items-center gap-0.5 text-xs font-bold text-[#ff1e56] hover:text-[#ff7a00] cursor-pointer"
                  >
                    <span>See All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {savedWatchlistDramas.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#0b0c14]/90 border border-white/12 text-xs text-zinc-400 text-center">
                    No saved titles yet. Tap Bookmark on any drama to add it here.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {savedWatchlistDramas.slice(0, 6).map(({ drama }) => (
                      <button
                        key={`hub-wl-${drama.id}`}
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDrama(drama);
                        }}
                        className="text-left rounded-xl bg-[#0b0c14]/90 border border-white/12 hover:border-[#ff1e56]/50 overflow-hidden cursor-pointer group"
                      >
                        <div className="aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                          <img
                            src={drama.poster}
                            alt={drama.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="p-1.5 text-[11px] font-bold text-white truncate">
                          {drama.title}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* My Offline Downloads Horizontal 3-Column Row */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-white">
                    📥 My Offline Downloads
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSubView('downloads')}
                    className="inline-flex items-center gap-0.5 text-xs font-bold text-[#ff1e56] hover:text-[#ff7a00] cursor-pointer"
                  >
                    <span>See All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {offlineItems.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#0b0c14]/90 border border-white/12 text-xs text-zinc-400 text-center">
                    No offline episodes downloaded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {offlineItems.slice(0, 3).map((item) => {
                      const drama = dramaById.get(item.dramaId);
                      return (
                        <button
                          key={`hub-dl-${item.key}`}
                          type="button"
                          onClick={() => {
                            if (drama) {
                              onClose();
                              onOpenDrama(drama, item.epNum, item.track as AudioType);
                            } else {
                              setSubView('downloads');
                            }
                          }}
                          className="text-left rounded-xl bg-[#0b0c14]/90 border border-white/12 hover:border-[#ff1e56]/50 overflow-hidden cursor-pointer group"
                        >
                          <div className="relative aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                            <img
                              src={item.poster || drama?.poster || ''}
                              alt={item.dramaTitle}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-black text-[9px] font-black">
                              EP {item.epNum}
                            </span>
                          </div>
                          <p className="p-1.5 text-[11px] font-bold text-white truncate">
                            {item.dramaTitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Settings List (6 Clean Rows) */}
              <div className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-white">Settings</h3>
                <div className="rounded-2xl bg-[#0b0c14]/90 border border-white/12 divide-y divide-white/10 overflow-hidden">
                  {/* 1. Edit Profile */}
                  <button
                    type="button"
                    onClick={() => setSubView('edit')}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#ff1e56]/15 text-[#ff1e56] flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-white">Edit Profile</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>

                  {/* 2. Account Security */}
                  <button
                    type="button"
                    onClick={() => setSubView('security')}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#ff7a00]/15 text-[#ff7a00] flex items-center justify-center">
                        <Shield className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-white">Account Security</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>

                  {/* 3. Notifications (Working Toggle) */}
                  <div
                    onClick={toggleNotificationsPref}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#e50914]/15 text-[#e50914] flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-white">Notifications</span>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        notificationsEnabled
                          ? 'bg-gradient-to-r from-[#e50914] to-[#ff1e56]'
                          : 'bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 4. Language */}
                  <button
                    type="button"
                    onClick={toggleLanguagePref}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-white/10 text-zinc-200 flex items-center justify-center">
                        <Globe className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-white">Language</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400">
                      <span>{appLang === 'hi' ? 'हिंदी' : 'English'}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </span>
                  </button>

                  {/* 5. Help & Support */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSupport) {
                        onClose();
                        onOpenSupport();
                      } else {
                        window.open('https://t.me/+yJH68LvfrT9hZDVl', '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-white/10 text-zinc-200 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-white">Help &amp; Support</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>

                  {/* 6. About AsiaFlix Prime */}
                  <button
                    type="button"
                    onClick={() => setSubView('about')}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-white/10 text-zinc-200 flex items-center justify-center">
                        <Info className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-white">About AsiaFlix Prime</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>

              {/* Outlined Log Out Button */}
              <button
                type="button"
                onClick={handleSignOutClick}
                className="w-full py-3.5 rounded-2xl border border-[#e50914]/50 bg-[#1a070d]/60 hover:bg-[#e50914]/20 text-[#ff4d6d] text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </>
          )}

          {/* SUBVIEW: FULL WATCH HISTORY */}
          {subView === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Watch History</h3>
                {watchHistoryItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1a070d] border border-[#e50914]/40 text-[#ff4d6d] text-xs font-black cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
              {watchHistoryItems.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-2">
                  <History className="w-8 h-8 text-zinc-500 mx-auto" />
                  <p className="text-sm font-black text-white">Watch History Is Empty</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {watchHistoryItems.map(({ dramaId, drama, entry }) => {
                    const pct =
                      entry.duration > 0
                        ? Math.min(100, Math.round((entry.currentTime / entry.duration) * 100))
                        : 0;
                    return (
                      <button
                        key={dramaId}
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDrama(drama, entry.ep || 1, entry.track || 'Hindi Dubbed');
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12 hover:border-[#ff1e56]/50 text-left cursor-pointer"
                      >
                        <img
                          src={drama.poster}
                          alt={drama.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-black text-white truncate">{drama.title}</h4>
                            <span className="text-[11px] font-bold text-[#ff7a00] shrink-0">
                              EP {entry.ep || 1}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>{entry.track}</span>
                            <span>
                              {formatTimeSeconds(entry.currentTime)} / {formatTimeSeconds(entry.duration)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBVIEW: FULL OFFLINE DOWNLOADS */}
          {subView === 'downloads' && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-white">Offline Downloads Vault</h3>
              {offlineItems.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-2">
                  <Download className="w-8 h-8 text-[#ff1e56] mx-auto" />
                  <p className="text-sm font-black text-white">No Offline Downloads Yet</p>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Tap Download on any episode to watch smoothly even without internet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {offlineItems.map((item) => {
                    const drama = dramaById.get(item.dramaId);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12"
                      >
                        <img
                          src={item.poster || drama?.poster || ''}
                          alt={item.dramaTitle}
                          referrerPolicy="no-referrer"
                          className="w-12 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="text-sm font-black text-white truncate">{item.dramaTitle}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              EP {item.epNum}
                            </span>
                            <span className="text-zinc-300">{item.track}</span>
                            <span className="text-zinc-500">•</span>
                            <span className="text-[#ff7a00]">{formatBytesReadable(item.sizeBytes)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {drama && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenDrama(drama, item.epNum, item.track as AudioType);
                              }}
                              className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Play</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDeleteOffline(item.key)}
                            className="p-2 rounded-xl bg-[#1a070d] border border-[#e50914]/40 text-[#ff4d6d] cursor-pointer"
                            aria-label="Delete Offline Episode"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBVIEW: EDIT PROFILE & PLAYBACK PREFERENCES */}
          {subView === 'edit' && (
            <form onSubmit={handleSaveHubSettings} className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white">Edit Profile</h3>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ff1e56] cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" /> Change Photo
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050509] border border-white/12 focus:border-[#ff1e56] text-sm font-bold text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Email Address / Mobile
                  </label>
                  <input
                    type="text"
                    maxLength={64}
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050509] border border-white/12 focus:border-[#ff1e56] text-sm font-bold text-white outline-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      Default Audio Track
                    </label>
                    <select
                      value={audioInput}
                      onChange={(e) => setAudioInput(e.target.value as AudioType)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#050509] border border-white/12 text-xs font-bold text-white outline-none"
                    >
                      <option value="Hindi Dubbed">Hindi Dubbed (Official)</option>
                      <option value="Hindi Fan Dubbed">Hindi Fan Dubbed</option>
                      <option value="Original / Eng Sub">Original / Eng Sub</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      Default Subtitles
                    </label>
                    <select
                      value={subLangInput}
                      onChange={(e) => setSubLangInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#050509] border border-white/12 text-xs font-bold text-white outline-none"
                    >
                      <option value="off">Off</option>
                      <option value="hi">Hindi</option>
                      <option value="en">English</option>
                      <option value="ur">Urdu</option>
                      <option value="bn">Bengali</option>
                      <option value="ta">Tamil</option>
                      <option value="te">Telugu</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#050509] border border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#ff7a00]" />
                      Auto-Skip Intro (+85s)
                    </span>
                    <input
                      type="checkbox"
                      checked={autoSkipIntroInput}
                      onChange={(e) => {
                        setAutoSkipIntroInput(e.target.checked);
                        setAutoSkipIntroPref(e.target.checked);
                      }}
                      className="w-4 h-4 accent-[#ff1e56]"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#050509] border border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-white">Auto-Play Next Episode</span>
                    <input
                      type="checkbox"
                      checked={autoPlayNextInput}
                      onChange={(e) => setAutoPlayNextInput(e.target.checked)}
                      className="w-4 h-4 accent-[#ff1e56]"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#050509] border border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-white">Data Saver Mode (480p)</span>
                    <input
                      type="checkbox"
                      checked={dataSaverInput}
                      onChange={(e) => setDataSaverInput(e.target.checked)}
                      className="w-4 h-4 accent-[#ff1e56]"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] text-white text-sm font-black shadow-[0_0_25px_rgba(229,9,20,0.45)] cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          )}

          {/* SUBVIEW: ACCOUNT SECURITY */}
          {subView === 'security' && (
            <form onSubmit={handleSaveHubSettings} className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-3">
                <h3 className="text-sm font-black text-white">Account Security</h3>
                <p className="text-xs text-zinc-400">
                  Update your local sign-in password or security PIN for {profile.contact || profile.name}.
                </p>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    maxLength={32}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="New Password or Security PIN"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#050509] border border-white/12 focus:border-[#ff1e56] text-sm font-bold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] text-white text-sm font-black shadow-[0_0_25px_rgba(229,9,20,0.45)] cursor-pointer"
              >
                Update Security PIN
              </button>
            </form>
          )}

          {/* SUBVIEW: LIKED REELS */}
          {subView === 'liked' && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-white">Liked Reels ({likedClips.length})</h3>
              {likedClips.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-2">
                  <Heart className="w-8 h-8 text-[#ff1e56] mx-auto" />
                  <p className="text-sm font-black text-white">No Liked Reels Yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {likedClips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenClipById(clip.id);
                      }}
                      className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-white/12 hover:border-[#ff1e56] text-left cursor-pointer"
                    >
                      <img
                        src={clip.poster}
                        alt={clip.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                      <div className="absolute bottom-2 inset-x-2">
                        <h4 className="text-xs font-black text-white line-clamp-2">{clip.title}</h4>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBVIEW: REMINDERS */}
          {subView === 'reminders' && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-white">Episode Drop Reminders</h3>
              {reminders.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-2">
                  <Bell className="w-8 h-8 text-[#ff7a00] mx-auto" />
                  <p className="text-sm font-black text-white">No Active Reminders</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminders.map((rem) => {
                    const drama = dramaById.get(rem.dramaId);
                    const nextDrop = getNextEpisodeDropDate(
                      drama?.schedule || rem.schedule,
                      new Date(countdownNowMs)
                    );
                    const countdown = formatDropCountdown(nextDrop, countdownNowMs);
                    return (
                      <div
                        key={rem.dramaId}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12"
                      >
                        <img
                          src={drama?.poster || rem.poster}
                          alt={rem.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="text-xs font-black text-white truncate">
                            {drama?.title || rem.title}
                          </h4>
                          <p className="text-[11px] text-[#ff7a00] font-bold truncate">
                            {drama?.schedule || rem.schedule}
                          </p>
                          {countdown && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300">
                              <Clock className="w-3 h-3" /> {countdown.formatted}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {drama && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenDrama(drama);
                              }}
                              className="p-2 rounded-xl bg-white/10 text-white cursor-pointer"
                            >
                              <Film className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const res = toggleEpisodeReminder({
                                id: rem.dramaId,
                                title: rem.title,
                                poster: rem.poster,
                                schedule: rem.schedule,
                              });
                              setReminders(res.list);
                            }}
                            className="p-2 rounded-xl bg-[#1a070d] border border-[#e50914]/40 text-[#ff4d6d] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBVIEW: ABOUT ASIAFLIX PRIME */}
          {subView === 'about' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-3 text-center">
                <img
                  src={transparentLogoSrc}
                  alt="AsiaFlix Prime"
                  referrerPolicy="no-referrer"
                  style={{
                    filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 14px rgba(255,42,133,0.75))',
                    mixBlendMode: 'screen',
                    background: 'transparent',
                  }}
                  className="w-16 h-16 object-contain mx-auto"
                />
                <div>
                  <h3 className="text-lg font-black text-white">AsiaFlix Prime</h3>
                  <p className="text-xs text-zinc-400">
                    High-speed 1080p Asian Dramas in Hindi Dubbed, Fan Dub &amp; Multi-Language Subtitles.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubView('liked')}
                    className="p-3 rounded-xl bg-[#050509] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-[#ff1e56]" />
                    <span>Liked Reels ({likedClips.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubView('reminders')}
                    className="p-3 rounded-xl bg-[#050509] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#ff7a00]" />
                    <span>Reminders ({reminders.length})</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  {!isAppInstalled && (onOpenAppDownloadModal || onInstallApp) && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenAppDownloadModal) onOpenAppDownloadModal();
                        else if (onInstallApp) onInstallApp();
                      }}
                      className="w-full p-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Official App</span>
                    </button>
                  )}

                  <a
                    href="https://t.me/+yJH68LvfrT9hZDVl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full p-3 rounded-xl bg-[#050509] border border-white/12 text-sky-300 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Official Telegram Channel</span>
                  </a>

                  {onOpenAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdmin();
                      }}
                      className="w-full p-3 rounded-xl bg-[#050509] border border-white/12 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#ff1e56]" />
                      <span>{isAdminAuthenticated ? 'Open Admin Studio' : 'Admin Studio'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
