import React, { useEffect, useRef } from 'react';

export type ParticleMode = 'snow' | 'sakura' | 'embers' | 'off';

interface SakuraCanvasProps {
  enabled?: boolean;
  mode?: ParticleMode;
}

interface FallingParticle {
  x: number;
  y: number;
  size: number;
  vy: number;
  vxDrift: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  variant: 'primary' | 'secondary';
}

export const SakuraCanvas: React.FC<SakuraCanvasProps> = ({
  enabled = true,
  mode = 'snow',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || mode === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationId = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // 20 crisp particles gently falling from top to bottom
    const count = 20;
    const particles: FallingParticle[] = Array.from({ length: count }).map((_, i) => {
      let size = 4;
      if (mode === 'snow') {
        // 6-point snowflakes: 3px to 6px; Netflix-red micro-sparks: 2px
        size = i % 4 === 0 ? 2 : 3 + Math.random() * 3;
      } else if (mode === 'sakura') {
        // Crisp ruby-pink petals: 4px to 8px
        size = 4 + Math.random() * 4;
      } else if (mode === 'embers') {
        // Crisp diamond sparks: 2px to 4px
        size = 2 + Math.random() * 2;
      }

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size,
        vy: 0.65 + Math.random() * 0.85,
        vxDrift: (Math.random() - 0.5) * 0.25,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.015 + Math.random() * 0.02,
        swayAmp: 0.35 + Math.random() * 0.45,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.025,
        alpha: 0.55 + Math.random() * 0.35,
        variant: i % 4 === 0 ? 'secondary' : 'primary',
      };
    });

    const drawSnowCrystal = (p: FallingParticle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.variant === 'secondary') {
        // Tiny 2px glowing Netflix-red micro-spark
        ctx.shadowColor = '#e50914';
        ctx.shadowBlur = 5;
        ctx.fillStyle = `rgba(229, 9, 20, ${p.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        // Sharp 6-point geometric ice-crystal snowflake
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 4;
        ctx.strokeStyle = `rgba(224, 242, 254, ${p.alpha.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        const r = p.size;
        for (let k = 0; k < 3; k++) {
          const angle = (k * Math.PI) / 3;
          const dx = Math.cos(angle) * r;
          const dy = Math.sin(angle) * r;
          ctx.beginPath();
          ctx.moveTo(-dx, -dy);
          ctx.lineTo(dx, dy);
          ctx.stroke();
        }
        // Crisp center dot
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha.toFixed(2)})`;
        ctx.fillRect(-0.7, -0.7, 1.4, 1.4);
      }

      ctx.restore();
    };

    const drawSakuraPetal = (p: FallingParticle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(1, 0.75 + 0.25 * Math.cos(p.swayPhase));

      const color = p.variant === 'secondary' ? '#ffb7c5' : '#ff4d79';
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = color;

      // Crisp small 3D sakura petal shape
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.85, -s * 0.45, s * 0.7, s * 0.65, 0, s);
      ctx.bezierCurveTo(-s * 0.7, s * 0.65, -s * 0.85, -s * 0.45, 0, -s);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const drawEmberSpark = (p: FallingParticle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      const isGold = p.variant === 'secondary';
      ctx.shadowColor = isGold ? '#f59e0b' : '#e50914';
      ctx.shadowBlur = 5;
      ctx.fillStyle = isGold
        ? `rgba(245, 158, 11, ${p.alpha.toFixed(2)})`
        : `rgba(229, 9, 20, ${p.alpha.toFixed(2)})`;

      // Sharp diamond spark
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.25);
      ctx.lineTo(s * 0.85, 0);
      ctx.lineTo(0, s * 1.25);
      ctx.lineTo(-s * 0.85, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const renderFrame = (animate: boolean) => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (animate) {
          p.swayPhase += p.swaySpeed;
          p.y += p.vy;
          p.x += p.vxDrift + Math.sin(p.swayPhase) * p.swayAmp;
          p.rotation += p.rotSpeed;

          if (p.y > height + 14) {
            p.y = -14;
            p.x = Math.random() * width;
          }
          if (p.x < -14) p.x = width + 14;
          if (p.x > width + 14) p.x = -14;
        }

        if (mode === 'snow') {
          drawSnowCrystal(p);
        } else if (mode === 'sakura') {
          drawSakuraPetal(p);
        } else if (mode === 'embers') {
          drawEmberSpark(p);
        }
      }
    };

    if (prefersReducedMotion) {
      renderFrame(false);
    } else {
      const loop = () => {
        renderFrame(true);
        animationId = requestAnimationFrame(loop);
      };
      animationId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [enabled, mode]);

  if (!enabled || mode === 'off') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      aria-hidden="true"
    />
  );
};
