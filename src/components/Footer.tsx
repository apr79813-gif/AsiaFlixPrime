import React, { useState } from 'react';
import { Send, Headphones, Film, ShieldCheck, Copy, Check, Globe } from 'lucide-react';

interface FooterProps {
  onOpenSupport: () => void;
  onOpenRequest: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport, onOpenRequest, onOpenAdmin }) => {
  const currentYear = new Date().getFullYear();
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText('https://asiaflixprime.pages.dev/');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <footer className="border-t border-white/[0.08] bg-[#06070a] text-zinc-400 py-12 relative z-30 pb-20 sm:pb-12 w-full">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col items-center text-center space-y-6">
        {/* Brand */}
        <a
          href="https://asiaflixprime.pages.dev/"
          className="flex items-center gap-2 text-white font-black text-xl tracking-tight hover:text-red-400 transition-colors"
        >
          <span className="text-[#e50914]">▶</span>
          <span>AsiaFlix Prime</span>
          <span className="text-zinc-500 text-xs font-semibold">VIP NETWORK 🐰</span>
        </a>

        <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl leading-relaxed">
          Non-commercial private community aggregator. All dramas and blockbuster movies are archived on encrypted cloud networks for fair-use streaming in clean Hindi Audio & 1080p FHD.
        </p>

        {/* Horizontal Links Row */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs sm:text-sm font-bold text-zinc-300">
          <button onClick={onOpenSupport} className="hover:text-[#e50914] transition-colors flex items-center gap-1.5 cursor-pointer">
            <Headphones className="w-4 h-4" />
            <span>Support & Help Desk</span>
          </button>
          <button onClick={onOpenRequest} className="hover:text-[#e50914] transition-colors flex items-center gap-1.5 cursor-pointer">
            <Film className="w-4 h-4" />
            <span>Request Drama</span>
          </button>
          <a
            href="https://t.me/+yJH68LvfrT9hZDVl"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#e50914] transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Official Telegram VIP</span>
          </a>
          <button
            onClick={handleCopyInvite}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Copy Official Portal Invite Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Invite Copied!' : 'Copy Invite Link'}</span>
          </button>
          <a
            href="https://asiaflixprime.pages.dev/"
            className="hover:text-sky-400 transition-colors flex items-center gap-1.5 text-zinc-400"
          >
            <Globe className="w-4 h-4" />
            <span>asiaflixprime.pages.dev</span>
          </a>
        </div>

        <div className="text-xs text-zinc-500 pt-4 border-t border-white/5 w-full flex flex-row items-center justify-between gap-3">
          <span>© {currentYear} AsiaFlix Prime Network · All Rights Reserved</span>
          <div className="flex items-center gap-3">
            <span>Crafted with Sakura Drift & VIP High-Speed Streams 🌸</span>
            <span className="text-zinc-700">·</span>
            <button
              onClick={onOpenAdmin}
              className="text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
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
