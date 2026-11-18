import React, { useRef, useState, useMemo } from 'react';
import { DramaItem, AudioType } from '../types/drama';
import { DramaCard } from './DramaCard';
import { ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';

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
  isComingSoonContext = false,
  isPhoneDevice = false,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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
    const scrollAmount = clientWidth * 0.75;
    rowRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!uniqueDramas || uniqueDramas.length === 0) return null;

  return (
    <section id={id} className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-12 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`rounded-full bg-gradient-to-b from-[#e50914] to-[#ff2b54] shadow-[0_0_12px_#e50914] shrink-0 ${
              isPhoneDevice ? 'w-1.5 h-8' : 'w-1 h-6'
            }`}
          />
          <div className="min-w-0">
            <h2
              className={`font-black text-white tracking-tight flex items-center gap-2 flex-wrap ${
                isPhoneDevice ? 'text-2xl' : 'text-lg sm:text-xl'
              }`}
            >
              {icon && <span className="shrink-0">{icon}</span>}
              <span className="truncate">{title}</span>
              <span
                className={`font-bold text-zinc-200 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-full shrink-0 ${
                  isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[11px] px-2.5 py-0.5'
                }`}
              >
                {uniqueDramas.length} Titles
              </span>
            </h2>
            {subtitle && (
              <p className={`mt-0.5 truncate ${isPhoneDevice ? 'text-sm text-zinc-300' : 'text-xs text-zinc-400'}`}>
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
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-[#e50914]/20 border border-white/10 hover:border-[#e50914]/50 backdrop-blur-md text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                aria-label="Scroll row left"
              >
                <ChevronLeft className={isPhoneDevice ? 'w-5 h-5' : 'w-4 h-4'} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-[#e50914]/20 border border-white/10 hover:border-[#e50914]/50 backdrop-blur-md text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                aria-label="Scroll row right"
              >
                <ChevronRight className={isPhoneDevice ? 'w-5 h-5' : 'w-4 h-4'} />
              </button>
            </div>
          )}

          {/* View All Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-md border border-white/10 text-zinc-200 hover:text-white transition-all cursor-pointer whitespace-nowrap ${
              isPhoneDevice ? 'text-sm px-4 py-2 font-black' : 'text-xs px-3.5 py-2 font-bold'
            }`}
          >
            {isExpanded ? (
              <>
                <List className={`${isPhoneDevice ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-[#ff2b54]`} />
                <span>Carousel View</span>
              </>
            ) : (
              <>
                <Grid className={`${isPhoneDevice ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-zinc-400`} />
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
            isPhoneDevice
              ? 'grid grid-cols-4 gap-5'
              : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4'
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
              isComingSoonContext={isComingSoonContext}
              isPhoneDevice={isPhoneDevice}
              isGrid={true}
            />
          ))}
        </div>
      ) : (
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-3 scrollbar-thin scrollbar-thumb-zinc-700 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {uniqueDramas.map((drama, idx) => (
            <div
              key={drama.id}
              className={isPhoneDevice ? 'w-[312px] min-w-[312px] shrink-0' : 'w-[165px] sm:w-[195px] shrink-0'}
            >
              <DramaCard
                drama={drama}
                onSelect={onSelectDrama}
                onToggleWatchlist={onToggleWatchlist}
                isWatchlisted={isWatchlisted(drama.id)}
                rank={idx + 1}
                isTopOne={idx === 0}
                activeAudioContext={activeAudioContext}
                isComingSoonContext={isComingSoonContext}
                isPhoneDevice={isPhoneDevice}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
