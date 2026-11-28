import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DramaItem, HeroBannerSlide, VipProfile, WatchlistEntry } from '../types/drama';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Info,
  Star,
  ChevronRight,
  Search,
  Bell,
  Menu,
  Flame,
} from 'lucide-react';
import { WeekendMegaLineupSection } from './WeekendMegaLineupSection';
import { getAgeRatingMeta } from '../services/ageRatingHelper';
import { getWatchTimestampForDrama } from '../services/vipPlayerHelper';
import { AdultsOnlyBadge } from './AdultsOnlyBadge';
import { OFFICIAL_WATERMARK_LOGO_URL, useTransparentLogo } from './AnimatedChannelLogo';

interface AppPosterCardProps {
  drama: DramaItem;
  onSelectDrama: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: boolean;
  rankNumber?: number;
  inGrid?: boolean;
  showProgressBar?: boolean;
}

const AppPosterCard: React.FC<AppPosterCardProps> = ({
  drama,
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
  rankNumber,
  inGrid = false,
  showProgressBar = false,
}) => {
  const ageInfo = getAgeRatingMeta(drama.ageRating);
  const watchTs = showProgressBar ? getWatchTimestampForDrama(drama.id) : null;
  const progressPct = showProgressBar
    ? watchTs && watchTs.duration > 0
      ? Math.min(100, Math.max(8, Math.round((watchTs.currentTime / watchTs.duration) * 100)))
      : watchTs && watchTs.currentTime > 0
      ? 35
      : 22
    : 0;

  const audioBadge =
    drama.defaultAudio === 'Hindi Dubbed'
      ? {
          label: '🔊 IN HINDI',
          className:
            'bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white border border-[#ff1e56]/60 shadow-[0_2px_10px_rgba(229,9,20,0.55)] font-extrabold',
        }
      : drama.defaultAudio === 'Hindi Fan Dubbed' || drama.defaultAudio === 'Fan Dubbed'
      ? {
          label: '🎙️ FAN DUB',
          className:
            'bg-gradient-to-r from-[#ff1e56] to-[#ff7a00] text-white border border-orange-400/50 shadow-[0_2px_10px_rgba(255,30,86,0.5)] font-extrabold',
        }
      : {
          label: '🌐 ORIGINAL',
          className:
            'bg-gradient-to-r from-[#0061ff] to-[#00c6ff] text-white border border-cyan-300/50 shadow-[0_2px_10px_rgba(0,198,255,0.45)] font-extrabold',
        };

  return (
    <article
      onClick={() => onSelectDrama(drama)}
      className={`group cursor-pointer flex flex-col bg-[#0b0c14] rounded-xl border border-white/10 hover:border-[#ff1e56]/60 overflow-hidden transition-transform duration-200 active:scale-[0.98] ${
        inGrid
          ? 'w-full'
          : 'w-[31%] min-w-[116px] max-w-[175px] sm:w-[168px] md:w-[182px] lg:w-[192px] shrink-0 snap-start'
      }`}
    >
      <div className="relative aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
        <img
          src={drama.poster}
          alt={drama.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050509] via-transparent to-black/25" />

        {/* Top-left rank / audio micro badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
          {typeof rankNumber === 'number' && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black shadow ${
                rankNumber === 1
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black'
                  : 'bg-[#e50914] text-white'
              }`}
            >
              #{rankNumber}
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded text-[9px] tracking-tight leading-none ${audioBadge.className}`}>
            {audioBadge.label}
          </span>
        </div>

        {/* Top-right watchlist toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist(drama);
          }}
          className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors cursor-pointer ${
            isWatchlisted
              ? 'bg-amber-400 text-black border-amber-200'
              : 'bg-black/60 text-white border-white/20 hover:bg-[#e50914]'
          }`}
          aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatchlisted ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>

        {/* Bottom overlay rating & 18+ indicator */}
        <div
          className={`absolute left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none ${
            showProgressBar ? 'bottom-3' : 'bottom-1.5'
          }`}
        >
          {showProgressBar && watchTs ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#e50914] text-white text-[9px] font-black shadow">
              <Play className="w-2.5 h-2.5 fill-white" />
              <span>Ep {watchTs.ep}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/75 text-amber-300 text-[10px] font-bold">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{drama.rating}</span>
            </span>
          )}
          {ageInfo.is18Plus && <AdultsOnlyBadge size="xs" />}
        </div>

        {/* Continue Watching Bottom Progress Bar */}
        {showProgressBar && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/20 overflow-hidden pointer-events-none">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] shadow-[0_0_8px_rgba(229,9,20,0.85)] transition-all"
            />
          </div>
        )}
      </div>

      <div className="p-2 flex flex-col gap-0.5 min-w-0">
        <h3 className="text-xs sm:text-[13px] font-bold text-white line-clamp-2 leading-tight group-hover:text-[#ff1e56] transition-colors">
          {drama.title}
        </h3>
        <p className="text-[10px] text-zinc-400 truncate">
          {drama.category} · {drama.releaseYear}
        </p>
      </div>
    </article>
  );
};

