import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  Clock,
  Crown,
  Download,
  Edit3,
  Flame,
  Heart,
  History,
  Play,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { AudioType, DramaItem, VipProfile } from '../types/drama';
import {
  TIMESTAMPS_UPDATED_EVENT,
  VIP_STATS_UPDATED_EVENT,
  WATCH_TIMESTAMPS_STORAGE_KEY,
  WatchTimestampEntry,
  formatTimeSeconds,
  getVipRankMeta,
  getVipStats,
  getWatchTimestamps,
  VipStats,
} from '../services/vipPlayerHelper';
import {
  LIKED_CLIPS_UPDATED_EVENT,
  StoredLikedClip,
  getLikedClipsList,
} from './ClipsFeedModal';
import { OFFICIAL_WATERMARK_LOGO_URL, useTransparentLogo } from './AnimatedChannelLogo';

export const VIP_PROFILE_STORAGE_KEY = 'asiaflix_vip_profile';
export const VIP_PROFILE_UPDATED_EVENT = 'asiaflix-vip-profile-updated';

export const VIP_AVATAR_OPTIONS: Array<{ emoji: string; label: string; glow: string }> = [
  { emoji: '👑', label: 'Royal Crown', glow: 'from-amber-400 to-red-500' },
  { emoji: '🦊', label: 'Nine-Tail Fox', glow: 'from-orange-400 to-pink-600' },
  { emoji: '🐉', label: 'Crimson Dragon', glow: 'from-red-500 to-rose-700' },
  { emoji: '🌸', label: 'Sakura Spirit', glow: 'from-pink-400 to-fuchsia-600' },
  { emoji: '⚡', label: 'Neon Bolt', glow: 'from-cyan-400 to-blue-600' },
  { emoji: '🎬', label: 'Cinema Ace', glow: 'from-rose-500 to-purple-600' },
  { emoji: '💎', label: 'Prism Diamond', glow: 'from-sky-400 to-indigo-600' },
  { emoji: '🔥', label: 'Blaze Idol', glow: 'from-amber-500 to-red-600' },
  { emoji: '🦋', label: 'Velvet Moth', glow: 'from-violet-400 to-pink-500' },
  { emoji: '🎭', label: 'Drama Mask', glow: 'from-emerald-400 to-teal-600' },
];

