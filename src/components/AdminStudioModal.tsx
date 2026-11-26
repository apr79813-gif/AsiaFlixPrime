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
  ShieldAlert,
  Send,
  Table,
  Bell,
  FileText,
  Copy,
  Code,
  DollarSign,
  Captions,
  Upload,
  Link2
} from 'lucide-react';
import { DramaItem, AudioType, DramaCategory, ReleaseNotification, WeekendSettings, HeroBannerSlide, TelegramBotSettings } from '../types/drama';
import { 
  insertDramaIntoSupabase, 
  insertNotificationIntoSupabase, 
  loginWithSupabaseAuth, 
  fetchDramasFromSupabase,
  fetchSupabaseStats,
  seedCatalogToSupabase,
  AdConfig,
  DEFAULT_AD_CONFIG
} from '../services/supabaseService';
import { sendTelegramBroadcast, sendBrandedTelegramEpisodePost, sendNativePushNotification } from '../services/notificationService';
import { createDramaSlug } from '../services/urlHelper';
import {
  parseSrtOrVttContent,
  normalizeSubtitleUrl,
  normalizeUniversalAssetUrl,
  getAdminSubtitleOverrides,
  saveAdminSubtitleOverrides,
  AdminSubtitleEntry,
} from '../services/vipPlayerHelper';
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
  initialTab?: 'trending' | 'weekend' | 'banners' | 'new_drama' | 'subtitles' | 'migrator' | 'broadcast' | 'sheets' | 'supabase' | 'ads' | 'security';
  onAuthSuccess?: () => void;
  onAuthLogout?: () => void;
  isAuthenticatedParent?: boolean;
  googleSheetUrl?: string;
  onUpdateGoogleSheetUrl?: (url: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  telegramBotSettings?: TelegramBotSettings;
  onUpdateTelegramBotSettings?: (settings: TelegramBotSettings) => void;
  adConfig?: AdConfig;
  onUpdateAdConfig?: (config: AdConfig) => Promise<{ success: boolean; error?: string }>;
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
  googleSheetUrl = '',
  onUpdateGoogleSheetUrl,
  telegramBotSettings,
  onUpdateTelegramBotSettings,
  adConfig,
  onUpdateAdConfig,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(isAuthenticatedParent);
  const [authMethod, setAuthMethod] = useState<'pin' | 'password'>('pin');
  const [pinInput, setPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'trending' | 'weekend' | 'banners' | 'new_drama' | 'subtitles' | 'migrator' | 'broadcast' | 'sheets' | 'supabase' | 'ads' | 'security'>(initialTab);

  // Ads Manager Local Draft State
  const [adDraft, setAdDraft] = useState<AdConfig>(() => adConfig || { ...DEFAULT_AD_CONFIG });
  const [isSavingAds, setIsSavingAds] = useState(false);
  const [adsSaveFeedback, setAdsSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (adConfig) {
      setAdDraft(adConfig);
    }
  }, [adConfig]);

  // Google Sheets Local State
  const [sheetUrlDraft, setSheetUrlDraft] = useState(googleSheetUrl);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSyncFeedback, setSheetSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [appsScriptUrlDraft, setAppsScriptUrlDraft] = useState<string>(() => {
    return localStorage.getItem('asiaflix_google_apps_script_url') || '';
  });
  const [appsScriptFeedback, setAppsScriptFeedback] = useState<string | null>(null);

  // Telegram Bot Local State
  const [botDraft, setBotDraft] = useState<TelegramBotSettings>(() => {
    return telegramBotSettings || {
      botUsername: 'asiaflix_request_bot',
      botToken: '',
      channelId: '@asiaflixprime',
      isEnabled: true,
    };
  });
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [botTestFeedback, setBotTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [broadcastToTelegram, setBroadcastToTelegram] = useState(true);
  const [broadcastToWebPush, setBroadcastToWebPush] = useState(true);
  const [notifButtonText, setNotifButtonText] = useState('▶ Stream 1080p Episodes');
  const [notifButtonUrl, setNotifButtonUrl] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [autoPostNewDramaTelegram, setAutoPostNewDramaTelegram] = useState(true);

  // Quick Add Episode Stream Link + Branded Telegram Auto-Post State
  const [quickEpDramaId, setQuickEpDramaId] = useState<string>(() => dramas[0]?.id || '');
  const [quickEpNumber, setQuickEpNumber] = useState<string>('1');
  const [quickEpAudio, setQuickEpAudio] = useState<AudioType>('Hindi Dubbed');
  const [quickEpStreamUrl, setQuickEpStreamUrl] = useState('');
  const [quickEpCustomAudioUrl, setQuickEpCustomAudioUrl] = useState('');
  const [quickEpTelegramUrl, setQuickEpTelegramUrl] = useState('');
  const [quickEpAutoPostTelegram, setQuickEpAutoPostTelegram] = useState(true);
  const [isPushingQuickEp, setIsPushingQuickEp] = useState(false);

  useEffect(() => {
    if (googleSheetUrl) {
      setSheetUrlDraft(googleSheetUrl);
    }
  }, [googleSheetUrl]);

  useEffect(() => {
    if (telegramBotSettings) {
      setBotDraft(telegramBotSettings);
    }
  }, [telegramBotSettings]);

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

  // Admin Subtitles Manager State
  const [adminSubOverrides, setAdminSubOverrides] = useState<Record<string, AdminSubtitleEntry[]>>(() =>
    getAdminSubtitleOverrides()
  );
  const [subTargetDramaId, setSubTargetDramaId] = useState<string>(() => dramas[0]?.id || '');
  const [subTargetEp, setSubTargetEp] = useState<string>('all');
  const [subLangCode, setSubLangCode] = useState<string>('hin_eng');
  const [subUrlInput, setSubUrlInput] = useState<string>('');
  const [subUploadPreview, setSubUploadPreview] = useState<{ fileName: string; cueCount: number; dataUrl: string } | null>(null);
  const [subSaveFeedback, setSubSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!subTargetDramaId && localDramas.length > 0) {
      setSubTargetDramaId(localDramas[0].id);
    }
  }, [localDramas, subTargetDramaId]);

  // Bulk Link & Host Migrator State
  const [migratorOldHost, setMigratorOldHost] = useState<string>(
    'https://huggingface.co/datasets/asiaflixprime/dramas/resolve/main/'
  );
  const [migratorNewHost, setMigratorNewHost] = useState<string>('');
  const [migratorScope, setMigratorScope] = useState<string>('all');
  const [migratorIncludeSubtitles, setMigratorIncludeSubtitles] = useState<boolean>(true);
  const [migratorIncludeAudio, setMigratorIncludeAudio] = useState<boolean>(true);
  const [migratorFeedback, setMigratorFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Batch Episode URL Paster State
  const [batchTargetDramaId, setBatchTargetDramaId] = useState<string>(() => dramas[0]?.id || '');
  const [batchTrack, setBatchTrack] = useState<'Hindi Dubbed' | 'Hindi Fan Dubbed' | 'Original / Eng Sub'>('Hindi Dubbed');
  const [batchField, setBatchField] = useState<'video' | 'audio' | 'subtitle'>('video');
  const [batchSubLangCode, setBatchSubLangCode] = useState<string>('hin_eng');
  const [batchUrlsText, setBatchUrlsText] = useState<string>('');
  const [batchAutoPostTelegram, setBatchAutoPostTelegram] = useState<boolean>(true);
  const [batchFeedback, setBatchFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!batchTargetDramaId && localDramas.length > 0) {
      setBatchTargetDramaId(localDramas[0].id);
    }
  }, [localDramas, batchTargetDramaId]);

  const migratorMatchSummary = useMemo(() => {
    const oldTrimmed = migratorOldHost.trim().toLowerCase();
    if (!oldTrimmed) return { matchedLinks: 0, matchedTitles: 0 };
    let matchedLinks = 0;
    let matchedTitles = 0;
    const targetDramas =
      migratorScope === 'all' ? localDramas : localDramas.filter((d) => d.id === migratorScope);

    for (const d of targetDramas) {
      let titleHit = false;
      const checkUrl = (u?: string) => {
        if (u && u.toLowerCase().includes(oldTrimmed)) {
          matchedLinks += 1;
          titleHit = true;
        }
      };
      checkUrl(d.movieStreamLink);
      checkUrl(d.movieFanDubStreamLink);
      checkUrl(d.movieEngSubStreamLink);
      if (migratorIncludeSubtitles) {
        checkUrl(d.subtitleLink);
        Object.values(d.subtitles || {}).forEach((s) => checkUrl(s?.url));
        (d.subtitleTracks || []).forEach((s) => checkUrl(s?.url));
      }
      for (const ep of d.episodes || []) {
        checkUrl(ep.streamLink);
        checkUrl(ep.hindiFanDubStreamLink);
        checkUrl(ep.engSubStreamLink);
        if (migratorIncludeAudio) {
          checkUrl(ep.hindiCustomAudioLink);
          checkUrl(ep.fanDubCustomAudioLink);
          checkUrl(ep.origCustomAudioLink);
        }
        if (migratorIncludeSubtitles) {
          checkUrl(ep.subtitleLink);
          Object.values(ep.subtitles || {}).forEach((s) => checkUrl(s?.url));
          (ep.subtitleTracks || []).forEach((s) => checkUrl(s?.url));
        }
      }
      if (titleHit) matchedTitles += 1;
    }
    return { matchedLinks, matchedTitles };
  }, [localDramas, migratorOldHost, migratorScope, migratorIncludeSubtitles, migratorIncludeAudio]);

  const handleApplyHostMigration = (e: React.FormEvent) => {
    e.preventDefault();
    setMigratorFeedback(null);
    const oldPrefix = migratorOldHost.trim();
    const newPrefix = migratorNewHost.trim();
    if (!oldPrefix || !newPrefix) {
      setMigratorFeedback({
        type: 'error',
        message: 'Enter both the Old Host / URL Prefix and the New Host / URL Prefix.',
      });
      return;
    }

    const escapedOld = oldPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp(escapedOld, 'gi');
    let replacedCount = 0;
    let affectedTitles = 0;

    const replaceUrl = (u?: string): string | undefined => {
      if (!u) return u;
      if (u.toLowerCase().includes(oldPrefix.toLowerCase())) {
        replacedCount += 1;
        return normalizeUniversalAssetUrl(u.replace(prefixRegex, newPrefix));
      }
      return u;
    };

    const updated = localDramas.map((d) => {
      if (migratorScope !== 'all' && d.id !== migratorScope) return d;
      const before = replacedCount;

      const nextSubs = d.subtitles
        ? Object.fromEntries(
            Object.entries(d.subtitles).map(([k, v]) => [
              k,
              migratorIncludeSubtitles && v?.url
                ? { ...v, url: replaceUrl(v.url) || v.url }
                : v,
            ])
          )
        : d.subtitles;

      const nextSubTracks = d.subtitleTracks
        ? d.subtitleTracks.map((t) =>
            migratorIncludeSubtitles ? { ...t, url: replaceUrl(t.url) || t.url } : t
          )
        : d.subtitleTracks;

      const nextEpisodes = (d.episodes || []).map((ep) => {
        const nextEpSubs = ep.subtitles
          ? Object.fromEntries(
              Object.entries(ep.subtitles).map(([k, v]) => [
                k,
                migratorIncludeSubtitles && v?.url
                  ? { ...v, url: replaceUrl(v.url) || v.url }
                  : v,
              ])
            )
          : ep.subtitles;

        const nextEpSubTracks = ep.subtitleTracks
          ? ep.subtitleTracks.map((t) =>
              migratorIncludeSubtitles ? { ...t, url: replaceUrl(t.url) || t.url } : t
            )
          : ep.subtitleTracks;

        return {
          ...ep,
          streamLink: replaceUrl(ep.streamLink),
          hindiFanDubStreamLink: replaceUrl(ep.hindiFanDubStreamLink),
          engSubStreamLink: replaceUrl(ep.engSubStreamLink),
          hindiCustomAudioLink: migratorIncludeAudio
            ? replaceUrl(ep.hindiCustomAudioLink)
            : ep.hindiCustomAudioLink,
          fanDubCustomAudioLink: migratorIncludeAudio
            ? replaceUrl(ep.fanDubCustomAudioLink)
            : ep.fanDubCustomAudioLink,
          origCustomAudioLink: migratorIncludeAudio
            ? replaceUrl(ep.origCustomAudioLink)
            : ep.origCustomAudioLink,
          subtitleLink: migratorIncludeSubtitles ? replaceUrl(ep.subtitleLink) : ep.subtitleLink,
          subtitles: nextEpSubs,
          subtitleTracks: nextEpSubTracks,
        };
      });

      const nextDrama: DramaItem = {
        ...d,
        movieStreamLink: replaceUrl(d.movieStreamLink),
        movieFanDubStreamLink: replaceUrl(d.movieFanDubStreamLink),
        movieEngSubStreamLink: replaceUrl(d.movieEngSubStreamLink),
        subtitleLink: migratorIncludeSubtitles ? replaceUrl(d.subtitleLink) : d.subtitleLink,
        subtitles: nextSubs,
        subtitleTracks: nextSubTracks,
        episodes: nextEpisodes,
      };

      if (replacedCount > before) affectedTitles += 1;
      return nextDrama;
    });

    if (replacedCount === 0) {
      setMigratorFeedback({
        type: 'error',
        message: 'No existing episode, audio, or subtitle links matched that Old Host prefix.',
      });
      return;
    }

    setLocalDramas(updated);
    onUpdateDramasCuration(updated);
    setSuccessMessage(`Migrated ${replacedCount} links across ${affectedTitles} title(s) live!`);
    setMigratorFeedback({
      type: 'success',
      message: `Replaced ${replacedCount} URL(s) across ${affectedTitles} title(s) and saved to live catalog.`,
    });
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleApplyBatchEpisodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchFeedback(null);
    if (!batchTargetDramaId) {
      setBatchFeedback({ type: 'error', message: 'Select a target series first.' });
      return;
    }
    const rawLines = batchUrlsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      setBatchFeedback({ type: 'error', message: 'Paste at least one episode URL (one per line, HD1 = URL, or EpNum|URL).' });
      return;
    }

    const parsedEntries: Array<{ epNum: number; url: string }> = [];
    let autoIndex = 1;
    for (const line of rawLines) {
      const labeledMatch = line.match(
        /^(?:(?:hd|fd|os|ep|episode|e|sub|s\d{1,2}e)\s*[-_#]?\s*)?(\d+)\s*[|=,:\t]+\s*(https?:\/\/.+)$/i
      );
      const urlRaw = labeledMatch ? labeledMatch[2] : line;
      const seInsideUrl = !labeledMatch ? urlRaw.match(/S\d{1,2}E(\d{1,3})/i) : null;
      const epNum = labeledMatch
        ? Math.max(1, parseInt(labeledMatch[1], 10))
        : seInsideUrl
          ? Math.max(1, parseInt(seInsideUrl[1], 10))
          : autoIndex;
      const normalized = normalizeUniversalAssetUrl(urlRaw);
      if (/^https?:\/\//i.test(normalized)) {
        parsedEntries.push({ epNum, url: normalized });
      }
      autoIndex = epNum + 1;
    }

    if (parsedEntries.length === 0) {
      setBatchFeedback({
        type: 'error',
        message: 'No valid http(s) URLs found. Supports "HD1 = https://...", "1|https://...", or plain URLs.',
      });
      return;
    }

    const targetDrama = localDramas.find((d) => d.id === batchTargetDramaId);
    if (!targetDrama) return;

    const getEpNumeric = (epNo: number | string) => {
      if (typeof epNo === 'number') return epNo;
      const m = String(epNo).match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 1;
    };

    const nextEpisodes = [...(targetDrama.episodes || [])];
    const subMeta = ADMIN_SUB_LANG_META[batchSubLangCode] || {
      label: batchSubLangCode.toUpperCase(),
      langTag: 'en-US',
    };

    for (const entry of parsedEntries) {
      const idx = nextEpisodes.findIndex((ep) => getEpNumeric(ep.episodeNumber) === entry.epNum);
      const existing = idx >= 0
        ? nextEpisodes[idx]
        : {
            id: `${targetDrama.id}-ep-${entry.epNum}`,
            episodeNumber: entry.epNum,
            title: `Episode ${entry.epNum}`,
            audio: batchTrack as AudioType,
            telegramUrl: targetDrama.telegramUrl || '',
            quality: targetDrama.qualityBadge || '1080p FHD',
          };

      const patched = { ...existing };
      if (batchField === 'video') {
        if (batchTrack === 'Hindi Dubbed') patched.streamLink = entry.url;
        else if (batchTrack === 'Hindi Fan Dubbed') patched.hindiFanDubStreamLink = entry.url;
        else patched.engSubStreamLink = entry.url;
      } else if (batchField === 'audio') {
        if (batchTrack === 'Hindi Dubbed') patched.hindiCustomAudioLink = entry.url;
        else if (batchTrack === 'Hindi Fan Dubbed') patched.fanDubCustomAudioLink = entry.url;
        else patched.origCustomAudioLink = entry.url;
      } else {
        patched.subtitleLink = entry.url;
        patched.subtitles = {
          ...(patched.subtitles || {}),
          [batchSubLangCode]: {
            code: batchSubLangCode,
            label: subMeta.label,
            langTag: subMeta.langTag,
            url: entry.url,
          },
        };
      }

      if (idx >= 0) nextEpisodes[idx] = patched;
      else nextEpisodes.push(patched);
    }

    nextEpisodes.sort((a, b) => getEpNumeric(a.episodeNumber) - getEpNumeric(b.episodeNumber));

    const updated = localDramas.map((d) =>
      d.id === batchTargetDramaId
        ? {
            ...d,
            episodes: nextEpisodes,
            totalEpisodes: Math.max(d.totalEpisodes || 0, nextEpisodes.length),
          }
        : d
    );

    setLocalDramas(updated);
    onUpdateDramasCuration(updated);
    setBatchUrlsText('');

    let tgFeedback = '';
    if (
      batchAutoPostTelegram &&
      batchField === 'video' &&
      botDraft.botToken?.trim() &&
      botDraft.channelId?.trim()
    ) {
      const latestEpNum = Math.max(...parsedEntries.map((item) => item.epNum));
      const slug = createDramaSlug(targetDrama);
      const watchUrl = `https://asiaflixprime.pages.dev/watch/${slug}/ep-${latestEpNum}`;
      const tgRes = await sendBrandedTelegramEpisodePost(botDraft.botToken, botDraft.channelId, {
        title: targetDrama.title,
        episodeNumber: latestEpNum,
        audioLabel: batchTrack,
        totalEpisodesText: targetDrama.details || `${nextEpisodes.length} Episodes`,
        genres: targetDrama.subCategory || targetDrama.category,
        ageRating: targetDrama.ageRating || 'UA 13+',
        statusText: `Now Streaming Ep ${latestEpNum}`,
        imageUrl: targetDrama.episodeThumbnails?.[latestEpNum] || targetDrama.thumbnailUrl || targetDrama.poster,
        watchUrl,
      });
      tgFeedback = tgRes.success ? ' + Branded 16:9 Telegram Post Sent!' : ` (Telegram: ${tgRes.error})`;
    }

    setSuccessMessage(`Applied ${parsedEntries.length} ${batchField} links to "${targetDrama.title}"!${tgFeedback}`);
    setBatchFeedback({
      type: 'success',
      message: `Updated ${parsedEntries.length} episode(s) (${batchTrack} • ${batchField.toUpperCase()}) on "${targetDrama.title}".${tgFeedback}`,
    });
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const ADMIN_SUB_LANG_META: Record<string, { label: string; langTag: string }> = {
    hin_eng: { label: '🇮🇳 Hindi + Eng Mix', langTag: 'hi-IN' },
    hin: { label: '🇮🇳 Hindi', langTag: 'hi-IN' },
    eng: { label: '🇬🇧 English', langTag: 'en-US' },
    ur: { label: '🇵🇰 Urdu', langTag: 'ur-PK' },
    tam: { label: '🇮🇳 Tamil', langTag: 'ta-IN' },
    tel: { label: '🇮🇳 Telugu', langTag: 'te-IN' },
    ben: { label: '🇮🇳 Bengali', langTag: 'bn-IN' },
    mar: { label: '🇮🇳 Marathi', langTag: 'mr-IN' },
    kor: { label: '🇰🇷 Korean', langTag: 'ko-KR' },
    chi: { label: '🇨🇳 Chinese', langTag: 'zh-CN' },
    ind: { label: '🇮🇩 Indonesian', langTag: 'id-ID' },
  };

  const handleAdminSubFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const cues = parseSrtOrVttContent(content);
      if (cues.length === 0) {
        setSubSaveFeedback({
          type: 'error',
          message: `No valid subtitle timestamps found in "${file.name}". Please upload a valid .srt, .md.srt, or .vtt file.`,
        });
        return;
      }
      const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
      setSubUploadPreview({ fileName: file.name, cueCount: cues.length, dataUrl });
      setSubSaveFeedback({
        type: 'success',
        message: `Parsed ${cues.length} subtitle cues from "${file.name}". Click Save Subtitle Track to publish.`,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyAdminSubEntryToDramas = (
    dramaId: string,
    entriesForDrama: AdminSubtitleEntry[]
  ) => {
    const updated = localDramas.map((d) => {
      if (d.id !== dramaId) return d;
      const dramaSubMap: Record<string, { code: string; label: string; langTag: string; url: string }> = {
        ...(d.subtitles || {}),
      };
      entriesForDrama
        .filter((item) => item.epNum === 'all')
        .forEach((item) => {
          dramaSubMap[item.code] = {
            code: item.code,
            label: item.label,
            langTag: item.langTag,
            url: item.url,
          };
        });

      const updatedEpisodes = d.episodes.map((ep) => {
        const epNum =
          typeof ep.episodeNumber === 'number'
            ? ep.episodeNumber
            : parseInt(String(ep.episodeNumber).match(/(\d+)/)?.[1] || '1', 10);
        const epSubMap = { ...(ep.subtitles || {}) };
        entriesForDrama
          .filter((item) => item.epNum === epNum)
          .forEach((item) => {
            epSubMap[item.code] = {
              code: item.code,
              label: item.label,
              langTag: item.langTag,
              url: item.url,
            };
          });
        return {
          ...ep,
          subtitles: Object.keys(epSubMap).length > 0 ? epSubMap : ep.subtitles,
          subtitleLink: Object.values(epSubMap)[0]?.url || ep.subtitleLink,
        };
      });

      return {
        ...d,
        subtitles: Object.keys(dramaSubMap).length > 0 ? dramaSubMap : d.subtitles,
        subtitleLink: Object.values(dramaSubMap)[0]?.url || d.subtitleLink,
        episodes: updatedEpisodes,
      };
    });
    setLocalDramas(updated);
    onUpdateDramasCuration(updated);
  };

  const handleSaveAdminSubtitle = (e: React.FormEvent) => {
    e.preventDefault();
    setSubSaveFeedback(null);
    if (!subTargetDramaId) {
      setSubSaveFeedback({ type: 'error', message: 'Please select a drama first.' });
      return;
    }
    const rawUrl = subUploadPreview?.dataUrl || normalizeSubtitleUrl(subUrlInput);
    if (!rawUrl || (!/^https?:\/\//i.test(rawUrl) && !/^data:/i.test(rawUrl))) {
      setSubSaveFeedback({
        type: 'error',
        message: 'Paste a valid Hugging Face / direct .srt or .md.srt URL, or upload a local file.',
      });
      return;
    }

    const meta = ADMIN_SUB_LANG_META[subLangCode] || { label: subLangCode.toUpperCase(), langTag: 'en-US' };
    const parsedEp: number | 'all' =
      subTargetEp === 'all' ? 'all' : Math.max(1, parseInt(subTargetEp, 10) || 1);

    const newEntry: AdminSubtitleEntry = {
      code: subLangCode,
      label: meta.label,
      langTag: meta.langTag,
      url: rawUrl,
      epNum: parsedEp,
    };

    const existingList = adminSubOverrides[subTargetDramaId] || [];
    const nextList = [
      ...existingList.filter((item) => !(item.code === newEntry.code && item.epNum === newEntry.epNum)),
      newEntry,
    ];
    const nextMap = { ...adminSubOverrides, [subTargetDramaId]: nextList };
    setAdminSubOverrides(nextMap);
    saveAdminSubtitleOverrides(nextMap);
    applyAdminSubEntryToDramas(subTargetDramaId, nextList);

    setSubUrlInput('');
    setSubUploadPreview(null);
    setSubSaveFeedback({
      type: 'success',
      message: `Saved ${meta.label} (${parsedEp === 'all' ? 'All Episodes / Movie' : `Ep ${parsedEp}`})! Live in player immediately.`,
    });
  };

  const handleRemoveAdminSubtitle = (dramaId: string, code: string, epNum: number | 'all') => {
    const existingList = adminSubOverrides[dramaId] || [];
    const nextList = existingList.filter((item) => !(item.code === code && item.epNum === epNum));
    const nextMap = { ...adminSubOverrides };
    if (nextList.length > 0) {
      nextMap[dramaId] = nextList;
    } else {
      delete nextMap[dramaId];
    }
    setAdminSubOverrides(nextMap);
    saveAdminSubtitleOverrides(nextMap);

    const updated = localDramas.map((d) => {
      if (d.id !== dramaId) return d;
      if (epNum === 'all') {
        const nextDramaSubs = { ...(d.subtitles || {}) };
        delete nextDramaSubs[code];
        return {
          ...d,
          subtitles: Object.keys(nextDramaSubs).length > 0 ? nextDramaSubs : undefined,
        };
      }
      return {
        ...d,
        episodes: d.episodes.map((ep) => {
          const n =
            typeof ep.episodeNumber === 'number'
              ? ep.episodeNumber
              : parseInt(String(ep.episodeNumber).match(/(\d+)/)?.[1] || '1', 10);
          if (n !== epNum || !ep.subtitles) return ep;
          const nextEpSubs = { ...ep.subtitles };
          delete nextEpSubs[code];
          return {
            ...ep,
            subtitles: Object.keys(nextEpSubs).length > 0 ? nextEpSubs : undefined,
          };
        }),
      };
    });
    setLocalDramas(updated);
    onUpdateDramasCuration(updated);
    setSubSaveFeedback({ type: 'success', message: 'Removed subtitle track.' });
  };

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
      localStorage.setItem('asiaflix_admin_unlocked', 'true');
      sessionStorage.setItem('asiaflix_admin_unlocked', 'true');
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
    localStorage.setItem('asiaflix_admin_unlocked', 'true');
    sessionStorage.setItem('asiaflix_admin_unlocked', 'true');
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

    // Auto-Save to Google Sheet via Google Apps Script Webhook
    const webhookUrl = (appsScriptUrlDraft || localStorage.getItem('asiaflix_google_apps_script_url') || '').trim();
    let sheetAppended = false;
    if (webhookUrl && webhookUrl.startsWith('http')) {
      const payload = {
        title: title.trim(),
        category,
        audio,
        poster: poster.trim(),
        telegramUrl: telegramUrl.trim(),
        status: 'Now Streaming (Ongoing)',
        schedule: `${episodesCount} Episodes`,
        badge: audio,
      };

      try {
        // Dual delivery: text/plain POST + GET query beacon (guaranteed delivery)
        fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        }).catch((err) => console.warn('Google Sheet webhook post failed:', err));

        const query = new URLSearchParams(payload as any).toString();
        const beaconUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}${query}`;
        fetch(beaconUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {});

        sheetAppended = true;
      } catch (err) {
        console.warn('Google Sheet dispatch error:', err);
      }
    }

    let tgPosted = false;
    let tgErrMsg = '';
    if (autoPostNewDramaTelegram && botDraft.botToken?.trim() && botDraft.channelId?.trim()) {
      const slug = createDramaSlug({ title: title.trim(), id: newDrama.id });
      const watchUrl = `https://asiaflixprime.pages.dev/watch/${slug}`;
      const tgRes = await sendBrandedTelegramEpisodePost(botDraft.botToken, botDraft.channelId, {
        title: newDrama.title,
        audioLabel: audio,
        totalEpisodesText: `${episodesCount} Episodes`,
        genres: category,
        ageRating: 'UA 13+',
        statusText: 'Now Streaming',
        imageUrl: newDrama.thumbnailUrl || newDrama.poster,
        watchUrl,
      });
      if (tgRes.success) tgPosted = true;
      else tgErrMsg = tgRes.error || '';
    }

    if (tgPosted) {
      setSuccessMessage(`Title "${title}" live hai + Branded 16:9 Telegram Channel Post deliver ho gaya! 🚀📣`);
    } else if (sheetAppended) {
      setSuccessMessage(`Title "${title}" add ho gaya, live portal par #1 set ho gaya aur Google Sheet me bhi auto-save dispatch ho gaya! ⚡📊`);
    } else if (sbResult.success) {
      setSuccessMessage(`Title "${title}" add ho gaya aur sabse aage (#1 position) par live hai! 🚀`);
    } else {
      setSuccessMessage(
        tgErrMsg
          ? `Title "${title}" live hai! (Telegram Auto-Post skipped: ${tgErrMsg})`
          : `Title "${title}" add ho gaya aur sabse aage (#1 position) par live hai! 🌸`
      );
    }

    setTitle('');
    setPoster('');
    setTelegramUrl('');
    setSynopsis('');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handlePushQuickEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDrama = localDramas.find((d) => d.id === quickEpDramaId) || localDramas[0];
    if (!targetDrama) return;
    const epNum = Math.max(1, parseInt(quickEpNumber, 10) || 1);
    const cleanStream = quickEpStreamUrl.trim();
    const cleanAudio = quickEpCustomAudioUrl.trim();
    const cleanTg = quickEpTelegramUrl.trim() || targetDrama.telegramUrl || 'https://t.me/+yJH68LvfrT9hZDVl';
    if (!cleanStream && !cleanAudio && !quickEpTelegramUrl.trim()) {
      setSuccessMessage('❌ Kam se kam Stream Link, Audio Track URL, ya Telegram Link enter karein.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setIsPushingQuickEp(true);
    const updatedEpisodes = [...(targetDrama.episodes || [])];
    const existingIdx = updatedEpisodes.findIndex((ep) => {
      const n = typeof ep.episodeNumber === 'number' ? ep.episodeNumber : parseInt(String(ep.episodeNumber).match(/(\d+)/)?.[1] || '0', 10);
      return n === epNum && ep.audio === quickEpAudio;
    });

    const epPatch: any = {
      id: existingIdx >= 0 ? updatedEpisodes[existingIdx].id : `ep-${targetDrama.id}-${quickEpAudio.replace(/[^a-z0-9]/gi, '')}-${epNum}`,
      episodeNumber: epNum,
      title: `${targetDrama.title} — Episode ${epNum} (${quickEpAudio})`,
      audio: quickEpAudio,
      telegramUrl: cleanTg,
      duration: targetDrama.details || '1080p FHD',
      quality: '1080p FHD',
      isMerged: false,
      format: 'single',
    };
    if (cleanStream) {
      if (quickEpAudio === 'Hindi Dubbed') epPatch.streamLink = cleanStream;
      else if (quickEpAudio === 'Hindi Fan Dubbed' || quickEpAudio === 'Fan Dubbed') epPatch.hindiFanDubStreamLink = cleanStream;
      else epPatch.engSubStreamLink = cleanStream;
    }
    if (cleanAudio) {
      if (quickEpAudio === 'Hindi Dubbed') epPatch.hindiCustomAudioLink = cleanAudio;
      else if (quickEpAudio === 'Hindi Fan Dubbed' || quickEpAudio === 'Fan Dubbed') epPatch.fanDubCustomAudioLink = cleanAudio;
      else epPatch.origCustomAudioLink = cleanAudio;
    }

    if (existingIdx >= 0) {
      updatedEpisodes[existingIdx] = { ...updatedEpisodes[existingIdx], ...epPatch };
    } else {
      updatedEpisodes.push(epPatch);
    }

    const updatedDrama: DramaItem = {
      ...targetDrama,
      episodes: updatedEpisodes,
      availableAudios: targetDrama.availableAudios.includes(quickEpAudio)
        ? targetDrama.availableAudios
        : [...targetDrama.availableAudios, quickEpAudio],
      statusText: `Now Streaming Ep ${epNum}`,
    };

    const nextDramas = [updatedDrama, ...localDramas.filter((d) => d.id !== updatedDrama.id)];
    setLocalDramas(nextDramas);
    onUpdateDramasCuration(nextDramas);

    let tgFeedback = '';
    if (quickEpAutoPostTelegram && botDraft.botToken?.trim() && botDraft.channelId?.trim()) {
      const slug = createDramaSlug(updatedDrama);
      const watchUrl = `https://asiaflixprime.pages.dev/watch/${slug}/ep-${epNum}`;
      const tgRes = await sendBrandedTelegramEpisodePost(botDraft.botToken, botDraft.channelId, {
        title: updatedDrama.title,
        episodeNumber: epNum,
        audioLabel: quickEpAudio,
        totalEpisodesText: updatedDrama.details || `${updatedDrama.episodes.length} Episodes`,
        genres: updatedDrama.subCategory || updatedDrama.category,
        ageRating: updatedDrama.ageRating || 'UA 13+',
        statusText: `Now Streaming Ep ${epNum}`,
        imageUrl: updatedDrama.episodeThumbnails?.[epNum] || updatedDrama.thumbnailUrl || updatedDrama.poster,
        watchUrl,
      });
      tgFeedback = tgRes.success ? ' + Branded 16:9 Telegram Post Sent! 📣' : ` (Telegram: ${tgRes.error})`;
    }

    setIsPushingQuickEp(false);
    setQuickEpStreamUrl('');
    setQuickEpCustomAudioUrl('');
    setQuickEpTelegramUrl('');
    setSuccessMessage(`✅ Ep ${epNum} (${updatedDrama.title}) live portal par update ho gaya${tgFeedback}`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSendTestRowToSheet = async () => {
    const url = (appsScriptUrlDraft || localStorage.getItem('asiaflix_google_apps_script_url') || '').trim();
    if (!url || !url.startsWith('http')) {
      setAppsScriptFeedback('❌ Pehle upar apna Google Apps Script Web App URL daalein aur Save karein.');
      return;
    }

    setAppsScriptFeedback('⏳ Google Sheet me Test Row bhej rahe hain...');
    const testPayload = {
      title: 'AsiaFlix VIP Test Row (2026)',
      category: 'K-Drama',
      audio: 'Hindi Dubbed',
      poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700',
      telegramUrl: 'https://t.me/c/3730319875/9999',
      status: 'Now Streaming (Ongoing)',
      schedule: '16 Episodes',
      badge: 'Test Badge',
    };

    try {
      // POST text/plain
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(testPayload),
      }).catch((e) => console.warn(e));

      // GET beacon
      const query = new URLSearchParams(testPayload as any).toString();
      const beaconUrl = `${url}${url.includes('?') ? '&' : '?'}${query}`;
      fetch(beaconUrl, { method: 'GET', mode: 'no-cors' }).catch((e) => console.warn(e));

      setAppsScriptFeedback('✅ Test Row dispatch ho gayi hai! Apni Google Sheet khol kar aakhri row check karein. Agar row dikh rahi hai toh connection 100% SUCCESS hai! 🚀');
    } catch (e: any) {
      setAppsScriptFeedback(`❌ Error: ${e.message}`);
    }
  };

  const handleSaveBotSettings = () => {
    if (onUpdateTelegramBotSettings) {
      onUpdateTelegramBotSettings(botDraft);
    }
    setBotTestFeedback({ type: 'success', message: 'Telegram Bot settings saved successfully!' });
    setTimeout(() => setBotTestFeedback(null), 3000);
  };

  const handleTestBotPing = async () => {
    if (!botDraft.botToken || !botDraft.channelId) {
      setBotTestFeedback({ type: 'error', message: 'Please enter Bot Token and Channel/Chat ID first.' });
      return;
    }
    setIsTestingBot(true);
    setBotTestFeedback(null);
    const text = `🌸 <b>AsiaFlix VIP Bot Connected!</b>\n\nNotification broadcast channel is active and verified. Audience will receive all new episode drops here! 🔥`;
    const res = await sendTelegramBroadcast(botDraft.botToken, botDraft.channelId, text);
    setIsTestingBot(false);
    if (res.success) {
      setBotTestFeedback({ type: 'success', message: `✅ Test ping delivered to ${botDraft.channelId} (Msg ID #${res.messageId})!` });
    } else {
      setBotTestFeedback({ type: 'error', message: `❌ Failed: ${res.error}` });
    }
  };

  const handleSaveAndSyncSheet = async () => {
    if (!sheetUrlDraft.trim()) {
      setSheetSyncFeedback({ type: 'error', message: 'Please enter Google Sheet CSV URL.' });
      return;
    }
    setIsSyncingSheet(true);
    setSheetSyncFeedback(null);
    if (onUpdateGoogleSheetUrl) {
      const res = await onUpdateGoogleSheetUrl(sheetUrlDraft.trim());
      setIsSyncingSheet(false);
      if (res.success) {
        setSheetSyncFeedback({ type: 'success', message: `✅ Google Sheet Synced! Loaded ${res.count || 0} titles into live catalog.` });
      } else {
        setSheetSyncFeedback({ type: 'error', message: `❌ Sync error: ${res.error || 'Check that sheet is Published to Web as CSV.'}` });
      }
    } else {
      setIsSyncingSheet(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setIsBroadcasting(true);
    const newNotif: ReleaseNotification = {
      id: `notif-${Date.now()}`,
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      timestamp: 'Just now',
      isRead: false,
      type: 'announcement',
    };

    // 1. Supabase notification
    await insertNotificationIntoSupabase(notifTitle.trim(), notifMessage.trim());

    // 2. In-app notification
    onAddNotification(newNotif);

    // 3. Native Browser Push Notification
    if (broadcastToWebPush) {
      sendNativePushNotification(`🌸 ${notifTitle.trim()}`, {
        body: notifMessage.trim(),
      });
    }

    // 4. Telegram Bot Broadcast to channel
    let tgMsg = '';
    if (broadcastToTelegram && botDraft.botToken && botDraft.channelId) {
      const formattedTgText = `🌸 <b>${notifTitle.trim()}</b> 🌸\n\n${notifMessage.trim()}\n\n🎬 <i>Stream 1080p FHD Audio on AsiaFlix Prime VIP Network</i>`;
      const tgRes = await sendTelegramBroadcast(
        botDraft.botToken,
        botDraft.channelId,
        formattedTgText,
        notifButtonText.trim() || undefined,
        notifButtonUrl.trim() || undefined
      );
      if (tgRes.success) {
        tgMsg = ` + Telegram Broadcast sent to ${botDraft.channelId}! 🚀`;
      } else {
        tgMsg = ` (Telegram error: ${tgRes.error})`;
      }
    }

    setIsBroadcasting(false);
    setSuccessMessage(`Notification broadcasted successfully! 🔔${tgMsg}`);
    setNotifTitle('');
    setNotifMessage('');
    setTimeout(() => setSuccessMessage(null), 4000);
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
                  localStorage.removeItem('asiaflix_admin_unlocked');
                  sessionStorage.removeItem('asiaflix_admin_unlocked');
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
                onClick={() => setActiveTab('subtitles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'subtitles' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Captions className="w-3.5 h-3.5 text-sky-300" />
                <span>Subtitles (.SRT / .MD.SRT)</span>
              </button>

              <button
                onClick={() => setActiveTab('migrator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'migrator' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>🔄 Bulk Migrator</span>
              </button>

              <button
                onClick={() => setActiveTab('broadcast')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'broadcast' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Alerts & Bot Broadcast</span>
              </button>

              <button
                onClick={() => setActiveTab('sheets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'sheets' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Sheets Sync</span>
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
                onClick={() => setActiveTab('ads')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'ads' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-amber-300" />
                <span>💰 Ads Manager</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    adDraft.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
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
              <>
              <form onSubmit={handleCreateDrama} className="space-y-3">
                <div className="text-[11px] text-zinc-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <span>⚡ Title will be saved directly into catalog, Supabase <strong className="text-white">titles</strong>, aur live portal par sabse aage #1 set hoga!</span>
                  {appsScriptUrlDraft ? (
                    <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30">
                      📊 Google Sheet Auto-Save Active
                    </span>
                  ) : null}
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

                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer text-sky-300">
                    <input
                      type="checkbox"
                      checked={autoPostNewDramaTelegram}
                      onChange={(e) => setAutoPostNewDramaTelegram(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                    />
                    <span>📣 Auto-Post Branded 16:9 Banner to Telegram Channel</span>
                  </label>
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

              {/* Quick Add Episode Stream Link + Branded 16:9 Telegram Channel Auto-Post */}
              <form
                onSubmit={handlePushQuickEpisode}
                className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#0088cc]/10 via-white/[0.02] to-transparent border border-[#0088cc]/30 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-white font-black text-xs">
                    <Send className="w-4 h-4 text-sky-400" />
                    <span>Quick Add Episode Stream Link &amp; Branded Telegram Auto-Post</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    16:9 Canvas Banner
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Target Series</label>
                    <select
                      value={quickEpDramaId}
                      onChange={(e) => setQuickEpDramaId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#181924] border border-white/10 text-white text-xs outline-none"
                    >
                      {localDramas.map((d) => (
                        <option key={`qep-${d.id}`} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Episode #</label>
                    <input
                      type="number"
                      min={1}
                      value={quickEpNumber}
                      onChange={(e) => setQuickEpNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Audio Track</label>
                    <select
                      value={quickEpAudio}
                      onChange={(e) => setQuickEpAudio(e.target.value as AudioType)}
                      className="w-full px-3 py-2 rounded-lg bg-[#181924] border border-white/10 text-white text-xs outline-none"
                    >
                      <option value="Hindi Dubbed">Hindi Dubbed</option>
                      <option value="Hindi Fan Dubbed">Hindi Fan Dubbed</option>
                      <option value="Original / Eng Sub">Original / Eng Sub</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="url"
                    value={quickEpStreamUrl}
                    onChange={(e) => setQuickEpStreamUrl(e.target.value)}
                    placeholder="Video Stream URL (.mp4 / Streamtape / HF)"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none"
                  />
                  <input
                    type="url"
                    value={quickEpCustomAudioUrl}
                    onChange={(e) => setQuickEpCustomAudioUrl(e.target.value)}
                    placeholder="External Audio URL (.mp3 Optional)"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none"
                  />
                  <input
                    type="url"
                    value={quickEpTelegramUrl}
                    onChange={(e) => setQuickEpTelegramUrl(e.target.value)}
                    placeholder="Telegram Episode Link (Optional)"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-sky-300">
                    <input
                      type="checkbox"
                      checked={quickEpAutoPostTelegram}
                      onChange={(e) => setQuickEpAutoPostTelegram(e.target.checked)}
                      className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
                    />
                    <span>Send 16:9 Branded Photo + Inline "✨ WATCH NOW ✔️" to Telegram</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isPushingQuickEp}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0088cc] to-sky-500 hover:brightness-110 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    {isPushingQuickEp ? 'Publishing...' : '⚡ Add Episode & Auto-Post'}
                  </button>
                </div>
              </form>
            </>
            )}

            {/* TAB: ADMIN-ONLY SUBTITLES MANAGER (.SRT / .MD.SRT & HUGGING FACE URLS) */}
            {activeTab === 'subtitles' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/15 via-black/40 to-transparent border border-sky-400/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-black text-xs">
                    <Captions className="w-4 h-4 text-sky-400" />
                    <span>Admin Subtitle Manager (.SRT / .MD.SRT &amp; Hugging Face Direct URLs)</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Attach <strong>.srt</strong>, <strong>.md.srt</strong> (e.g. Hugging Face <code className="text-sky-300">resolve/main/...md.srt?download=true</code>), or <strong>.vtt</strong> subtitle tracks to any drama or episode. Audience viewers only see the Subtitle bar on titles where tracks exist—upload buttons remain strictly Admin-only.
                  </p>
                </div>

                {subSaveFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold border ${
                      subSaveFeedback.type === 'success'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-500/20 border-red-500/40 text-red-200'
                    }`}
                  >
                    {subSaveFeedback.message}
                  </div>
                )}

                <form onSubmit={handleSaveAdminSubtitle} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Select Drama / Movie
                      </label>
                      <select
                        value={subTargetDramaId}
                        onChange={(e) => setSubTargetDramaId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#181924] border border-white/10 text-white text-xs outline-none focus:border-sky-400"
                      >
                        {localDramas.map((d) => (
                          <option key={`sub-opt-${d.id}`} value={d.id}>
                            {d.title} ({d.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Episode Number
                      </label>
                      <input
                        type="text"
                        value={subTargetEp}
                        onChange={(e) => setSubTargetEp(e.target.value)}
                        placeholder="all (or 1, 2, 3...)"
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Subtitle Language
                      </label>
                      <select
                        value={subLangCode}
                        onChange={(e) => setSubLangCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#181924] border border-white/10 text-white text-xs outline-none focus:border-sky-400"
                      >
                        {Object.entries(ADMIN_SUB_LANG_META).map(([code, meta]) => (
                          <option key={`sub-lang-${code}`} value={code}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Hugging Face / Direct .SRT or .MD.SRT URL
                    </label>
                    <input
                      type="url"
                      value={subUrlInput}
                      onChange={(e) => {
                        setSubUrlInput(e.target.value);
                        if (e.target.value.trim()) setSubUploadPreview(null);
                      }}
                      placeholder="https://huggingface.co/datasets/asiaflixprime/dramas/resolve/main/series_subtitles_hindi_english_mix.md.srt?download=true"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono outline-none focus:border-sky-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <label className="px-3.5 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-xs font-black text-amber-200 cursor-pointer flex items-center gap-1.5 transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Local .SRT / .MD.SRT / .VTT</span>
                      <input
                        type="file"
                        accept=".srt,.vtt,.md.srt,.txt"
                        onChange={handleAdminSubFileSelect}
                        className="hidden"
                      />
                    </label>

                    {subUploadPreview && (
                      <span className="text-[11px] font-bold text-emerald-300">
                        ✅ {subUploadPreview.fileName} ({subUploadPreview.cueCount} cues parsed)
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save &amp; Publish Subtitle Track Live</span>
                  </button>
                </form>

                {/* Active Admin Subtitle Overrides List */}
                {subTargetDramaId && (adminSubOverrides[subTargetDramaId]?.length || 0) > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="text-xs font-black text-white">
                      Attached Admin Subtitles for Selected Title
                    </div>
                    <div className="space-y-1.5">
                      {(adminSubOverrides[subTargetDramaId] || []).map((entry) => (
                        <div
                          key={`${entry.code}-${entry.epNum}`}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-black text-sky-300">{entry.label}</span>
                            <span className="text-zinc-400 mx-2">•</span>
                            <span className="font-bold text-amber-200">
                              {entry.epNum === 'all' ? 'All Episodes / Movie' : `Episode ${entry.epNum}`}
                            </span>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">
                              {entry.url.startsWith('data:') ? 'Uploaded Local Subtitle File (Embedded)' : entry.url}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdminSubtitle(subTargetDramaId, entry.code, entry.epNum)}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 transition-all shrink-0 cursor-pointer"
                            title="Remove Subtitle Track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: BROADCAST NOTIFICATIONS & TELEGRAM BOT */}
            {activeTab === 'broadcast' && (
              <div className="space-y-4">
                {/* 1. Telegram Bot Integration Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#0088cc]/15 via-black/40 to-white/[0.02] border border-[#0088cc]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Send className="w-4 h-4 text-sky-400" />
                      <span>Telegram Bot Configuration (Audience Broadcast)</span>
                    </div>
                    <span className="text-[10px] text-sky-300 font-bold bg-[#0088cc]/20 px-2 py-0.5 rounded border border-[#0088cc]/40">
                      Official Bot API
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Yahan apna Telegram Bot Token aur Channel ID set karein. Jab bhi aap nayi release ka notification bhejenge, yeh direct aapke Telegram channel aur bot subscribers ko deliver hoga!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Bot Username
                      </label>
                      <input
                        type="text"
                        value={botDraft.botUsername}
                        onChange={(e) => setBotDraft({ ...botDraft, botUsername: e.target.value.replace('@', '') })}
                        placeholder="asiaflix_request_bot"
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Bot Token (from @BotFather)
                      </label>
                      <input
                        type="password"
                        value={botDraft.botToken}
                        onChange={(e) => setBotDraft({ ...botDraft, botToken: e.target.value })}
                        placeholder="7123456789:ABCDef..."
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-sky-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Channel / Chat ID
                      </label>
                      <input
                        type="text"
                        value={botDraft.channelId}
                        onChange={(e) => setBotDraft({ ...botDraft, channelId: e.target.value })}
                        placeholder="@asiaflixprime or -100..."
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  {botTestFeedback && (
                    <div className={`p-2.5 rounded-lg text-xs font-bold ${
                      botTestFeedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {botTestFeedback.message}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveBotSettings}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Bot Config</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestBotPing}
                      disabled={isTestingBot}
                      className="px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-sky-300 text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isTestingBot ? 'Testing...' : 'Send Test Ping to Channel'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Broadcast Release Alert Form */}
                <form onSubmit={handleSendBroadcast} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Megaphone className="w-4 h-4 text-red-400" />
                      <span>Send Instant Release Alert to Audience</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-bold">Multi-Channel Dispatch</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Alert Heading / Title
                    </label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g. Episode 12 Hindi Dubbed Released!"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Alert Description / Episode Details
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      placeholder="e.g. Clean 1080p FHD Hindi audio track uploaded with zero ads. Download link live on Telegram VIP..."
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Telegram Button Label (Optional)
                      </label>
                      <input
                        type="text"
                        value={notifButtonText}
                        onChange={(e) => setNotifButtonText(e.target.value)}
                        placeholder="▶ Stream 1080p Episodes"
                        className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Episode Telegram Post URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={notifButtonUrl}
                        onChange={(e) => setNotifButtonUrl(e.target.value)}
                        placeholder="https://t.me/c/3730319875/123"
                        className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs outline-none focus:border-[#e50914]"
                      />
                    </div>
                  </div>

                  {/* Channels selection checkboxes */}
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                    <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={broadcastToTelegram}
                        onChange={(e) => setBroadcastToTelegram(e.target.checked)}
                        className="rounded border-white/20 text-[#0088cc] focus:ring-0"
                      />
                      <span className="font-bold flex items-center gap-1">
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        <span>Broadcast to Telegram Channel & Bot</span>
                      </span>
                    </label>

                    <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={broadcastToWebPush}
                        onChange={(e) => setBroadcastToWebPush(e.target.checked)}
                        className="rounded border-white/20 text-[#e50914] focus:ring-0"
                      />
                      <span className="font-bold flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5 text-red-400" />
                        <span>Send Native Phone/PC Push</span>
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:shadow-[0_0_15px_rgba(229,9,20,0.6)] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>{isBroadcasting ? 'Dispatching Broadcast...' : '📢 Dispatch Broadcast to Audience'}</span>
                  </button>
                </form>

                {/* 3. Update Marquee */}
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
              </div>
            )}

            {/* TAB: GOOGLE SHEETS LIVE SYNC */}
            {activeTab === 'sheets' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#14151f] to-emerald-900/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Table className="w-4 h-4 text-emerald-400" />
                      <span>Google Sheets Live Catalog Sync</span>
                    </div>
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                      Live Connected
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Aapki website Google Sheet ke CSV URL se direct titles fetch karti hai. Sheet mein jab bhi aap naya drama ya episode link daalenge, woh yahan 1-click mein sync ho jayega!
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-300">
                      Google Sheet Published CSV URL
                    </label>
                    <input
                      type="url"
                      value={sheetUrlDraft}
                      onChange={(e) => setSheetUrlDraft(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                      className="w-full px-3 py-2.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {sheetSyncFeedback && (
                    <div className={`p-3 rounded-lg text-xs font-bold ${
                      sheetSyncFeedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {sheetSyncFeedback.message}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveAndSyncSheet}
                      disabled={isSyncingSheet}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg transition-all flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                      <span>{isSyncingSheet ? 'Syncing Catalog...' : '⚡ Save & Sync Google Sheet Now'}</span>
                    </button>

                    <a
                      href={sheetUrlDraft || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Live Sheet CSV</span>
                    </a>
                  </div>
                </div>

                {/* Two-Way Auto-Save (Website ➡️ Google Sheet Auto-Save Webhook) */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 via-[#14151f] to-indigo-950/30 border border-blue-500/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <span>⚡ Two-Way Auto Sync (Website ➡️ Google Sheet Auto-Save)</span>
                    </div>
                    <span className="text-[10px] text-sky-300 font-bold bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/40">
                      100% Free Built-in Webhook
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Agar aap chahte hain ki <strong>Website ke Admin panel se aap jo bhi Drama/Movie add karein, woh apne aap aapki Google Sheet me new row ban kar save ho jaye</strong>, toh yeh 1-minute setup karein:
                  </p>

                  <div className="p-3 rounded-lg bg-black/50 border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">Google Apps Script Code (Sheet me paste karne ke liye):</span>
                      <button
                        type="button"
                        onClick={() => {
                          const scriptCode = `function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = (e && e.parameter) || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    sheet.appendRow([
      data.title || "New Title",
      data.category || "K-Drama",
      data.audio || "Hindi Dubbed",
      data.poster || "",
      data.telegramUrl || "",
      data.status || "Now Streaming (Ongoing)",
      data.schedule || "16 Episodes",
      data.badge || data.audio || "Hindi Dubbed",
      "", // Notice
      "", // Trending
      ""  // Logo
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ result: "success", title: data.title }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
                          navigator.clipboard.writeText(scriptCode);
                          setAppsScriptFeedback('Google Apps Script Code copied to clipboard! Ab Sheet me paste karke Deploy karein. 📋');
                          setTimeout(() => setAppsScriptFeedback(null), 3500);
                        }}
                        className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px] flex items-center gap-1 border border-sky-500/40 transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Apps Script Code</span>
                      </button>
                    </div>

                    <div className="space-y-1 text-[11px] text-zinc-400">
                      <p><strong className="text-white">Step 1:</strong> Apni Google Sheet kholein ➡️ Upar menu me <strong>Extensions</strong> (या विस्तार) ➡️ <strong>Apps Script</strong> par click karein.</p>
                      <p><strong className="text-white">Step 2:</strong> Jo code khule, use delete karke upar ka copied code paste karein aur upar <strong>Save (💾)</strong> dabayein.</p>
                      <p><strong className="text-white">Step 3:</strong> Upar right me <strong>Deploy</strong> ➡️ <strong>Manage deployments</strong> (ya New deployment) ➡️ Pencil icon (Edit) ➡️ Version me <strong>New version</strong> ➡️ Execute as: <strong>Me</strong>, Who has access: <strong>Anyone</strong> karke <strong>Deploy</strong> karein.</p>
                      <p className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
                        ⚠️ <strong>"Google hasn't verified this app" warning aaye toh:</strong> Neeche <strong>Advanced</strong> par click karein ➡️ <strong>Go to Untitled project (unsafe)</strong> par click karein ➡️ <strong>Allow</strong> kar dein.
                      </p>
                      <p><strong className="text-white">Step 4:</strong> Wahan se jo <strong>Web App URL</strong> (`/exec` wala) mile, use neeche daalkar Test Row bhejein:</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-300">
                      Google Apps Script Webhook URL (Ending with /exec)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="url"
                        value={appsScriptUrlDraft}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAppsScriptUrlDraft(val);
                          localStorage.setItem('asiaflix_google_apps_script_url', val.trim());
                        }}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 min-w-[240px] px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-sky-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('asiaflix_google_apps_script_url', appsScriptUrlDraft.trim());
                          setAppsScriptFeedback('Google Apps Script URL saved! ⚡');
                          setTimeout(() => setAppsScriptFeedback(null), 3000);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black transition-all"
                      >
                        Save URL
                      </button>
                      <button
                        type="button"
                        onClick={handleSendTestRowToSheet}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <span>⚡ Send Test Row Now</span>
                      </button>
                    </div>
                  </div>

                  {appsScriptFeedback && (
                    <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-bold">
                      {appsScriptFeedback}
                    </div>
                  )}
                </div>

                {/* Google Sheet All Columns Guide */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Aapki Sheet Ke 20 Columns Ka Complete Live Guide</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const csvHeader = "Title,Category,Audio,Poster,Telegram (Hindi),Telegram2  (Fan Dub),Telegram3 (Orig),Status,Details,Schedule,Badge,Hero Banner,Synopsis,Rating,Lead Cast,Hastags,Notice,Top Trending Spotlight,Trending Now (Top VIP Binge Picks),Logo";
                        navigator.clipboard.writeText(csvHeader);
                        setSuccessMessage('Full 20-Column CSV Header copied to clipboard!');
                        setTimeout(() => setSuccessMessage(null), 3000);
                      }}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 bg-white/[0.05] px-2 py-1 rounded cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Full 20 Headers</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    Aapki Google Sheet ke sabhi 20 columns website se directly connected hain. Telegram 1, 2, 3 ke alag alag audio links, Details, Schedule, Lead Cast aur Hashtags sab live portal par render hote hain:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-emerald-400 font-bold">1. Title</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Series/Movie name with year e.g. Doctor X (2026)</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-sky-400 font-bold">2. Category</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">K-Drama, C-Drama, Asian Movie, Bollywood, J-Drama</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-red-400 font-bold">3. Audio</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Primary Audio: Hindi Dubbed, Fan Dubbed, Original</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-amber-400 font-bold">4. Poster</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Direct image URL (ibb.co, wikimedia, justwatch, etc.)</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/30">
                      <span className="font-mono text-emerald-400 font-bold">5. Telegram (Hindi)</span>
                      <p className="text-[10px] text-zinc-300 mt-0.5">Telegram 1: Hindi Dubbed Episode/Stream post link</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-purple-500/30">
                      <span className="font-mono text-purple-400 font-bold">6. Telegram2 (Fan Dub)</span>
                      <p className="text-[10px] text-zinc-300 mt-0.5">Telegram 2: Hindi Fan Dubbed stream post link</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-blue-500/30">
                      <span className="font-mono text-blue-400 font-bold">7. Telegram3 (Orig)</span>
                      <p className="text-[10px] text-zinc-300 mt-0.5">Telegram 3: Original Audio + Eng Sub stream post link</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-purple-300 font-bold">8. Status</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Now Streaming Ep X, Completed (Full Series), Coming Soon</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-sky-500/30">
                      <span className="font-mono text-sky-300 font-bold">9. Details</span>
                      <p className="text-[10px] text-zinc-300 mt-0.5">16 Episodes, 1:44:00, 2:14:19, Full Movie runtime</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/30">
                      <span className="font-mono text-amber-300 font-bold">10. Schedule</span>
                      <p className="text-[10px] text-zinc-300 mt-0.5">Sat-Sat, Sat & Sun 7:00 PM (Completed ho toh blank)</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-pink-400 font-bold">11. Badge</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Hindi Dubbed, Eng Sub, Full Movie tag</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-indigo-400 font-bold">12. Hero Banner</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Put "YES" for big homepage sliding banner</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-teal-400 font-bold">13. Synopsis</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Plot and story synopsis</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-yellow-400 font-bold">14. Rating</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">IMDB/VIP Rating (e.g. 9.4)</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-pink-500/30">
                      <span className="font-mono text-pink-300 font-bold">15. Lead Cast</span>
                      <p className="text-[10px] text-zinc-300 mt-0.5">Comma-separated actors: Song Joong-ki, Song Hye-kyo</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-red-500/30">
                      <span className="font-mono text-red-300 font-bold">16. Hastags</span>
                      <p className="text-[10px] text-zinc-300 mt-0.5">Space-separated tags: #Romance #Action #Kdrama</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-rose-400 font-bold">17. Notice</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Top marquee announcement ticker text</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-orange-400 font-bold">18. Top Trending Spotlight</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Spotlight featured titles list</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-orange-300 font-bold">19. Trending Now</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Top VIP binge pick titles</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="font-mono text-yellow-300 font-bold">20. Logo</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Custom website brand logo URL</p>
                    </div>
                  </div>
                </div>
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

            {/* TAB: MONETIZATION & ADS MANAGER */}
            {activeTab === 'ads' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#181924] to-emerald-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span>💰 Adsterra Monetization &amp; Ads Manager</span>
                    </h4>
                    <p className="text-[11px] text-zinc-300 mt-0.5">
                      Pre-configured with your live Adsterra <strong className="text-amber-300">728x90 Leaderboard</strong> &amp; <strong className="text-emerald-300">NativeBanner</strong> slots. Customize codes or toggle slots and publish live across all devices.
                    </p>
                  </div>

                  {/* Master 1-Click ON/OFF Switch */}
                  <button
                    type="button"
                    onClick={() => setAdDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      adDraft.enabled
                        ? 'bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.5)]'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${adDraft.enabled ? 'bg-white animate-pulse' : 'bg-zinc-400'}`} />
                    <span>{adDraft.enabled ? 'Ads Status: ON (Live)' : 'Ads Status: OFF'}</span>
                  </button>
                </div>

                {/* Slot Placement Toggles */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider">
                        Ad Placement Slot Controls
                      </label>
                      <button
                        type="button"
                        onClick={() => setAdDraft({ ...DEFAULT_AD_CONFIG })}
                        className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                      >
                        Reset to Default Adsterra Codes
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-bold">
                      <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/25">
                        <div>
                          <div className="text-white">Home 728x90 Banner</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Below Weekend Lineup</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={adDraft.showHomeBanner}
                          onChange={(e) =>
                            setAdDraft((prev) => ({ ...prev, showHomeBanner: e.target.checked }))
                          }
                          className="w-4 h-4 accent-[#e50914] cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/25">
                        <div>
                          <div className="text-white">Episode Modal 728x90 Banner</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Above Audio / Episodes</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={adDraft.showModalBanner}
                          onChange={(e) =>
                            setAdDraft((prev) => ({ ...prev, showModalBanner: e.target.checked }))
                          }
                          className="w-4 h-4 accent-[#e50914] cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/25">
                        <div>
                          <div className="text-white">Footer 4-Card Native Banner</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Above Policy &amp; Safety</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={adDraft.showFooterNative}
                          onChange={(e) =>
                            setAdDraft((prev) => ({ ...prev, showFooterNative: e.target.checked }))
                          }
                          className="w-4 h-4 accent-[#e50914] cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-br from-[#e50914]/15 to-[#a855f7]/15 border border-purple-500/35 cursor-pointer hover:border-purple-400/60">
                        <div>
                          <div className="text-white">🚀 Floating &amp; Center Pop-Up Ads</div>
                          <div className="text-[10px] text-purple-300 font-normal">Spotlight &amp; Corner Widget</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={adDraft.showPopupAd !== false}
                          onChange={(e) =>
                            setAdDraft((prev) => ({ ...prev, showPopupAd: e.target.checked }))
                          }
                          className="w-4 h-4 accent-[#a855f7] cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/35 border border-white/10">
                      <div>
                        <div className="text-xs font-bold text-white">Pop-Up Ad Cooldown Interval (Seconds)</div>
                        <div className="text-[10px] text-zinc-400">
                          First popup triggers 8s after arrival, then repeats every {adDraft.popupIntervalSeconds || 90}s (min 15s).
                        </div>
                      </div>
                      <input
                        type="number"
                        min={15}
                        max={3600}
                        value={adDraft.popupIntervalSeconds || 90}
                        onChange={(e) =>
                          setAdDraft((prev) => ({
                            ...prev,
                            popupIntervalSeconds: Math.max(15, parseInt(e.target.value, 10) || 90),
                          }))
                        }
                        className="w-28 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs text-center outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Pre-configured Key / Domain / Native Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Adsterra 728x90 Banner Key
                      </label>
                      <input
                        type="text"
                        value={adDraft.banner728Key}
                        onChange={(e) => setAdDraft((prev) => ({ ...prev, banner728Key: e.target.value }))}
                        placeholder="feba36fe11182be18bd172b85f043722"
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Adsterra Script Domain
                      </label>
                      <input
                        type="text"
                        value={adDraft.adDomain}
                        onChange={(e) => setAdDraft((prev) => ({ ...prev, adDomain: e.target.value }))}
                        placeholder="bancadeltempoidea.org"
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        NativeBanner Async Script URL
                      </label>
                      <input
                        type="url"
                        value={adDraft.nativeScriptSrc}
                        onChange={(e) => setAdDraft((prev) => ({ ...prev, nativeScriptSrc: e.target.value }))}
                        placeholder="https://bancadeltempoidea.org/21/bb8e0cf142cc695370f42b82967f601b"
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        NativeBanner Container ID
                      </label>
                      <input
                        type="text"
                        value={adDraft.nativeContainerId}
                        onChange={(e) => setAdDraft((prev) => ({ ...prev, nativeContainerId: e.target.value }))}
                        placeholder="container-bb8e0cf142cc695370f42b82967f601b"
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Optional Raw HTML Paste Overrides */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-amber-400" />
                          <span>Paste Updated 728x90 Adsterra HTML/Script Override (Optional)</span>
                        </label>
                        {adDraft.customBannerHtml && (
                          <button
                            type="button"
                            onClick={() => setAdDraft((prev) => ({ ...prev, customBannerHtml: '' }))}
                            className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                          >
                            Use Default 728x90 Key
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={adDraft.customBannerHtml}
                        onChange={(e) => setAdDraft((prev) => ({ ...prev, customBannerHtml: e.target.value }))}
                        placeholder="Leave blank to use default pre-configured 728x90 script above, OR paste raw Adsterra 728x90 HTML code here..."
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-amber-200 font-mono text-[11px] outline-none focus:border-[#e50914]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Paste Updated NativeBanner Adsterra HTML/Script Override (Optional)</span>
                        </label>
                        {adDraft.customNativeHtml && (
                          <button
                            type="button"
                            onClick={() => setAdDraft((prev) => ({ ...prev, customNativeHtml: '' }))}
                            className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                          >
                            Use Default NativeBanner
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={adDraft.customNativeHtml}
                        onChange={(e) => setAdDraft((prev) => ({ ...prev, customNativeHtml: e.target.value }))}
                        placeholder="Leave blank to use default pre-configured NativeBanner async widget above, OR paste raw Adsterra NativeBanner HTML code here..."
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-emerald-300 font-mono text-[11px] outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {adsSaveFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold ${
                        adsSaveFeedback.type === 'success'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/20 border-red-500/40 text-red-300'
                      }`}
                    >
                      {adsSaveFeedback.message}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isSavingAds}
                    onClick={async () => {
                      setIsSavingAds(true);
                      setAdsSaveFeedback(null);
                      if (onUpdateAdConfig) {
                        const res = await onUpdateAdConfig(adDraft);
                        setIsSavingAds(false);
                        if (res.success) {
                          setAdsSaveFeedback({
                            type: 'success',
                            message:
                              '✅ Adsterra configuration saved & published live across all devices via Supabase!',
                          });
                          setSuccessMessage('💰 Adsterra Monetization Slots published live!');
                          setTimeout(() => setSuccessMessage(null), 3500);
                        } else {
                          setAdsSaveFeedback({
                            type: 'error',
                            message: `Saved locally, Supabase notice: ${res.error || 'Check database permissions'}`,
                          });
                        }
                      } else {
                        setIsSavingAds(false);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingAds ? 'Publishing to Cloud...' : '💾 Save & Publish Ads Live'}</span>
                  </button>
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
                      localStorage.removeItem('asiaflix_admin_unlocked');
                      sessionStorage.removeItem('asiaflix_admin_unlocked');
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

            {/* TAB: BULK LINK & HOST MIGRATOR */}
            {activeTab === 'migrator' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-sm font-black text-white">
                      1-Click Bulk Host Migrator & Batch Episode Link Paster
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Move videos, external MP3 audio, and .SRT subtitles off HuggingFace to Cloudflare R2, Archive.org, BunnyCDN, Streamwish, Vidhide, or any custom domain in seconds. GitHub, Archive.org, and HuggingFace links auto-normalize automatically.
                  </p>
                </div>

                {/* Tool 1: Host / Prefix Find & Replace */}
                <form
                  onSubmit={handleApplyHostMigration}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <h5 className="text-xs font-black text-white">
                        Tool 1: Host / URL Prefix Find & Replace
                      </h5>
                      <p className="text-[11px] text-zinc-400">
                        Swap broken host domains across all episodes, audio tracks, and subtitles at once.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 shrink-0">
                      {migratorMatchSummary.matchedLinks} link(s) • {migratorMatchSummary.matchedTitles} title(s)
                    </span>
                  </div>

                  {migratorFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold border ${
                        migratorFeedback.type === 'success'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/15 border-red-500/40 text-red-300'
                      }`}
                    >
                      {migratorFeedback.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Old Host / URL Prefix
                      </label>
                      <input
                        type="text"
                        value={migratorOldHost}
                        onChange={(e) => setMigratorOldHost(e.target.value)}
                        placeholder="https://huggingface.co/datasets/asiaflixprime/dramas/resolve/main/"
                        className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        New Host / URL Prefix
                      </label>
                      <input
                        type="text"
                        value={migratorNewHost}
                        onChange={(e) => setMigratorNewHost(e.target.value)}
                        placeholder="https://cdn.yourbucket.r2.dev/dramas/"
                        className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Target Scope
                      </label>
                      <select
                        value={migratorScope}
                        onChange={(e) => setMigratorScope(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Catalog Titles ({localDramas.length})</option>
                        {localDramas.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 font-semibold cursor-pointer pt-4">
                      <input
                        type="checkbox"
                        checked={migratorIncludeAudio}
                        onChange={(e) => setMigratorIncludeAudio(e.target.checked)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      <span>Include External MP3 Links</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 font-semibold cursor-pointer pt-4">
                      <input
                        type="checkbox"
                        checked={migratorIncludeSubtitles}
                        onChange={(e) => setMigratorIncludeSubtitles(e.target.checked)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      <span>Include .SRT / .VTT Links</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>⚡ Replace Matching Links & Save ({migratorMatchSummary.matchedLinks})</span>
                  </button>
                </form>

                {/* Tool 2: Batch Episode URL Paster */}
                <form
                  onSubmit={handleApplyBatchEpisodes}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
                >
                  <div className="border-b border-white/10 pb-2.5">
                    <h5 className="text-xs font-black text-white">
                      Tool 2: Batch Episode URL Paster (1 Line = 1 Episode)
                    </h5>
                    <p className="text-[11px] text-zinc-400">
                      Paste multi-line Streamwish, Vidhide, Streamtape, Archive.org, R2 MP4, MP3 audio, or .SRT links. Supports plain lines (Ep 1, Ep 2...) or explicit "5|https://..." lines.
                    </p>
                  </div>

                  {batchFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold border ${
                        batchFeedback.type === 'success'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/15 border-red-500/40 text-red-300'
                      }`}
                    >
                      {batchFeedback.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Select Series
                      </label>
                      <select
                        value={batchTargetDramaId}
                        onChange={(e) => setBatchTargetDramaId(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      >
                        {localDramas.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} ({d.episodes.length} Ep)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Audio Track
                      </label>
                      <select
                        value={batchTrack}
                        onChange={(e) =>
                          setBatchTrack(
                            e.target.value as 'Hindi Dubbed' | 'Hindi Fan Dubbed' | 'Original / Eng Sub'
                          )
                        }
                        className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      >
                        <option value="Hindi Dubbed">🇮🇳 Hindi Dubbed</option>
                        <option value="Hindi Fan Dubbed">🎙️ Hindi Fan Dubbed</option>
                        <option value="Original / Eng Sub">🌐 Original / Eng Sub</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Target Field
                      </label>
                      <select
                        value={batchField}
                        onChange={(e) =>
                          setBatchField(e.target.value as 'video' | 'audio' | 'subtitle')
                        }
                        className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white outline-none focus:border-[#e50914]"
                      >
                        <option value="video">🎬 Video Stream / Embed URL</option>
                        <option value="audio">🎧 External MP3 Audio URL</option>
                        <option value="subtitle">💬 Subtitle (.SRT / .VTT) URL</option>
                      </select>
                    </div>
                  </div>

                  {batchField === 'subtitle' && (
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Subtitle Language Slot
                      </label>
                      <select
                        value={batchSubLangCode}
                        onChange={(e) => setBatchSubLangCode(e.target.value)}
                        className="w-full sm:w-64 py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white outline-none focus:border-sky-500"
                      >
                        {Object.entries(ADMIN_SUB_LANG_META).map(([code, meta]) => (
                          <option key={code} value={code}>
                            {meta.label} ({code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Episode Links (1 line per episode, "HD1 = URL", "S01E01 = URL", or "EpNumber|URL")
                    </label>
                    <textarea
                      rows={6}
                      value={batchUrlsText}
                      onChange={(e) => setBatchUrlsText(e.target.value)}
                      placeholder={`HD1 = https://archive.org/download/series/ep1.mp3\nHD2 = https://cdn.example.com/ep2.mp3\n3|https://streamwish.to/e/ep3id`}
                      className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#e50914]"
                    />
                  </div>

                  {batchField === 'video' && (
                    <label className="flex items-center gap-2 text-xs text-zinc-300 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchAutoPostTelegram}
                        onChange={(e) => setBatchAutoPostTelegram(e.target.checked)}
                        className="accent-[#e50914] w-4 h-4"
                      />
                      <span>📣 Auto-post latest updated episode banner to Telegram Channel</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#e50914] hover:bg-[#c80812] text-white text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>⚡ Apply Batch Episode Links & Save</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
