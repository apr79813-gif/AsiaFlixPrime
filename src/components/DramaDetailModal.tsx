import React, { useState } from 'react';
import { DramaItem, AudioType, WatchlistStatus } from '../types/drama';
import { 
  X, 
  Play, 
  Send, 
  Star, 
  Bookmark, 
  BookmarkCheck, 
  CheckCircle2, 
  Circle, 
  Copy, 
  Check, 
  Volume2, 
  Clock, 
  Download,
  Share2,
  Sparkles
} from 'lucide-react';

interface DramaDetailModalProps {
  drama: DramaItem | null;
  onClose: () => void;
  onToggleWatchlist: (drama: DramaItem, status?: WatchlistStatus) => void;
  isWatchlisted: boolean;
  watchlistStatus?: WatchlistStatus;
  watchedEpisodes: (number | string)[];
  onToggleEpisodeWatched: (dramaId: string, episodeNum: number | string) => void;
  onMoveToFront?: (dramaId: string) => void;
  isAdminAuthenticated?: boolean;
  isTopOne?: boolean;
}

export const DramaDetailModal: React.FC<DramaDetailModalProps> = ({
  drama,
  onClose,
  onToggleWatchlist,
  isWatchlisted,
  watchlistStatus = 'want_to_watch',
  watchedEpisodes,
  onToggleEpisodeWatched,
  onMoveToFront,
  isAdminAuthenticated = false,
  isTopOne = false,
}) => {
  const [activeAudio, setActiveAudio] = useState<AudioType>(() => {
    return drama?.defaultAudio && drama?.availableAudios.includes(drama.defaultAudio)
      ? drama.defaultAudio
      : drama?.availableAudios[0] || 'Hindi Dubbed';
  });
  const [copied, setCopied] = useState(false);
  const [frontSuccess, setFrontSuccess] = useState(false);

  // Synchronize activeAudio if drama changes
  React.useEffect(() => {
    if (drama) {
      const initial = drama.defaultAudio && drama.availableAudios.includes(drama.defaultAudio)
        ? drama.defaultAudio
        : drama.availableAudios[0] || 'Hindi Dubbed';
      setActiveAudio(initial);
    }
  }, [drama]);

  if (!drama) return null;

  // Selected audio track
  const currentAudio = drama.availableAudios.includes(activeAudio) 
    ? activeAudio 
    : drama.availableAudios[0] || 'Hindi Dubbed';

  // Filter episodes: if only 1 audio exists, show all episodes. If multiple, show only for current audio
  const displayEpisodes = drama.episodes.filter((ep) => {
    if (drama.availableAudios.length <= 1) return true;
    return ep.audio === currentAudio || (!ep.audio && ep.isMerged);
  });

  const handleShare = () => {
    const text = `🌸 Watch "${drama.title}" in Clean Hindi Dubbed 1080p on AsiaFlix Prime VIP Network: https://asiaflixprimeofficial.netlify.app/`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#111218] rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/70 hover:bg-[#e50914] text-zinc-300 hover:text-white transition-all border border-white/10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Backdrop Banner */}
        <div className="relative w-full h-64 sm:h-80 shrink-0 overflow-hidden bg-zinc-950">
          <img
            src={drama.backdrop || drama.poster}
            alt={drama.title}
            className="w-full h-full object-cover object-center filter brightness-[0.45]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111218] via-[#111218]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111218] via-transparent to-transparent" />

          {/* Banner Content Overlay */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-[#e50914] text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow">
                  {drama.category}
                </span>
                <span className="bg-white/10 text-zinc-200 text-xs font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
                  {drama.releaseYear}
                </span>
                <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-black">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{drama.rating}</span>
                </div>
                {isTopOne || drama.spotlightTag === 'TOP #1' ? (
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-2.5 py-0.5 rounded text-xs font-black flex items-center gap-1 shadow-lg shadow-amber-500/30 animate-pulse">
                    <span>👑</span>
                    <span>TOP 1 IN ASIAFLIX</span>
                  </span>
                ) : drama.isSpotlight ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    <span>⭐</span>
                    <span>Top Trending VIP</span>
                  </span>
                ) : null}
                {drama.isWeekendLineup && (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    <span>🌸</span>
                    <span>{drama.weekendSlot || 'Weekend Drop'}</span>
                  </span>
                )}
                <span className="text-zinc-400 text-xs font-semibold">{drama.scheduleInfo}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {drama.title}
              </h2>
              {drama.originalTitle && (
                <p className="text-zinc-400 text-xs font-semibold mt-0.5">{drama.originalTitle}</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={drama.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:scale-105 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Open in Telegram</span>
              </a>

              {/* Sabse Aage (#1) Button: STRICTLY visible only when admin is authenticated */}
              {isAdminAuthenticated && onMoveToFront && (
                <button
                  onClick={() => {
                    onMoveToFront(drama.id);
                    setFrontSuccess(true);
                    setTimeout(() => setFrontSuccess(false), 3500);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-red-500/20 hover:from-amber-500 hover:to-red-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-black transition-all shadow-sm"
                  title="Admin Control: Is drama ko portal par sabse aage (#1 position) par set karein"
                >
                  <span>👑 Admin: Set as #1 (Sabse Aage)</span>
                </button>
              )}

              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white transition-all"
                title="Share Drama Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {frontSuccess && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-between animate-fade-in shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <span>"{drama.title}" ab live portal par sabse aage (#1 position) par set ho gaya hai!</span>
              </div>
              <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-black">#1 FRONT</span>
            </div>
          )}

          {/* Watchlist Status Selector & Meta Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-400">Watchlist Status:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onToggleWatchlist(drama, 'want_to_watch')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isWatchlisted && watchlistStatus === 'want_to_watch'
                      ? 'bg-amber-500 text-black shadow-sm font-black'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white'
                  }`}
                >
                  🔖 Want to Watch
                </button>
                <button
                  onClick={() => onToggleWatchlist(drama, 'watching')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isWatchlisted && watchlistStatus === 'watching'
                      ? 'bg-sky-500 text-white shadow-sm font-black'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white'
                  }`}
                >
                  ▶️ Watching
                </button>
                <button
                  onClick={() => onToggleWatchlist(drama, 'completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isWatchlisted && watchlistStatus === 'completed'
                      ? 'bg-emerald-500 text-white shadow-sm font-black'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white'
                  }`}
                >
                  ✅ Completed
                </button>
                {isWatchlisted && (
                  <button
                    onClick={() => onToggleWatchlist(drama)}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 ml-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>100% Free VIP Stream · No Token Needed</span>
            </div>
          </div>

          {/* Synopsis & Tags */}
          <div>
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Synopsis & Storyline</h4>
            <p className="text-sm text-zinc-300 leading-relaxed">{drama.synopsis}</p>
            
            {drama.tags && drama.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {drama.tags.map((tag) => (
                  <span key={tag} className="text-[11px] font-semibold text-zinc-400 bg-white/[0.04] px-2.5 py-0.5 rounded border border-white/5">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cast */}
          {drama.cast && drama.cast.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Lead Cast</h4>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
                {drama.cast.map((actor) => (
                  <span key={actor} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-bold">
                    🎭 {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Audio Tracks Selection (Single Audio Badge OR Multi-Audio Switcher) */}
          <div>
            {drama.availableAudios.length <= 1 ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-zinc-400">Audio Track:</span>
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center gap-1.5 shadow-sm">
                  <span>{drama.availableAudios[0] === 'Hindi Dubbed' ? '🔊' : drama.availableAudios[0] === 'Fan Dubbed' ? '🎙️' : '💬'}</span>
                  <span>{drama.availableAudios[0] || 'Hindi Dubbed'}</span>
                </span>
                <span className="text-[11px] text-zinc-500 ml-auto hidden sm:inline">1080p FHD Quality</span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-red-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Available Audio Versions ({drama.availableAudios.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-zinc-400">Click audio to switch episode links</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {drama.availableAudios.map((audio) => (
                    <button
                      key={audio}
                      onClick={() => setActiveAudio(audio)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        currentAudio === audio
                          ? 'bg-[#e50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.5)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
                      }`}
                    >
                      <span>{audio === 'Hindi Dubbed' ? '🔊' : audio === 'Fan Dubbed' ? '🎙️' : '💬'}</span>
                      <span>{audio}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Episodes List & Telegram Deep Links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <span>Episodes & Upload Packs</span>
                <span className="text-zinc-500">({displayEpisodes.length})</span>
              </h4>
              <span className="text-[11px] text-zinc-400">
                Watched: {watchedEpisodes.length} episodes
              </span>
            </div>

            {displayEpisodes.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <p className="text-xs font-bold text-zinc-300">
                  Episodes for {currentAudio} will be updated on the private Telegram channel!
                </p>
                <a
                  href={drama.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-2 rounded-xl bg-[#e50914] hover:bg-red-600 text-white text-xs font-black shadow transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open Telegram Channel</span>
                </a>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayEpisodes.map((ep) => {
                  const isWatched = watchedEpisodes.includes(ep.episodeNumber);
                  return (
                    <div
                      key={ep.id}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all ${
                        isWatched 
                          ? 'bg-emerald-950/20 border-emerald-500/30' 
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]'
                      }`}
                    >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Mark as Watched Checkbox */}
                      <button
                        onClick={() => onToggleEpisodeWatched(drama.id, ep.episodeNumber)}
                        className="text-zinc-400 hover:text-emerald-400 transition-colors shrink-0"
                        title={isWatched ? 'Mark as Unwatched' : 'Mark as Watched'}
                      >
                        {isWatched ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white truncate">
                            {ep.isMerged || ep.format === 'movie' 
                              ? ep.title 
                              : `Episode ${ep.episodeNumber}: ${ep.title.replace(/^Episode \d+:\s*/, '')}`}
                          </span>
                          {ep.isMerged && (
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded border border-amber-500/30">
                              Batch / Merged
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span className="text-red-400 font-bold">{ep.audio}</span>
                          {ep.duration && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-zinc-500">
                                <Clock className="w-3 h-3" /> {ep.duration}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span className="text-zinc-400">{ep.quality || '1080p FHD'}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={ep.telegramUrl || drama.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 px-3.5 py-2 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black shadow-md hover:shadow-[0_0_15px_rgba(229,9,20,0.6)] transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Telegram Post</span>
                      <span className="sm:hidden">Open</span>
                    </a>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
