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
    baseRate: 1.04,
    basePitch: 0.96,
    detuneCents: 0,
    gender: 'M',
  },
  Male_Char_2: {
    id: 'Male_Char_2',
    voice: 'en-IN-PrabhatNeural',
    baseRate: 1.08,
    basePitch: 1.06,
    detuneCents: 45,
    gender: 'M',
  },
  Male_Char_3: {
    id: 'Male_Char_3',
    voice: 'hi-IN-MadhurNeural',
    baseRate: 1.01,
    basePitch: 0.88,
    detuneCents: -115,
    gender: 'M',
  },
  Female_Lead_1: {
    id: 'Female_Lead_1',
    voice: 'hi-IN-SwaraNeural',
    baseRate: 1.05,
    basePitch: 1.03,
    detuneCents: 0,
    gender: 'F',
  },
  Female_Char_2: {
    id: 'Female_Char_2',
    voice: 'en-IN-NeerjaNeural',
    baseRate: 1.06,
    basePitch: 0.96,
    detuneCents: -40,
    gender: 'F',
  },
  Female_Char_3: {
    id: 'Female_Char_3',
    voice: 'hi-IN-SwaraNeural',
    baseRate: 1.11,
    basePitch: 1.11,
    detuneCents: 95,
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
  explicitGender: 'M' | 'F' | null;
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
    /\b(m|male|man|boy|mr|sir|dad|father|bro|brother|uncle|king|prince|oppa|hyung|dadaji|papa|bhai|hero|chief|director|chairman|ceo|boss)\b/i.test(
      n
    )
  ) {
    return 'M';
  }
  if (
    /\b(f|female|woman|lady|girl|ms|mrs|miss|maam|mom|mother|sis|sister|aunt|queen|princess|unnie|noona|didi|madam)\b/i.test(
      n
    )
  ) {
    return 'F';
  }
  if (/[aeiy]$/.test(n) && n.length > 2) return 'F';
  return null;
}

