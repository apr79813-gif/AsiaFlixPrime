import React from 'react';
import { DramaItem } from '../types/drama';
import { Play, Bookmark, BookmarkCheck, Star, Send } from 'lucide-react';

interface DramaCardProps {
  drama: DramaItem;
  onSelect: (drama: DramaItem) => void;
  onToggleWatchlist: (drama: DramaItem) => void;
  isWatchlisted: boolean;
  rank?: number;
  isTopOne?: boolean;
}

export const DramaCard: React.FC<DramaCardProps> = ({
  drama,
  onSelect,
  onToggleWatchlist,
  isWatchlisted,
  rank,
  isTopOne,
}) => {
  const isRankOne = isTopOne || rank === 1 || drama.spotlightTag === 'TOP #1';

  const getStatusDotColor = () => {
    if (drama.status.includes('Completed')) return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
    if (drama.status.includes('Coming')) return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
    return 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]';
  };

  return (
    <div className="group relative bg-[#111218] rounded-xl border border-white/[0.08] hover:border-[#e50914]/60 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_12px_30px_rgba(0,0,0,0.8)] hover:-translate-y-1">
      {/* Poster Container */}
      <div 
        onClick={() => onSelect(drama)}
        className="relative w-full aspect-[2/3] overflow-hidden bg-zinc-900 cursor-pointer"
      >
        <img
          src={drama.poster}
          alt={drama.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111218] via-transparent to-black/40 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            {isRankOne && (
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg flex items-center gap-0.5 pointer-events-auto shadow-amber-500/40 animate-pulse">
                👑 TOP 1
              </span>
            )}
            <span className="bg-[#e50914] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md pointer-events-auto">
              {drama.defaultAudio}
            </span>
            {drama.availableAudios.length > 1 && (
              <span className="bg-amber-500 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded shadow pointer-events-auto">
                {drama.availableAudios.length} Audios
              </span>
            )}
          </div>

          <span className="bg-black/75 backdrop-blur-md text-zinc-300 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 shadow pointer-events-auto">
            {drama.category}
          </span>
        </div>

        {/* Watchlist Quick Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist(drama);
          }}
          className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-lg backdrop-blur-md border transition-all z-10 ${
            isWatchlisted
              ? 'bg-amber-500/80 border-amber-400 text-black shadow-lg opacity-100'
              : 'bg-black/60 border-white/20 text-white hover:bg-[#e50914] hover:border-[#e50914] opacity-0 group-hover:opacity-100'
          }`}
          title={isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
        >
          {isWatchlisted ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Status Bottom Floating Row */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] sm:text-[11px] pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-white font-bold">
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor()}`} />
            <span className="text-[9px] sm:text-[10px] truncate max-w-[85px] sm:max-w-[100px]">{drama.status.replace(/ \(.*\)/, '')}</span>
          </div>

          <span className="bg-black/80 backdrop-blur-md text-amber-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            <span>{drama.rating}</span>
          </span>
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2 sm:gap-2.5">
        <div>
          <h3 
            onClick={() => onSelect(drama)}
            className="text-xs sm:text-sm font-black text-white hover:text-red-400 transition-colors line-clamp-1 cursor-pointer" 
            title={drama.title}
          >
            {drama.title}
          </h3>

          {/* Details & Year Meta */}
          <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] text-zinc-400">
            <span className="text-sky-400 font-bold truncate max-w-[105px] sm:max-w-[125px]">
              {drama.details || drama.scheduleInfo || 'Full Series'}
            </span>
            <span className="text-zinc-500 font-semibold">{drama.releaseYear}</span>
          </div>

          {/* Airing Schedule (If Active/Ongoing) */}
          {drama.schedule && drama.schedule.trim() && (
            <div className="mt-1 flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded truncate">
              <span>📅</span>
              <span className="truncate">{drama.schedule}</span>
            </div>
          )}

          {/* Audio Tracks Available Pills (1: Hindi, 2: Fan Dub, 3: Orig) */}
          {drama.availableAudios.length > 1 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {drama.availableAudios.map((aud) => (
                <span
                  key={aud}
                  className={`text-[8px] font-black px-1.5 py-0.2 rounded border ${
                    aud === 'Hindi Dubbed'
                      ? 'bg-red-500/15 text-red-300 border-red-500/30'
                      : aud === 'Fan Dubbed'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  }`}
                >
                  {aud === 'Hindi Dubbed' ? '1: Hindi' : aud === 'Fan Dubbed' ? '2: Fan' : '3: Sub'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1">
          <button
            onClick={() => onSelect(drama)}
            className="w-full py-1.5 px-1 sm:px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-bold border border-white/10 text-center transition-all flex items-center justify-center gap-1"
          >
            <span>Episodes</span>
          </button>

          <a
            href={drama.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full py-1.5 px-1 sm:px-2 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black text-center shadow-md hover:shadow-[0_0_12px_rgba(229,9,20,0.6)] transition-all flex items-center justify-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </div>
  );
};
