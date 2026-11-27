import React, { useMemo, useState, useEffect } from 'react';
import { DramaItem, HeroBannerSlide } from '../types/drama';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Info,
  Star,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import { WeekendMegaLineupSection } from './WeekendMegaLineupSection';
import { getAgeRatingMeta } from '../services/ageRatingHelper';
import { AdultsOnlyBadge } from './AdultsOnlyBadge';

interface AppPosterCardProps {
  drama: DramaItem;
  onSelectDrama: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: boolean;
  rankNumber?: number;
  inGrid?: boolean;
}

const AppPosterCard: React.FC<AppPosterCardProps> = ({
  drama,
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
  rankNumber,
  inGrid = false,
}) => {
  const ageInfo = getAgeRatingMeta(drama.ageRating);

  const audioBadge =
    drama.defaultAudio === 'Hindi Dubbed'
      ? {
          label: '🔊 IN HINDI',
          className:
            'bg-gradient-to-r from-[#e50914] to-[#ff2a5f] text-white border border-red-400/50 shadow-[0_2px_10px_rgba(229,9,20,0.6)] font-extrabold',
        }
      : drama.defaultAudio === 'Hindi Fan Dubbed' || drama.defaultAudio === 'Fan Dubbed'
      ? {
          label: '🎙️ FAN DUB',
          className:
            'bg-gradient-to-r from-[#7928ca] to-[#ff0080] text-white border border-purple-400/50 shadow-[0_2px_10px_rgba(121,40,202,0.6)] font-extrabold',
        }
      : {
          label: '🌐 ORIGINAL',
          className:
            'bg-gradient-to-r from-[#0061ff] to-[#00c6ff] text-white border border-cyan-300/50 shadow-[0_2px_10px_rgba(0,198,255,0.5)] font-extrabold',
        };

  return (
    <article
      onClick={() => onSelectDrama(drama)}
      className={`group cursor-pointer flex flex-col bg-[#10111a] rounded-xl border border-white/[0.08] hover:border-[#e50914]/60 overflow-hidden transition-transform duration-200 active:scale-[0.98] ${
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090e] via-transparent to-black/25" />

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
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/75 text-amber-300 text-[10px] font-bold">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>{drama.rating}</span>
          </span>
          {ageInfo.is18Plus && <AdultsOnlyBadge size="xs" />}
        </div>
      </div>

      <div className="p-2 flex flex-col gap-0.5 min-w-0">
        <h3 className="text-xs sm:text-[13px] font-bold text-white line-clamp-2 leading-tight group-hover:text-red-400 transition-colors">
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
}

const AppCatalogRow: React.FC<AppCatalogRowProps> = ({
  id,
  title,
  subtitle,
  dramas,
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
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
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-zinc-400 truncate">{subtitle}</p>
          )}
        </div>
        <span className="text-[11px] font-semibold text-zinc-400 shrink-0 tabular-nums">
          {uniqueList.length}
        </span>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
        {uniqueList.map((drama) => (
          <AppPosterCard
            key={`${id}-${drama.id}`}
            drama={drama}
            onSelectDrama={onSelectDrama}
            onToggleWatchlist={onToggleWatchlist}
            isWatchlisted={isWatchlisted(drama.id)}
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
  onSelectDrama: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: (id: string) => boolean;
  onOpenAdminWeekend: () => void;
  weekendAnnouncement?: string;
  weekendTiming?: string;
  weekendActive?: boolean;
  isAdminAuthenticated?: boolean;
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
  isAdminAuthenticated,
}) => {
  const [heroIdx, setHeroIdx] = useState(0);

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
      badge: idx === 0 ? '👑 #1 Spotlight' : undefined,
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

  return (
    <div className="flex-1 w-full pb-28 lg:pb-14 space-y-6 sm:space-y-8">
      {/* If Category/Audio/Search Filter Active: Clean Responsive Poster Grid */}
      {isFiltered ? (
        <section className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 space-y-4">
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
              <p className="text-xs text-zinc-400">
                {filteredDramas.length} titles available
              </p>
            </div>
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-xs font-bold text-red-400 border border-white/10 cursor-pointer shrink-0"
            >
              Reset
            </button>
          </div>

          {filteredDramas.length === 0 ? (
            <div className="py-16 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
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
                  className="px-4 py-2 rounded-xl bg-[#e50914] text-white text-xs font-bold cursor-pointer"
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
      ) : (
        <>
          {/* 1. Panoramic Widescreen App Hero Showcase */}
          {activeSlide && heroDrama && (() => {
            const heroTelegramUrl =
              heroDrama.telegramHindi ||
              heroDrama.telegramFanDub ||
              heroDrama.telegramOrig ||
              heroDrama.telegramUrl;
            const heroAgeInfo = getAgeRatingMeta(heroDrama.ageRating);
            return (
              <section className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3">
                <div className="aspect-[16/10] sm:aspect-[21/9] w-full relative rounded-2xl overflow-hidden border border-white/10 bg-[#07070c] flex items-end shadow-2xl">
                  <img
                    src={activeSlide.backdropUrl || heroDrama.backdrop || heroDrama.poster}
                    alt={activeSlide.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                  {/* Edge-Only Cinema Gradients (keep main artwork faces & upper/right 65% uncovered) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-[#07070c]/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#07070c]/80 via-[#07070c]/25 to-transparent" />

                  <div className="relative z-10 p-3 sm:p-6 max-w-2xl w-full flex flex-col justify-end">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-bold text-zinc-100">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gradient-to-r from-[#e50914] to-[#ff2a5f] text-white font-black uppercase tracking-wider shadow">
                        {activeSlide.badge && !activeSlide.badge.includes(',') && activeSlide.badge.length < 24
                          ? activeSlide.badge
                          : '🔥 VIP PICK'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/15 backdrop-blur-sm text-white font-bold">
                        {heroDrama.category}
                      </span>
                      {heroDrama.ageRating &&
                        (heroAgeInfo.is18Plus ? (
                          <AdultsOnlyBadge size="xs" />
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${heroAgeInfo.pillClass}`}>
                            {heroAgeInfo.label}
                          </span>
                        ))}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-zinc-200 font-bold">
                        {heroDrama.releaseYear}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-amber-300 font-black">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {heroDrama.rating}
                      </span>
                      {heroDrama.defaultAudio && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold">
                          {heroDrama.defaultAudio}
                        </span>
                      )}
                    </div>

                    <h1 className="text-lg sm:text-2xl font-black text-white leading-tight mt-1 line-clamp-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {heroDrama.title}
                    </h1>

                    <p className="text-[11px] sm:text-xs text-gray-200 line-clamp-2 max-w-[90%] mt-0.5 leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                      {heroDrama.synopsis || activeSlide.synopsis}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => onSelectDrama(heroDrama)}
                        className="bg-[#e50914] hover:bg-[#f6121d] text-white text-xs font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-600/35 cursor-pointer transition-transform active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>▶ Watch Now</span>
                      </button>

                      {heroTelegramUrl && (
                        <a
                          href={heroTelegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/15 hover:bg-[#0088cc]/45 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 text-[#38bdf8]" />
                          <span>✈️ Open in Telegram</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => onToggleWatchlist(heroDrama)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer backdrop-blur-md transition-colors ${
                          isWatchlisted(heroDrama.id)
                            ? 'bg-amber-500/25 border-amber-400/55 text-amber-200'
                            : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                        }`}
                        aria-label={isWatchlisted(heroDrama.id) ? 'Saved in Watchlist' : 'Add to Watchlist'}
                        title={isWatchlisted(heroDrama.id) ? 'Saved in Watchlist' : 'Add to Watchlist'}
                      >
                        {isWatchlisted(heroDrama.id) ? (
                          <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {isWatchlisted(heroDrama.id) ? 'Saved' : 'Watchlist'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {heroSlides.length > 1 && (
                    <div className="flex items-center gap-2 absolute bottom-2.5 right-3 sm:bottom-4 sm:right-4 z-20">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10">
                        {heroSlides.map((sl, sIdx) => (
                          <button
                            key={`dot-${sl.id}-${sIdx}`}
                            type="button"
                            onClick={() => setHeroIdx(sIdx)}
                            aria-label={`Hero slide ${sIdx + 1}`}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              sIdx === heroIdx % heroSlides.length
                                ? 'w-5 bg-[#e50914]'
                                : 'w-1.5 bg-white/40 hover:bg-white/75'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeroIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
                        className="hidden sm:flex w-8 h-8 rounded-lg bg-black/60 border border-white/15 text-white items-center justify-center cursor-pointer hover:bg-black/85"
                        aria-label="Previous Hero Slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroIdx((i) => (i + 1) % heroSlides.length)}
                        className="hidden sm:flex w-8 h-8 rounded-lg bg-black/60 border border-white/15 text-white items-center justify-center cursor-pointer hover:bg-black/85"
                        aria-label="Next Hero Slide"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* 2. Top 10 Trending Spotlight Strip */}
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

          {/* 3. Continue Watching Row */}
          {continueWatchingDramas.length > 0 && (
            <AppCatalogRow
              id="app-sec-continue"
              title="▶️ Continue Watching"
              subtitle="Jump straight back into your active series"
              dramas={continueWatchingDramas}
              onSelectDrama={onSelectDrama}
              onToggleWatchlist={onToggleWatchlist}
              isWatchlisted={isWatchlisted}
            />
          )}

          {/* 4. Clean / Collapsible Weekly Airing Schedule */}
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

          {/* 5. Organized Poster Rows (3 Cards Visible cleanly on Phone, scaling up on Tablet/Laptop App) */}
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
