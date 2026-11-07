import React from 'react';
import { ReleaseNotification, DramaItem } from '../types/drama';
import { X, Bell, CheckCheck, Sparkles, Film, ArrowRight } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ReleaseNotification[];
  onMarkAllAsRead: () => void;
  onSelectNotification: (notif: ReleaseNotification) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111218] border-l border-white/10 h-full flex flex-col shadow-2xl animate-slide-left"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-[#ff2b54]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Release Alerts</h3>
                {unreadCount > 0 && (
                  <span className="bg-[#e50914] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Live updates on fresh episode drops</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 p-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-600 opacity-60" />
              <p className="text-sm font-bold text-zinc-300">No notifications yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                You will be notified whenever new Hindi dubbed episodes or movies drop!
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  onSelectNotification(notif);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  notif.isRead
                    ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05]'
                    : 'bg-gradient-to-r from-[#191114] to-[#12131b] hover:from-[#211419] hover:to-[#171824] border-red-500/30'
                }`}
              >
                {!notif.isRead && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#e50914] animate-pulse" />
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.05] text-red-400 shrink-0 mt-0.5">
                    {notif.type === 'fhd_remaster' ? (
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Film className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-white group-hover:text-red-400 transition-colors truncate">
                        {notif.title}
                      </h4>
                      {notif.audioType && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded shrink-0">
                          {notif.audioType}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-zinc-500">
                      <span>{notif.timestamp}</span>
                      <span className="text-zinc-400 flex items-center gap-0.5 group-hover:text-white transition-colors font-bold">
                        View Drama <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
