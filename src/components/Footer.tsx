import React from 'react';
import { Send, Headphones, Film, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenSupport: () => void;
  onOpenRequest: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport, onOpenRequest, onOpenAdmin }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.08] bg-[#06070a] text-zinc-400 py-12 px-4 sm:px-6 relative z-30 pb-24 sm:pb-12">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2 text-white font-black text-xl tracking-tight">
          <span className="text-[#e50914]">▶</span>
          <span>AsiaFlix Prime</span>
          <span className="text-zinc-500 text-xs font-semibold">VIP NETWORK 🐰</span>
        </div>

        <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
          Non-commercial private community aggregator. All dramas and blockbuster movies are archived on encrypted cloud networks for fair-use streaming in clean Hindi Audio & 1080p FHD.
        </p>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-zinc-300">
          <button onClick={onOpenSupport} className="hover:text-[#e50914] transition-colors flex items-center gap-1">
            <Headphones className="w-3.5 h-3.5" />
            <span>Support & Help Desk</span>
          </button>
          <button onClick={onOpenRequest} className="hover:text-[#e50914] transition-colors flex items-center gap-1">
            <Film className="w-3.5 h-3.5" />
            <span>Request Drama</span>
          </button>
          <a
            href="https://t.me/+yJH68LvfrT9hZDVl"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#e50914] transition-colors flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Official Telegram VIP</span>
          </a>
        </div>

        <div className="text-[11px] text-zinc-500 pt-4 border-t border-white/5 w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {currentYear} AsiaFlix Prime Network · All Rights Reserved</span>
          <div className="flex items-center gap-3">
            <span>Crafted with Sakura Drift & VIP High-Speed Streams 🌸</span>
            <span className="text-zinc-700">·</span>
            <button
              onClick={onOpenAdmin}
              className="text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 font-semibold"
              title="Admin Control Studio (Protected with PIN/Password)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
              <span>Admin Studio</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
