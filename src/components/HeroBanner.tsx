import React, { useState, useEffect } from 'react';
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
    navigator.clipboard.writeText("https://asiaflixprimeofficial.netlify.app/");
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
    <section className="relative overflow-hidden border-b border-white/[0.08] min-h-[520px] lg:min-h-[600px] flex items-center">
      {/* Cinematic Backdrop Image with Dark Vignette */}
      <div className="absolute inset-0 z-0">
        <img
          key={currentSlide.id + currentSlide.backdropUrl}
          src={currentSlide.backdropUrl}
          alt={currentSlide.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-[0.38] transition-all duration-1000 scale-105"
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080c] via-[#08080c]/85 to-transparent max-w-4xl" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#08080c] to-transparent" />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 w-full">
        {/* Header Badges Row */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          {/* Top 1 Badge */}
          {isTopOne ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.6)] uppercase tracking-wider animate-pulse">
              <span>👑 TOP 1 IN ASIAFLIX</span>
            </div>
          ) : currentSlide.badge ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e50914] text-white text-xs font-black tracking-wider uppercase shadow-md">
              <span>{currentSlide.badge}</span>
            </div>
          ) : null}

          {/* Network Notice */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-xs text-zinc-300 font-semibold shadow-sm">
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
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 hover:bg-red-600 border border-red-500/50 text-white text-xs font-bold transition-all shadow-md ml-auto"
              title="Add or edit homepage background posters and banners"
            >
              <ImageIcon className="w-3.5 h-3.5 text-red-300" />
              <span>Edit Background Posters</span>
            </button>
          )}
        </div>

        <div className="max-w-2xl">
          {/* Audio & Category tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {currentSlide.audio && (
              <span className="bg-[#e50914] text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow-sm">
                {currentSlide.audio}
              </span>
            )}
            {currentSlide.category && (
              <span className="bg-white/10 text-white text-[11px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                {currentSlide.category}
              </span>
            )}
            {associatedDrama?.ageRating && (
              <span className="bg-black/70 text-amber-300 border border-amber-500/30 text-[11px] font-black px-2 py-0.5 rounded">
                {associatedDrama.ageRating}
              </span>
            )}
            {associatedDrama?.subCategory && (
              <span className="bg-white/10 text-zinc-200 text-[11px] font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
                {associatedDrama.subCategory}
              </span>
            )}
            {currentSlide.releaseYear && (
              <span className="text-zinc-400 text-xs font-semibold">
                {currentSlide.releaseYear}
              </span>
            )}
            {currentSlide.rating && (
              <>
                <span className="text-zinc-500">·</span>
                <div className="flex items-center text-amber-400 text-xs font-bold gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{currentSlide.rating}</span>
                </div>
              </>
            )}
            {(associatedDrama?.details || currentSlide.scheduleInfo) && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-sky-400 text-xs font-bold">
                  {associatedDrama?.details || currentSlide.scheduleInfo}
                </span>
              </>
            )}
            {associatedDrama?.statusText && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded">
                {associatedDrama.statusText}
              </span>
            )}
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-4 text-balance">
            {currentSlide.title}
          </h1>

          {/* Synopsis */}
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed line-clamp-3 mb-8 max-w-xl text-balance">
            {currentSlide.synopsis}
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={currentSlide.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-sm font-black shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:shadow-[0_0_35px_rgba(229,9,20,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Open in Telegram</span>
            </a>

            {associatedDrama && (
              <button
                onClick={() => onSelectDrama(associatedDrama)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-sm font-bold border border-white/10 backdrop-blur-md transition-all hover:scale-[1.02]"
              >
                <Info className="w-4 h-4 text-zinc-300" />
                <span>Episodes & Audio</span>
              </button>
            )}

            {associatedDrama && (
              <button
                onClick={() => onToggleWatchlist(associatedDrama)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold backdrop-blur-md transition-all ${
                  inWatchlist
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300 hover:text-white'
                }`}
                title={inWatchlist ? 'In your Watchlist' : 'Add to Watchlist'}
              >
                {inWatchlist ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span className="hidden sm:inline">Watchlist</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs font-semibold border border-white/[0.08] transition-all"
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
