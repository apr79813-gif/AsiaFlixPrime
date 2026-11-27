import React, { useRef, useState, useEffect } from 'react';
import { 
  Bell, 
  Bookmark, 
  Gamepad2, 
  Headphones, 
  Film, 
  Send, 
  Search,
  Home,
  Share2,
  Check,
  Flame,
  Trophy,
  Download,
  Menu,
  MoreVertical,
} from 'lucide-react';
import { ParticleMode } from './SakuraCanvas';
import { VipStats, getVipRankMeta } from '../services/vipPlayerHelper';
import { useTransparentLogo } from './AnimatedChannelLogo';

interface NavbarProps {
  unreadNotifsCount: number;
  watchlistCount: number;
  sakuraEnabled: boolean;
  particleMode?: ParticleMode;
  onToggleSakura: () => void;
  onOpenNotifications: () => void;
  onOpenWatchlist: () => void;
  onOpenArcade: () => void;
  onOpenSupport: () => void;
  onOpenRequest: () => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated?: boolean;
  logoUrl?: string;
  sheetSyncCount?: number;
  isSheetSyncing?: boolean;
  onRefreshSheet?: () => void;
  onOpenSearch?: () => void;
  onGoHome?: () => void;
  onOpenSearchModal?: () => void;
  vipStats?: VipStats;
  onInstallApp?: () => void;
  onOpenAppDownloadModal?: () => void;
  isAppInstalled?: boolean;
  isInstalledApp?: boolean;
  onOpenAppMenu?: () => void;
  activeAppQuickChip?: 'all' | 'K-Drama' | 'C-Drama' | 'Asian Movies' | 'Hindi Dubbed' | 'schedule';
  onSelectAppQuickChip?: (chip: 'all' | 'K-Drama' | 'C-Drama' | 'Asian Movies' | 'Hindi Dubbed' | 'schedule') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  unreadNotifsCount,
  watchlistCount,
  sakuraEnabled,
  particleMode = sakuraEnabled ? 'snow' : 'off',
  onToggleSakura,
  onOpenNotifications,
  onOpenWatchlist,
  onOpenArcade,
  onOpenSupport,
  onOpenRequest,
  onOpenAdmin,
  isAdminAuthenticated = false,
  logoUrl,
  sheetSyncCount = 202,
  isSheetSyncing = false,
  onRefreshSheet,
  onOpenSearch,
  onGoHome,
  onOpenSearchModal,
  vipStats,
  onInstallApp,
  onOpenAppDownloadModal,
  isAppInstalled = false,
  isInstalledApp = false,
  onOpenAppMenu,
  activeAppQuickChip = 'all',
  onSelectAppQuickChip,
}) => {
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showVipPopover, setShowVipPopover] = useState(false);
  const vipPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showVipPopover) return;
    const handleOutside = (e: MouseEvent) => {
      if (vipPopoverRef.current && !vipPopoverRef.current.contains(e.target as Node)) {
        setShowVipPopover(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [showVipPopover]);

  const effectiveStats: VipStats = vipStats || {
    totalMinutes: 0,
    totalSecondsCarry: 0,
    episodesCompleted: 0,
    streakDays: 0,
    lastWatchDate: '',
  };
  const vipRank = getVipRankMeta(effectiveStats.totalMinutes);
  const transparentLogoSrc = useTransparentLogo(logoUrl);

  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText('https://asiaflixprime.pages.dev/');
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleOpenSearchAction = onOpenSearchModal || onOpenSearch;

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isAdminAuthenticated) {
      onOpenAdmin();
      return;
    }

    logoClicksRef.current += 1;
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);

    if (logoClicksRef.current >= 2) {
      e.preventDefault();
      logoClicksRef.current = 0;
      onOpenAdmin();
      return;
    }

    logoTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1200);
  };

  if (isInstalledApp) {
    const appQuickChips: Array<{
      id: 'all' | 'K-Drama' | 'C-Drama' | 'Asian Movies' | 'Hindi Dubbed' | 'schedule';
      label: string;
    }> = [
      { id: 'all', label: 'All' },
      { id: 'K-Drama', label: 'K-Drama' },
      { id: 'C-Drama', label: 'C-Drama' },
      { id: 'Asian Movies', label: 'Movies' },
      { id: 'Hindi Dubbed', label: 'Hindi Dubbed' },
      { id: 'schedule', label: 'Schedule' },
    ];

    return (
      <header className="sticky top-0 z-50 w-full bg-[#07070c]/90 backdrop-blur-xl border-b border-white/10">
        {/* Main Native App Top Bar */}
        <div className="max-w-[1440px] mx-auto h-14 px-4 flex items-center justify-between gap-3">
          {/* Left: Official Brand Emblem + Title */}
          <button
            type="button"
            onClick={(e) => {
              if (onGoHome) onGoHome();
              handleLogoClick(e);
            }}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none group"
          >
            <img
              src={transparentLogoSrc}
              alt="AsiaFlix Prime"
              referrerPolicy="no-referrer"
              style={{ background: 'transparent', mixBlendMode: 'screen' }}
              className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(229,9,20,0.45)]"
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base sm:text-lg font-black tracking-tight text-white truncate group-hover:text-red-400 transition-colors">
                AsiaFlix
              </span>
              <span className="bg-[#e50914] text-white text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded shrink-0">
                PRIME
              </span>
            </div>
          </button>

          {/* Right: Quick Search, Notifications Bell, and 3-Lines / 3-Dots App Menu Button */}
          <div className="flex items-center gap-2 shrink-0">
            {handleOpenSearchAction && (
              <button
                type="button"
                onClick={handleOpenSearchAction}
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Search Dramas and Movies"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Release Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#e50914] text-white text-[10px] font-black flex items-center justify-center shadow">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {onOpenAppMenu && (
              <button
                type="button"
                onClick={onOpenAppMenu}
                className="h-10 px-3 rounded-xl bg-white/[0.08] hover:bg-[#e50914] border border-white/15 hover:border-[#e50914] text-white flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                aria-label="Open App Menu"
                title="Categories & Options Menu"
              >
                <Menu className="w-4 h-4" />
                <MoreVertical className="w-3.5 h-3.5 opacity-80" />
              </button>
            )}
          </div>
        </div>

        {/* Single-Line Horizontally Scrollable Quick App Category Pills */}
        {onSelectAppQuickChip && (
          <div className="max-w-[1440px] mx-auto px-4 pb-2.5 pt-0.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {appQuickChips.map((chip) => {
              const isActive = activeAppQuickChip === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onSelectAppQuickChip(chip.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#e50914] text-white border-[#e50914] shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/10'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-[#08080c]/95 backdrop-blur-md border-b border-white/[0.08] transition-all">
      <div className="max-w-[1600px] mx-auto px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between gap-2 w-full">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div onClick={handleLogoClick} className="flex items-center gap-2 group cursor-pointer select-none shrink-0">
            <div className="relative w-10 h-10 md:w-11 md:h-11 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] shrink-0 flex items-center justify-center">
              <img 
                src={transparentLogoSrc} 
                alt="AsiaFlix Prime" 
                referrerPolicy="no-referrer"
                style={{ background: 'transparent', mixBlendMode: 'screen' }}
                className="w-full h-full shrink-0 object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(229,9,20,0.55)]"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 rounded-full border-2 border-[#08080c]" title="Network Active" />
            </div>
            <div className="shrink-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base md:text-xl font-black tracking-tight text-white group-hover:text-red-500 transition-colors">
                  AsiaFlix
                </span>
                <span className="bg-[#e50914] text-white text-[9px] md:text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm">
                  PRIME
                </span>
              </div>
              <p className="hidden sm:flex text-[9px] font-bold text-zinc-400 tracking-wider items-center gap-1 mt-0.5 leading-none">
                PRIVATE VIP NETWORK 🐰
              </p>
              <div className="flex items-center gap-1 mt-0.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-bold tracking-tight">VIP Network Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls (horizontally scrollable on narrow mobile screens, never squashed) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 py-0.5">
          {/* VIP Binge Level & Daily Streak Badge */}
          <div className="shrink-0" ref={vipPopoverRef}>
            <button
              onClick={() => setShowVipPopover((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 md:py-2 rounded-xl bg-gradient-to-r ${vipRank.gradientClass} border text-xs md:text-[12px] font-black transition-all shadow-[0_0_14px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap shrink-0`}
              title="View your VIP Binge Level & Watch Streak"
            >
              <span>{vipRank.title}</span>
              <span className="opacity-60">•</span>
              <span className="flex items-center gap-0.5 text-amber-300">
                🔥 {effectiveStats.streakDays}d
              </span>
            </button>

            {showVipPopover && (
              <div className="fixed right-3 top-14 w-72 rounded-2xl bg-[#10121b] border border-amber-400/35 shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-4 z-[60] space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">VIP Binge Profile</span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {vipRank.title}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-sm font-black text-white">{effectiveStats.totalMinutes}m</div>
                    <div className="text-[10px] text-zinc-400 font-bold">Binged</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-sm font-black text-emerald-300">{effectiveStats.episodesCompleted}</div>
                    <div className="text-[10px] text-zinc-400 font-bold">Eps Done</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-sm font-black text-amber-300 flex items-center justify-center gap-0.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      {effectiveStats.streakDays}d
                    </div>
                    <div className="text-[10px] text-zinc-400 font-bold">Streak</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-zinc-400">
                      {vipRank.nextRankTitle ? `Next: ${vipRank.nextRankTitle}` : 'Max VIP Rank Reached!'}
                    </span>
                    <span className="text-amber-300 font-black">{vipRank.progressPct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#e50914] via-[#f59e0b] to-emerald-400 transition-all duration-500"
                      style={{ width: `${vipRank.progressPct}%` }}
                    />
                  </div>
                  {vipRank.nextRankMinutes !== null && (
                    <p className="text-[10px] text-zinc-400">
                      Watch <strong className="text-white">{Math.max(1, vipRank.nextRankMinutes - effectiveStats.totalMinutes)} more mins</strong> to level up!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 1-Click Install App / Download APK Modal Trigger */}
          {(onOpenAppDownloadModal || onInstallApp) && !isAppInstalled && (
            <button
              onClick={onOpenAppDownloadModal || onInstallApp}
              className="px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-[13px] font-extrabold rounded-xl bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              title="Install AsiaFlix Prime App or Download APK"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📲 Install App / Download APK</span>
            </button>
          )}

          {/* ALWAYS-VISIBLE PROMINENT HOME BUTTON (PHONE, TABLET, LAPTOP) */}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-white/[0.06] hover:bg-[#e50914] border border-white/10 text-xs md:text-[13px] font-extrabold text-white transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0 group hover:scale-105 active:scale-95"
              title="Return to Home Screen & Reset Filters"
            >
              <Home className="w-3.5 h-3.5 text-zinc-200 group-hover:text-white" />
              <span>Home</span>
            </button>
          )}

          {/* ALWAYS-VISIBLE PROMINENT SEARCH BUTTON (PHONE, TABLET, LAPTOP) */}
          {handleOpenSearchAction && (
            <button
              onClick={handleOpenSearchAction}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] hover:from-red-600 hover:to-pink-600 border border-red-500/40 text-xs md:text-[13px] font-extrabold text-white transition-all shadow-[0_0_15px_rgba(229,9,20,0.35)] cursor-pointer whitespace-nowrap shrink-0 hover:scale-105 active:scale-95"
              title="Quick Search Dramas, Movies, and Cast"
            >
              <Search className="w-3.5 h-3.5 text-white" />
              <span>Search</span>
            </button>
          )}

          {/* Google Sheet Live Sync Pill */}
          {onRefreshSheet && (
            <button
              onClick={onRefreshSheet}
              disabled={isSheetSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs md:text-[13px] font-extrabold transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="Click to live-sync dramas, links, and posters from Google Sheets"
            >
              <span className={`w-2 h-2 rounded-full ${isSheetSyncing ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{isSheetSyncing ? 'Syncing...' : `Sheet: ${sheetSyncCount} Live`}</span>
              <span className={`text-xs ${isSheetSyncing ? 'animate-spin' : ''}`}>🔄</span>
            </button>
          )}

          {/* Falling Ambience Mode Cycler (Snow -> Sakura -> Embers -> Off) */}
          {(() => {
            const modeConfig: Record<ParticleMode, { icon: string; label: string; style: string }> = {
              snow: {
                icon: '❄️',
                label: 'First Snow & Red Sparks (Click to switch)',
                style: 'bg-sky-500/15 border-sky-400/35 text-sky-200 hover:bg-sky-500/25 shadow-[0_0_12px_rgba(56,189,248,0.2)]',
              },
              sakura: {
                icon: '🌸',
                label: 'Ruby-Pink Petals (Click to switch)',
                style: 'bg-pink-500/15 border-pink-400/35 text-pink-200 hover:bg-pink-500/25 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
              },
              embers: {
                icon: '🔥',
                label: 'Crimson & Gold Embers (Click to switch)',
                style: 'bg-red-500/15 border-red-400/35 text-amber-200 hover:bg-red-500/25 shadow-[0_0_12px_rgba(229,9,20,0.25)]',
              },
              off: {
                icon: '🚫',
                label: 'Ambience: Off (Click to enable First Snow)',
                style: 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]',
              },
            };
            const activeCfg = modeConfig[particleMode];

            return (
              <button
                onClick={onToggleSakura}
                className={`px-2.5 py-1.5 md:py-2 rounded-xl text-xs md:text-[13px] font-extrabold transition-all border whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center ${activeCfg.style}`}
                title={activeCfg.label}
              >
                <span className="text-sm leading-none">{activeCfg.icon}</span>
              </button>
            );
          })()}

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative px-2.5 py-1.5 md:py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-200 hover:text-white transition-all whitespace-nowrap shrink-0 flex items-center justify-center cursor-pointer"
            title="Release Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e50914] text-white text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Watchlist Quick Button */}
          <button
            onClick={onOpenWatchlist}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs md:text-[13px] font-extrabold text-zinc-200 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="My Watchlist"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Watchlist</span>
            {watchlistCount > 0 && (
              <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.5 text-[11px] rounded font-black">
                {watchlistCount}
              </span>
            )}
          </button>

          {/* Arcade Modal Button */}
          <button
            onClick={onOpenArcade}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs md:text-[13px] font-extrabold text-zinc-200 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Drama Arcade (Memory, Quiz, Wheel)"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-[#ff2b54]" />
            <span>Arcade</span>
          </button>

          {/* Support Desk */}
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs md:text-[13px] font-extrabold text-zinc-200 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Support Desk"
          >
            <Headphones className="w-3.5 h-3.5 text-sky-400" />
            <span>Support</span>
          </button>

          {/* Request Drama */}
          <button
            onClick={onOpenRequest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs md:text-[13px] font-extrabold text-zinc-200 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Request Drama"
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>Request</span>
          </button>

          {/* Copy Official Invite Link */}
          <button
            onClick={handleCopyPortalLink}
            className={`px-2.5 py-1.5 md:py-2 rounded-xl text-xs md:text-[13px] font-extrabold transition-all border whitespace-nowrap shrink-0 flex items-center justify-center cursor-pointer ${
              linkCopied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/[0.03] border-white/10 text-zinc-200 hover:text-white hover:bg-white/[0.08]'
            }`}
            title={linkCopied ? 'Copied https://asiaflixprime.pages.dev/' : 'Copy Invite Link (https://asiaflixprime.pages.dev/)'}
          >
            {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Admin Studio Indicator Button (Visible when unlocked) */}
          {isAdminAuthenticated && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 hover:text-white text-xs md:text-[13px] font-extrabold transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] whitespace-nowrap shrink-0 cursor-pointer"
              title="Open Admin Control Studio"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Admin Studio</span>
            </button>
          )}

          {/* VIP Telegram Join Primary CTA */}
          <a
            href="https://t.me/+yJH68LvfrT9hZDVl"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs md:text-[13px] font-extrabold shadow-[0_0_20px_rgba(229,9,20,0.45)] hover:shadow-[0_0_28px_rgba(229,9,20,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Join VIP</span>
          </a>
        </div>
      </div>
    </header>
  );
};
