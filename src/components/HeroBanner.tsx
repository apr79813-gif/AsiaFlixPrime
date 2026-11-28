import React, { useState, useEffect, useRef } from 'react';
import { DramaItem, HeroBannerSlide, WatchlistStatus } from '../types/drama';
import { 
  Play, 
  Bookmark, 
  BookmarkCheck, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Star,
  Copy,
  Check,
  ImageIcon
} from 'lucide-react';
import { getAgeRatingMeta } from '../services/ageRatingHelper';

interface HeroBannerProps {
  featuredDramas: DramaItem[];
  banners?: HeroBannerSlide[];
  onSelectDrama: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem, status?: WatchlistStatus) => void;
  isWatchlisted: (dramaId: string) => boolean;
  onOpenAdminBanners?: () => void;
  isAdminAuthenticated?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredDramas,
  banners = [],
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
  onOpenAdminBanners,
  isAdminAuthenticated = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Active items list: use custom banners if available and active, otherwise fallback to featured dramas
  const activeSlides = React.useMemo(() => {
    const validBanners = (banners || []).filter((b) => b && b.isActive !== false);
    if (validBanners.length > 0) {
      return validBanners;
    }
    // Convert featured dramas to slides
    return (featuredDramas || []).map((d, index) => ({
      id: d.id,
      title: d.title,
      backdropUrl: d.backdrop || d.poster,
      posterUrl: d.poster,
      audio: d.defaultAudio,
      category: d.category,
      releaseYear: d.releaseYear,
      rating: d.rating,
      scheduleInfo: d.scheduleInfo,
      synopsis: d.synopsis,
      telegramUrl: d.telegramUrl,
      badge: index === 0 ? '👑 TOP 1' : undefined,
      dramaId: d.id,
      isActive: true,
    }));
  }, [banners, featuredDramas]);

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://asiaflixprime.pages.dev/");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!currentSlide) return null;

  // Find associated drama if available (by id or normalized title match)
  const associatedDrama = currentSlide.dramaId 
    ? featuredDramas.find((d) => d.id === currentSlide.dramaId || d.title.toLowerCase() === currentSlide.title.toLowerCase()) 
    : (featuredDramas.find((d) => d.title.toLowerCase() === currentSlide.title.toLowerCase()) || featuredDramas[0]);

  const inWatchlist = associatedDrama ? isWatchlisted(associatedDrama.id) : false;
  const isTopOne = currentIndex === 0 || currentSlide.badge?.includes('TOP 1');

  return (
    <section
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartXRef.current === null || activeSlides.length <= 1) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
        const delta = endX - touchStartXRef.current;
        touchStartXRef.current = null;
        if (Math.abs(delta) > 40) {
          if (delta < 0) {
            setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
          } else {
            setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
          }
        }
      }}
      className="relative overflow-hidden border-b border-white/[0.08] aspect-[16/10] sm:aspect-auto min-h-[300px] sm:min-h-[460px] lg:min-h-[540px] flex items-end sm:items-center bg-[#050509]"
    >
      {/* Cinematic 16:9 Backdrop Image with Smooth Seamless Gradients (Right Side Bright & Crisp) */}
      <div className="absolute inset-0 z-0">
        <img
          key={currentSlide.id + currentSlide.backdropUrl}
          src={currentSlide.backdropUrl}
          alt={currentSlide.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050509]/95 via-[#050509]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050509] via-[#050509]/25 to-transparent" />
      </div>

      <div className="relative z-20 max-w-[1600px] mx-auto px-3 py-2.5 sm:px-8 sm:py-14 lg:py-16 w-full">
        {/* Header Badges Row */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2.5 mb-1 sm:mb-5">
          {/* Top 1 / VIP Pick Badge */}
          {isTopOne ? (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-3.5 sm:py-1.5 rounded sm:rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[8px] sm:text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.6)] uppercase tracking-wider animate-pulse">
              <span>👑 TOP 1</span>
              <span className="hidden sm:inline">IN ASIAFLIX</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-3.5 sm:py-1.5 rounded sm:rounded-full bg-[#e50914] text-white text-[8px] sm:text-xs font-black tracking-wider uppercase shadow-md">
              <span>{currentSlide.badge && !currentSlide.badge.includes(',') && currentSlide.badge.length < 25 ? currentSlide.badge : '🔥 VIP PICK'}</span>
            </div>
          )}

          {/* Network Notice (desktop/tablet) */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-xs text-zinc-300 font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Weekend Mega Lineup is Active!</span>
            <span className="text-zinc-500">·</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> VIP High Speed
            </span>
          </div>

          {/* Admin Edit Banners Quick Trigger (ONLY shown to authenticated admin) */}
          {isAdminAuthenticated && onOpenAdminBanners && (
            <button
              onClick={onOpenAdminBanners}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 rounded-full bg-red-600/30 hover:bg-red-600 border border-red-500/50 text-white text-[10px] sm:text-xs font-bold transition-all shadow-md ml-auto"
              title="Add or edit homepage background posters and banners"
            >
              <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-300" />
              <span className="hidden sm:inline">Edit Background Posters</span>
              <span className="sm:hidden">Edit</span>
            </button>
          )}
        </div>

        <div className="max-w-2xl">
          {/* Audio & Category tags */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-3">
            {currentSlide.audio && (
              <span className="bg-[#e50914] text-white text-[8px] sm:text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 sm:px-2.5 rounded shadow-sm">
                {currentSlide.audio}
              </span>
            )}
            {currentSlide.category && (
              <span className="bg-white/10 text-white text-[8px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2 rounded backdrop-blur-sm">
                {currentSlide.category}
              </span>
            )}
            {associatedDrama?.ageRating && (() => {
              const ageInfo = getAgeRatingMeta(associatedDrama.ageRating);
              return (
                <span className={`hidden sm:inline-block text-[11px] font-black px-2 py-0.5 rounded ${ageInfo.pillClass}`}>
                  {ageInfo.label}
                </span>
              );
            })()}
            {associatedDrama?.subCategory && (
              <span className="hidden sm:inline-block bg-white/10 text-zinc-200 text-[11px] font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
                {associatedDrama.subCategory}
              </span>
            )}
            {currentSlide.releaseYear && (
              <span className="text-zinc-300 sm:text-zinc-400 text-[8.5px] sm:text-xs font-semibold">
                {currentSlide.releaseYear}
              </span>
            )}
            {currentSlide.rating && (
              <>
                <span className="text-zinc-500 text-[9px] sm:text-xs">·</span>
                <div className="flex items-center text-amber-400 text-[8.5px] sm:text-xs font-bold gap-0.5 sm:gap-1">
                  <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                  <span>{currentSlide.rating}</span>
                </div>
              </>
            )}
            {(associatedDrama?.details || currentSlide.scheduleInfo) && (
              <>
                <span className="hidden sm:inline text-zinc-500">·</span>
                <span className="hidden sm:inline text-sky-400 text-xs font-bold">
                  {associatedDrama?.details || currentSlide.scheduleInfo}
                </span>
              </>
            )}
            {associatedDrama?.statusText && (
              <span className="hidden sm:inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded">
                {associatedDrama.statusText}
              </span>
            )}
          </div>

          {/* Main Title */}
          <h1 className="text-xs sm:text-5xl lg:text-6xl font-extrabold sm:font-black text-white tracking-tight leading-tight sm:leading-[1.1] mb-0.5 sm:mb-4 line-clamp-1 sm:line-clamp-none text-balance">
            {currentSlide.title}
          </h1>

          {/* Synopsis */}
          <p className="text-zinc-200 sm:text-zinc-300 text-[9.5px] sm:text-base leading-snug sm:leading-relaxed line-clamp-1 sm:line-clamp-3 mb-2 sm:mb-8 max-w-[72%] sm:max-w-xl text-balance">
            {currentSlide.synopsis}
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
            <a
              href={currentSlide.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 sm:gap-2 px-2.5 py-1 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-[10px] sm:text-sm font-black shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:shadow-[0_0_35px_rgba(229,9,20,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-white" />
              <span className="sm:hidden">Telegram</span>
              <span className="hidden sm:inline">Open in Telegram</span>
            </a>

            {associatedDrama && (
              <button
                onClick={() => onSelectDrama(associatedDrama)}
                className="flex items-center gap-1 sm:gap-2 px-2.5 py-1 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl bg-white/[0.12] sm:bg-white/[0.08] hover:bg-white/[0.14] text-white text-[10px] sm:text-sm font-bold border border-white/15 sm:border-white/10 backdrop-blur-md transition-all hover:scale-[1.02]"
              >
                <Info className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-200 sm:text-zinc-300" />
                <span className="sm:hidden">Watch HD</span>
                <span className="hidden sm:inline">Episodes & Audio</span>
              </button>
            )}

            {associatedDrama && (
              <button
                onClick={() => onToggleWatchlist(associatedDrama)}
                className={`flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border text-[10px] sm:text-sm font-bold backdrop-blur-md transition-all ${
                  inWatchlist
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-white/[0.06] sm:bg-white/[0.04] hover:bg-white/[0.08] border-white/15 sm:border-white/10 text-zinc-200 sm:text-zinc-300 hover:text-white'
                }`}
                title={inWatchlist ? 'In your Watchlist' : 'Add to Watchlist'}
              >
                {inWatchlist ? (
                  <>
                    <BookmarkCheck className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
                    <span className="hidden sm:inline">Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Watchlist</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs font-semibold border border-white/[0.08] transition-all"
              title="Copy Portal Invite Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Invite'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide Navigation Controls */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2">
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length)}
            className="p-2 rounded-lg bg-black/60 hover:bg-black/90 border border-white/10 text-white backdrop-blur-sm transition-all"
            aria-label="Previous Featured Poster"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            {activeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  currentIndex === i ? 'w-6 bg-[#e50914]' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % activeSlides.length)}
            className="p-2 rounded-lg bg-black/60 hover:bg-black/90 border border-white/10 text-white backdrop-blur-sm transition-all"
            aria-label="Next Featured Poster"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};
