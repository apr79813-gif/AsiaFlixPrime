import React from 'react';
import { Radio } from 'lucide-react';

interface MarqueeNoticeProps {
  noticeText: string;
  isLiveSynced?: boolean;
}

export const MarqueeNotice: React.FC<MarqueeNoticeProps> = ({ noticeText, isLiveSynced = true }) => {
  return (
    <div className="relative z-40 bg-[#0c0d13] border-b border-white/[0.08] text-[14px] sm:text-[15px] font-extrabold py-2.5 px-4 overflow-hidden flex items-center shadow-inner">
      <div className="flex items-center gap-1.5 bg-[#e50914] text-white font-black text-[13px] tracking-wider uppercase px-3 py-1 rounded shrink-0 mr-3.5 shadow-sm">
        <Radio className="w-3.5 h-3.5 animate-pulse" />
        <span>Live VIP Notice</span>
      </div>

      <div className="overflow-hidden flex-1 relative whitespace-nowrap">
        <div className="animate-marquee inline-flex gap-12 text-zinc-200 font-extrabold text-[14px] sm:text-[15px]">
          <span className="flex items-center gap-2">
            🌸 <strong className="text-white">Weekend Mega Lineup is Active!</strong> New Hindi Dubbed Episodes Dropping Sat & Sun 7:00 PM IST • Zero Ads • 100% Free VIP Network 🌸
          </span>
          <span className="flex items-center gap-2">
            ✨ {noticeText || 'Direct Telegram uploads in clean 1080p FHD & Crystal Hindi Dubbed tracks.'} ✨
          </span>
          <span className="flex items-center gap-2">
            ⚡ All links permanent on Private Channel to avoid copyright crawlers • Zero token links!
          </span>
        </div>
      </div>

      {isLiveSynced && (
        <div className="hidden sm:flex items-center gap-2 text-zinc-300 text-[13px] font-bold shrink-0 ml-3 pl-3 border-l border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-400">Cloud Sync Active</span>
        </div>
      )}
    </div>
  );
};
