import React, { useEffect, useRef, useState } from 'react';

export const OFFICIAL_WATERMARK_LOGO_URL = '/logo-watermark.png';
export const FALLBACK_RAW_LOGO_URL =
  'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png';

const transparentLogoCache = new Map<string, string>();
const transparentLogoInflight = new Map<string, Promise<string>>();

export async function getTransparentLogoUrl(rawUrl?: string): Promise<string> {
  const candidate = (rawUrl || '').trim() || OFFICIAL_WATERMARK_LOGO_URL;
  const cached = transparentLogoCache.get(candidate);
  if (cached) return cached;
  const inflight = transparentLogoInflight.get(candidate);
  if (inflight) return inflight;

  const task = new Promise<string>((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(candidate);
      return;
    }

    const attemptLoad = (src: string, allowProxy: boolean, allowFallbackUrl: boolean) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 256;
          const h = img.naturalHeight || img.height || 256;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(candidate);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const maxChannel = Math.max(r, g, b);
            if (maxChannel < 45) {
              data[i + 3] = 0;
            } else if (maxChannel < 75) {
              data[i + 3] = Math.round(((maxChannel - 45) / 30) * data[i + 3]);
            }
          }
          ctx.putImageData(imageData, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          transparentLogoCache.set(candidate, pngUrl);
          resolve(pngUrl);
        } catch {
          if (allowProxy) {
            attemptLoad(`/api/image-proxy?url=${encodeURIComponent(candidate)}`, false, allowFallbackUrl);
          } else if (allowFallbackUrl && candidate !== FALLBACK_RAW_LOGO_URL) {
            attemptLoad(FALLBACK_RAW_LOGO_URL, true, false);
          } else {
            resolve(candidate);
          }
        }
      };
      img.onerror = () => {
        if (allowProxy) {
          attemptLoad(`/api/image-proxy?url=${encodeURIComponent(candidate)}`, false, allowFallbackUrl);
        } else if (allowFallbackUrl && candidate !== FALLBACK_RAW_LOGO_URL) {
          attemptLoad(FALLBACK_RAW_LOGO_URL, true, false);
        } else {
          resolve(candidate);
        }
      };
      img.src = src;
    };

    attemptLoad(candidate, true, true);
  }).finally(() => {
    transparentLogoInflight.delete(candidate);
  });

  transparentLogoInflight.set(candidate, task);
  return task;
}