interface AppCatalogRowProps {
  id: string;
  title: string;
  subtitle?: string;
  dramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: (id: string) => boolean;
  showProgressBar?: boolean;
  seeAllAction?: () => void;
}

const AppCatalogRow: React.FC<AppCatalogRowProps> = ({
  id,
  title,
  subtitle,
  dramas,
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
  showProgressBar = false,
  seeAllAction,
}) => {
  const uniqueList = useMemo(() => {
    const seen = new Set<string>();
    return dramas.filter((d) => {
      if (!d || !d.id || seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [dramas]);

  if (uniqueList.length === 0) return null;

  return (
    <section id={id} className="space-y-2.5 px-3 sm:px-6 max-w-[1440px] mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-zinc-400 truncate">{subtitle}</p>
          )}
        </div>
        {seeAllAction ? (
          <button
            type="button"
            onClick={seeAllAction}
            className="inline-flex items-center gap-0.5 text-xs font-bold text-[#ff1e56] hover:text-[#ff7a00] shrink-0 cursor-pointer"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-zinc-400 shrink-0 tabular-nums">
            {uniqueList.length}
          </span>
        )}
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
        {uniqueList.map((drama) => (
          <AppPosterCard
            key={`${id}-${drama.id}`}
            drama={drama}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted(drama.id)}
            showProgressBar={showProgressBar}
          />
        ))}
      </div>
    </section>
  );
};

interface AppHomeFeedProps {
  dramas: DramaItem[];
  featuredDramas: DramaItem[];
  heroBanners: HeroBannerSlide[];
  spotlightDramas: DramaItem[];
  weekendDramas: DramaItem[];
  filteredDramas: DramaItem[];
  continueWatchingDramas: DramaItem[];
  recommendedDramas: DramaItem[];
  comingSoonDramas: DramaItem[];
  trendingDramas: DramaItem[];
  hindiDubbedList: DramaItem[];
  fanDubbedList: DramaItem[];
  origEngSubList: DramaItem[];
  ongoingDramas: DramaItem[];
  kdramaList: DramaItem[];
  cdramaList: DramaItem[];
  otherSeriesList: DramaItem[];
  asianMoviesList: DramaItem[];
  hollyBollyList: DramaItem[];
  completedList: DramaItem[];
  searchQuery: string;
  selectedAudio: string;
  selectedCategory: string;
  selectedStatus: string;
  onResetFilters: () => void;
  onOpenRequest: () => void;
  onSelectDrama: (drama: DramaItem, epNum?: number) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: (id: string) => boolean;
  onOpenAdminWeekend: () => void;
  weekendAnnouncement?: string;
  weekendTiming?: string;
  weekendActive?: boolean;
  isAdminAuthenticated?: boolean;
  // Transparent App Header + Hub Wiring
  logoUrl?: string;
  vipProfile?: VipProfile | null;
  unreadNotifsCount?: number;
  watchlistEntries?: WatchlistEntry[];
  onGoHome?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenWatchlist?: () => void;
  onOpenAppMenu?: () => void;
  onOpenAdmin?: () => void;
  activeAppQuickChip?: 'all' | 'K-Drama' | 'C-Drama' | 'Asian Movies' | 'Hindi Dubbed' | 'schedule';
  onSelectAppQuickChip?: (
    chip: 'all' | 'K-Drama' | 'C-Drama' | 'Asian Movies' | 'Hindi Dubbed' | 'schedule'
  ) => void;
}

export const AppHomeFeed: React.FC<AppHomeFeedProps> = ({
  dramas,
  featuredDramas,
  heroBanners,
  spotlightDramas,
  weekendDramas,
  filteredDramas,
  continueWatchingDramas,
  recommendedDramas,
  comingSoonDramas,
  trendingDramas,
  hindiDubbedList,
  fanDubbedList,
  origEngSubList,
  ongoingDramas,
  kdramaList,
  cdramaList,
  otherSeriesList,
  asianMoviesList,
  hollyBollyList,
  completedList,
  searchQuery,
  selectedAudio,
  selectedCategory,
  selectedStatus,
  onResetFilters,
  onOpenRequest,
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
  onOpenAdminWeekend,
  weekendAnnouncement,
  weekendTiming,
  weekendActive,
  isAdminAuthenticated = false,
  logoUrl,
  vipProfile,
  unreadNotifsCount = 0,
  watchlistEntries = [],
  onGoHome,
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  onOpenWatchlist,
  onOpenAppMenu,
  onOpenAdmin,
  activeAppQuickChip = 'all',
  onSelectAppQuickChip,
}) => {
  const [heroIdx, setHeroIdx] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<number | null>(null);
  const transparentLogoSrc = useTransparentLogo(logoUrl || OFFICIAL_WATERMARK_LOGO_URL);

  const handleLogoTap = () => {
    if (isAdminAuthenticated && onOpenAdmin) {
      onOpenAdmin();
      return;
    }
    logoClicksRef.current += 1;
    if (logoTimerRef.current) window.clearTimeout(logoTimerRef.current);
    if (logoClicksRef.current >= 2 && onOpenAdmin) {
      logoClicksRef.current = 0;
      onOpenAdmin();
      return;
    }
    logoTimerRef.current = window.setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1100);
    onGoHome?.();
  };

  const heroSlides = useMemo(() => {
    const customSlides = (heroBanners || []).filter((b) => b && b.isActive !== false);
    if (customSlides.length > 0) return customSlides;
    return (featuredDramas || []).slice(0, 5).map((d, idx) => ({
      id: d.id,
      title: d.title,
      backdropUrl: d.backdrop || d.poster,
      posterUrl: d.poster,
      audio: d.defaultAudio,
      category: d.category,
      releaseYear: d.releaseYear,
      rating: d.rating,
      scheduleInfo: d.details || d.scheduleInfo,
      synopsis: d.synopsis,
      telegramUrl: d.telegramUrl,
      badge: idx === 0 ? '🔥 Trending Now' : undefined,
      dramaId: d.id,
      isActive: true,
    }));
  }, [heroBanners, featuredDramas]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const activeSlide = heroSlides[heroIdx % Math.max(1, heroSlides.length)] || heroSlides[0];
  const heroDrama = activeSlide
    ? dramas.find(
        (d) =>
          (activeSlide.dramaId && d.id === activeSlide.dramaId) ||
          d.title.toLowerCase() === activeSlide.title.toLowerCase()
      ) || featuredDramas[0]
    : featuredDramas[0];

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedAudio !== 'all' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all';

  const top10Spotlight = useMemo(() => {
    const combined = [...spotlightDramas, ...trendingDramas, ...dramas];
    const seen = new Set<string>();
    const out: DramaItem[] = [];
    for (const d of combined) {
      if (!d || !d.id || seen.has(d.id)) continue;
      seen.add(d.id);
      out.push(d);
      if (out.length >= 10) break;
    }
    return out;
  }, [spotlightDramas, trendingDramas, dramas]);

  const myListDramas = useMemo(() => {
    if (watchlistEntries.length > 0) {
      const byId = new Map(dramas.map((d) => [d.id, d]));
      const mapped = watchlistEntries
        .map((e) => byId.get(e.dramaId))
        .filter((d): d is DramaItem => Boolean(d));
      if (mapped.length > 0) return mapped;
    }
    return dramas.filter((d) => isWatchlisted(d.id));
  }, [watchlistEntries, dramas, isWatchlisted]);

  const primaryContinueDrama = continueWatchingDramas[0] || null;
  const primaryContinueTs = primaryContinueDrama
    ? getWatchTimestampForDrama(primaryContinueDrama.id)
    : null;
  const continueRemainingMins =
    primaryContinueTs && primaryContinueTs.duration > 0
      ? Math.max(1, Math.round((primaryContinueTs.duration - primaryContinueTs.currentTime) / 60))
      : 42;
  const continueProgressPct =
    primaryContinueTs && primaryContinueTs.duration > 0
      ? Math.min(
          100,
          Math.max(8, Math.round((primaryContinueTs.currentTime / primaryContinueTs.duration) * 100))
        )
      : primaryContinueTs && primaryContinueTs.currentTime > 0
      ? 36
      : 24;

  const isValidPhoto = (val?: string) =>
    Boolean(val && (val.startsWith('data:image/') || /^https?:\/\//i.test(val)));

  // Reusable Transparent Header Right Controls
  const renderHeaderActions = () => (
    <div className="flex items-center gap-2 shrink-0">
      {onOpenSearch && (
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-9 h-9 rounded-full bg-black/45 hover:bg-white/15 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Search Dramas"
        >
          <Search className="w-4 h-4" />
        </button>
      )}
      {onOpenNotifications && (
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 rounded-full bg-black/45 hover:bg-white/15 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(229,9,20,0.8)]">
              {unreadNotifsCount}
            </span>
          )}
        </button>
      )}
      {onOpenProfile && (
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-8 h-8 rounded-full border-2 border-[#ff1e56] overflow-hidden bg-gradient-to-br from-[#e50914] via-[#ff1e56] to-[#ff7a00] flex items-center justify-center text-xs font-black text-white shadow-[0_0_14px_rgba(255,30,86,0.55)] cursor-pointer shrink-0"
          aria-label="Open Profile"
          title={vipProfile ? `${vipProfile.name} • Profile` : 'Sign In / Profile'}
        >
          {isValidPhoto(vipProfile?.avatar) ? (
            <img
              src={vipProfile?.avatar}
              alt={vipProfile?.name || 'Profile'}
              className="w-full h-full object-cover"
            />
          ) : (
            (vipProfile?.name?.trim()?.[0] || 'A').toUpperCase()
          )}
        </button>
      )}
    </div>
  );

  const browseCategoryPills: Array<{
    id: 'all' | 'K-Drama' | 'C-Drama' | 'Asian Movies' | 'Hindi Dubbed';
    label: string;
  }> = [
    { id: 'all', label: '🎬 All' },
    { id: 'K-Drama', label: '🇰🇷 K-Dramas' },
    { id: 'C-Drama', label: '🇨🇳 C-Dramas' },
    { id: 'Asian Movies', label: '🎥 Movies' },
    { id: 'Hindi Dubbed', label: '🎧 Hindi Dubbed' },
  ];

  return (
    <div className="flex-1 w-full pb-28 lg:pb-14 space-y-6 bg-[#050509]">
      {/* If Category/Audio/Search Filter Active: Compact App Header + Responsive Poster Grid */}
      {isFiltered ? (
        <>
          <header className="sticky top-0 z-40 w-full px-4 py-3 bg-[#050509]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLogoTap}
              className="flex items-center gap-2 min-w-0 cursor-pointer"
            >
              <img
                src={transparentLogoSrc}
                alt="AsiaFlix Prime"
                referrerPolicy="no-referrer"
                style={{
                  filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 12px rgba(255,42,133,0.7))',
                  mixBlendMode: 'screen',
                  background: 'transparent',
                }}
                className="w-8 h-8 object-contain shrink-0"
              />
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-white tracking-tight">AsiaFlix</span>
                <span className="text-base font-black bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] bg-clip-text text-transparent">
                  Prime
                </span>
              </div>
            </button>
            {renderHeaderActions()}
          </header>

          {/* Category Quick Switcher inside Filtered Mode */}
          {onSelectAppQuickChip && (
            <div className="px-3 sm:px-6 max-w-[1440px] mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
              {browseCategoryPills.map((pill) => {
                const isActive = activeAppQuickChip === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => onSelectAppQuickChip(pill.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] text-white border-[#ff1e56]/60 shadow-[0_0_16px_rgba(229,9,20,0.45)]'
                        : 'bg-[#0b0c14]/90 text-zinc-200 border-white/12 hover:border-[#ff1e56]/40'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
              {onOpenAppMenu && (
                <button
                  type="button"
                  onClick={onOpenAppMenu}
                  className="px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 border bg-[#0b0c14]/90 border-white/12 text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <Menu className="w-3.5 h-3.5" />
                  <span>More</span>
                </button>
              )}
            </div>
          )}

          <section className="max-w-[1440px] mx-auto px-3 sm:px-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-extrabold text-white truncate">
                  {selectedCategory !== 'all'
                    ? selectedCategory
                    : selectedAudio !== 'all'
                    ? selectedAudio
                    : selectedStatus !== 'all'
                    ? selectedStatus
                    : 'Filtered Results'}
                </h2>
                <p className="text-xs text-zinc-400">{filteredDramas.length} titles available</p>
              </div>
              <button
                type="button"
                onClick={onResetFilters}
                className="px-3 py-1.5 rounded-lg bg-[#0b0c14]/90 hover:bg-white/[0.14] text-xs font-bold text-[#ff1e56] border border-white/12 cursor-pointer shrink-0"
              >
                Reset
              </button>
            </div>

            {filteredDramas.length === 0 ? (
              <div className="py-16 px-4 text-center rounded-2xl bg-[#0b0c14]/90 border border-white/12 space-y-3">
                <p className="text-sm font-bold text-zinc-200">No titles match this filter.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                  >
                    Show All Titles
                  </button>
                  <button
                    type="button"
                    onClick={onOpenRequest}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white text-xs font-bold cursor-pointer"
                  >
                    Request Drama
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4">
                {filteredDramas.map((d) => (
                  <AppPosterCard
                    key={`app-grid-${d.id}`}
                    drama={d}
                    onSelectDrama={onSelectDrama}
                    onToggleWatchlist={onToggleWatchlist}
                    isWatchlisted={isWatchlisted(d.id)}
                    inGrid={true}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* 1. Full-Bleed 16:9 App Hero Banner with Overlaid Transparent Header */}
          {activeSlide && heroDrama && (
            <section
              onTouchStart={(e) => {
                touchStartXRef.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                if (touchStartXRef.current === null || heroSlides.length <= 1) return;
                const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
                const delta = endX - touchStartXRef.current;
                touchStartXRef.current = null;
                if (Math.abs(delta) > 40) {
                  if (delta < 0) {
                    setHeroIdx((i) => (i + 1) % heroSlides.length);
                  } else {
                    setHeroIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length);
                  }
                }
              }}
              className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[345px] sm:min-h-[420px] max-h-[540px] overflow-hidden bg-[#050509] flex items-end select-none"
            >
              {/* Transparent Top Header Overlaid Directly on Top of Hero Banner */}
              <header className="px-4 py-3 flex items-center justify-between absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
                <button
                  type="button"
                  onClick={handleLogoTap}
                  className="flex items-center gap-2 min-w-0 cursor-pointer"
                >
                  <img
                    src={transparentLogoSrc}
                    alt="AsiaFlix Prime"
                    referrerPolicy="no-referrer"
                    style={{
                      filter: 'url(#asiaflix-remove-black) drop-shadow(0 0 12px rgba(255,42,133,0.75))',
                      mixBlendMode: 'screen',
                      background: 'transparent',
                    }}
                    className="w-8 h-8 object-contain shrink-0"
                  />
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-black text-white tracking-tight">
                      AsiaFlix
                    </span>
                    <span className="text-base sm:text-lg font-black bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] bg-clip-text text-transparent">
                      Prime
                    </span>
                  </div>
                </button>
                {renderHeaderActions()}
              </header>

              {/* Hero Backdrop Image */}
              <img
                key={activeSlide.id + activeSlide.backdropUrl}
                src={
                  activeSlide.backdropUrl ||
                  heroDrama.backdrop ||
                  heroDrama.thumbnailUrl ||
                  heroDrama.poster
                }
                alt={activeSlide.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700"
              />
              {/* Seamless Edge Gradients (Zero Split Line) */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050509]/85 via-[#050509]/35 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050509] via-[#050509]/45 to-transparent" />

              {/* Bottom-Left Overlay Content */}
              <div className="relative z-20 max-w-[1440px] mx-auto w-full px-4 pb-5 sm:px-8 sm:pb-8 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(229,9,20,0.55)]">
                    <Flame className="w-3 h-3 fill-white" />
                    <span>
                      {activeSlide.badge &&
                      !activeSlide.badge.includes(',') &&
                      activeSlide.badge.length < 24
                        ? activeSlide.badge
                        : 'Trending Now'}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-zinc-100 text-[10px] font-bold">
                    {heroDrama.category}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-amber-300 text-[10px] font-black">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    {heroDrama.rating}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight line-clamp-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] max-w-xl">
                  {heroDrama.title}
                </h1>

                <p className="text-xs sm:text-sm text-zinc-200 line-clamp-2 max-w-[82%] sm:max-w-lg leading-snug drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">
                  {heroDrama.synopsis || activeSlide.synopsis}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectDrama(heroDrama, 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] text-white text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectDrama(heroDrama)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>More Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleWatchlist(heroDrama)}
                    className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors cursor-pointer ${
                      isWatchlisted(heroDrama.id)
                        ? 'bg-amber-400 text-black border-amber-200'
                        : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                    }`}
                    aria-label={isWatchlisted(heroDrama.id) ? 'Saved in My List' : 'Add to My List'}
                  >
                    {isWatchlisted(heroDrama.id) ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom-Right Crimson-Pink Pagination Dots */}
              {heroSlides.length > 1 && (
                <div className="absolute bottom-5 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                  {heroSlides.map((sl, sIdx) => (
                    <button
                      key={`dot-${sl.id}-${sIdx}`}
                      type="button"
                      onClick={() => setHeroIdx(sIdx)}
                      aria-label={`Hero slide ${sIdx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        sIdx === heroIdx % heroSlides.length
                          ? 'w-5 bg-gradient-to-r from-[#e50914] to-[#ff1e56]'
                          : 'w-1.5 bg-white/35 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 2. Continue Watching Featured Card + See All */}
          {primaryContinueDrama && (
            <section id="app-sec-continue" className="px-3 sm:px-6 max-w-[1440px] mx-auto w-full space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Continue Watching
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenProfile?.()}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-[#ff1e56] hover:text-[#ff7a00] cursor-pointer"
                >
                  <span>See All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                onClick={() =>
                  onSelectDrama(primaryContinueDrama, primaryContinueTs?.ep || 1)
                }
                className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#0b0c14]/90 border border-white/12 hover:border-[#ff1e56]/50 shadow-xl cursor-pointer group transition-all"
              >
                <div className="relative w-32 sm:w-44 aspect-video rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                  <img
                    src={
                      primaryContinueDrama.backdrop ||
                      primaryContinueDrama.thumbnailUrl ||
                      primaryContinueDrama.poster
                    }
                    alt={primaryContinueDrama.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black text-white truncate">
                        {primaryContinueDrama.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 font-semibold mt-0.5">
                        S1 E{primaryContinueTs?.ep || 1} • {continueRemainingMins} min remaining
                      </p>
                    </div>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-white/12 overflow-hidden">
                    <div
                      style={{ width: `${continueProgressPct}%` }}
                      className="h-full bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] rounded-full"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] font-bold text-zinc-400">
                      {primaryContinueTs?.track || primaryContinueDrama.defaultAudio}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDrama(primaryContinueDrama, primaryContinueTs?.ep || 1);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#e50914] to-[#ff1e56] text-white text-[11px] font-black shadow-[0_0_16px_rgba(229,9,20,0.45)] cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Resume</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3. My List Horizontal Poster Row */}
          {myListDramas.length > 0 && (
            <AppCatalogRow
              id="app-sec-mylist"
              title="My List"
              dramas={myListDramas}
              onSelectDrama={onSelectDrama}
              onToggleWatchlist={onToggleWatchlist}
              isWatchlisted={isWatchlisted}
              seeAllAction={onOpenWatchlist}
            />
          )}

          {/* 4. Browse Categories Horizontal Pills + More Drawer */}
          <section className="px-3 sm:px-6 max-w-[1440px] mx-auto w-full space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Browse Categories
              </h2>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {browseCategoryPills.map((pill) => {
                const isActive = activeAppQuickChip === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => onSelectAppQuickChip?.(pill.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#e50914] via-[#ff1e56] to-[#ff7a00] text-white border-[#ff1e56]/60 shadow-[0_0_18px_rgba(229,9,20,0.45)]'
                        : 'bg-[#0b0c14]/90 hover:border-[#ff1e56]/40 text-zinc-200 border-white/12'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
              {onOpenAppMenu && (
                <button
                  type="button"
                  onClick={onOpenAppMenu}
                  className="px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 border bg-[#0b0c14]/90 hover:border-[#ff1e56]/40 text-zinc-200 border-white/12 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Menu className="w-3.5 h-3.5 text-[#ff1e56]" />
                  <span>More</span>
                </button>
              )}
            </div>
          </section>

          {/* 5. Top 10 Trending Spotlight Strip */}
          {top10Spotlight.length > 0 && (
            <section id="app-sec-trending" className="max-w-[1440px] mx-auto px-3 sm:px-6 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    🔥 Top 10 Trending Spotlight
                  </h2>
                  <p className="text-[11px] sm:text-xs text-zinc-400">
                    Most-watched series right now on AsiaFlix Prime
                  </p>
                </div>
              </div>

              <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                {top10Spotlight.map((drama, idx) => (
                  <AppPosterCard
                    key={`top10-${drama.id}`}
                    drama={drama}
                    onSelectDrama={onSelectDrama}
                    onToggleWatchlist={onToggleWatchlist}
                    isWatchlisted={isWatchlisted(drama.id)}
                    rankNumber={idx + 1}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 6. Weekly Airing Schedule */}
          <div id="app-sec-schedule">
            <WeekendMegaLineupSection
              weekendDramas={weekendDramas}
              onSelectDrama={onSelectDrama}
              onToggleWatchlist={onToggleWatchlist}
              isWatchlisted={isWatchlisted}
              onOpenAdminWeekend={onOpenAdminWeekend}
              announcementText={weekendAnnouncement}
              timingText={weekendTiming}
              isActive={weekendActive}
              isAdminAuthenticated={isAdminAuthenticated}
              isAppMode={true}
            />
          </div>

          {/* 7. Organized Catalog Poster Rows */}
          <AppCatalogRow
            id="app-sec-recommended"
            title="🎯 Recommended for You"
            subtitle="Handpicked VIP series and top-rated releases"
            dramas={recommendedDramas}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-hindi"
            title="🇮🇳 Hindi Dubbed Collection"
            subtitle="Crystal clear official Hindi audio in 1080p"
            dramas={hindiDubbedList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-kdrama"
            title="🇰🇷 K-Dramas (Korean)"
            dramas={kdramaList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-cdrama"
            title="🇨🇳 C-Dramas (Chinese)"
            dramas={cdramaList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-ongoing"
            title="🆕 Ongoing Drops & Latest"
            dramas={ongoingDramas}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-fandub"
            title="🎙️ Hindi Fan Dubbed"
            dramas={fanDubbedList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-orig"
            title="🌐 Original Audio / Eng Sub"
            dramas={origEngSubList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-movies"
            title="🎬 Asian Movies"
            dramas={asianMoviesList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-hollybolly"
            title="🍿 Hollywood & Bollywood Dubbed"
            dramas={hollyBollyList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-other"
            title="🌏 Other Series (J-Drama / T-Drama)"
            dramas={otherSeriesList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-coming"
            title="⏳ Coming Soon & Premieres"
            dramas={comingSoonDramas}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />

          <AppCatalogRow
            id="app-sec-completed"
            title="🟢 Completed Full Series"
            dramas={completedList}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted}
          />
        </>
      )}
    </div>
  );
};
