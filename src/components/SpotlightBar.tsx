import React from 'react';
import { DramaItem } from '../types/drama';
import { Flame, Star, ArrowRight } from 'lucide-react';

interface SpotlightBarProps {
  spotlightDramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
  onOpenAdminSpotlight?: () => void;
  isAdminAuthenticated?: boolean;
  isPhoneDevice?: boolean;
}

export const SpotlightBar: React.FC<SpotlightBarProps> = ({
  spotlightDramas,
  onSelectDrama,
  onOpenAdminSpotlight,
  isAdminAuthenticated,
  isPhoneDevice = false,
}) => {
  if (!spotlightDramas || spotlightDramas.length === 0) return null;

  const uniqueSpotlights = Array.from(new Map(spotlightDramas.map((d) => [d.id, d])).values());
  const visibleSpotlights = uniqueSpotlights.slice(0, 5);
  const gridColsClass =
    visibleSpotlights.length >= 5
      ? 'grid grid-cols-5 gap-4 w-full'
      : 'grid grid-cols-4 gap-4 w-full';

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 my-6 sm:my-8 w-full">
      <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-[#171216] via-[#111218] to-[#12161f] border border-white/[0.08] shadow-lg relative overflow-hidden w-full">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-[#e50914]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`rounded-lg bg-[#e50914]/20 border border-[#e50914]/40 text-[#ff2b54] ${isPhoneDevice ? 'p-2' : 'p-1.5'}`}>
              <Flame className={`${isPhoneDevice ? 'w-5 h-5' : 'w-4 h-4'} animate-bounce`} />
            </div>
            <div>
              <h2 className={`font-black text-white tracking-wide uppercase flex items-center gap-2 ${isPhoneDevice ? 'text-lg' : 'text-xs sm:text-sm'}`}>
                Top Trending Spotlight
                <span className={`font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 ${isPhoneDevice ? 'text-xs' : 'text-[9px] sm:text-[10px]'}`}>
                  VIP PICKS
                </span>
              </h2>
              <p className={`text-zinc-400 ${isPhoneDevice ? 'text-xs font-semibold' : 'text-[10px] sm:text-[11px]'}`}>
                Curated trending releases on AsiaFlix Prime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 font-semibold text-zinc-400 ${isPhoneDevice ? 'text-sm' : 'text-[11px] sm:text-xs'}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Synced 🔥</span>
            </div>

            {isAdminAuthenticated && onOpenAdminSpotlight && (
              <button
                onClick={onOpenAdminSpotlight}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Curate Top Trending and Spotlight items"
              >
                <span>⚙️ Curate</span>
              </button>
            )}
          </div>
        </div>

        {/* Full-Width Spotlight Grid */}
        <div className={gridColsClass}>
          {visibleSpotlights.map((drama, idx) => (
            <div
              key={drama.id}
              onClick={() => onSelectDrama(drama)}
              className="group cursor-pointer flex items-center gap-3.5 min-h-[135px] p-3.5 rounded-2xl bg-black/45 hover:bg-white/[0.06] border border-white/[0.08] hover:border-[#e50914]/50 transition-all hover:translate-y-[-2px] relative overflow-hidden"
            >
              <div className="relative overflow-hidden shrink-0 bg-zinc-900 border border-white/10 w-24 h-32 rounded-xl">
                <img
                  src={drama.poster}
                  alt={drama.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <span
                  className={`absolute top-1.5 left-1.5 font-black rounded shadow-md flex items-center gap-0.5 text-[11px] px-2 py-0.5 ${
                    idx === 0
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-500/50 animate-pulse'
                      : 'bg-[#e50914] text-white'
                  }`}
                >
                  {idx === 0 ? '👑 #1' : `#${idx + 1}`}
                </span>
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-between gap-1.5">
                <h4 className="text-[16px] font-black text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                  {drama.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-zinc-300 flex-wrap">
                  <span className="text-red-400 font-bold truncate max-w-[95px]">
                    {drama.defaultAudio}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 text-amber-400 font-bold shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{drama.rating}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px] font-bold text-zinc-400">
                  <span className="text-sky-400 truncate max-w-[125px]">
                    {drama.details || drama.scheduleInfo}
                  </span>
                  <span className="text-zinc-400 flex items-center gap-0.5 group-hover:text-white transition-colors shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
