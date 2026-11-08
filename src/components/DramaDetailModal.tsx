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
  Share2,
  Sparkles,
  Volume2,
  Clock,
  Calendar,
  Film,
  Bell,
  Check,
  AlertCircle
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
  onSubscribeDubAlert?: (dramaTitle: string, audio: string) => void;
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
  onSubscribeDubAlert,
}) => {
  // Determine initial active audio track based on what's available
  const [activeAudio, setActiveAudio] = useState<AudioType>(() => {
    if (!drama) return 'Hindi Dubbed';
    if (drama.telegramHindi) return 'Hindi Dubbed';
    if (drama.telegramFanDub) return 'Fan Dubbed';
    if (drama.telegramOrig) return 'Original / Eng Sub';
    return drama.defaultAudio || 'Hindi Dubbed';
  });

  const [copied, setCopied] = useState(false);
  const [frontSuccess, setFrontSuccess] = useState(false);
  const [subscribedAudios, setSubscribedAudios] = useState<Record<string, boolean>>({});

  // Synchronize activeAudio when drama changes
  React.useEffect(() => {
    if (drama) {
      if (drama.telegramHindi) setActiveAudio('Hindi Dubbed');
      else if (drama.telegramFanDub) setActiveAudio('Fan Dubbed');
      else if (drama.telegramOrig) setActiveAudio('Original / Eng Sub');
      else setActiveAudio(drama.defaultAudio || 'Hindi Dubbed');
    }
  }, [drama]);

  if (!drama) return null;

  const isMovie = drama.isMovie || 
    drama.category.toLowerCase().includes('movie') || 
    drama.category.toLowerCase().includes('bolly') || 
    drama.category.toLowerCase().includes('holly') ||
    Boolean(drama.details && (drama.details.includes(':') || drama.details.toLowerCase().includes('movie')));

  // Link for each audio track
  const audioLinkMap: Record<AudioType, string | undefined> = {
    'Hindi Dubbed': drama.telegramHindi || (drama.defaultAudio === 'Hindi Dubbed' ? drama.telegramUrl : undefined),
    'Fan Dubbed': drama.telegramFanDub,
    'Original / Eng Sub': drama.telegramOrig || (drama.defaultAudio === 'Original / Eng Sub' ? drama.telegramUrl : undefined),
  };

  const currentAudioLink = audioLinkMap[activeAudio];
  const isCurrentAudioAvailable = Boolean(currentAudioLink && currentAudioLink.startsWith('http'));

  // Find another active audio if current is coming soon
  const alternateActiveAudio = (['Hindi Dubbed', 'Fan Dubbed', 'Original / Eng Sub'] as AudioType[]).find(
    (a) => a !== activeAudio && audioLinkMap[a] && audioLinkMap[a]?.startsWith('http')
  );

  const handleShare = () => {
    const text = `🌸 Watch "${drama.title}" in Clean Audio on AsiaFlix Prime VIP: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDubSubscribe = (audio: string) => {
    setSubscribedAudios((prev) => ({ ...prev, [audio]: true }));
    if (onSubscribeDubAlert) {
      onSubscribeDubAlert(drama.title, audio);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in">
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
            className="w-full h-full object-cover object-center filter brightness-[0.4]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111218] via-[#111218]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111218] via-transparent to-transparent" />

          {/* Banner Content Overlay */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
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

                {/* Details Pill (Runtime or Episode Count) */}
                {drama.details && (
                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    {isMovie ? <Film className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{drama.details}</span>
                  </span>
                )}

                {/* Schedule Pill if ongoing */}
                {drama.schedule && drama.schedule.trim() ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{drama.schedule}</span>
                  </span>
                ) : drama.status.includes('Completed') ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold">
                    ✅ All Drops Complete
                  </span>
                ) : null}

                {isTopOne || drama.spotlightTag === 'TOP #1' ? (
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-2.5 py-0.5 rounded text-xs font-black flex items-center gap-1 shadow-lg shadow-amber-500/30 animate-pulse">
                    <span>👑</span>
                    <span>TOP 1 IN ASIAFLIX</span>
                  </span>
                ) : null}
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
              {isCurrentAudioAvailable ? (
                <a
                  href={currentAudioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Open {activeAudio}</span>
                </a>
              ) : (
                <button
                  onClick={() => handleDubSubscribe(activeAudio)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-lg transition-all"
                >
                  <Bell className="w-4 h-4" />
                  <span>{subscribedAudios[activeAudio] ? 'Subscribed!' : `Notify Me (${activeAudio})`}</span>
                </button>
              )}

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
                  <span>👑 Set #1 Front</span>
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

          {/* TELEGRAM 1, 2, 3 AUDIO SELECTOR SECTION */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#e50914]" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Audio Tracks (Telegram 1, 2, 3)
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">
                Select audio to switch episode links & status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Telegram 1: Hindi Dubbed */}
              <button
                onClick={() => setActiveAudio('Hindi Dubbed')}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  activeAudio === 'Hindi Dubbed'
                    ? 'bg-[#e50914]/20 border-[#e50914] shadow-[0_0_15px_rgba(229,9,20,0.3)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>🇮🇳</span>
                    <span>1. Hindi Dubbed</span>
                  </span>
                  {drama.telegramHindi ? (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black">
                      ⚡ Ready
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black">
                      ⏳ Coming Soon
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {drama.telegramHindi ? 'Stream link available' : 'In production pipeline'}
                </span>
              </button>

              {/* Telegram 2: Fan Dubbed */}
              <button
                onClick={() => setActiveAudio('Fan Dubbed')}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  activeAudio === 'Fan Dubbed'
                    ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>🎙️</span>
                    <span>2. Fan Dubbed</span>
                  </span>
                  {drama.telegramFanDub ? (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black">
                      ⚡ Ready
                    </span>
                  ) : (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-black">
                      ⏳ Coming Soon
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {drama.telegramFanDub ? 'VIP Fan Dub active' : 'Voice dub in preparation'}
                </span>
              </button>

              {/* Telegram 3: Original / Eng Sub */}
              <button
                onClick={() => setActiveAudio('Original / Eng Sub')}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  activeAudio === 'Original / Eng Sub'
                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>🌐</span>
                    <span>3. Original / Sub</span>
                  </span>
                  {drama.telegramOrig ? (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black">
                      ⚡ Ready
                    </span>
                  ) : (
                    <span className="text-[9px] bg-zinc-500/20 text-zinc-400 px-1.5 py-0.5 rounded font-black">
                      Optional
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {drama.telegramOrig ? 'Original Audio + Eng Sub' : 'Eng Sub on request'}
                </span>
              </button>
            </div>
          </div>

          {/* ACTIVE AUDIO STATUS & STREAM ACCESS */}
          <div>
            {isCurrentAudioAvailable ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-[#111218] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                      {activeAudio} Stream Available · 1080p FHD
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    {isMovie 
                      ? `Complete Full Movie in clean ${activeAudio} audio with zero ads.`
                      : `Episodes and merged batch drops are ready on AsiaFlix Telegram channel.`}
                  </p>
                </div>

                <a
                  href={currentAudioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>{isMovie ? 'Watch Full Movie Now' : `Open ${activeAudio} Post`}</span>
                </a>
              </div>
            ) : (
              /* COMING SOON / IN PREPARATION STATE FOR THIS TRACK */
              <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      ⏳ {activeAudio} Is Coming Soon / In Dubbing Room
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Episodes in <strong>{activeAudio}</strong> for "{drama.title}" are currently being dubbed or prepared for release.
                    </p>
                    {alternateActiveAudio && (
                      <div className="pt-1 flex items-center gap-2 text-xs">
                        <span className="text-zinc-400">Want to watch right now?</span>
                        <button
                          onClick={() => setActiveAudio(alternateActiveAudio)}
                          className="text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer"
                        >
                          Switch to {alternateActiveAudio} (Already Streaming!)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleDubSubscribe(activeAudio)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                      subscribedAudios[activeAudio]
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md'
                    }`}
                  >
                    {subscribedAudios[activeAudio] ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Subscribed for {activeAudio} Alert!</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        <span>🔔 Notify Me When {activeAudio} Drops</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

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

          {/* Details & Schedule Overview Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" />
                <span>Details & Runtime</span>
              </span>
              <p className="text-sm font-black text-white">
                {drama.details || (isMovie ? 'Feature Film 1080p' : '16 Episodes')}
              </p>
              <p className="text-[11px] text-zinc-400">
                Format: {isMovie ? 'Full Length Movie (Continuous Stream)' : 'Episodic VIP Series'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Release Schedule</span>
              </span>
              <p className="text-sm font-black text-amber-300">
                {drama.schedule && drama.schedule.trim() ? drama.schedule : 'All Drops Completed (Full Batch Live)'}
              </p>
              <p className="text-[11px] text-zinc-400">
                {drama.schedule && drama.schedule.trim() ? 'Episodes drop as per weekly schedule' : 'Instant binge-watch on Telegram'}
              </p>
            </div>
          </div>

          {/* Lead Cast Section */}
          {(drama.leadCast && drama.leadCast.length > 0) || (drama.cast && drama.cast.length > 0) ? (
            <div>
              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Lead Cast</h4>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
                {(drama.leadCast && drama.leadCast.length > 0 ? drama.leadCast : drama.cast).map((actor) => (
                  <span key={actor} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-bold flex items-center gap-1.5">
                    <span>🎭</span>
                    <span>{actor}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Hashtags Section */}
          {((drama.hashtags && drama.hashtags.length > 0) || (drama.tags && drama.tags.length > 0)) && (
            <div>
              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Series Hashtags & Topics</h4>
              <div className="flex flex-wrap gap-1.5">
                {(drama.hashtags && drama.hashtags.length > 0 ? drama.hashtags : drama.tags).map((tag) => (
                  <span 
                    key={tag} 
                    className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Synopsis & Storyline */}
          <div>
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Synopsis & Storyline</h4>
            <p className="text-sm text-zinc-300 leading-relaxed">{drama.synopsis}</p>
          </div>

          {/* Episodes List & Telegram Deep Links */}
          {!isMovie && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Episode Upload Packs & Direct Links</span>
                </h4>
                <span className="text-[11px] text-zinc-400">
                  Watched: {watchedEpisodes.length} episodes
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Main Full / Latest Pack */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] transition-all">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => onToggleEpisodeWatched(drama.id, 'all')}
                      className="text-zinc-400 hover:text-emerald-400 transition-colors shrink-0"
                      title={watchedEpisodes.includes('all') ? 'Mark as Unwatched' : 'Mark as Watched'}
                    >
                      {watchedEpisodes.includes('all') ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white truncate">
                          {drama.title} · {activeAudio} Master Pack
                        </span>
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded border border-amber-500/30">
                          {drama.details || 'Batch / Merged'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span className="text-red-400 font-bold">{activeAudio}</span>
                        <span>·</span>
                        <span className="text-zinc-400">1080p FHD Quality</span>
                        {drama.schedule && (
                          <>
                            <span>·</span>
                            <span className="text-amber-400">{drama.schedule}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isCurrentAudioAvailable ? (
                    <a
                      href={currentAudioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 px-3.5 py-2 rounded-lg bg-[#e50914] hover:bg-red-600 text-white text-xs font-black shadow-md hover:shadow-[0_0_15px_rgba(229,9,20,0.6)] transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Open Telegram</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => handleDubSubscribe(activeAudio)}
                      className="ml-3 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Alert Me</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