// Layer 2: Hindi & English grammatical / lexical gender cue detection
function detectGrammarGenderFromText(text: string): 'M' | 'F' | null {
  const t = text.trim();
  const malePatterns = [
    /रहा\s*(?:हूँ|हुँ|था|होगा)/,
    /करूँगा|करूंगा|जाऊँगा|जाऊंगा|बताऊँगा|बताऊंगा|आऊँगा|आऊंगा|देखूँगा|देखूंगा|बोलूँगा|बोलूंगा/,
    /आया\s*(?:हूँ|हुँ|था)|गया\s*(?:हूँ|हुँ|था)|बैठा\s*(?:हूँ|हुँ|था)|खड़ा\s*(?:हूँ|हुँ|था)/,
    /मेरा\s+(?:भाई|नाम|बाप|पिता)/,
    /मैं\s+करता|मैं\s+जानता|मैं\s+समझता|मैं\s+सोचता/,
    /\[(?:M|Male)\b[^\]]*\]/i,
    /\b(?:he says|my wife|i am a man|i'm a man|as a father|as your brother|husband)\b/i,
  ];
  const femalePatterns = [
    /रही\s*(?:हूँ|हुँ|थी|होगी)/,
    /करूँगी|करूंगी|जाऊँगी|जाऊंगी|बताऊँगी|बताऊंगी|आऊँगी|आऊंगी|देखूँगी|देखूंगी|बोलूँगी|बोलूंगी/,
    /आई\s*(?:हूँ|हुँ|थी)|गई\s*(?:हूँ|हुँ|थी)|बैठी\s*(?:हूँ|हुँ|थी)|खड़ी\s*(?:हूँ|हुँ|थी)/,
    /मेरी\s+(?:बहन|माँ)/,
    /मैं\s+करती|मैं\s+जानती|मैं\s+समझती|मैं\s+सोचती/,
    /\[(?:F|Female)\b[^\]]*\]/i,
    /\b(?:she says|my husband|i am a woman|i'm a woman|as a mother|as your sister|wife)\b/i,
  ];

  const isMale = malePatterns.some((re) => re.test(t));
  const isFemale = femalePatterns.some((re) => re.test(t));
  if (isMale && !isFemale) return 'M';
  if (isFemale && !isMale) return 'F';
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

// Lightweight time-domain autocorrelation F0 pitch detector (80Hz - 320Hz)
function estimateF0FromSamples(buf: Float32Array, sampleRate: number): number | null {
  const size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += buf[i] * buf[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.015) return null; // Too quiet / silence

  const minLag = Math.max(20, Math.floor(sampleRate / 320));
  const maxLag = Math.min(size >> 1, Math.floor(sampleRate / 80));
  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i < size - lag; i += 2) {
      const a = buf[i];
      const b = buf[i + lag];
      sum += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const denom = Math.sqrt(energyA * energyB);
    const corr = denom > 0 ? sum / denom : 0;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestCorr < 0.45 || bestLag <= 0) return null;
  const f0 = sampleRate / bestLag;
  return f0 >= 80 && f0 <= 320 ? f0 : null;
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

  // WebAudio Center-Channel Vocal Canceller (Mid-Side + -40dB vocal notch) & Pitch Analyser
  private attachedVideo: HTMLVideoElement | null = null;
  private videoSourceNode: MediaElementAudioSourceNode | null = null;
  private vocalAnalyser: AnalyserNode | null = null;
  private midSideDryGain: GainNode | null = null;
  private midSideCancellerGain: GainNode | null = null;
  private splitterNode: ChannelSplitterNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private invertLeftGain: GainNode | null = null;
  private invertRightGain: GainNode | null = null;
  private vocalNotchLow: BiquadFilterNode | null = null;
  private vocalNotchMid: BiquadFilterNode | null = null;
  private vocalNotchHigh: BiquadFilterNode | null = null;
  private subBassPreserveFilter: BiquadFilterNode | null = null;
  private ambiencePreserveFilter: BiquadFilterNode | null = null;
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
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  private isSameOriginOrCorsSafe(video: HTMLVideoElement): boolean {
    try {
      const src = video.currentSrc || video.src || '';
      if (!src) return false;
      if (src.startsWith('/') || src.startsWith('blob:')) return true;
      if (src.startsWith(window.location.origin)) return true;
      return video.crossOrigin === 'anonymous';
    } catch {
      return false;
    }
  }

  private ensureVideoBgmGraph(): boolean {
    if (this.isExternalAudioMode || !this.attachedVideo || this.corsAudioBlocked) {
      return false;
    }
    if (!this.isSameOriginOrCorsSafe(this.attachedVideo)) {
      return false;
    }
    const ctx = this.ensureAudioContext();
    if (!ctx) return false;

    if (!this.videoSourceNode) {
      try {
        const srcNode = ctx.createMediaElementSource(this.attachedVideo);
        this.videoSourceNode = srcNode;

        // Pre-subtraction pitch analyser (Layer 1 Acoustic F0)
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        this.vocalAnalyser = analyser;
        srcNode.connect(analyser);

        // Master output gain for BGM bed
        const outGain = ctx.createGain();
        outGain.gain.value = 1.0;
        this.videoGainNode = outGain;
        outGain.connect(ctx.destination);

        // Dry path (used when Subtitle Dub is OFF)
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1.0;
        this.midSideDryGain = dryGain;
        srcNode.connect(dryGain);
        dryGain.connect(outGain);

        // Mid-Side Center Vocal Canceller path (used when Subtitle Dub is ON)
        // 1) Stereo Side difference: Left - Right cancels center-panned dialogue
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.0;
        this.midSideCancellerGain = wetGain;

        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);
        const invL = ctx.createGain();
        invL.gain.value = -1;
        const invR = ctx.createGain();
        invR.gain.value = -1;

        this.splitterNode = splitter;
        this.mergerNode = merger;
        this.invertLeftGain = invL;
        this.invertRightGain = invR;

        // L_out = L - R ; R_out = R - L
        srcNode.connect(splitter);
        splitter.connect(merger, 0, 0);
        splitter.connect(invR, 1);
        invR.connect(merger, 0, 0);

        splitter.connect(merger, 1, 1);
        splitter.connect(invL, 0);
        invL.connect(merger, 0, 1);

        // 2) Steep -40dB multi-band vocal notch across 220Hz-3800Hz on side bus
        const n1 = ctx.createBiquadFilter();
        n1.type = 'peaking';
        n1.frequency.value = 420;
        n1.Q.value = 1.1;
        n1.gain.value = -24;

        const n2 = ctx.createBiquadFilter();
        n2.type = 'peaking';
        n2.frequency.value = 1250;
        n2.Q.value = 0.75;
        n2.gain.value = -40;

        const n3 = ctx.createBiquadFilter();
        n3.type = 'peaking';
        n3.frequency.value = 2850;
        n3.Q.value = 1.1;
        n3.gain.value = -28;

        this.vocalNotchLow = n1;
        this.vocalNotchMid = n2;
        this.vocalNotchHigh = n3;

        merger.connect(n1);
        n1.connect(n2);
        n2.connect(n3);
        n3.connect(wetGain);

        // 3) Warm Sub-Bass (<160Hz) & Airy Ambience (>4800Hz) preservation shelves
        const subLp = ctx.createBiquadFilter();
        subLp.type = 'lowpass';
        subLp.frequency.value = 160;
        subLp.Q.value = 0.7;
        const subBoost = ctx.createGain();
        subBoost.gain.value = 0.75;
        this.subBassPreserveFilter = subLp;

        const airHp = ctx.createBiquadFilter();
        airHp.type = 'highpass';
        airHp.frequency.value = 4800;
        airHp.Q.value = 0.7;
        const airBoost = ctx.createGain();
        airBoost.gain.value = 0.6;
        this.ambiencePreserveFilter = airHp;

        srcNode.connect(subLp);
        subLp.connect(subBoost);
        subBoost.connect(wetGain);

        srcNode.connect(airHp);
        airHp.connect(airBoost);
        airBoost.connect(wetGain);

        wetGain.connect(outGain);
      } catch {
        this.corsAudioBlocked = true;
        return false;
      }
    }
    return true;
  }

  private detachVideoGraph(): void {
    try {
      this.videoSourceNode?.disconnect();
      this.vocalAnalyser?.disconnect();
      this.midSideDryGain?.disconnect();
      this.midSideCancellerGain?.disconnect();
      this.splitterNode?.disconnect();
      this.mergerNode?.disconnect();
      this.invertLeftGain?.disconnect();
      this.invertRightGain?.disconnect();
      this.vocalNotchLow?.disconnect();
      this.vocalNotchMid?.disconnect();
      this.vocalNotchHigh?.disconnect();
      this.subBassPreserveFilter?.disconnect();
      this.ambiencePreserveFilter?.disconnect();
      this.videoGainNode?.disconnect();
    } catch {}
    this.videoSourceNode = null;
    this.vocalAnalyser = null;
    this.midSideDryGain = null;
    this.midSideCancellerGain = null;
    this.splitterNode = null;
    this.mergerNode = null;
    this.invertLeftGain = null;
    this.invertRightGain = null;
    this.vocalNotchLow = null;
    this.vocalNotchMid = null;
    this.vocalNotchHigh = null;
    this.subBassPreserveFilter = null;
    this.ambiencePreserveFilter = null;
    this.videoGainNode = null;
    this.corsAudioBlocked = false;
  }

  // Layer 1 Acoustic Pitch Sample (~45-90ms look-sample from video audio)
  private detectAcousticPitchGender(): 'M' | 'F' | null {
    if (!this.vocalAnalyser || !this.audioCtx) return null;
    try {
      const sampleBuf = new Float32Array(this.vocalAnalyser.fftSize);
      this.vocalAnalyser.getFloatTimeDomainData(sampleBuf);
      const f0 = estimateF0FromSamples(sampleBuf, this.audioCtx.sampleRate);
      if (f0 === null) return null;
      if (f0 >= 82 && f0 <= 168) return 'M';
      if (f0 >= 172 && f0 <= 315) return 'F';
      return null;
    } catch {
      return null;
    }
  }

  private applyBgmDucking(speakingNow: boolean): void {
    if (!this.enabled || this.isExternalAudioMode || !this.attachedVideo) return;
    if (this.duckHoldTimer) {
      clearTimeout(this.duckHoldTimer);
      this.duckHoldTimer = null;
    }

    const targetGain = speakingNow ? 0.18 : 0.34;
    const hasGraph = this.ensureVideoBgmGraph();

    if (
      hasGraph &&
      this.audioCtx &&
      this.midSideDryGain &&
      this.midSideCancellerGain &&
      this.videoGainNode
    ) {
      const now = this.audioCtx.currentTime;
      this.midSideDryGain.gain.setTargetAtTime(0.0, now, 0.05);
      this.midSideCancellerGain.gain.setTargetAtTime(1.0, now, 0.05);
      this.videoGainNode.gain.setTargetAtTime(targetGain, now, 0.07);
    } else {
      try {
        this.attachedVideo.volume = speakingNow ? 0.09 : 0.22;
      } catch {}
    }
  }

  private restoreVideoAudio(): void {
    if (this.duckHoldTimer) {
      clearTimeout(this.duckHoldTimer);
      this.duckHoldTimer = null;
    }
    if (
      this.audioCtx &&
      this.midSideDryGain &&
      this.midSideCancellerGain &&
      this.videoGainNode
    ) {
      const now = this.audioCtx.currentTime;
      this.midSideCancellerGain.gain.setTargetAtTime(0.0, now, 0.04);
      this.midSideDryGain.gain.setTargetAtTime(1.0, now, 0.04);
      this.videoGainNode.gain.setTargetAtTime(1.0, now, 0.05);
    }
    if (this.attachedVideo && !this.isExternalAudioMode) {
      try {
        this.attachedVideo.volume = Math.max(0.25, this.originalVideoVolume || 1);
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
      // NEVER cut off active speech mid-word; queue smoothly
      this.enqueueCue(cueIndex);
    }
  }

  private assignNamedProfile(speakerKey: string, textGrammarGender: 'M' | 'F' | null): ProfileId {
    const cleanKey = speakerKey.trim().toLowerCase();
    const existing = this.speakerMap.get(cleanKey);
    if (existing) return existing;

    const hint = guessGenderFromName(cleanKey) || textGrammarGender;
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
    if (t === 'M1' || t === 'MALE1' || t === 'M' || t === 'MALE') return 'Male_Lead_1';
    if (t === 'M2' || t === 'MALE2') return 'Male_Char_2';
    if (t === 'M3' || t === 'MALE3') return 'Male_Char_3';
    if (t === 'F1' || t === 'FEMALE1' || t === 'F' || t === 'FEMALE') return 'Female_Lead_1';
    if (t === 'F2' || t === 'FEMALE2') return 'Female_Char_2';
    if (t === 'F3' || t === 'FEMALE3') return 'Female_Char_3';
    return null;
  }

  private parseCueDialogueTurns(cueIndex: number, liveAcousticGender: 'M' | 'F' | null = null): DialogueTurn[] {
    const cue = this.cues[cueIndex];
    if (!cue) return [];

    const cleanedRaw = stripSrtMarkup(cue.text);
    if (isNonSpeechCaption(cleanedRaw)) return [];

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
      let explicitGender: 'M' | 'F' | null = null;

      // Strip [M]/[F]/[Male]/[Female] cues & lock gender
      const tagMatch = text.match(/^\[(M[123]?|F[123]?|Male[123]?|Female[123]?)\]\s*(.+)$/i);
      if (tagMatch) {
        profileId = this.resolveTagToken(tagMatch[1]);
        explicitGender = tagMatch[1].toUpperCase().startsWith('M') ? 'M' : 'F';
        text = tagMatch[2].trim();
      }

      const grammarGender = detectGrammarGenderFromText(text);
      if (!explicitGender && grammarGender) {
        explicitGender = grammarGender;
      }

      // Named speaker "Minho: ..." or "Kang:"
      if (!profileId) {
        const nameMatch = text.match(/^([A-Za-z][A-Za-z0-9 ._-]{1,22}):\s+(.+)$/);
        if (nameMatch) {
          profileId = this.assignNamedProfile(nameMatch[1], explicitGender);
          explicitGender = CHARACTER_PROFILES[profileId].gender;
          text = nameMatch[2].trim();
        }
      }

      // Gender-matched selection across Layer 1 Acoustic F0 & Layer 2 Grammar cues
      if (!profileId) {
        const chosenGender = explicitGender || (idx === 0 ? liveAcousticGender : null);
        if (chosenGender === 'M') {
          profileId = MALE_PROFILES[this.nextMaleIdx % MALE_PROFILES.length];
          if (segments.length > 1 || seg.trim().startsWith('-') || gapSincePrev > 1.25) {
            this.nextMaleIdx++;
          }
          explicitGender = 'M';
        } else if (chosenGender === 'F') {
          profileId = FEMALE_PROFILES[this.nextFemaleIdx % FEMALE_PROFILES.length];
          if (segments.length > 1 || seg.trim().startsWith('-') || gapSincePrev > 1.25) {
            this.nextFemaleIdx++;
          }
          explicitGender = 'F';
        } else {
          if (segments.length > 1 || seg.trim().startsWith('-') || gapSincePrev > 1.25) {
            this.lastUnlabeledProfileIdx = (this.lastUnlabeledProfileIdx + 1) % PROFILE_ROTATION.length;
          }
          profileId = PROFILE_ROTATION[this.lastUnlabeledProfileIdx];
        }
      }

      if (!text || isNonSpeechCaption(text)) return;
      const emo = detectEmotionModifiers(text);
      turns.push({
        text,
        profileId,
        explicitGender,
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

  // Pre-fetch & decode next 8 cues ahead smoothly so every line starts at 0ms delay
  private prefetchAround(cueIndex: number): void {
    const start = Math.max(0, cueIndex);
    const end = Math.min(this.cues.length - 1, start + 7);
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

  private getCueWindowSeconds(cueIndex: number): number {
    const cue = this.cues[cueIndex];
    if (!cue) return 1.5;
    const nextCue = cueIndex + 1 < this.cues.length ? this.cues[cueIndex + 1] : null;
    const hardEnd = nextCue ? Math.min(cue.end, nextCue.start) : cue.end;
    return Math.max(1.2, hardEnd - cue.start);
  }

  private enqueueCue(cueIndex: number): void {
    const cue = this.cues[cueIndex];
    if (!cue) return;
    const cueDuration = this.getCueWindowSeconds(cueIndex);

    // Sample acoustic pitch before vocal muting if no grammatical/speaker gender locked
    const acousticGender = this.detectAcousticPitchGender();
    const turns = this.parseCueDialogueTurns(cueIndex, acousticGender);
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
        // Fit speech cleanly inside exact cue window [0.96x .. 1.28x] * video.playbackRate
        const naturalFit = buffer.duration / Math.max(0.85, cueDuration - 0.08);
        const syncedRate = Math.min(1.28, Math.max(0.96, naturalFit)) * this.videoPlaybackRate;
        source.playbackRate.value = Math.min(1.8, Math.max(0.75, syncedRate));

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
        utter.rate = Math.min(1.35, Math.max(0.95, profile.baseRate * turn.rateMult * this.videoPlaybackRate));
        utter.pitch = Math.min(1.4, Math.max(0.72, profile.basePitch * turn.pitchMult));
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
