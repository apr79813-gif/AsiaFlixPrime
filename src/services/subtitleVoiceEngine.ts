import { SubtitleCue } from './vipPlayerHelper';

export type ProfileId =
  | 'Male_Lead_1'
  | 'Male_Char_2'
  | 'Male_Char_3'
  | 'Female_Lead_1'
  | 'Female_Char_2'
  | 'Female_Char_3';

export interface CharacterVoiceProfile {
  id: ProfileId;
  voice: string;
  baseRate: number;
  basePitch: number;
  detuneCents: number;
  gender: 'M' | 'F';
}

export const CHARACTER_PROFILES: Record<ProfileId, CharacterVoiceProfile> = {
  Male_Lead_1: {
    id: 'Male_Lead_1',
    voice: 'hi-IN-MadhurNeural',
    baseRate: 1.06,
    basePitch: 0.96,
    detuneCents: 0,
    gender: 'M',
  },
  Male_Char_2: {
    id: 'Male_Char_2',
    voice: 'en-IN-PrabhatNeural',
    baseRate: 1.1,
    basePitch: 1.07,
    detuneCents: 55,
    gender: 'M',
  },
  Male_Char_3: {
    id: 'Male_Char_3',
    voice: 'hi-IN-MadhurNeural',
    baseRate: 1.02,
    basePitch: 0.87,
    detuneCents: -130,
    gender: 'M',
  },
  Female_Lead_1: {
    id: 'Female_Lead_1',
    voice: 'hi-IN-SwaraNeural',
    baseRate: 1.07,
    basePitch: 1.03,
    detuneCents: 0,
    gender: 'F',
  },
  Female_Char_2: {
    id: 'Female_Char_2',
    voice: 'en-IN-NeerjaNeural',
    baseRate: 1.08,
    basePitch: 0.95,
    detuneCents: -45,
    gender: 'F',
  },
  Female_Char_3: {
    id: 'Female_Char_3',
    voice: 'hi-IN-SwaraNeural',
    baseRate: 1.13,
    basePitch: 1.12,
    detuneCents: 110,
    gender: 'F',
  },
};

const PROFILE_ROTATION: ProfileId[] = [
  'Female_Lead_1',
  'Male_Lead_1',
  'Female_Char_2',
  'Male_Char_2',
  'Female_Char_3',
  'Male_Char_3',
];

const MALE_PROFILES: ProfileId[] = ['Male_Lead_1', 'Male_Char_2', 'Male_Char_3'];
const FEMALE_PROFILES: ProfileId[] = ['Female_Lead_1', 'Female_Char_2', 'Female_Char_3'];

interface DialogueTurn {
  text: string;
  profileId: ProfileId;
  pitchMult: number;
  volumeMult: number;
  rateMult: number;
}

interface CachedTurnAudio {
  buffer: AudioBuffer | null;
  failed: boolean;
}

function stripSrtMarkup(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\\[^}]+\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessGenderFromName(name: string): 'M' | 'F' | null {
  const n = name.toLowerCase();
  if (
    /\b(mr|sir|dad|father|bro|brother|uncle|king|prince|oppa|hyung|dadaji|papa|bhai|hero|boy|man|chief|director)\b/i.test(
      n
    )
  ) {
    return 'M';
  }
  if (
    /\b(ms|mrs|miss|maam|mom|mother|sis|sister|aunt|queen|princess|unnie|noona|didi|girl|woman|lady|madam)\b/i.test(
      n
    )
  ) {
    return 'F';
  }
  if (/[aeiy]$/.test(n) && n.length > 2) return 'F';
  return null;
}

function detectEmotionModifiers(text: string): {
  pitchMult: number;
  volumeMult: number;
  rateMult: number;
} {
  let pitchMult = 1;
  let volumeMult = 1;
  let rateMult = 1;

  if (text.includes('!')) {
    volumeMult *= 1.12;
    pitchMult *= 1.06;
    rateMult *= 1.04;
  } else if (text.includes('?') || text.includes('？')) {
    pitchMult *= 1.08;
  } else if (text.includes('...') || text.includes('…')) {
    pitchMult *= 0.94;
    volumeMult *= 0.88;
    rateMult *= 0.95;
  }
  return { pitchMult, volumeMult, rateMult };
}

