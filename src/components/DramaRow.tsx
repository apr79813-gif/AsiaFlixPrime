import React, { useRef, useState, useMemo, useEffect } from 'react';
import { DramaItem, AudioType } from '../types/drama';
import { DramaCard } from './DramaCard';
import { ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';

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

interface DramaRowProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  dramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: (dramaId: string) => boolean;
  activeAudioContext?: AudioType | string;
  rowAudioContext?: 'hindi' | 'fandub' | 'orig';
  isComingSoonContext?: boolean;
  isPhoneDevice?: boolean;
}

export const DramaRow: React.FC<DramaRowProps> = ({
  id,
  title,
  subtitle,
  icon,
  dramas,
  onSelectDrama,
  onToggleWatchlist,
  isWatchlisted,
  activeAudioContext,
  rowAudioContext,
  isComingSoonContext = false,
  isPhoneDevice = false,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [detectedPhone, setDetectedPhone] = useState<boolean>(() => detectPhoneOrPortrait());

  useEffect(() => {
    const update = () => setDetectedPhone(detectPhoneOrPortrait());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const effectiveIsPhone = Boolean(isPhoneDevice || detectedPhone);

  // Derive strict row audio context from explicit prop, title, or activeAudioContext
  const effectiveRowAudioContext: 'hindi' | 'fandub' | 'orig' | undefined = useMemo(() => {
    if (rowAudioContext) return rowAudioContext;
    const tLower = title.toLowerCase();
    const ctxLower = (activeAudioContext || '').toLowerCase();
    if (tLower.includes('fan dub') || ctxLower.includes('fan')) return 'fandub';
    if (tLower.includes('hindi dubbed') || (ctxLower.includes('hindi') && !ctxLower.includes('fan'))) return 'hindi';
    if (tLower.includes('original audio') || tLower.includes('eng sub') || ctxLower.includes('orig') || ctxLower.includes('eng')) return 'orig';
    return undefined;
  }, [rowAudioContext, title, activeAudioContext]);

  // Guarantee 100% unique dramas by ID to eliminate duplicate keys
  const uniqueDramas = useMemo(() => {
    const seen = new Set<string>();
    return (dramas || []).filter((d) => {
      if (!d || !d.id || seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [dramas]);

  const scroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const { scrollLeft, clientWidth } = rowRef.current;
    const scrollAmount = effectiveIsPhone ? 1050 : clientWidth * 0.75;
    rowRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!uniqueDramas || uniqueDramas.length === 0) return null;

  return (
    <section
      id={id}
      className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 w-full ${
        effectiveIsPhone ? 'py-5 my-3 mb-12' : 'mb-12'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`rounded-full bg-gradient-to-b from-[#e50914] to-[#ff2b54] shadow-[0_0_12px_#e50914] shrink-0 ${
              effectiveIsPhone ? 'w-1.5 h-9' : 'w-1 h-6'
            }`}
          />
          <div className="min-w-0">
            <h2
              className={`font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap ${
                effectiveIsPhone ? 'text-[26px]' : 'text-lg sm:text-xl'
              }`}
            >
              {icon && <span className="shrink-0">{icon}</span>}
              <span className="truncate">{title}</span>
              <span
                className={`font-bold text-zinc-200 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-full shrink-0 ${
                  effectiveIsPhone ? 'text-[14px] px-3.5 py-1' : 'text-[11px] px-2.5 py-0.5'
                }`}
              >
                {uniqueDramas.length} Titles
              </span>
            </h2>
            {subtitle && (
              <p className={`mt-1 truncate ${effectiveIsPhone ? 'text-[15px] text-zinc-300 font-semibold' : 'text-xs text-zinc-400'}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Carousel Arrows (Hidden when expanded) */}
          {!isExpanded && uniqueDramas.length > 3 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => scroll('left')}
                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-[#e50914]/20 border border-white/10 hover:border-[#e50914]/50 backdrop-blur-md text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                aria-label="Scroll row left"
              >
                <ChevronLeft className={effectiveIsPhone ? 'w-5 h-5' : 'w-4 h-4'} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-[#e50914]/20 border border-white/10 hover:border-[#e50914]/50 backdrop-blur-md text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                aria-label="Scroll row right"
              >
                <ChevronRight className={effectiveIsPhone ? 'w-5 h-5' : 'w-4 h-4'} />
              </button>
            </div>
          )}

          {/* View All Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-md border border-white/15 text-zinc-100 hover:text-white transition-all cursor-pointer whitespace-nowrap ${
              effectiveIsPhone ? 'text-[15px] px-5 py-2.5 font-black' : 'text-xs px-3.5 py-2 font-bold'
            }`}
          >
            {isExpanded ? (
              <>
                <List className={`${effectiveIsPhone ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-[#ff2b54]`} />
                <span>Carousel View</span>
              </>
            ) : (
              <>
                <Grid className={`${effectiveIsPhone ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-zinc-300`} />
                <span>View All ({uniqueDramas.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cards Container */}
      {isExpanded ? (
        <div
          className={
            effectiveIsPhone
              ? ''
              : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4'
          }
          style={
            effectiveIsPhone
              ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '22px',
                }
              : undefined
          }
        >
          {uniqueDramas.map((drama, idx) => (
            <DramaCard
              key={drama.id}
              drama={drama}
              onSelect={onSelectDrama}
              onToggleWatchlist={onToggleWatchlist}
              isWatchlisted={isWatchlisted(drama.id)}
              rank={idx + 1}
              isTopOne={idx === 0}
              activeAudioContext={activeAudioContext}
              rowAudioContext={effectiveRowAudioContext}
              isComingSoonContext={isComingSoonContext}
              isPhoneDevice={effectiveIsPhone}
              isGrid={true}
            />
          ))}
        </div>
      ) : (
        <div
          ref={rowRef}
          className={`flex overflow-x-auto scroll-smooth pb-3 scrollbar-thin scrollbar-thumb-zinc-700 -mx-4 px-4 sm:mx-0 sm:px-0 ${
            effectiveIsPhone ? 'gap-[22px]' : 'gap-4'
          }`}
        >
          {uniqueDramas.map((drama, idx) =>
            effectiveIsPhone ? (
              <DramaCard
                key={drama.id}
                drama={drama}
                onSelect={onSelectDrama}
                onToggleWatchlist={onToggleWatchlist}
                isWatchlisted={isWatchlisted(drama.id)}
                rank={idx + 1}
                isTopOne={idx === 0}
                activeAudioContext={activeAudioContext}
                rowAudioContext={effectiveRowAudioContext}
                isComingSoonContext={isComingSoonContext}
                isPhoneDevice={true}
                isGrid={false}
              />
            ) : (
              <div key={drama.id} className="w-[165px] sm:w-[195px] shrink-0">
                <DramaCard
                  drama={drama}
                  onSelect={onSelectDrama}
                  onToggleWatchlist={onToggleWatchlist}
                  isWatchlisted={isWatchlisted(drama.id)}
                  rank={idx + 1}
                  isTopOne={idx === 0}
                  activeAudioContext={activeAudioContext}
                  rowAudioContext={effectiveRowAudioContext}
                  isComingSoonContext={isComingSoonContext}
                  isPhoneDevice={false}
                />
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
};