export function loadVipProfile(): VipProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VIP_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VipProfile>;
    if (!parsed || typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
    return {
      id: parsed.id || `AFP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: parsed.name.trim(),
      contact: typeof parsed.contact === 'string' ? parsed.contact.trim() : '',
      avatar: typeof parsed.avatar === 'string' && parsed.avatar ? parsed.avatar : '👑',
      defaultAudio: (parsed.defaultAudio as AudioType) || 'Hindi Dubbed',
      preferredSubLang: typeof parsed.preferredSubLang === 'string' ? parsed.preferredSubLang : 'off',
      autoPlayNext: parsed.autoPlayNext !== false,
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
    window.dispatchEvent(new CustomEvent(VIP_PROFILE_UPDATED_EVENT, { detail: profile }));
  } catch {
    // ignore storage errors
  }
}

function generateVipPassCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `AFP-2026-${digits}`;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceGate?: boolean;
  profile: VipProfile | null;
  onSaveProfile: (profile: VipProfile) => void;
  dramas: DramaItem[];
  watchlistCount: number;
  onOpenWatchlist: () => void;
  onOpenDrama: (drama: DramaItem, epNum?: number, track?: AudioType) => void;
  onOpenClipById: (clipId: string) => void;
  onInstallApp?: () => void;
  onOpenAppDownloadModal?: () => void;
  isAppInstalled?: boolean;
  onOpenAdmin?: () => void;
  isAdminAuthenticated?: boolean;
  customLogoUrl?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  forceGate = false,
  profile,
  onSaveProfile,
  dramas,
  watchlistCount,
  onOpenWatchlist,
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
  const [activeTab, setActiveTab] = useState<'liked' | 'history' | 'preferences'>('liked');
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(forceGate || !profile);

  // Form states
  const [nameInput, setNameInput] = useState(profile?.name || '');
  const [contactInput, setContactInput] = useState(profile?.contact || '');
  const [avatarInput, setAvatarInput] = useState(profile?.avatar || '👑');
  const [audioInput, setAudioInput] = useState<AudioType>(profile?.defaultAudio || 'Hindi Dubbed');
  const [subLangInput, setSubLangInput] = useState(profile?.preferredSubLang || 'off');
  const [autoPlayNextInput, setAutoPlayNextInput] = useState<boolean>(profile?.autoPlayNext !== false);
  const [dataSaverInput, setDataSaverInput] = useState<boolean>(Boolean(profile?.dataSaverDefault));
  const [savedNotice, setSavedNotice] = useState(false);

  // Live synced stats, liked clips, & watch history
  const [vipStats, setVipStats] = useState<VipStats>(() => getVipStats());
  const [likedClips, setLikedClips] = useState<StoredLikedClip[]>(() => getLikedClipsList());
  const [watchMap, setWatchMap] = useState<Record<string, WatchTimestampEntry>>(() => getWatchTimestamps());

  useEffect(() => {
    if (!isOpen) return;
    setIsEditingProfile(forceGate || !profile);
    if (profile) {
      setNameInput(profile.name);
      setContactInput(profile.contact);
      setAvatarInput(profile.avatar);
      setAudioInput(profile.defaultAudio);
      setSubLangInput(profile.preferredSubLang || 'off');
      setAutoPlayNextInput(profile.autoPlayNext !== false);
      setDataSaverInput(Boolean(profile.dataSaverDefault));
    }
    setVipStats(getVipStats());
    setLikedClips(getLikedClipsList());
    setWatchMap(getWatchTimestamps());
  }, [isOpen, forceGate, profile]);

  useEffect(() => {
    const syncStats = () => setVipStats(getVipStats());
    const syncLiked = () => setLikedClips(getLikedClipsList());
    const syncTimestamps = () => setWatchMap(getWatchTimestamps());
    window.addEventListener(VIP_STATS_UPDATED_EVENT, syncStats);
    window.addEventListener(LIKED_CLIPS_UPDATED_EVENT, syncLiked);
    window.addEventListener(TIMESTAMPS_UPDATED_EVENT, syncTimestamps);
    return () => {
      window.removeEventListener(VIP_STATS_UPDATED_EVENT, syncStats);
      window.removeEventListener(LIKED_CLIPS_UPDATED_EVENT, syncLiked);
      window.removeEventListener(TIMESTAMPS_UPDATED_EVENT, syncTimestamps);
    };
  }, []);

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
      .filter((item) => Boolean(item.drama))
      .sort((a, b) => (b.entry.updatedAt || 0) - (a.entry.updatedAt || 0));
  }, [watchMap, dramaById]);

  const vipRank = useMemo(() => getVipRankMeta(vipStats.totalMinutes), [vipStats.totalMinutes]);

  const handleSubmitProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = nameInput.trim() || 'VIP Member';
    const nextProfile: VipProfile = {
      id: profile?.id || generateVipPassCode(),
      name: cleanName,
      contact: contactInput.trim(),
      avatar: avatarInput || '👑',
      defaultAudio: audioInput,
      preferredSubLang: subLangInput,
      autoPlayNext: autoPlayNextInput,
      dataSaverDefault: dataSaverInput,
      createdAt: profile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    saveVipProfile(nextProfile);
    onSaveProfile(nextProfile);
    setIsEditingProfile(false);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
    if (forceGate) {
      onClose();
    }
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

  if (!isOpen) return null;

  // Onboarding First-Time Gate OR Edit Mode View
  if (forceGate && !profile) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Your AsiaFlix VIP Profile"
        className="fixed inset-0 z-[105] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="relative w-full max-w-lg rounded-3xl bg-[#0d0e17] border border-pink-500/35 shadow-[0_25px_90px_rgba(229,9,20,0.4)] p-5 sm:p-7 space-y-5 my-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={transparentLogoSrc}
                alt="AsiaFlix Prime"
                referrerPolicy="no-referrer"
                style={{
                  filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 14px rgba(255,42,133,0.7))',
                  mixBlendMode: 'screen',
                  background: 'transparent',
                }}
                className="w-11 h-11 object-contain"
              />
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                  <Crown className="w-3 h-3" /> Welcome to AsiaFlix Prime
                </span>
                <h2 className="text-xl font-black text-white leading-tight">Claim Your VIP Pass</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Skip
            </button>
          </div>

          <form onSubmit={handleSubmitProfile} className="space-y-4">
            {/* Avatar Picker */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-2">
                Choose Your 3D Neon Avatar
              </label>
              <div className="grid grid-cols-5 gap-2">
                {VIP_AVATAR_OPTIONS.map((av) => {
                  const selected = avatarInput === av.emoji;
                  return (
                    <button
                      key={av.emoji}
                      type="button"
                      onClick={() => setAvatarInput(av.emoji)}
                      title={av.label}
                      className={`h-12 rounded-2xl flex items-center justify-center text-2xl transition-all cursor-pointer border ${
                        selected
                          ? `bg-gradient-to-br ${av.glow} border-white shadow-[0_0_20px_rgba(255,42,133,0.5)] scale-105`
                          : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/10'
                      }`}
                    >
                      {av.emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
                  Full Name / Nickname *
                </label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Aryan, Ji-hoon Fan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 focus:border-[#e50914] outline-none text-sm font-bold text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
                  Telegram / Email / Phone
                </label>
                <input
                  type="text"
                  maxLength={48}
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  placeholder="@username or email (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 focus:border-[#e50914] outline-none text-sm font-bold text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
                Preferred Default Audio Track
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Hindi Dubbed', 'Hindi Fan Dubbed', 'Original / Eng Sub'] as AudioType[]).map((track) => {
                  const active = audioInput === track;
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => setAudioInput(track)}
                      className={`px-2.5 py-2.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#e50914] text-white border-[#e50914] shadow-[0_0_16px_rgba(229,9,20,0.5)]'
                          : 'bg-white/[0.05] text-zinc-300 border-white/10 hover:bg-white/[0.1]'
                      }`}
                    >
                      {track === 'Hindi Dubbed' ? '🇮🇳 Hindi' : track === 'Hindi Fan Dubbed' ? '🎙️ Fan Dub' : '🌏 Eng Sub'}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#e50914] via-[#ff2a85] to-amber-500 text-white text-sm font-black shadow-[0_10px_30px_rgba(229,9,20,0.45)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Activate My AsiaFlix VIP Pass</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="VIP Profile Hub"
      onClick={onClose}
      className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-5 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] rounded-3xl bg-[#090a11] border border-white/15 shadow-[0_25px_100px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0d0e18]">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-[#ff2a85]" />
            <h2 className="text-base sm:text-lg font-black text-white">VIP Profile Hub</h2>
            {savedNotice && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-[#e50914] text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close VIP Profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Holographic 3D VIP Pass Card */}
          <div className="relative rounded-3xl p-5 sm:p-6 overflow-hidden border border-amber-400/35 bg-gradient-to-br from-[#190913] via-[#121222] to-[#0a1320] shadow-[0_14px_50px_rgba(229,9,20,0.28)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-[#e50914]/30 via-[#ff2a85]/25 to-amber-500/20 blur-3xl"
            />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#e50914] via-[#ff2a85] to-amber-400 p-0.5 shadow-[0_0_25px_rgba(255,42,133,0.45)] shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[#0b0c14] flex items-center justify-center text-3xl sm:text-4xl">
                    {profile?.avatar || avatarInput}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-black tracking-wider">
                      #{profile?.id || 'AFP-2026-VIP'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black bg-gradient-to-r ${vipRank.gradientClass}`}>
                      {vipRank.title}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1 truncate">
                    {profile?.name || 'Guest VIP Member'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold truncate">
                    {profile?.contact || 'Tap Edit to add Telegram / Email'} • Default: {profile?.defaultAudio || audioInput}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('preferences');
                    setIsEditingProfile(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{profile ? 'Edit Pass' : 'Setup Pass'}</span>
                </button>
              </div>
            </div>

            {/* Rank Progress */}
            <div className="relative mt-4 pt-3 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {vipRank.nextRankTitle ? `Next Rank: ${vipRank.nextRankTitle}` : 'Maximum VIP Legend Status Unlocked!'}
                </span>
                <span className="text-amber-300 font-black">{vipRank.progressPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#e50914] via-[#ff2a85] to-amber-400 transition-all duration-500"
                  style={{ width: `${vipRank.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4 Live Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Minutes Binged</span>
              </div>
              <div className="text-xl font-black text-white mt-1">{vipStats.totalMinutes}m</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Eps Completed</span>
              </div>
              <div className="text-xl font-black text-emerald-300 mt-1">{vipStats.episodesCompleted}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily Streak</span>
              </div>
              <div className="text-xl font-black text-amber-300 mt-1">{vipStats.streakDays}d</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWatchlist();
              }}
              className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
                <Bookmark className="w-3.5 h-3.5 text-pink-400" />
                <span>Likes / Saved</span>
              </div>
              <div className="text-xl font-black text-pink-300 mt-1">
                {likedClips.length} / {watchlistCount}
              </div>
            </button>
          </div>

          {/* 3 Interactive Hub Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('liked')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'liked'
                  ? 'bg-[#ff2a85] text-white shadow-[0_0_16px_rgba(255,42,133,0.4)]'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>My Liked Clips ({likedClips.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#e50914] text-white shadow-[0_0_16px_rgba(229,9,20,0.4)]'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Watch History ({watchHistoryItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-amber-500 text-black shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>App & Playback Preferences</span>
            </button>
          </div>

          {/* TAB 1: My Liked Clips */}
          {activeTab === 'liked' && (
            <div className="space-y-3">
              {likedClips.length === 0 ? (
                <div className="py-10 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <Heart className="w-8 h-8 text-pink-400/70 mx-auto" />
                  <p className="text-sm font-black text-white">No Liked Clips Yet</p>
                  <p className="text-xs text-zinc-400">
                    Double-tap any highlight inside the 🎬 Clips feed to save your favorite moments here!
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {likedClips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenClipById(clip.id);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-left transition-all cursor-pointer group"
                    >
                      <img
                        src={clip.poster}
                        alt={clip.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-20 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-black text-white truncate group-hover:text-pink-300">
                          {clip.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {clip.episodeNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-zinc-200">
                              EP {clip.episodeNumber}
                            </span>
                          )}
                          {clip.label && (
                            <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-[10px] font-bold text-pink-200">
                              {clip.label}
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#ff2a85]">
                          <Play className="w-3 h-3 fill-current" /> Replay Clip
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Watch History & Continue Watching */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {watchHistoryItems.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">
                    Tap any drama to resume right where you paused
                  </span>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-[11px] font-black cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Watch History</span>
                  </button>
                </div>
              )}

              {watchHistoryItems.length === 0 ? (
                <div className="py-10 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <History className="w-8 h-8 text-zinc-500 mx-auto" />
                  <p className="text-sm font-black text-white">Watch History Is Empty</p>
                  <p className="text-xs text-zinc-400">
                    Your watched episodes and resume timestamps appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {watchHistoryItems.map(({ dramaId, drama, entry }) => {
                    if (!drama) return null;
                    const pct = entry.duration > 0 ? Math.min(100, Math.round((entry.currentTime / entry.duration) * 100)) : 0;
                    return (
                      <button
                        key={dramaId}
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDrama(drama, entry.ep || 1, entry.track || 'Hindi Dubbed');
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-left transition-all cursor-pointer group"
                      >
                        <img
                          src={drama.poster}
                          alt={drama.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-black text-white truncate group-hover:text-red-400">
                              {drama.title}
                            </h4>
                            <span className="text-[11px] font-bold text-amber-300 shrink-0">
                              EP {entry.ep || 1}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#e50914] to-amber-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold">
                            <span>{entry.track}</span>
                            <span>
                              {formatTimeSeconds(entry.currentTime)} / {formatTimeSeconds(entry.duration)} ({pct}%)
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

          {/* TAB 3: App & Playback Preferences */}
          {activeTab === 'preferences' && (
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              {isEditingProfile || !profile ? (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-2">
                      Avatar Icon
                    </label>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {VIP_AVATAR_OPTIONS.map((av) => (
                        <button
                          key={av.emoji}
                          type="button"
                          onClick={() => setAvatarInput(av.emoji)}
                          title={av.label}
                          className={`h-10 rounded-xl flex items-center justify-center text-xl border transition-all cursor-pointer ${
                            avatarInput === av.emoji
                              ? `bg-gradient-to-br ${av.glow} border-white scale-105`
                              : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.1]'
                          }`}
                        >
                          {av.emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={32}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your Name / Nickname"
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm font-bold text-white outline-none focus:border-[#e50914]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1">
                        Telegram / Email / Phone
                      </label>
                      <input
                        type="text"
                        maxLength={48}
                        value={contactInput}
                        onChange={(e) => setContactInput(e.target.value)}
                        placeholder="@telegram or email"
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm font-bold text-white outline-none focus:border-[#e50914]"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
                      Default Audio Track
                    </label>
                    <select
                      value={audioInput}
                      onChange={(e) => setAudioInput(e.target.value as AudioType)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#141624] border border-white/15 text-xs font-extrabold text-white outline-none"
                    >
                      <option value="Hindi Dubbed">🇮🇳 Hindi Dubbed (Official)</option>
                      <option value="Hindi Fan Dubbed">🎙️ Hindi Fan Dubbed</option>
                      <option value="Original / Eng Sub">🌏 Original / Eng Sub</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
                      Default Subtitle Language
                    </label>
                    <select
                      value={subLangInput}
                      onChange={(e) => setSubLangInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#141624] border border-white/15 text-xs font-extrabold text-white outline-none"
                    >
                      <option value="off">Off (Manual Toggle)</option>
                      <option value="hi">🇮🇳 Hindi (हिन्दी)</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="ur">🇵🇰 Urdu (اردو)</option>
                      <option value="bn">🇧🇩 Bengali (বাংলা)</option>
                      <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
                      <option value="te">🇮🇳 Telugu (తెలుగు)</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
                    <div>
                      <div className="text-xs font-black text-white">Auto-Play Next Episode</div>
                      <div className="text-[10px] text-zinc-400">8s Netflix countdown at episode end</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPlayNextInput}
                      onChange={(e) => setAutoPlayNextInput(e.target.checked)}
                      className="w-4 h-4 accent-[#e50914]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
                    <div>
                      <div className="text-xs font-black text-white">Data Saver Mode (480p)</div>
                      <div className="text-[10px] text-zinc-400">Lower data usage on mobile networks</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dataSaverInput}
                      onChange={(e) => setDataSaverInput(e.target.checked)}
                      className="w-4 h-4 accent-[#e50914]"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2a85] text-white text-xs font-black hover:brightness-110 transition-all cursor-pointer"
                >
                  Save Profile & Playback Preferences
                </button>
              </div>

              {/* Quick VIP Actions (App Installer, Telegram, Admin Studio) */}
              <div className="grid sm:grid-cols-3 gap-2.5">
                {!isAppInstalled && (onOpenAppDownloadModal || onInstallApp) && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenAppDownloadModal) onOpenAppDownloadModal();
                      else if (onInstallApp) onInstallApp();
                    }}
                    className="p-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Official App</span>
                  </button>
                )}

                <a
                  href="https://t.me/+yJH68LvfrT9hZDVl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 text-xs font-black flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Join VIP Telegram</span>
                </a>

                {onOpenAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-zinc-200 text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-red-400" />
                    <span>{isAdminAuthenticated ? 'Open Admin Studio' : 'Admin Access'}</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