function isNonSpeechCaption(text: string): boolean {
  const clean = text.trim();
  if (!clean) return true;
  if (/^\[(?:music|sfx|sigh|laugh|applause|birds|wind|door|phone)[^\]]*\]$/i.test(clean)) {
    return true;
  }
  if (/^[♪♫\s.,!?-]+$/.test(clean)) return true;
  return false;
}

export class SubtitleVoiceEngine {
  private enabled = false;
  private cues: SubtitleCue[] = [];
  private speakerMap = new Map<string, ProfileId>();
  private nextMaleIdx = 0;
  private nextFemaleIdx = 0;
  private lastUnlabeledProfileIdx = 0;
  private lastCueEndSec = -10;

  private audioCtx: AudioContext | null = null;
  private ttsGainNode: GainNode | null = null;
  private cache = new Map<string, Promise<CachedTurnAudio>>();
  private queuedCueKeys = new Set<string>();
  private turnQueue: Array<{
    cueIndex: number;
    cueDuration: number;
    turn: DialogueTurn;
    key: string;
  }> = [];
  private isSpeaking = false;
  private activeSource: AudioBufferSourceNode | null = null;
  private generationId = 0;

  // Video BGM-Only Suppression & Ducking state
  private attachedVideo: HTMLVideoElement | null = null;
  private videoSourceNode: MediaElementAudioSourceNode | null = null;
  private vocalCutFilter: BiquadFilterNode | null = null;
  private videoGainNode: GainNode | null = null;
  private originalVideoVolume = 1;
  private corsAudioBlocked = false;
  private isExternalAudioMode = false;
  private videoPlaybackRate = 1;
  private duckHoldTimer: ReturnType<typeof setTimeout> | null = null;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setExternalAudioMode(active: boolean): void {
    this.isExternalAudioMode = active;
    if (active) {
      this.restoreVideoAudio();
    }
  }

  public setPlaybackRate(rate: number): void {
    this.videoPlaybackRate = Math.max(0.5, Math.min(2, rate || 1));
  }

  public setCues(cues: SubtitleCue[]): void {
    this.cues = cues || [];
    this.cache.clear();
    this.speakerMap.clear();
    this.queuedCueKeys.clear();
    this.turnQueue = [];
    this.nextMaleIdx = 0;
    this.nextFemaleIdx = 0;
    this.lastUnlabeledProfileIdx = 0;
    this.lastCueEndSec = -10;
  }

