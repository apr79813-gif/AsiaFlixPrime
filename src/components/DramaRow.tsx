import React, { useRef, useState, useMemo } from 'react';
import { DramaItem } from '../types/drama';
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
    <section id={id} className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            {icon && <span>{icon}</span>}
            <span>{title}</span>
            <span className="text-xs font-bold text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-full ml-1">
              {uniqueDramas.length}
            </span>
          </h2>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Carousel Arrows (Hidden when expanded) */}
          {!isExpanded && uniqueDramas.length > 3 && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scroll('left')}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-all"
                aria-label="Scroll row left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-all"
                aria-label="Scroll row right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View All Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all"
          >
            {isExpanded ? (
              <>
                <List className="w-3.5 h-3.5 text-red-400" />
                <span>Carousel View</span>
              </>
            ) : (
              <>
                <Grid className="w-3.5 h-3.5 text-zinc-400" />
                <span>View All ({uniqueDramas.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cards Container */}
      {isExpanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {uniqueDramas.map((drama, idx) => (
            <DramaCard
              key={drama.id}
              drama={drama}
              onSelect={onSelectDrama}
              onToggleWatchlist={onToggleWatchlist}
              isWatchlisted={isWatchlisted(drama.id)}
              rank={idx + 1}
              isTopOne={idx === 0}
            />
          ))}
        </div>
      ) : (
        <div
          ref={rowRef}
          className="flex gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth pb-3 scrollbar-thin scrollbar-thumb-zinc-700 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {uniqueDramas.map((drama, idx) => (
            <div key={drama.id} className="w-[165px] sm:w-[195px] shrink-0">
              <DramaCard
                drama={drama}
                onSelect={onSelectDrama}
                onToggleWatchlist={onToggleWatchlist}
                isWatchlisted={isWatchlisted(drama.id)}
                rank={idx + 1}
                isTopOne={idx === 0}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
