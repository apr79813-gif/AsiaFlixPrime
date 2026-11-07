import React from 'react';
import { ShieldCheck, Zap, MessageSquare, Lock, HeartHandshake } from 'lucide-react';

export const PolicySafetySection: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-16">
      <div className="p-6 sm:p-10 rounded-3xl bg-[#0d0e14] border border-white/[0.08] relative overflow-hidden shadow-2xl">
        {/* Subtle accent glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mb-8 relative z-10">
          <div className="text-[#e50914] text-xs font-black tracking-widest uppercase mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Channel Policy & Fair-Use Safety 🐾</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            Why is AsiaFlix Prime Kept as a 100% Private VIP Network?
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
            Unlike public channels that constantly suffer from automated link bans, vanishing video files, and bot crawlers, AsiaFlix Prime stays <strong>100% Private</strong>. This ensures that every episode you watch stays permanently available with clean direct downloads and zero link-shortener redirects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#ff2b54] flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white mb-1.5">Permanent Episode Links</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Videos are archived on encrypted cloud channels. No dead links, no deleted posts, and no broken episode series.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white mb-1.5">Zero Pop-ups or Link Tokens</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We never use spammy url-shorteners, captchas, or adult ad tokens. Direct Telegram download links open in 1 click.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white mb-1.5">Direct Telegram Bot Queue</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Need a missing K-Drama or audio fix? Submit via our Telegram Bot and get direct replies from the admin team.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
