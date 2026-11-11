import React, { useState } from 'react';
import { DramaItem, WatchlistEntry, WatchlistStatus } from '../types/drama';
import { X, Bookmark, Trash2, ExternalLink, Film, Cloud, LogOut } from 'lucide-react';
import { syncUserAccountWithSupabase } from '../services/supabaseService';

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: WatchlistEntry[];
  allDramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
  onRemoveFromWatchlist: (dramaId: string) => void;
  onUpdateStatus: (dramaId: string, status: WatchlistStatus) => void;
  supabaseUser?: any | null;
  onUserChange?: (
    user: any | null,
    cloudWatchlist?: WatchlistEntry[],
    cloudWatchedEpisodesMap?: Record<string, (number | string)[]>
  ) => void;
  watchedEpisodesMap?: Record<string, (number | string)[]>;
}

export const WatchlistDrawer: React.FC<WatchlistDrawerProps> = ({
  isOpen,
  onClose,
  watchlist,
  allDramas,
  onSelectDrama,
  onRemoveFromWatchlist,
  onUpdateStatus,
  supabaseUser,
  onUserChange,
  watchedEpisodesMap = {},
}) => {
  const [activeTab, setActiveTab] = useState<'all' | WatchlistStatus>('all');
  const [showAuthCard, setShowAuthCard] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMsg, setAuthMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsAuthLoading(true);
    setAuthMsg(null);

    const res = await syncUserAccountWithSupabase(
      email,
      password,
      authMode,
      watchlist,
      watchedEpisodesMap
    );

    if (!res.success) {
      setAuthMsg({ text: res.error || 'Authentication failed', isError: true });
    } else {
      setAuthMsg({
        text: authMode === 'login' ? 'Signed in! Cloud sync active.' : 'Account created & synced across devices!',
        isError: false,
      });
      if (onUserChange) {
        onUserChange(res.user, res.watchlist, res.watchedEpisodesMap);
      }
      setTimeout(() => setShowAuthCard(false), 1500);
    }
    setIsAuthLoading(false);
  };

  const handleSignOut = () => {
    if (onUserChange) onUserChange(null);
    setAuthMsg({ text: 'Signed out successfully.', isError: false });
    setTimeout(() => setAuthMsg(null), 2000);
  };

  // Match each watchlist entry with its actual DramaItem from the catalog
  const resolvedItems = watchlist
    .map((entry) => {
      const drama = allDramas.find(
        (d) =>
          d.id === entry.dramaId ||
          d.id === 'sheet-' + entry.dramaId ||
          (entry.dramaId && d.id.replace('sheet-', '') === entry.dramaId.replace('sheet-', '')) ||
          (entry.dramaTitle && d.title.toLowerCase() === entry.dramaTitle.toLowerCase())
      );
      return drama ? { entry, drama } : null;
    })
    .filter((item): item is { entry: WatchlistEntry; drama: DramaItem } => item !== null);

  const filteredItems = resolvedItems.filter((item) => {
    if (activeTab === 'all') return true;
    return item.entry.status === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111218] border-l border-white/10 h-full flex flex-col shadow-2xl animate-slide-left"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Bookmark className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">My Watchlist</h3>
              <p className="text-xs text-zinc-400">Track your favorite K-Dramas & Movies</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud Sync Bar */}
        <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cloud className={`w-3.5 h-3.5 ${supabaseUser ? 'text-emerald-400' : 'text-zinc-500'}`} />
            {supabaseUser ? (
              <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
                <span>Cloud Sync: {supabaseUser.email}</span>
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400 font-medium">Guest Mode (Device Storage)</span>
            )}
          </div>

          {supabaseUser ? (
            <button
              onClick={handleSignOut}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthCard(!showAuthCard)}
              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              {showAuthCard ? 'Hide Form' : '☁️ Cloud Sync (Multi-Device)'}
            </button>
          )}
        </div>

        {/* Auth Dropdown Form */}
        {showAuthCard && !supabaseUser && (
          <form onSubmit={handleAuthSubmit} className="p-3.5 bg-black/50 border-b border-white/10 space-y-2.5 text-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-[11px]">
                {authMode === 'login' ? 'Sign In to Sync' : 'Create Free Cloud Account'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthMsg(null);
                }}
                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                {authMode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
              </button>
            </div>

            {authMsg && (
              <div className={`p-2 rounded-lg text-[10px] font-semibold ${authMsg.isError ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                {authMsg.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-[11px] outline-none focus:border-emerald-500"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-[11px] outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-1.5 rounded-lg bg-[#10b981] hover:bg-emerald-600 text-white font-black text-[11px] shadow transition-all cursor-pointer"
            >
              {isAuthLoading ? 'Processing...' : authMode === 'login' ? 'Sign In & Sync' : 'Sign Up & Sync Watchlist'}
            </button>
          </form>
        )}

        {/* Status Filter Tabs (Accurately counts matched catalog dramas) */}
        <div className="p-3 border-b border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all' ? 'bg-[#e50914] text-white shadow-sm' : 'bg-white/[0.04] text-zinc-400 hover:text-white'
            }`}
          >
            All ({resolvedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('watching')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'watching' ? 'bg-[#e50914] text-white shadow-sm' : 'bg-white/[0.04] text-zinc-400 hover:text-white'
            }`}
          >
            ▶️ Watching ({resolvedItems.filter((i) => i.entry.status === 'watching').length})
          </button>
          <button
            onClick={() => setActiveTab('want_to_watch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'want_to_watch' ? 'bg-[#e50914] text-white shadow-sm' : 'bg-white/[0.04] text-zinc-400 hover:text-white'
            }`}
          >
            🔖 Want ({resolvedItems.filter((i) => i.entry.status === 'want_to_watch').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'completed' ? 'bg-[#e50914] text-white shadow-sm' : 'bg-white/[0.04] text-zinc-400 hover:text-white'
            }`}
          >
            ✅ Done ({resolvedItems.filter((i) => i.entry.status === 'completed').length})
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <Film className="w-12 h-12 mx-auto mb-3 text-zinc-600 opacity-60" />
              <p className="text-sm font-bold text-zinc-300">No dramas in this list yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Explore the homepage rows and tap the bookmark icon on any drama to add it here!
              </p>
            </div>
          ) : (
            filteredItems.map(({ entry, drama }) => {
              const watchedCount = entry.watchedEpisodes?.length || 0;
              const totalCount = drama.totalEpisodes || drama.episodes.length || 1;
              const progressPct = Math.min(100, Math.round((watchedCount / totalCount) * 100));

              return (
                <div
                  key={entry.dramaId}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all flex gap-3 group"
                >
                  <div 
                    onClick={() => {
                      onSelectDrama(drama);
                      onClose();
                    }}
                    className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 bg-zinc-900 cursor-pointer"
                  >
                    <img
                      src={drama.poster}
                      alt={drama.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          onClick={() => {
                            onSelectDrama(drama);
                            onClose();
                          }}
                          className="text-xs font-black text-white hover:text-red-400 transition-colors line-clamp-1 cursor-pointer"
                        >
                          {drama.title}
                        </h4>

                        <button
                          onClick={() => onRemoveFromWatchlist(entry.dramaId)}
                          className="text-zinc-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                        <span className="text-red-400 font-bold">{drama.defaultAudio}</span>
                        <span>·</span>
                        <span>{drama.releaseYear}</span>
                      </div>

                      {/* Episode Progress Bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400 mb-1">
                          <span>Progress</span>
                          <span className="text-sky-400">{watchedCount} / {totalCount} Ep</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#e50914] to-[#ff2b54] rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Switcher */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5">
                      <select
                        value={entry.status}
                        onChange={(e) => onUpdateStatus(entry.dramaId, e.target.value as WatchlistStatus)}
                        className="bg-black/60 border border-white/10 text-zinc-300 text-[10px] font-bold rounded px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value="want_to_watch">🔖 Want to Watch</option>
                        <option value="watching">▶️ Currently Watching</option>
                        <option value="completed">✅ Completed</option>
                        <option value="dropped">❌ Dropped</option>
                      </select>

                      <button
                        onClick={() => {
                          onSelectDrama(drama);
                          onClose();
                        }}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Episodes</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
