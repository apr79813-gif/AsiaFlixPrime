import React from 'react';

interface AnimatedChannelLogoProps {
  src: string;
  alt?: string;
}

export const AnimatedChannelLogo: React.FC<AnimatedChannelLogoProps> = ({
  src,
  alt = 'AsiaFlix Prime',
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '14px',
        zIndex: 25,
        pointerEvents: 'none',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
      className="select-none animate-logo-float-3d"
    >
      <div
        style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
        className="relative overflow-hidden"
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          style={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            opacity: 0.92,
            filter: 'drop-shadow(0 0 10px rgba(229, 9, 20, 0.55)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.85))',
          }}
          className="h-[28px] md:h-[40px] w-auto object-contain block"
        />
        <div
          aria-hidden="true"
          style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
          className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-logo-sheen"
        />
      </div>
    </div>
  );
};
