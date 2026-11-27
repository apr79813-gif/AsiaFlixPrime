import React from 'react';

interface AdultsOnlyBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const AdultsOnlyBadge: React.FC<AdultsOnlyBadgeProps> = ({
  size = 'sm',
  className = '',
}) => {
  const circleClasses =
    size === 'lg'
      ? 'w-8 h-8 text-[12px] border-[2.5px]'
      : size === 'md'
      ? 'w-6 h-6 text-[10px] border-[2.5px]'
      : size === 'xs'
      ? 'w-[22px] h-[22px] text-[9px] border-[2px]'
      : 'w-6 h-6 text-[10px] border-[2.5px]';

  const pillClasses =
    size === 'lg'
      ? 'pl-2.5 pr-2.5 py-1 -ml-1.5 text-[10px]'
      : size === 'md'
      ? 'pl-2 pr-2 py-0.5 -ml-1.5 text-[8.5px]'
      : size === 'xs'
      ? 'pl-2 pr-1.5 py-[2px] -ml-1.5 text-[7.5px]'
      : 'pl-2 pr-2 py-0.5 -ml-1.5 text-[8.5px]';

  return (
    <span
      className={`inline-flex items-center select-none pointer-events-none shrink-0 align-middle ${className}`}
      aria-label="18+ Adults Only"
      title="18+ Adults Only"
    >
      <span
        className={`relative z-10 bg-white text-black font-black rounded-full border-[#e50914] flex items-center justify-center leading-none shadow-[0_2px_8px_rgba(0,0,0,0.65)] tracking-tighter ${circleClasses}`}
      >
        18+
      </span>
      <span
        className={`bg-gradient-to-b from-[#7a0409] to-[#4a0205] border border-[#e50914] rounded-r-md flex flex-col justify-center leading-[1.02] shadow-[0_2px_8px_rgba(229,9,20,0.45)] font-black tracking-wider text-white uppercase ${pillClasses}`}
      >
        <span>ADULTS</span>
        <span>ONLY</span>
      </span>
    </span>
  );
};
