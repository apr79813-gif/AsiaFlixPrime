import React from 'react';
import { DramaItem } from '../types/drama';
import { Flame, Send, ArrowRight } from 'lucide-react';

interface SpotlightBarProps {
  spotlightDramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
  onOpenAdminSpotlight?: () => void;
  isAdminAuthenticated?: boolean;
}

export const SpotlightBar: React.FC<SpotlightBarProps> = ({
  spotlightDramas,
  onSelectDrama,
  onOpenAdminSpotlight,
  isAdminAuthenticated,
}) => {
  if (!spotlightDramas || spotlightDramas.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 my-8">
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#171216] via-[#111218] to-[#12161f] border border-white/[0.08] shadow-lg relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-[#e50914]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#e50914]/20 border border-[#e50914]/40 text-[#ff2b54]">
              <Flame className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                Top Trending Spotlight
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  VIP PICKS
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">Curated trending releases on AsiaFlix Prime</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Synced 🔥</span>
            </div>

            {isAdminAuthenticated && onOpenAdminSpotlight && (
              <button
                onClick={onOpenAdminSpotlight}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Curate Top Trending and Spotlight items"
              >
                <span>⚙️ Curate Trending</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from(new Map(spotlightDramas.map((d) => [d.id, d])).values()).slice(0, 6).map((drama, idx) => (
            <div
              key={drama.id}
              onClick={() => onSelectDrama(drama)}
              className="group cursor-pointer flex items-center gap-3 p-2.5 rounded-xl bg-black/40 hover:bg-white/[0.06] border border-white/[0.06] hover:border-[#e50914]/40 transition-all hover:translate-y-[-2px] relative"
            >
              <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-zinc-900 border border-white/10">
                <img
                  src={drama.poster}
                  alt={drama.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <span className={`absolute top-0.5 left-0.5 text-[9px] font-black px-1.5 py-0.5 rounded shadow-md flex items-center gap-0.5 ${
                  idx === 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-500/50 animate-pulse' : 'bg-[#e50914] text-white'
                }`}>
                  {idx === 0 ? '👑 TOP 1' : `#${idx + 1}`}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-white truncate group-hover:text-red-400 transition-colors">
                  {drama.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                  <span className="text-red-400 font-bold">{drama.defaultAudio}</span>
                  <span>·</span>
                  <span>{drama.releaseYear}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500">
                  <span className="text-sky-400 font-semibold">{drama.scheduleInfo}</span>
                  <span className="text-zinc-400 flex items-center gap-0.5 group-hover:text-white transition-colors">
                    Episodes <ArrowRight className="w-2.5 h-2.5" />
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
