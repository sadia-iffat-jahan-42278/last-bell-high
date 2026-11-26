// Synthesised audio: SFX + generative lo-fi music. No audio files needed.
const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

export type MusicMode = 'explore' | 'tense' | 'boss' | 'night';
export type SfxName =
  | 'click'
  | 'hover'
  | 'ok'
  | 'correct'
  | 'wrong'
  | 'coin'
  | 'star'
  | 'level'
  | 'bell'
  | 'door'
  | 'tick'
  | 'hit'
  | 'boss'
  | 'win'
  | 'lose'
  | 'whoosh'
  | 'stamp'
  | 'power'
  | 'meow'
  | 'splash';

interface OscOptions {
  /** Exponentially slide the pitch to freq * slide over the note. */
  slide?: number;
  attack?: number;
  bus?: AudioNode;
}

type Chord = [root: number, quality: 'm' | 'M'];

const PROGRESSIONS: Record<MusicMode, Chord[]> = {
  boss: [
    [45, 'm'],
    [41, 'M'],
    [43, 'M'],
    [40, 'M'],
  ],
  tense: [
    [52, 'm'],
    [48, 'M'],
    [43, 'M'],
    [50, 'm'],
  ],
  night: [
    [57, 'm'],
    [53, 'M'],
    [48, 'M'],
    [55, 'M'],
  ],
  explore: [
    [57, 'm'],
    [53, 'M'],
    [48, 'M'],
    [55, 'M'],
  ],
};
const BPM: Record<MusicMode, number> = { explore: 84, tense: 108, boss: 132, night: 70 };
const SCALE = [0, 3, 5, 7, 10, 12, 15];

class SoundEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicG: GainNode | null = null;
  sfxG: GainNode | null = null;
  vol = { music: 0.5, sfx: 0.8 };
  mode: MusicMode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextT = 0;
  private bpm = 84;
  private prog: Chord[] = PROGRESSIONS.explore;
  private noiseBuf: AudioBuffer | null = null;

  /** Create the AudioContext on first user gesture and resume it if the browser suspended it. */
  init(): void {
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicG = ctx.createGain();
      this.sfxG = ctx.createGain();
      this.musicG.connect(this.master);
      this.sfxG.connect(this.master);
      this.setVolumes(this.vol.music, this.vol.sfx);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(music: number, sfx: number): void {
    this.vol = { music, sfx };
    if (this.ctx && this.musicG && this.sfxG) {
      // Cancel any running fade-in first, otherwise it would finish at the old volume.
      this.musicG.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicG.gain.setValueAtTime(music * 0.55, this.ctx.currentTime);
      this.sfxG.gain.value = sfx;
    }
  }

  setMuted(muted: boolean): void {
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  osc(
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType = 'sine',
    vol = 0.15,
    o: OscOptions = {},
  ): void {
    const c = this.ctx;
    if (!c || !this.sfxG) return;
    const g = c.createGain();
    const os = c.createOscillator();
    os.type = type;
    os.frequency.setValueAtTime(freq, t);
    if (o.slide) os.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.slide), t + dur);
    const attack = o.attack ?? 0.008;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g);
    g.connect(o.bus ?? this.sfxG);
    os.start(t);
    os.stop(t + dur + 0.05);
  }

  noise(t: number, dur: number, vol = 0.1, hp = 4000, bus?: AudioNode): void {
    const c = this.ctx;
    if (!c || !this.sfxG || !this.noiseBuf) return;
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = this.noiseBuf;
    f.type = 'highpass';
    f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus ?? this.sfxG);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  kick(t: number, bus?: AudioNode): void {
    this.osc(120, t, 0.18, 'sine', 0.5, { slide: 0.3, bus: bus ?? this.musicG ?? undefined });
  }

  hat(t: number, bus?: AudioNode, v = 0.05): void {
    this.noise(t, 0.05, v, 7000, bus ?? this.musicG ?? undefined);
  }

  sfx(name: SfxName, n = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'click':
        this.osc(660, t, 0.06, 'triangle', 0.12);
        break;
      case 'hover':
        this.osc(900, t, 0.03, 'sine', 0.04);
        break;
      case 'ok':
        this.osc(523, t, 0.1, 'triangle', 0.15);
        this.osc(784, t + 0.08, 0.16, 'triangle', 0.15);
        break;
      case 'correct': {
        const base = 523 * Math.pow(2, (Math.min(n, 7) / 12) * 1.5);
        this.osc(base, t, 0.12, 'triangle', 0.18);
        this.osc(base * 1.5, t + 0.07, 0.2, 'triangle', 0.16);
        break;
      }
      case 'wrong':
        this.osc(190, t, 0.28, 'sawtooth', 0.12, { slide: 0.6 });
        this.osc(140, t + 0.1, 0.3, 'square', 0.07, { slide: 0.6 });
        break;
      case 'coin':
        this.osc(988, t, 0.07, 'square', 0.07);
        this.osc(1319, t + 0.07, 0.2, 'square', 0.07);
        break;
      case 'star':
        [784, 988, 1175, 1568].forEach((f, i) => this.osc(f, t + i * 0.06, 0.25, 'triangle', 0.14));
        break;
      case 'level':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc(f, t + i * 0.09, 0.3, 'triangle', 0.17));
        break;
      case 'bell':
        for (let i = 0; i < 3; i++) {
          [880, 1318, 1760].forEach((f, k) => this.osc(f, t + i * 0.5, 1.2, 'sine', 0.08 / (k + 1)));
        }
        break;
      case 'door':
        this.osc(140, t, 0.2, 'triangle', 0.2, { slide: 0.5 });
        this.noise(t, 0.15, 0.05, 800);
        break;
      case 'tick':
        this.osc(1400, t, 0.03, 'square', 0.04);
        break;
      case 'hit':
        this.osc(220, t, 0.18, 'sawtooth', 0.2, { slide: 0.3 });
        this.noise(t, 0.12, 0.12, 600);
        break;
      case 'boss':
        this.osc(98, t, 0.8, 'sawtooth', 0.14, { slide: 0.5 });
        this.osc(147, t, 0.8, 'square', 0.08, { slide: 0.5 });
        break;
      case 'win':
        [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.osc(f, t + i * 0.11, 0.25, 'triangle', 0.17));
        break;
      case 'lose':
        [392, 349, 311, 262].forEach((f, i) => this.osc(f, t + i * 0.16, 0.35, 'triangle', 0.14));
        break;
      case 'whoosh':
        this.noise(t, 0.3, 0.07, 1200);
        break;
      case 'stamp':
        this.osc(90, t, 0.25, 'sine', 0.4, { slide: 0.4 });
        this.noise(t, 0.1, 0.1, 500);
        break;
      case 'power':
        this.osc(440, t, 0.3, 'sawtooth', 0.1, { slide: 3 });
        break;
      case 'meow':
        this.osc(700, t, 0.25, 'triangle', 0.1, { slide: 1.5 });
        this.osc(900, t + 0.12, 0.2, 'triangle', 0.08, { slide: 0.6 });
        break;
      case 'splash':
        this.noise(t, 0.2, 0.05, 2000);
        break;
    }
  }

  /* ---- generative background music ---- */
  startMusic(mode: MusicMode = 'explore'): void {
    const c = this.ctx;
    if (!c || !this.musicG || this.mode === mode) return;
    this.mode = mode;
    this.step = 0;
    this.nextT = c.currentTime + 0.1;
    this.bpm = BPM[mode];
    this.prog = PROGRESSIONS[mode];
    this.musicG.gain.cancelScheduledValues(c.currentTime);
    this.musicG.gain.setValueAtTime(0.0001, c.currentTime);
    this.musicG.gain.linearRampToValueAtTime(this.vol.music * 0.55, c.currentTime + 1.5);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 80);
  }

  stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.mode = null;
    if (this.musicG && this.ctx) this.musicG.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
  }

  private schedule(): void {
    const c = this.ctx;
    const bus = this.musicG;
    if (!c || !bus || !this.mode) return;
    const stepDur = 60 / this.bpm / 2;
    const mode = this.mode;
    while (this.nextT < c.currentTime + 0.3) {
      const s = this.step;
      const bar = Math.floor(s / 8) % 4;
      const st = s % 8;
      const t = this.nextT;
      const [root, quality] = this.prog[bar];
      if (st === 0) {
        const intervals = quality === 'm' ? [0, 3, 7, 10] : [0, 4, 7, 11];
        for (const i of intervals) {
          this.osc(midi(root + 12 + i), t, stepDur * 7.5, 'triangle', mode === 'boss' ? 0.04 : 0.035, {
            attack: 0.25,
            bus,
          });
        }
      }
      if (st % 4 === 0 || (st === 6 && mode !== 'explore')) {
        this.osc(
          midi(root - 12),
          t,
          stepDur * 1.6,
          mode === 'boss' ? 'sawtooth' : 'sine',
          mode === 'boss' ? 0.07 : 0.16,
          { bus },
        );
      }
      if (st === 0 || st === 4 || (mode === 'boss' && st % 2 === 0)) this.kick(t);
      if (st % 2 === 1) this.hat(t, bus, mode === 'explore' ? 0.025 : 0.04);
      if ((mode === 'tense' || mode === 'boss') && (st === 2 || st === 6))
        this.noise(t, 0.12, 0.05, 1800, bus);
      if (st % 2 === 0 && Math.random() < (mode === 'explore' ? 0.38 : 0.5)) {
        const n = SCALE[Math.floor(Math.random() * SCALE.length)];
        this.osc(midi(root + 24 + n), t, stepDur * 2.2, 'sine', 0.05, { bus });
      }
      this.nextT += stepDur;
      this.step++;
    }
  }
}

export const Sound = new SoundEngine();
