import React, { useEffect, useRef, useState } from 'react';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    const startMs = performance.now();
    let rafId = 0;

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    };

    const hardTimeoutId = window.setTimeout(finish, 8000);

    // Pre-generate 160 high-speed 3D prism spectrum ribbons for Phase 3 Hyper-Warp
    const prismPalette = ['#e50914', '#ff2a85', '#ffb800', '#7928ca', '#00f2fe'];
    const warpRibbons = Array.from({ length: 160 }, (_, i) => {
      const goldenAngle = i * 2.39996323;
      const radialSpread = 0.16 + ((i * 0.6180339) % 1) * 0.95;
      return {
        nx: Math.cos(goldenAngle) * radialSpread,
        ny: Math.sin(goldenAngle) * radialSpread * 0.68,
        zStart: 0.35 + ((i * 0.317) % 1) * 1.45,
        speed: 0.9 + (i % 7) * 0.24,
        color: prismPalette[i % prismPalette.length],
        width: 1.4 + (i % 5) * 0.9,
        verticalSliceX: (((i * 0.431) % 1) - 0.5) * 2.1,
        sliceDelay: (i % 12) * 0.055,
      };
    });

    const renderFrame = (now: number) => {
      const t = Math.min(8.0, (now - startMs) / 1000);
      setElapsedSec(t);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(320, Math.round(rect.width * dpr));
        const h = Math.max(180, Math.round(rect.height * dpr));
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

          // PHASE 1 (0.0s - 2.0s, subtle tail to 2.4s): Deep Space Anamorphic Lens Flare & Energy Ignition
          if (t < 2.45) {
            const p1 = Math.min(1, t / 2.0);
            const fade1 = t > 1.85 ? Math.max(0, 1 - (t - 1.85) / 0.6) : 1;
            const flareSweepX = cx + (p1 - 0.48) * w * 0.68;

            // Core ignition radial bloom
            const coreR = minDim * (0.06 + Math.sin(p1 * Math.PI * 0.65) * 0.34);
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.72 * fade1 * Math.sin(Math.min(1, p1 * 1.1) * Math.PI)})`);
            coreGrad.addColorStop(0.24, `rgba(0, 242, 254, ${0.42 * fade1})`);
            coreGrad.addColorStop(0.55, `rgba(229, 9, 20, ${0.38 * fade1})`);
            coreGrad.addColorStop(1, 'rgba(2, 2, 5, 0)');
            ctx.fillStyle = coreGrad;
            ctx.fillRect(0, 0, w, h);

            // Electric horizontal anamorphic cyan streak
            const cyanW = w * (0.45 + p1 * 0.55);
            const cyanH = Math.max(3 * dpr, minDim * 0.035 * (1 - p1 * 0.25));
            const cyanGrad = ctx.createLinearGradient(flareSweepX - cyanW * 0.5, cy, flareSweepX + cyanW * 0.5, cy);
            cyanGrad.addColorStop(0, 'rgba(0, 242, 254, 0)');
            cyanGrad.addColorStop(0.35, `rgba(0, 242, 254, ${0.38 * fade1})`);
            cyanGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.88 * fade1})`);
            cyanGrad.addColorStop(0.65, `rgba(255, 42, 133, ${0.42 * fade1})`);
            cyanGrad.addColorStop(1, 'rgba(229, 9, 20, 0)');

            ctx.save();
            ctx.fillStyle = cyanGrad;
            ctx.beginPath();
            ctx.ellipse(flareSweepX, cy, cyanW * 0.5, cyanH, 0, 0, Math.PI * 2);
            ctx.fill();

            // Razor-thin electric anamorphic filament line
            ctx.fillStyle = `rgba(220, 252, 255, ${0.85 * fade1})`;
            ctx.fillRect(cx - w * 0.48, cy - 1.2 * dpr, w * 0.96, 2.4 * dpr);

            // Secondary crimson horizontal diffraction streak
            const crimGrad = ctx.createLinearGradient(cx - w * 0.46, cy, cx + w * 0.46, cy);
            crimGrad.addColorStop(0, 'rgba(229, 9, 20, 0)');
            crimGrad.addColorStop(0.5, `rgba(255, 42, 133, ${0.52 * fade1})`);
            crimGrad.addColorStop(1, 'rgba(229, 9, 20, 0)');
            ctx.fillStyle = crimGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w * 0.48, cyanH * 2.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // PHASE 2 (1.8s - 5.9s): Rotating Volumetric Crimson/Magenta Aurora God-Rays Behind Emblem
          if (t >= 1.75 && t < 6.05) {
            const enter2 = Math.min(1, (t - 1.75) / 0.65);
            const exit2 = t > 5.3 ? Math.max(0, 1 - (t - 5.3) / 0.75) : 1;
            const alpha2 = enter2 * exit2;
            const pulse = 0.82 + 0.18 * Math.sin(t * 2.4);

            // Warm crimson & magenta central aurora behind logo
            const auraGrad = ctx.createRadialGradient(cx, cy, minDim * 0.02, cx, cy, minDim * 0.56);
            auraGrad.addColorStop(0, `rgba(255, 42, 133, ${0.34 * alpha2 * pulse})`);
            auraGrad.addColorStop(0.38, `rgba(229, 9, 20, ${0.26 * alpha2 * pulse})`);
            auraGrad.addColorStop(0.7, `rgba(121, 40, 202, ${0.14 * alpha2})`);
            auraGrad.addColorStop(1, 'rgba(2, 2, 5, 0)');
            ctx.fillStyle = auraGrad;
            ctx.fillRect(0, 0, w, h);

            // 16 rotating volumetric god-ray shafts radiating behind logo play emblem
            ctx.save();
            ctx.translate(cx, cy);
            for (let b = 0; b < 16; b++) {
              const angle = (b / 16) * Math.PI * 2 + t * 0.14;
              const rayLen = minDim * (0.58 + (b % 3) * 0.12);
              const raySpread = minDim * (0.045 + (b % 2) * 0.025);
              ctx.save();
              ctx.rotate(angle);
              const rayGrad = ctx.createLinearGradient(0, 0, rayLen, 0);
              rayGrad.addColorStop(0, b % 2 === 0 ? `rgba(255, 42, 133, ${0.26 * alpha2 * pulse})` : `rgba(229, 9, 20, ${0.22 * alpha2 * pulse})`);
              rayGrad.addColorStop(0.5, b % 3 === 0 ? `rgba(121, 40, 202, ${0.1 * alpha2})` : `rgba(255, 184, 0, ${0.07 * alpha2})`);
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

          // PHASE 3 (5.5s - 8.0s): Netflix-Style 3D Prism Spectrum Hyper-Warp Tunnel
          if (t >= 5.45) {
            const p3 = Math.min(1, (t - 5.45) / 2.55);
            const warpGain = Math.sin(Math.min(1, p3 * 1.05) * Math.PI * 0.92);

            for (const r of warpRibbons) {
              // Advance 3D z-depth toward camera
              const zSpan = r.zStart - p3 * r.speed * 1.45;
              const zHead = Math.max(0.06, ((zSpan % 1.4) + 1.4) % 1.4);
              const zTail = Math.min(1.8, zHead + 0.22 + p3 * 0.42);

              const scaleHead = 0.42 / zHead;
              const scaleTail = 0.42 / zTail;

              const x1 = cx + r.nx * w * 0.55 * scaleTail;
              const y1 = cy + r.ny * h * 0.65 * scaleTail;
              const x2 = cx + r.nx * w * 0.55 * scaleHead;
              const y2 = cy + r.ny * h * 0.65 * scaleHead;

              ctx.strokeStyle = r.color;
              ctx.globalAlpha = Math.min(0.9, (0.28 + warpGain * 0.72) * (1 - p3 * 0.28));
              ctx.lineWidth = r.width * dpr * (0.65 + scaleHead * 0.75);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();

              // Vertical Netflix-style prism spectrum light ribbons sweeping past edges
              if (r.width >= 2.2) {
                const sliceP = Math.max(0, Math.min(1, p3 * 1.35 - r.sliceDelay * 0.5));
                if (sliceP > 0) {
                  const sx = cx + r.verticalSliceX * w * (0.55 + sliceP * 0.95);
                  ctx.globalAlpha = Math.min(0.45, sliceP * 0.5) * (1 - p3 * 0.45);
                  ctx.fillStyle = r.color;
                  ctx.fillRect(sx, 0, r.width * dpr * (1.2 + sliceP * 2.8), h);
                }
              }
            }
            ctx.globalAlpha = 1;
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
      window.clearTimeout(hardTimeoutId);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Compute 3-phase CSS transform & opacity for the SINGLE official transparent AsiaFlix Prime logo
  let logoOpacity = 0;
  let logoScale = 0.82;
  let logoTiltY = 0;
  let overlayOpacity = 1;

  if (elapsedSec < 2.0) {
    // Phase 1 (0.0s - 2.0s): Lens flare ignition -> logo begins smooth fade-in around 1.2s
    const emerge = Math.max(0, Math.min(1, (elapsedSec - 1.15) / 0.85));
    const eased = 1 - Math.pow(1 - emerge, 3);
    logoOpacity = eased;
    logoScale = 0.82 + eased * 0.08;
    logoTiltY = (1 - eased) * -10;
  } else if (elapsedSec < 5.5) {
    // Phase 2 (2.0s - 5.5s): 3D Official Logo Emergence (scale 0.90 -> 1.05) with Volumetric God-Rays
    const p2 = (elapsedSec - 2.0) / 3.5;
    const smooth2 = 1 - Math.pow(1 - p2, 2);
    logoOpacity = 1;
    logoScale = 0.9 + smooth2 * 0.15;
    logoTiltY = Math.sin(p2 * Math.PI * 1.2) * 4.5;
  } else {
    // Phase 3 (5.5s - 8.0s): 3D Prism Spectrum Hyper-Warp zoom forward & seamless cross-fade to episode
    const p3 = Math.min(1, (elapsedSec - 5.5) / 2.5);
    logoScale = 1.05 + Math.pow(p3, 2.0) * 2.95;
    logoOpacity = p3 > 0.52 ? Math.max(0, 1 - (p3 - 0.52) / 0.48) : 1;
    overlayOpacity = p3 > 0.72 ? Math.max(0, 1 - (p3 - 0.72) / 0.28) : 1;
  }

  return (
    <div
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
        transition: 'opacity 140ms linear',
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
      `}</style>

      {/* Canvas 60fps Volumetric Light Engine */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
      />

      {/* Single Official Transparent Logo (ZERO duplicate HTML PRIME text, ZERO dot artifacts) */}
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
              border: 'none',
              boxShadow: 'none',
              filter:
                'drop-shadow(0 0 26px rgba(255,42,133,0.72)) drop-shadow(0 4px 18px rgba(0,0,0,0.96))',
            }}
            className="object-contain block"
          />
          {elapsedSec >= 2.0 && elapsedSec < 6.0 && (
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