  public attachVideo(video: HTMLVideoElement | null): void {
    if (this.attachedVideo === video) return;
    this.detachVideoGraph();
    this.attachedVideo = video;
    if (video) {
      this.originalVideoVolume = video.volume || 1;
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
      this.ttsGainNode = this.audioCtx.createGain();
      this.ttsGainNode.gain.value = 1.0;
      this.ttsGainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private ensureVideoBgmGraph(): boolean {
    if (this.isExternalAudioMode || !this.attachedVideo || this.corsAudioBlocked) {
      return false;
    }
    const ctx = this.ensureAudioContext();
    if (!ctx) return false;

    if (!this.videoSourceNode) {
      try {
        this.videoSourceNode = ctx.createMediaElementSource(this.attachedVideo);
        this.vocalCutFilter = ctx.createBiquadFilter();
        this.vocalCutFilter.type = 'peaking';
        this.vocalCutFilter.frequency.value = 1350;
        this.vocalCutFilter.Q.value = 0.65;
        this.vocalCutFilter.gain.value = 0;

        this.videoGainNode = ctx.createGain();
        this.videoGainNode.gain.value = 1.0;

        this.videoSourceNode.connect(this.vocalCutFilter);
        this.vocalCutFilter.connect(this.videoGainNode);
        this.videoGainNode.connect(ctx.destination);
      } catch {
        // Cross-origin video without CORS headers blocks MediaElementAudioSourceNode; fall back gracefully to volume ducking
        this.corsAudioBlocked = true;
        return false;
      }
    }
    return true;
  }

  private detachVideoGraph(): void {
    try {
      this.videoSourceNode?.disconnect();
      this.vocalCutFilter?.disconnect();
      this.videoGainNode?.disconnect();
    } catch {}
    this.videoSourceNode = null;
    this.vocalCutFilter = null;
    this.videoGainNode = null;
    this.corsAudioBlocked = false;
  }

  private applyBgmDucking(speakingNow: boolean): void {
    if (!this.enabled || this.isExternalAudioMode || !this.attachedVideo) return;
    if (this.duckHoldTimer) {
      clearTimeout(this.duckHoldTimer);
      this.duckHoldTimer = null;
    }

    const targetGain = speakingNow ? 0.1 : 0.24;
    const hasGraph = this.ensureVideoBgmGraph();

    if (hasGraph && this.audioCtx && this.vocalCutFilter && this.videoGainNode) {
      const now = this.audioCtx.currentTime;
      this.vocalCutFilter.gain.setTargetAtTime(-24, now, 0.06);
      this.videoGainNode.gain.setTargetAtTime(targetGain, now, 0.08);
    } else {
      try {
        this.attachedVideo.volume = targetGain;
      } catch {}
    }
  }

  private restoreVideoAudio(): void {
    if (this.duckHoldTimer) {
      clearTimeout(this.duckHoldTimer);
      this.duckHoldTimer = null;
    }
    if (this.audioCtx && this.vocalCutFilter && this.videoGainNode) {
      const now = this.audioCtx.currentTime;
      this.vocalCutFilter.gain.setTargetAtTime(0, now, 0.05);
      this.videoGainNode.gain.setTargetAtTime(1.0, now, 0.05);
    }
    if (this.attachedVideo && !this.isExternalAudioMode) {
      try {
        this.attachedVideo.volume = Math.max(0.2, this.originalVideoVolume || 1);
      } catch {}
    }
  }

  public enable(currentCueIndex: number, upcomingCueIndex?: number, isPaused = false): void {
    this.enabled = true;
    this.generationId++;
    this.turnQueue = [];
    this.queuedCueKeys.clear();
    this.ensureAudioContext();
    if (this.attachedVideo && !this.isExternalAudioMode) {
      this.originalVideoVolume = this.attachedVideo.volume || 1;
    }
    this.applyBgmDucking(false);
    const lookaheadStart =
      currentCueIndex >= 0 ? currentCueIndex : Math.max(0, upcomingCueIndex ?? 0);
    this.prefetchAround(lookaheadStart);
    if (!isPaused && currentCueIndex >= 0 && currentCueIndex < this.cues.length) {
      this.enqueueCue(currentCueIndex);
    }
  }

  public disable(): void {
    this.enabled = false;
    this.generationId++;
    this.turnQueue = [];
    this.queuedCueKeys.clear();
    this.stopCurrentSpeechOnly();
    this.restoreVideoAudio();
  }

  public onSeekingStop(): void {
    this.generationId++;
    this.turnQueue = [];
    this.queuedCueKeys.clear();
    this.stopCurrentSpeechOnly();
    if (this.enabled) {
      this.applyBgmDucking(false);
    }
  }

  public handleSeek(newCueIndex: number, upcomingCueIndex?: number, isPaused = false): void {
    this.generationId++;
    this.turnQueue = [];
    this.queuedCueKeys.clear();
    this.stopCurrentSpeechOnly();
    if (this.enabled) {
      this.applyBgmDucking(false);
      const lookaheadStart =
        newCueIndex >= 0 ? newCueIndex : Math.max(0, upcomingCueIndex ?? 0);
      this.prefetchAround(lookaheadStart);
      if (!isPaused && newCueIndex >= 0 && newCueIndex < this.cues.length) {
        this.enqueueCue(newCueIndex);
      }
    }
  }

  public syncResume(currentCueIndex: number, upcomingCueIndex?: number): void {
    if (!this.enabled) return;
    const lookaheadStart =
      currentCueIndex >= 0 ? currentCueIndex : Math.max(0, upcomingCueIndex ?? 0);
    this.prefetchAround(lookaheadStart);
    if (
      currentCueIndex >= 0 &&
      currentCueIndex < this.cues.length &&
      !this.isSpeaking &&
      this.turnQueue.length === 0
    ) {
      this.enqueueCue(currentCueIndex);
    }
  }

  public onPausedOrEnded(): void {
    this.generationId++;
    this.stopCurrentSpeechOnly();
    this.turnQueue = [];
    this.queuedCueKeys.clear();
    if (this.enabled) {
      this.applyBgmDucking(false);
    }
  }

  private stopCurrentSpeechOnly(): void {
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {}
      this.activeSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isSpeaking = false;
  }

  public onActiveCueChanged(cueIndex: number): void {
    if (!this.enabled) return;
    if (cueIndex >= 0) {
      this.prefetchAround(cueIndex);
    }
    if (cueIndex >= 0 && cueIndex < this.cues.length) {
      // NEVER abort an actively speaking line mid-sentence: always queue seamlessly!
      this.enqueueCue(cueIndex);
    }
  }

  private assignNamedProfile(speakerKey: string): ProfileId {
    const cleanKey = speakerKey.trim().toLowerCase();
    const existing = this.speakerMap.get(cleanKey);
    if (existing) return existing;

    const hint = guessGenderFromName(cleanKey);
    let assigned: ProfileId;
    if (hint === 'M') {
      assigned = MALE_PROFILES[this.nextMaleIdx % MALE_PROFILES.length];
      this.nextMaleIdx++;
    } else if (hint === 'F') {
      assigned = FEMALE_PROFILES[this.nextFemaleIdx % FEMALE_PROFILES.length];
      this.nextFemaleIdx++;
    } else {
      const idx = this.speakerMap.size % PROFILE_ROTATION.length;
      assigned = PROFILE_ROTATION[idx];
    }
    this.speakerMap.set(cleanKey, assigned);
    return assigned;
  }

  private resolveTagToken(token: string): ProfileId | null {
    const t = token.toUpperCase();
    if (t === 'M1' || t === 'MALE1') return 'Male_Lead_1';
    if (t === 'M2' || t === 'MALE2') return 'Male_Char_2';
    if (t === 'M3' || t === 'MALE3') return 'Male_Char_3';
    if (t === 'F1' || t === 'FEMALE1') return 'Female_Lead_1';
    if (t === 'F2' || t === 'FEMALE2') return 'Female_Char_2';
    if (t === 'F3' || t === 'FEMALE3') return 'Female_Char_3';
    return null;
  }

  private parseCueDialogueTurns(cueIndex: number): DialogueTurn[] {
    const cue = this.cues[cueIndex];
    if (!cue) return [];

    const cleanedRaw = stripSrtMarkup(cue.text);
    if (isNonSpeechCaption(cleanedRaw)) return [];

    // Split hyphenated or multi-line dual-speaker exchanges
    const segments = cue.text
      .split(/\n+/)
      .flatMap((line) => {
        const plain = stripSrtMarkup(line);
        if (!plain) return [];
        const dualDash = plain.match(/^-\s*(.+?)\s+-\s+(.+)$/);
        if (dualDash) {
          return [`- ${dualDash[1]}`, `- ${dualDash[2]}`];
        }
        return [plain];
      })
      .filter((seg) => !isNonSpeechCaption(seg));

    const turns: DialogueTurn[] = [];
    const gapSincePrev = cue.start - this.lastCueEndSec;
    this.lastCueEndSec = cue.end;

    segments.forEach((seg, idx) => {
      let text = seg.replace(/^-\s*/, '').trim();
      let profileId: ProfileId | null = null;

      // 1. Explicit [M1]..[F3] tag
      const tagMatch = text.match(/^\[(M[123]|F[123]|Male[123]|Female[123])\]\s*(.+)$/i);
      if (tagMatch) {
        profileId = this.resolveTagToken(tagMatch[1]);
        text = tagMatch[2].trim();
      }

      // 2. Named prefix "Rohan: ..." or "Kang:"
      if (!profileId) {
        const nameMatch = text.match(/^([A-Za-z][A-Za-z0-9 ._-]{1,22}):\s+(.+)$/);
        if (nameMatch) {
          profileId = this.assignNamedProfile(nameMatch[1]);
          text = nameMatch[2].trim();
        }
      }

      // 3. Turn-taking fallback across multi-speaker segments or paused turns
      if (!profileId) {
        if (segments.length > 1 || seg.trim().startsWith('-') || gapSincePrev > 1.25) {
          this.lastUnlabeledProfileIdx =
            (this.lastUnlabeledProfileIdx + (idx > 0 ? 1 : 1)) % PROFILE_ROTATION.length;
        }
        profileId = PROFILE_ROTATION[this.lastUnlabeledProfileIdx];
      }

      if (!text || isNonSpeechCaption(text)) return;
      const emo = detectEmotionModifiers(text);
      turns.push({
        text,
        profileId,
        pitchMult: emo.pitchMult,
        volumeMult: emo.volumeMult,
        rateMult: emo.rateMult,
      });
    });

    return turns;
  }

  private getCacheKey(cueIndex: number, turnIdx: number, turn: DialogueTurn): string {
    return `${cueIndex}:${turnIdx}:${turn.profileId}:${turn.text}`;
  }

  private prefetchAround(cueIndex: number): void {
    const start = Math.max(0, cueIndex);
    const end = Math.min(this.cues.length - 1, start + 5);
    for (let i = start; i <= end; i++) {
      const turns = this.parseCueDialogueTurns(i);
      turns.forEach((turn, tIdx) => {
        const key = this.getCacheKey(i, tIdx, turn);
        if (!this.cache.has(key)) {
          this.cache.set(key, this.fetchAndDecodeTurn(turn));
        }
      });
    }
  }

  private async fetchAndDecodeTurn(turn: DialogueTurn): Promise<CachedTurnAudio> {
    const profile = CHARACTER_PROFILES[turn.profileId];
    const effectivePitch = profile.basePitch * turn.pitchMult;
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: turn.text,
          voice: profile.voice,
          rate: profile.baseRate * turn.rateMult,
          pitch: effectivePitch,
        }),
      });
      if (!resp.ok) {
        return { buffer: null, failed: true };
      }
      const arr = await resp.arrayBuffer();
      const ctx = this.ensureAudioContext();
      if (!ctx || arr.byteLength === 0) {
        return { buffer: null, failed: true };
      }
      const decoded = await ctx.decodeAudioData(arr.slice(0));
      return { buffer: decoded, failed: false };
    } catch {
      return { buffer: null, failed: true };
    }
  }

  private enqueueCue(cueIndex: number): void {
    const cue = this.cues[cueIndex];
    if (!cue) return;
    const cueDuration = Math.max(1.0, cue.end - cue.start);
    const turns = this.parseCueDialogueTurns(cueIndex);
    if (turns.length === 0) return;

    turns.forEach((turn, tIdx) => {
      const key = this.getCacheKey(cueIndex, tIdx, turn);
      if (this.queuedCueKeys.has(key)) return;
      this.queuedCueKeys.add(key);
      if (!this.cache.has(key)) {
        this.cache.set(key, this.fetchAndDecodeTurn(turn));
      }
      this.turnQueue.push({ cueIndex, cueDuration, turn, key });
    });

    if (!this.isSpeaking) {
      void this.drainQueue();
    }
  }

  private async drainQueue(): Promise<void> {
    if (this.isSpeaking || !this.enabled) return;
    const nextItem = this.turnQueue.shift();
    if (!nextItem) {
      this.applyBgmDucking(false);
      return;
    }

    this.isSpeaking = true;
    const gen = this.generationId;
    this.applyBgmDucking(true);

    const cacheEntry = await (this.cache.get(nextItem.key) ||
      this.fetchAndDecodeTurn(nextItem.turn));

    if (!this.enabled || gen !== this.generationId) {
      this.isSpeaking = false;
      return;
    }

    if (cacheEntry.buffer && this.audioCtx && this.ttsGainNode) {
      await this.playDecodedBuffer(cacheEntry.buffer, nextItem.cueDuration, nextItem.turn, gen);
    } else {
      await this.playWebSpeechFallback(nextItem.turn, gen);
    }

    if (gen === this.generationId) {
      this.isSpeaking = false;
      if (this.turnQueue.length > 0 && this.enabled) {
        void this.drainQueue();
      } else if (this.enabled) {
        this.duckHoldTimer = setTimeout(() => {
          if (!this.isSpeaking && this.enabled) {
            this.applyBgmDucking(false);
          }
        }, 180);
      }
    }
  }

  private playDecodedBuffer(
    buffer: AudioBuffer,
    cueDuration: number,
    turn: DialogueTurn,
    gen: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.audioCtx;
      const gain = this.ttsGainNode;
      if (!ctx || !gain || !this.enabled || gen !== this.generationId) {
        resolve();
        return;
      }

      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const profile = CHARACTER_PROFILES[turn.profileId];
        // Fit smoothly into cue duration within 1.05x..1.35x scaled by video.playbackRate
        const naturalFit = buffer.duration / Math.max(0.8, cueDuration);
        const clampedFit = Math.max(1.05, Math.min(1.35, naturalFit));
        source.playbackRate.value = Math.min(1.65, clampedFit * this.videoPlaybackRate);

        if (typeof source.detune !== 'undefined') {
          const emotionCents = Math.round((turn.pitchMult - 1) * 180);
          source.detune.value = profile.detuneCents + emotionCents;
        }

        const itemGain = ctx.createGain();
        itemGain.gain.value = Math.min(1.35, turn.volumeMult);

        source.connect(itemGain);
        itemGain.connect(gain);
        this.activeSource = source;

        source.onended = () => {
          if (this.activeSource === source) {
            this.activeSource = null;
          }
          try {
            source.disconnect();
            itemGain.disconnect();
          } catch {}
          resolve();
        };

        source.start(0);
      } catch {
        resolve();
      }
    });
  }

  private playWebSpeechFallback(turn: DialogueTurn, gen: number): Promise<void> {
    return new Promise((resolve) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        !this.enabled ||
        gen !== this.generationId
      ) {
        resolve();
        return;
      }
      try {
        const profile = CHARACTER_PROFILES[turn.profileId];
        const utter = new SpeechSynthesisUtterance(turn.text);
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('hi') &&
              (profile.gender === 'F'
                ? /swara|female|kalpana|heera|woman/i.test(v.name)
                : /madhur|male|hemant|man/i.test(v.name))
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
          voices[0];
        if (preferred) utter.voice = preferred;
        utter.lang = 'hi-IN';
        utter.rate = Math.min(1.45, Math.max(0.95, profile.baseRate * turn.rateMult * this.videoPlaybackRate));
        utter.pitch = Math.min(1.45, Math.max(0.7, profile.basePitch * turn.pitchMult));
        utter.volume = Math.min(1, turn.volumeMult);
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      } catch {
        resolve();
      }
    });
  }

  public dispose(): void {
    this.disable();
    this.detachVideoGraph();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.ttsGainNode = null;
    this.cache.clear();
  }
}