export function useTransparentLogo(rawUrl?: string): string {
  const target = (rawUrl || '').trim() || OFFICIAL_WATERMARK_LOGO_URL;
  const [resolved, setResolved] = useState<string>(() => transparentLogoCache.get(target) || target);

  useEffect(() => {
    let cancelled = false;
    const cached = transparentLogoCache.get(target);
    if (cached) {
      setResolved(cached);
      return;
    }
    setResolved(target);
    void getTransparentLogoUrl(target).then((png) => {
      if (!cancelled) setResolved(png);
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  return resolved;
}

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
        top: '14px',
        right: '18px',
        zIndex: 28,
        pointerEvents: 'none',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        backdropFilter: 'none',
      }}
      className="select-none"
    >
      <style>{`
        @keyframes afpWatermarkFloat3D {
          0%, 100% {
            transform: perspective(700px) translateY(-2px) rotateY(-4deg) scale(1);
          }
          50% {
            transform: perspective(700px) translateY(2px) rotateY(4deg) scale(1.03);
          }
        }
        @keyframes afpWatermarkShimmer {
          0% {
            transform: translateX(-160%) skewX(-24deg);
            opacity: 0;
          }
          18% {
            opacity: 0.9;
          }
          52% {
            transform: translateX(220%) skewX(-24deg);
            opacity: 0;
          }
          100% {
            transform: translateX(220%) skewX(-24deg);
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          backdropFilter: 'none',
          animation: 'afpWatermarkFloat3D 4.4s ease-in-out infinite',
        }}
        className="relative"
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          style={{
            background: 'transparent',
            mixBlendMode: 'screen',
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'none',
            opacity: 0.95,
            filter:
              'drop-shadow(0 2px 5px rgba(0,0,0,0.95)) drop-shadow(0 0 14px rgba(255,42,133,0.75))',
          }}
          className="h-[46px] md:h-[68px] lg:h-[74px] w-auto object-contain block"
        />
        {/* Alpha-masked diagonal light-shimmer gleaming strictly over opaque logo contours */}
        <div
          aria-hidden="true"
          style={{
            WebkitMaskImage: `url("${src}")`,
            maskImage: `url("${src}")`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'none',
          }}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            style={{
              background:
                'linear-gradient(105deg, transparent 15%, rgba(255,255,255,0.75) 48%, rgba(255,184,0,0.45) 56%, transparent 85%)',
              animation: 'afpWatermarkShimmer 4.5s ease-in-out infinite',
            }}
            className="absolute inset-y-0 -left-1/3 w-[65%]"
          />
        </div>
      </div>
    </div>
  );
};

export interface IntroAudioHandle {
  stop: () => void;
}

/**
 * Synthesizes an 8-second Netflix-style theatrical "TUDUM" & Prism Harmonic audio score
 * using WebAudio API. Must be called synchronously inside a user click gesture for instant playback.
 */
export function startAsiaFlixIntroAudio(): IntroAudioHandle {
  if (typeof window === 'undefined') {
    return { stop: () => {} };
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return { stop: () => {} };
  }

  let stopped = false;
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  const activeTimers: number[] = [];

  try {
    ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.25;

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.88, ctx.currentTime);
    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    const t0 = ctx.currentTime;

    // Warm saturation wave-shaper for cinema sub-bass punch
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    shaper.curve = curve;

    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(220, t0);
    shaper.connect(subFilter);
    subFilter.connect(masterGain);

    const triggerSubImpact = (startOffset: number, peakGain: number, decaySec: number) => {
      if (!ctx) return;
      const start = t0 + startOffset;

      const oscMain = ctx.createOscillator();
      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(65, start);
      oscMain.frequency.exponentialRampToValueAtTime(32, start + Math.min(0.45, decaySec));

      const oscSubBody = ctx.createOscillator();
      oscSubBody.type = 'triangle';
      oscSubBody.frequency.setValueAtTime(98, start);
      oscSubBody.frequency.exponentialRampToValueAtTime(48, start + 0.24);

      const impactGain = ctx.createGain();
      impactGain.gain.setValueAtTime(0.0001, start);
      impactGain.gain.linearRampToValueAtTime(peakGain, start + 0.012);
      impactGain.gain.exponentialRampToValueAtTime(0.0001, start + decaySec);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.0001, start);
      bodyGain.gain.linearRampToValueAtTime(peakGain * 0.28, start + 0.008);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);

      oscMain.connect(impactGain);
      oscSubBody.connect(bodyGain);
      impactGain.connect(shaper);
      bodyGain.connect(shaper);

      oscMain.start(start);
      oscSubBody.start(start);
      oscMain.stop(start + decaySec + 0.05);
      oscSubBody.stop(start + 0.3);
    };

    // Two punchy theater sub-bass drum impacts at 0.1s and 0.38s
    triggerSubImpact(0.1, 0.85, 0.44);
    triggerSubImpact(0.38, 1.05, 1.35);

    // Lush shimmering cinematic harmonic chord (D3, A3, F#4, A4, D5) from 0.7s to 5.5s
    const chordStart = t0 + 0.7;
    const chordEnd = t0 + 6.9;

    const padBus = ctx.createGain();
    padBus.gain.setValueAtTime(0.0001, chordStart);
    padBus.gain.linearRampToValueAtTime(0.07, chordStart + 0.7);
    padBus.gain.linearRampToValueAtTime(0.24, t0 + 3.4);
    padBus.gain.linearRampToValueAtTime(0.16, t0 + 5.5);
    padBus.gain.exponentialRampToValueAtTime(0.0001, chordEnd);

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.Q.value = 1.6;
    padFilter.frequency.setValueAtTime(260, chordStart);
    padFilter.frequency.exponentialRampToValueAtTime(3200, t0 + 3.6);
    padFilter.frequency.exponentialRampToValueAtTime(1100, t0 + 6.5);

    // Stereo reverb delay network
    const delayL = ctx.createDelay(1.0);
    delayL.delayTime.value = 0.23;
    const delayR = ctx.createDelay(1.0);
    delayR.delayTime.value = 0.37;
    const fbL = ctx.createGain();
    fbL.gain.value = 0.36;
    const fbR = ctx.createGain();
    fbR.gain.value = 0.34;
    const verbDamp = ctx.createBiquadFilter();
    verbDamp.type = 'lowpass';
    verbDamp.frequency.value = 2100;

    padBus.connect(padFilter);
    padFilter.connect(masterGain);
    padFilter.connect(delayL);
    padFilter.connect(delayR);
    delayL.connect(verbDamp);
    delayR.connect(verbDamp);
    verbDamp.connect(masterGain);
    delayL.connect(fbL);
    fbL.connect(delayR);
    delayR.connect(fbR);
    fbR.connect(delayL);

    const chordFreqs = [146.83, 220.0, 369.99, 440.0, 587.33]; // D3, A3, F#4, A4, D5
    chordFreqs.forEach((freq, idx) => {
      if (!ctx) return;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = idx === 0 ? 0.28 : 0.16;

      if (typeof ctx.createStereoPanner === 'function') {
        const pan = ctx.createStereoPanner();
        pan.pan.value = (idx - 2) * 0.28;
        voiceGain.connect(pan);
        pan.connect(padBus);
      } else {
        voiceGain.connect(padBus);
      }

      const sine = ctx.createOscillator();
      sine.type = 'sine';
      sine.frequency.setValueAtTime(freq, chordStart);

      const sawA = ctx.createOscillator();
      sawA.type = 'sawtooth';
      sawA.frequency.setValueAtTime(freq, chordStart);
      sawA.detune.setValueAtTime(-7, chordStart);

      const sawB = ctx.createOscillator();
      sawB.type = 'sawtooth';
      sawB.frequency.setValueAtTime(freq, chordStart);
      sawB.detune.setValueAtTime(7, chordStart);

      const sawMix = ctx.createGain();
      sawMix.gain.value = 0.35;

      sine.connect(voiceGain);
      sawA.connect(sawMix);
      sawB.connect(sawMix);
      sawMix.connect(voiceGain);

      sine.start(chordStart);
      sawA.start(chordStart);
      sawB.start(chordStart);
      sine.stop(chordEnd + 0.05);
      sawA.stop(chordEnd + 0.05);
      sawB.stop(chordEnd + 0.05);
    });

    // Crisp crystalline whoosh & harmonic chime at 7.2s
    const whooshStart = t0 + 6.95;
    const whooshEnd = t0 + 7.98;
    const noiseLen = Math.floor(ctx.sampleRate * 1.1);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.Q.value = 2.4;
    whooshFilter.frequency.setValueAtTime(420, whooshStart);
    whooshFilter.frequency.exponentialRampToValueAtTime(5600, t0 + 7.35);
    whooshFilter.frequency.exponentialRampToValueAtTime(1600, whooshEnd);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.0001, whooshStart);
    whooshGain.gain.linearRampToValueAtTime(0.32, t0 + 7.26);
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, whooshEnd);

    noiseSrc.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(masterGain);
    noiseSrc.start(whooshStart);
    noiseSrc.stop(whooshEnd);

    // High crystalline chime at 7.2s
    [880.0, 1174.66].forEach((freq) => {
      if (!ctx || !masterGain) return;
      const bell = ctx.createOscillator();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(freq, t0 + 7.18);
      const bellGain = ctx.createGain();
      bellGain.gain.setValueAtTime(0.0001, t0 + 7.18);
      bellGain.gain.linearRampToValueAtTime(0.08, t0 + 7.24);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.98);
      bell.connect(bellGain);
      bellGain.connect(masterGain);
      bell.start(t0 + 7.18);
      bell.stop(t0 + 8.0);
    });

    const autoCloseId = window.setTimeout(() => {
      if (!stopped && ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 8400);
    activeTimers.push(autoCloseId);
  } catch {
    // WebAudio blocked or unsupported — fail silently
  }

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      activeTimers.forEach((id) => window.clearTimeout(id));
      if (ctx && masterGain && ctx.state !== 'closed') {
        try {
          const now = ctx.currentTime;
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
          window.setTimeout(() => {
            ctx?.close().catch(() => {});
          }, 130);
        } catch {
          ctx.close().catch(() => {});
        }
      }
    },
  };
}

interface AsiaFlixCinematicIntroProps {
  logoSrc: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const AsiaFlixCinematicIntro: React.FC<AsiaFlixCinematicIntroProps> = ({
  logoSrc,
  onComplete,
  onSkip,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 1280, h: 720 });
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    const syncCanvasDimensions = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const parentRect = container?.parentElement?.getBoundingClientRect();
      const fallbackW = Math.max(320, parentRect?.width || window.innerWidth || 1280);
      const cssW = rect.width >= 32 ? rect.width : fallbackW;
      const cssH = rect.height >= 18 ? rect.height : Math.round((cssW * 9) / 16);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.round(cssW * dpr));
      const h = Math.max(180, Math.round(cssH * dpr));
      canvasSizeRef.current = { w, h };
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    syncCanvasDimensions();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => syncCanvasDimensions());
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', syncCanvasDimensions);

    const startMs = performance.now();
    let rafId = 0;

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    };

    const hardTimeoutId = window.setTimeout(finish, 8000);

    const renderFrame = (now: number) => {
      const t = Math.min(8.0, (now - startMs) / 1000);
      setElapsedSec(t);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w =
          rect.width >= 32
            ? Math.max(320, Math.round(rect.width * dpr))
            : canvasSizeRef.current.w;
        const h =
          rect.height >= 18
            ? Math.max(180, Math.round(rect.height * dpr))
            : canvasSizeRef.current.h;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.clearRect(0, 0, w, h);
          const cx = w * 0.5;
          const cy = h * 0.5;
          const minDim = Math.min(w, h);

          // Additive cinema light blending
          ctx.globalCompositeOperation = 'lighter';

          // PHASE 1 (0.0s - 2.0s, tail to 2.5s): Horizontal Crimson-Cyan Anamorphic Lens Flare & Ignition
          if (t < 2.55) {
            const p1 = Math.min(1, t / 2.0);
            const fade1 = t > 1.8 ? Math.max(0, 1 - (t - 1.8) / 0.75) : 1;
            const flareSweepX = cx + (p1 - 0.45) * w * 0.65;

            const coreR = minDim * (0.08 + Math.sin(p1 * Math.PI * 0.65) * 0.36);
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
            coreGrad.addColorStop(
              0,
              `rgba(255, 255, 255, ${0.76 * fade1 * Math.sin(Math.min(1, p1 * 1.15) * Math.PI)})`
            );
            coreGrad.addColorStop(0.24, `rgba(0, 242, 254, ${0.46 * fade1})`);
            coreGrad.addColorStop(0.55, `rgba(229, 9, 20, ${0.42 * fade1})`);
            coreGrad.addColorStop(1, 'rgba(2, 2, 5, 0)');
            ctx.fillStyle = coreGrad;
            ctx.fillRect(0, 0, w, h);

            const cyanW = w * (0.48 + p1 * 0.52);
            const cyanH = Math.max(3 * dpr, minDim * 0.036 * (1 - p1 * 0.25));
            const cyanGrad = ctx.createLinearGradient(
              flareSweepX - cyanW * 0.5,
              cy,
              flareSweepX + cyanW * 0.5,
              cy
            );
            cyanGrad.addColorStop(0, 'rgba(0, 242, 254, 0)');
            cyanGrad.addColorStop(0.35, `rgba(0, 242, 254, ${0.44 * fade1})`);
            cyanGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.9 * fade1})`);
            cyanGrad.addColorStop(0.65, `rgba(255, 42, 133, ${0.46 * fade1})`);
            cyanGrad.addColorStop(1, 'rgba(229, 9, 20, 0)');

            ctx.save();
            ctx.fillStyle = cyanGrad;
            ctx.beginPath();
            ctx.ellipse(flareSweepX, cy, cyanW * 0.5, cyanH, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(225, 252, 255, ${0.88 * fade1})`;
            ctx.fillRect(cx - w * 0.48, cy - 1.2 * dpr, w * 0.96, 2.4 * dpr);

            const crimGrad = ctx.createLinearGradient(cx - w * 0.46, cy, cx + w * 0.46, cy);
            crimGrad.addColorStop(0, 'rgba(229, 9, 20, 0)');
            crimGrad.addColorStop(0.5, `rgba(255, 42, 133, ${0.56 * fade1})`);
            crimGrad.addColorStop(1, 'rgba(229, 9, 20, 0)');
            ctx.fillStyle = crimGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w * 0.48, cyanH * 2.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // PHASE 2 (1.8s - 6.6s): Rotating Volumetric Crimson/Magenta Aurora God-Rays Behind Emblem (Zero Vertical/Pencil Stripes)
          if (t >= 1.7 && t < 7.2) {
            const enter2 = Math.min(1, (t - 1.7) / 0.65);
            const exit2 = t > 6.1 ? Math.max(0, 1 - (t - 6.1) / 1.1) : 1;
            const alpha2 = enter2 * exit2;
            const pulse = 0.84 + 0.16 * Math.sin(t * 2.2);

            const auraGrad = ctx.createRadialGradient(cx, cy, minDim * 0.02, cx, cy, minDim * 0.6);
            auraGrad.addColorStop(0, `rgba(255, 42, 133, ${0.38 * alpha2 * pulse})`);
            auraGrad.addColorStop(0.38, `rgba(229, 9, 20, ${0.28 * alpha2 * pulse})`);
            auraGrad.addColorStop(0.7, `rgba(121, 40, 202, ${0.14 * alpha2})`);
            auraGrad.addColorStop(1, 'rgba(2, 2, 5, 0)');
            ctx.fillStyle = auraGrad;
            ctx.fillRect(0, 0, w, h);

            ctx.save();
            ctx.translate(cx, cy);
            for (let b = 0; b < 14; b++) {
              const angle = (b / 14) * Math.PI * 2 + t * 0.12;
              const rayLen = minDim * (0.58 + (b % 3) * 0.12);
              const raySpread = minDim * (0.048 + (b % 2) * 0.024);
              ctx.save();
              ctx.rotate(angle);
              const rayGrad = ctx.createLinearGradient(0, 0, rayLen, 0);
              rayGrad.addColorStop(
                0,
                b % 2 === 0
                  ? `rgba(255, 42, 133, ${0.24 * alpha2 * pulse})`
                  : `rgba(229, 9, 20, ${0.2 * alpha2 * pulse})`
              );
              rayGrad.addColorStop(
                0.5,
                b % 3 === 0 ? `rgba(121, 40, 202, ${0.09 * alpha2})` : `rgba(255, 184, 0, ${0.06 * alpha2})`
              );
              rayGrad.addColorStop(1, 'rgba(2, 2, 5, 0)');
              ctx.fillStyle = rayGrad;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(rayLen, -raySpread);
              ctx.lineTo(rayLen, raySpread);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
            ctx.restore();
          }

          ctx.globalCompositeOperation = 'source-over';
        }
      }

      if (t < 8.0) {
        rafId = window.requestAnimationFrame(renderFrame);
      } else {
        finish();
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', syncCanvasDimensions);
      window.clearTimeout(hardTimeoutId);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Smooth 3-Phase Timeline (No stripes — Zoom forward & seamless cross-fade at 6.2s -> 8.0s)
  let logoOpacity = 0;
  let logoScale = 0.84;
  let logoTiltY = 0;
  let overlayOpacity = 1;

  if (elapsedSec < 2.0) {
    // Phase 1 (0.0s - 2.0s): Lens flare ignition -> logo begins smooth fade-in around 1.15s
    const emerge = Math.max(0, Math.min(1, (elapsedSec - 1.1) / 0.9));
    const eased = 1 - Math.pow(1 - emerge, 3);
    logoOpacity = eased;
    logoScale = 0.84 + eased * 0.08;
    logoTiltY = (1 - eased) * -9;
  } else if (elapsedSec < 6.2) {
    // Phase 2 (2.0s - 6.2s): 3D Official Logo Emergence with Warm Crimson Aurora & Metallic Sweep
    const p2 = (elapsedSec - 2.0) / 4.2;
    const smooth2 = 1 - Math.pow(1 - p2, 2);
    logoOpacity = 1;
    logoScale = 0.92 + smooth2 * 0.14;
    logoTiltY = Math.sin(p2 * Math.PI * 1.35) * 4.5;
  } else {
    // Phase 3 (6.2s - 8.0s): Logo zooms forward toward camera & cross-fades cleanly into video/thumbnail
    const p3 = Math.min(1, (elapsedSec - 6.2) / 1.8);
    const easedZoom = 1 - Math.pow(1 - p3, 2);
    logoScale = 1.06 + easedZoom * 2.1;
    logoOpacity = Math.max(0, 1 - p3 * 1.05);
    const fadeP = Math.max(0, Math.min(1, (elapsedSec - 6.6) / 1.4));
    overlayOpacity = 1 - fadeP;
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: '#020205',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: overlayOpacity,
        transition: 'opacity 180ms ease-out',
      }}
      className="select-none"
    >
      <style>{`
        @keyframes afpIntroBeamSweep {
          0% {
            transform: translateX(-160%) skewX(-24deg);
            opacity: 0;
          }
          20% {
            opacity: 0.95;
          }
          58% {
            transform: translateX(220%) skewX(-24deg);
            opacity: 0;
          }
          100% {
            transform: translateX(220%) skewX(-24deg);
            opacity: 0;
          }
        }
        @keyframes afpCssFlarePulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.06);
          }
        }
      `}</style>

      {/* Instant GPU CSS Volumetric Crimson/Cyan Backdrop Layer (guarantees visibility on frame 0 even before canvas ticks) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            elapsedSec < 2.0
              ? 'radial-gradient(ellipse 75% 18% at 50% 50%, rgba(0,242,254,0.28) 0%, rgba(229,9,20,0.34) 42%, rgba(2,2,5,0) 78%)'
              : 'radial-gradient(circle at 50% 50%, rgba(255,42,133,0.34) 0%, rgba(229,9,20,0.24) 36%, rgba(121,40,202,0.12) 60%, rgba(2,2,5,0) 80%)',
          animation: 'afpCssFlarePulse 3.2s ease-in-out infinite',
        }}
      />

      {/* Canvas 60fps Volumetric Light Engine */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full block"
      />

      {/* Single Official Transparent Logo (ZERO duplicate HTML PRIME text, ZERO vertical color stripes) */}
      <div
        style={{
          position: 'relative',
          zIndex: 42,
          opacity: logoOpacity,
          transform: `perspective(1000px) rotateY(${logoTiltY.toFixed(2)}deg) scale(${logoScale.toFixed(3)})`,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
        className="flex items-center justify-center pointer-events-none"
      >
        <div className="relative flex items-center justify-center">
          <img
            src={logoSrc}
            alt="AsiaFlix Prime"
            referrerPolicy="no-referrer"
            style={{
              height: 'clamp(115px, 19vw, 190px)',
              width: 'auto',
              background: 'transparent',
              mixBlendMode: 'screen',
              border: 'none',
              boxShadow: 'none',
              filter:
                'drop-shadow(0 0 26px rgba(255,42,133,0.72)) drop-shadow(0 4px 18px rgba(0,0,0,0.96))',
            }}
            className="object-contain block"
          />
          {elapsedSec >= 2.0 && elapsedSec < 6.2 && (
            <div
              aria-hidden="true"
              style={{
                WebkitMaskImage: `url("${logoSrc}")`,
                maskImage: `url("${logoSrc}")`,
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div
                style={{
                  background:
                    'linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.95) 48%, rgba(255,184,0,0.6) 56%, transparent 88%)',
                  animation: 'afpIntroBeamSweep 2.3s ease-in-out infinite',
                }}
                className="absolute inset-y-0 -left-1/3 w-[65%]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sleek Glass Skip Intro Pill after 1.5s */}
      {elapsedSec >= 1.5 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          style={{
            position: 'absolute',
            bottom: '18px',
            right: '18px',
            zIndex: 45,
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '11px',
          }}
          className="px-3.5 py-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/15 font-bold tracking-wide transition-all cursor-pointer"
        >
          Skip Intro ⏭
        </button>
      )}
    </div>
  );
};

interface AppLaunchSplashProps {
  logoUrl?: string;
  onComplete: () => void;
}

export const AppLaunchSplash: React.FC<AppLaunchSplashProps> = ({
  logoUrl,
  onComplete,
}) => {
  const transparentLogo = useTransparentLogo(logoUrl);
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const completedRef = useRef(false);

  const finishSplash = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setPhase('exit');
    }, 1350);
    const doneTimer = window.setTimeout(() => {
      finishSplash();
    }, 1820);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div
      onClick={finishSplash}
      role="presentation"
      className={`fixed inset-0 z-[120] bg-[#000000] flex flex-col items-center justify-center overflow-hidden select-none transition-all duration-[460ms] ease-out ${
        phase === 'exit'
          ? 'opacity-0 scale-[1.14] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes afpAppSplashRingSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes afpAppSplashLogoPop {
          0% { opacity: 0; transform: perspective(900px) scale(0.72) rotateY(-12deg); }
          60% { opacity: 1; transform: perspective(900px) scale(1.04) rotateY(3deg); }
          100% { opacity: 1; transform: perspective(900px) scale(1) rotateY(0deg); }
        }
      `}</style>

      {/* Deep ambient crimson-magenta radial aura (seamless on #000000, zero square box) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full blur-3xl opacity-80"
        style={{
          background:
            'radial-gradient(circle, rgba(229,9,20,0.42) 0%, rgba(255,0,128,0.22) 45%, rgba(0,0,0,0) 74%)',
        }}
      />

      {/* Single Centered 100% Transparent Animated Emblem + Neon-Crimson Aura Ring (Zero Duplicate Bottom Text) */}
      <div
        style={{ animation: 'afpAppSplashLogoPop 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
        className="relative flex items-center justify-center"
      >
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
          {/* Outer rotating neon-crimson & magenta conic aura ring */}
          <div
            aria-hidden="true"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, #e50914 95deg, #ff0080 185deg, #f59e0b 255deg, transparent 360deg)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              animation: 'afpAppSplashRingSpin 1.35s linear infinite',
            }}
            className="absolute inset-0 rounded-full opacity-95 drop-shadow-[0_0_20px_rgba(229,9,20,0.78)]"
          />

          {/* 100% Transparent Chroma-Keyed + Mix-Blend Screen Official Emblem */}
          <img
            src={transparentLogo}
            alt="AsiaFlix Prime"
            referrerPolicy="no-referrer"
            style={{
              background: 'transparent',
              mixBlendMode: 'screen',
              filter:
                'drop-shadow(0 0 22px rgba(229,9,20,0.72)) drop-shadow(0 6px 18px rgba(0,0,0,0.95))',
            }}
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain relative z-10"
          />
        </div>
      </div>
    </div>
  );
};

