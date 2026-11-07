import React, { useEffect, useState } from 'react';

interface SakuraCanvasProps {
  enabled: boolean;
}

export const SakuraCanvas: React.FC<SakuraCanvasProps> = ({ enabled }) => {
  const [petals, setPetals] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    if (!enabled) {
      setPetals([]);
      return;
    }
    const items = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 98,
      size: Math.random() * 7 + 7,
      duration: Math.random() * 8 + 8,
      delay: Math.random() * 5,
    }));
    setPetals(items);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute animate-sakura rounded-[150%_0_150%_0] opacity-40 shadow-sm"
          style={{
            left: `${p.left}vw`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'radial-gradient(circle, #ffb7c5 0%, #ff2b54 80%)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
