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

    // Pre-generate 75 golden dust particles for Stage 2
    const dustParticles = Array.from({ length: 75 }, (_, i) => ({
      angle: ((i * 137.5) % 360) * (Math.PI / 180),
      radius: 0.08 + ((i * 0.618) % 1) * 0.44,
      speed: 0.18 + (i % 7) * 0.05,
      size: 1.0 + (i % 4) * 0.65,
      phase: i * 0.9,
      driftY: ((i % 9) - 4) * 0.008,
    }));

    // Pre-generate 44 Netflix-style hyper-speed prism streaks for Stage 3
    const prismColors = ['#e50914', '#ff2a85', '#8b5cf6', '#ffb800', '#00f2fe'];
    const prismStreaks = Array.from({ length: 44 }, (_, i) => ({
      xNorm: ((i * 0.37) % 1) - 0.5,
      angle: ((i * 8.18) % 360) * (Math.PI / 180),
      color: prismColors[i % prismColors.length],
      width: 2 + (i % 5) * 1.4,
      delay: (i % 10) * 0.08,
      speed: 1.0 + (i % 6) * 0.25,
    }));

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
          ctx.clearRect(0, 0, w, h);
          const cx = w * 0.5;
          const cy = h * 0.5;
          const minDim = Math.min(w, h);

          // Stage 1 (0.0s - 2.2s): Neon Core Ignition with spiraling volumetric ribbons & shockwave ring
          if (t < 2.5) {
            const p1 = Math.min(1, t / 2.2);
            const fade1 = t > 2.0 ? Math.max(0, 1 - (t - 2.0) / 0.5) : 1;

            // Core ignition radial bloom
            const coreRadius = minDim * (0.05 + p1 * 0.32);
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * fade1 * Math.sin(p1 * Math.PI)})`);
            coreGrad.addColorStop(0.28, `rgba(255, 42, 133, ${0.55 * fade1})`);
            coreGrad.addColorStop(0.65, `rgba(229, 9, 20, ${0.25 * fade1})`);
            coreGrad.addColorStop(1, 'rgba(3, 3, 6, 0)');
            ctx.fillStyle = coreGrad;
            ctx.fillRect(0, 0, w, h);

            // 18 Volumetric spiraling ribbons converging inward
            const ribbonColors = ['#e50914', '#ff2a85', '#ffb800'];
            for (let i = 0; i < 18; i++) {
              const baseAngle = (i / 18) * Math.PI * 2;
              const spinOffset = (1 - p1) * 3.4;
              ctx.beginPath();
              const steps = 16;
              for (let s = 0; s <= steps; s++) {
                const frac = s / steps;
                const r = minDim * (0.04 + (1 - p1 * 0.85) * 0.62 * frac);
                const a = baseAngle + spinOffset + frac * 1.35;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.strokeStyle = ribbonColors[i % ribbonColors.length];
              ctx.globalAlpha = 0.52 * fade1 * (0.35 + p1 * 0.65);
              ctx.lineWidth = (1.5 + (i % 3)) * dpr;
              ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // 3D Shockwave ignition ring around 0.9s - 2.2s
            if (t >= 0.85) {
              const sw = Math.min(1, (t - 0.85) / 1.35);
              const ringR = minDim * (0.06 + sw * 0.52);
              ctx.save();
              ctx.translate(cx, cy);
              ctx.scale(1.18, 0.88);
              ctx.beginPath();
              ctx.arc(0, 0, ringR, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(255, 184, 0, ${(1 - sw) * 0.85})`;
              ctx.lineWidth = (4 - sw * 3) * dpr;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(0, 0, ringR * 0.88, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(255, 42, 133, ${(1 - sw) * 0.7})`;
              ctx.lineWidth = (2.5 - sw * 1.8) * dpr;
              ctx.stroke();
              ctx.restore();
            }
          }

          // Stage 2 (1.8s - 6.1s): Pulsing radial light beams + floating golden cinema dust particles
          if (t >= 1.7 && t < 6.4) {
            const enter = Math.min(1, (t - 1.7) / 0.7);
            const exit = t > 5.6 ? Math.max(0, 1 - (t - 5.6) / 0.8) : 1;
            const alpha2 = enter * exit;

            // Pulsing radial golden-crimson volumetric beams
            const pulse = 0.75 + 0.25 * Math.sin(t * 2.8);
            const aura = ctx.createRadialGradient(cx, cy, minDim * 0.04, cx, cy, minDim * 0.55);
            aura.addColorStop(0, `rgba(255, 184, 0, ${0.22 * alpha2 * pulse})`);
            aura.addColorStop(0.45, `rgba(229, 9, 20, ${0.16 * alpha2 * pulse})`);
            aura.addColorStop(1, 'rgba(3, 3, 6, 0)');
            ctx.fillStyle = aura;
            ctx.fillRect(0, 0, w, h);

            ctx.save();
            ctx.translate(cx, cy);
            for (let b = 0; b < 12; b++) {
              const ba = (b / 12) * Math.PI * 2 + t * 0.08;
              ctx.save();
              ctx.rotate(ba);
              const beamGrad = ctx.createLinearGradient(0, 0, minDim * 0.65, 0);
              beamGrad.addColorStop(0, `rgba(255, 184, 0, ${0.18 * alpha2 * pulse})`);
              beamGrad.addColorStop(0.5, `rgba(255, 42, 133, ${0.08 * alpha2})`);
              beamGrad.addColorStop(1, 'rgba(3, 3, 6, 0)');
              ctx.fillStyle = beamGrad;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(minDim * 0.65, -minDim * 0.06);
              ctx.lineTo(minDim * 0.65, minDim * 0.06);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
            ctx.restore();

            // Floating golden cinema dust particles
            for (const p of dustParticles) {
              const curAngle = p.angle + t * p.speed * 0.25;
              const px = cx + Math.cos(curAngle) * p.radius * w * 0.85;
              const py = cy + Math.sin(curAngle) * p.radius * h * 0.85 + Math.sin(t * 2 + p.phase) * 8 * dpr;
              const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 3.2 + p.phase));
              ctx.beginPath();
              ctx.arc(px, py, p.size * dpr, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 200, 75, ${twinkle * 0.82 * alpha2})`;
              ctx.fill();
            }
          }

          // Stage 3 (5.8s - 8.0s): Netflix-Style Prism Spectrum Warp (hyper-speed vertical & radial light streaks)
          if (t >= 5.75) {
            const p3 = Math.min(1, (t - 5.75) / 2.25);
            const intensity = Math.sin(Math.min(1, p3 * 1.15) * Math.PI);

            for (const s of prismStreaks) {
              const localP = Math.max(0, Math.min(1, (p3 * 1.35 - s.delay * 0.35) * s.speed));
              if (localP <= 0) continue;

              // Vertical hyper-speed prism columns (Netflix ribbon warp feel)
              const vx = cx + s.xNorm * w * (1 + localP * 1.5);
              ctx.save();
              ctx.globalAlpha = Math.min(0.85, localP * 0.9) * (1 - p3 * 0.45);
              ctx.fillStyle = s.color;
              ctx.fillRect(vx, 0, s.width * dpr * (1 + localP * 4.5), h);
              ctx.restore();

              // Radial light tunnel rays
              const rStart = minDim * (0.04 + localP * 0.18);
              const rEnd = minDim * (0.18 + localP * 0.95);
              ctx.save();
              ctx.globalAlpha = (0.65 * intensity + 0.2) * (1 - p3 * 0.35);
              ctx.strokeStyle = s.color;
              ctx.lineWidth = s.width * dpr * (0.8 + localP * 1.6);
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(s.angle) * rStart, cy + Math.sin(s.angle) * rStart);
              ctx.lineTo(cx + Math.cos(s.angle) * rEnd, cy + Math.sin(s.angle) * rEnd);
              ctx.stroke();
              ctx.restore();
            }
          }
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

  // Compute 3-stage CSS transform & opacity for the official transparent AsiaFlix Prime logo
  let logoOpacity = 0;
  let logoScale = 0.55;
  let logoTiltY = 0;
  let overlayOpacity = 1;

  if (elapsedSec < 2.2) {
    // Stage 1 (0.0s - 2.2s): Neon Core Ignition -> Logo emerges after 0.7s
    const emerge = Math.max(0, Math.min(1, (elapsedSec - 0.65) / 1.45));
    logoOpacity = emerge;
    logoScale = 0.55 + emerge * 0.45;
    logoTiltY = (1 - emerge) * -14;
  } else if (elapsedSec < 5.8) {
    // Stage 2 (2.2s - 5.8s): Grand 3D Official Logo Reveal
    const p2 = (elapsedSec - 2.2) / 3.6;
    logoOpacity = 1;
    logoScale = 1.0 + p2 * 0.08;
    logoTiltY = Math.sin(p2 * Math.PI * 1.5) * 6;
  } else {
    // Stage 3 (5.8s - 8.0s): Netflix-Style Prism Spectrum Warp zoom forward + smooth fade out
    const p3 = Math.min(1, (elapsedSec - 5.8) / 2.2);
    logoScale = 1.08 + Math.pow(p3, 1.8) * 2.8;
    logoOpacity = p3 > 0.55 ? Math.max(0, 1 - (p3 - 0.55) / 0.45) : 1;
    overlayOpacity = p3 > 0.72 ? Math.max(0, 1 - (p3 - 0.72) / 0.28) : 1;
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: '#030306',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: overlayOpacity,
        transition: 'opacity 120ms linear',
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
          60% {
            transform: translateX(220%) skewX(-24deg);
            opacity: 0;
          }
          100% {
            transform: translateX(220%) skewX(-24deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Canvas 3-Stage Choreography Layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
      />

      {/* Grand 3D Official Transparent Logo + Specular Sweep */}
      <div
        style={{
          position: 'relative',
          zIndex: 42,
          opacity: logoOpacity,
          transform: `perspective(950px) rotateY(${logoTiltY.toFixed(2)}deg) scale(${logoScale.toFixed(3)})`,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
        className="flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="relative flex items-center justify-center">
          <img
            src={logoSrc}
            alt="AsiaFlix Prime"
            referrerPolicy="no-referrer"
            style={{
              height: 'clamp(110px, 18vw, 180px)',
              width: 'auto',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              filter:
                'drop-shadow(0 0 22px rgba(255,42,133,0.7)) drop-shadow(0 4px 16px rgba(0,0,0,0.95))',
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
                    'linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.92) 48%, rgba(255,184,0,0.65) 56%, transparent 88%)',
                  animation: 'afpIntroBeamSweep 2.4s ease-in-out infinite',
                }}
                className="absolute inset-y-0 -left-1/3 w-[65%]"
              />
            </div>
          )}
        </div>
        {elapsedSec >= 2.1 && elapsedSec < 6.4 && (
          <div className="mt-2 flex flex-col items-center gap-0.5 tracking-[0.42em] uppercase text-[10px] sm:text-xs font-extrabold text-amber-200/95 drop-shadow-[0_2px_10px_rgba(255,184,0,0.65)]">
            <span>— P R I M E —</span>
          </div>
        )}
      </div>

      {/* Subtle Semi-Transparent Skip Intro Pill after 1.5s */}
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
