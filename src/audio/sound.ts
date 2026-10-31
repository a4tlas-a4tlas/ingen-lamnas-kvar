// Everything is synthesised with WebAudio – no sound files. Three buses:
// - music: a nyckelharpa-like drone that follows the group's hope, a heartbeat at a
//   boss, and in trust a slow pentatonic melody now and then;
// - ambience: wind, and a bed for each region and time of day, and the fire's crackle;
// - effects: cars, blows, steps, cards, hope, the map and the end.
// The scene comes from the game state (`sceneOf`), set on every render.
import type { BlowKind, Size } from '../engine/types';
import { TITLE_SCENE, sameScene, type Scene } from './scene';

type Ctx = AudioContext;

function noiseBuffer(ctx: Ctx, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** The drone's strings: D, a detuned D, the minor third, A, and the octaves above. */
const STRINGS = [73.42, 73.7, 87.31, 110, 146.83, 220, 293.66] as const;
/** How loud each string is in each mood, and how open the filter. */
const MOOD_VOICE = {
  fortvivlan: { gains: [1, 0.5, 0.6, 0, 0.2, 0, 0], filter: 420, lfo: 120 },
  oro: { gains: [1, 0.6, 0, 0.7, 0.35, 0, 0.12], filter: 700, lfo: 260 },
  tillit: { gains: [1, 0.6, 0, 0.8, 0.5, 0.35, 0.25], filter: 1100, lfo: 320 },
} as const;
/** D major pentatonic, for trust's melody. */
const PENTA = [293.66, 329.63, 369.99, 440, 493.88, 587.33];

const MUSIC_KEY = 'ingen-lamnas-kvar/music';

export type EndKind = 'all' | 'some' | 'fallen';

export class Sound {
  private ctx?: Ctx;
  private master?: GainNode;
  private musicBus?: GainNode;
  private ambBus?: GainNode;
  private fxBus?: GainNode;
  private droneBus?: GainNode;
  private droneFilter?: BiquadFilterNode;
  private droneLfo?: GainNode;
  private voices: GainNode[] = [];
  private bed?: { filter: BiquadFilterNode; gain: GainNode };
  private noise?: AudioBuffer;
  private scene: Scene = TITLE_SCENE;
  private nextMelody = 0;
  private nextBeat = 0;
  muted = false;
  music = true;
  /** What was played, newest last: for tests and debugging. */
  trace: string[] = [];

  constructor() {
    try {
      this.music = localStorage.getItem(MUSIC_KEY) !== 'off';
    } catch {
      // No storage: music on.
    }
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(ctx.destination);
    const bus = (v: number) => { const g = ctx.createGain(); g.gain.value = v; g.connect(this.master!); return g; };
    this.musicBus = bus(this.music ? 1 : 0);
    this.ambBus = bus(1);
    this.fxBus = bus(1);
    this.noise = noiseBuffer(ctx, 2);
    this.drone();
    this.wind();
    this.applyScene(this.scene, true);
    window.setInterval(() => this.tick(), 250);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2);
  }

  setMusic(on: boolean) {
    this.music = on;
    try {
      localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off');
    } catch {
      // No storage: it lasts this session.
    }
    if (this.ctx && this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.4);
  }

  /** Where we are now. Called on every render; only a change does anything. */
  setScene(next: Scene) {
    if (sameScene(this.scene, next)) return;
    const prev = this.scene;
    this.scene = next;
    if (!this.ctx) return;
    this.applyScene(prev);
  }

  private mark(name: string) {
    this.trace.push(name);
    if (this.trace.length > 200) this.trace.shift();
  }

  // ------------------------------------------------------------ building blocks

  /** One note: an oscillator with an attack and a decay, on a bus. */
  private tone(bus: AudioNode, f: number, at: number, peak: number, attack: number, decay: number, type: OscillatorType = 'sine', glideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + attack + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + attack + decay + 0.05);
  }

  /** A burst of filtered noise. */
  private hiss(bus: AudioNode, at: number, dur: number, type: BiquadFilterType, f: number, peak: number, q = 1, fTo?: number, attack = 0.01) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f, at);
    if (fTo) flt.frequency.exponentialRampToValueAtTime(fTo, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(flt).connect(g).connect(bus);
    src.start(at, Math.random());
    src.stop(at + dur + 0.05);
  }

  // ------------------------------------------------------------ music

  private drone() {
    const ctx = this.ctx!;
    const bus = ctx.createGain();
    bus.gain.value = 0.05;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.Q.value = 3;
    bus.connect(lp).connect(this.musicBus!);
    this.droneBus = bus;
    this.droneFilter = lp;
    this.voices = STRINGS.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = MOOD_VOICE.oro.gains[i];
      o.connect(og).connect(bus);
      o.start();
      return og;
    });
    // Slow bowing: breathe the filter.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    this.droneLfo = lfoGain;
  }

  private wind() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.06;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lg = ctx.createGain();
    lg.gain.value = 220;
    lfo.connect(lg).connect(bp.frequency);
    src.connect(bp).connect(g).connect(this.ambBus!);
    src.start();
    lfo.start();
    // The region's bed: a second noise, shaped per scene.
    const bed = ctx.createBufferSource();
    bed.buffer = this.noise!;
    bed.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    bed.connect(filter).connect(gain).connect(this.ambBus!);
    bed.start();
    this.bed = { filter, gain };
  }

  /** Crossfade the drone and the bed to the scene; mark a change of mood with a chord. */
  private applyScene(prev: Scene, first = false) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const s = this.scene;
    const v = MOOD_VOICE[s.mood];
    const fire = s.phase === 'fire';
    this.voices.forEach((g, i) => g.gain.setTargetAtTime(v.gains[i], t, 1.2));
    this.droneFilter!.frequency.setTargetAtTime(fire ? v.filter * 0.6 : v.filter, t, 1.2);
    this.droneLfo!.gain.setTargetAtTime(v.lfo, t, 1.2);
    this.droneBus!.gain.setTargetAtTime(fire ? 0.03 : s.phase === 'end' ? 0.025 : 0.05, t, 1.5);
    const bed = BEDS[s.region ?? 'none']?.[s.night ? 1 : 0] ?? { f: 300, g: 0 };
    this.bed!.filter.frequency.setTargetAtTime(bed.f, t, 1.5);
    this.bed!.gain.gain.setTargetAtTime(s.phase === 'title' || s.phase === 'oath' ? 0 : s.phase === 'map' ? bed.g * 0.5 : bed.g, t, 1.5);
    if (!first && prev.mood !== s.mood && prev.phase !== 'title') this.moodChord(order(s.mood) > order(prev.mood));
    this.mark(`scene:${s.phase}:${s.region ?? '-'}:${s.night ? 'night' : 'day'}:${s.mood}${s.boss ? ':boss' : ''}`);
  }

  /** A shift of mood: a rising chord into trust, a falling one into despair. */
  private moodChord(up: boolean) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const notes = up ? [146.83, 185, 220, 293.66] : [220, 174.61, 146.83, 110];
    notes.forEach((f, i) => this.tone(this.musicBus!, f, t + i * 0.22, 0.05, 0.4, 2.6, 'triangle'));
    this.mark(up ? 'mood:up' : 'mood:down');
  }

  /** The clock of the music and the ambience: a heartbeat at a boss, a melody in trust, the region's sounds, the fire. */
  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const s = this.scene;
    if (s.boss && s.phase === 'danger' && t >= this.nextBeat) {
      // Lub-dub, about 50 a minute.
      this.tone(this.musicBus!, 52, t + 0.05, 0.22, 0.02, 0.25, 'sine', 38);
      this.tone(this.musicBus!, 48, t + 0.33, 0.14, 0.02, 0.22, 'sine', 36);
      this.nextBeat = t + 1.2;
    }
    if (s.mood === 'tillit' && (s.phase === 'map' || s.phase === 'danger' || s.phase === 'fire') && t >= this.nextMelody) {
      if (this.nextMelody > 0) this.melody(t);
      this.nextMelody = t + 20 + Math.random() * 20;
    }
    if (s.phase === 'fire') this.crackle(t);
    if (s.phase === 'map' || s.phase === 'danger' || s.phase === 'fire') this.ambience(t);
  }

  /** A few notes of the pentatonic, slow, like someone humming. */
  private melody(t: number, minor = false) {
    const scale = minor ? [293.66, 349.23, 392, 440, 523.25, 587.33] : PENTA;
    let i = Math.floor(Math.random() * 3) + 1;
    const n = 4 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      i = Math.max(0, Math.min(scale.length - 1, i + (Math.random() < 0.5 ? -1 : 1)));
      this.tone(this.musicBus!, scale[i], t + k * 0.9, 0.035, 0.3, 1.5, 'triangle');
    }
    this.mark('melody');
  }

  private crackle(t: number) {
    for (let k = 0; k < 3; k++) if (Math.random() < 0.35) this.hiss(this.ambBus!, t + Math.random() * 0.25, 0.03 + Math.random() * 0.04, 'highpass', 1800 + Math.random() * 2500, 0.06 + Math.random() * 0.08);
    if (Math.random() < 0.02) this.hiss(this.ambBus!, t, 0.3, 'bandpass', 600, 0.06, 2); // a log settles
  }

  /** The region's life, a sound now and then. */
  private ambience(t: number) {
    const s = this.scene;
    const bus = this.ambBus!;
    const chance = (p: number) => Math.random() < p * (s.phase === 'map' ? 0.5 : 1);
    const night = s.night;
    switch (s.region) {
      case 'dalen':
        if (!night && chance(0.05)) this.chirp(t, 2400 + Math.random() * 1600);
        if (night && chance(0.012)) this.hoot(t);
        break;
      case 'akrarna':
        if (!night && chance(0.04)) for (let k = 0; k < 6; k++) this.tone(bus, 3200 + Math.random() * 900, t + k * 0.07, 0.012, 0.01, 0.06, 'sine');
        if (night && chance(0.3)) this.cricket(t);
        break;
      case 'staden':
        if (night && chance(0.004)) this.tone(bus, 620, t, 0.012, 1.2, 2.5, 'triangle', 760);
        if (!night && chance(0.02)) this.hiss(bus, t, 2, 'lowpass', 300, 0.03, 1, 500, 0.8);
        break;
      case 'mossen':
        if (chance(night ? 0.04 : 0.025)) this.croak(t);
        if (!night && chance(0.006)) this.craneCall(t, 0.025);
        if (night && chance(0.03)) this.tone(bus, 1400 + Math.random() * 600, t, 0.02, 0.005, 0.08, 'sine', 700);
        break;
      case 'skogsbrynet':
        if (chance(0.01)) this.hiss(bus, t, 3, 'bandpass', 500, 0.04, 0.6, 900, 1.2);
        if (night && chance(0.01)) this.hoot(t);
        if (!night && chance(0.03)) this.chirp(t, 2000 + Math.random() * 1200);
        break;
    }
  }

  private chirp(t: number, f: number) {
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) this.tone(this.ambBus!, f, t + k * 0.12, 0.02, 0.01, 0.08, 'sine', f * 1.3);
  }
  private hoot(t: number) {
    this.tone(this.ambBus!, 380, t, 0.04, 0.08, 0.35, 'sine', 340);
    this.tone(this.ambBus!, 360, t + 0.6, 0.035, 0.1, 0.6, 'sine', 320);
  }
  private cricket(t: number) {
    for (let k = 0; k < 4; k++) this.tone(this.ambBus!, 4400, t + k * 0.045, 0.008, 0.005, 0.03, 'square');
  }
  private croak(t: number) {
    for (let k = 0; k < 3; k++) this.tone(this.ambBus!, 110 + Math.random() * 30, t + k * 0.09, 0.05, 0.01, 0.07, 'sawtooth', 80);
  }
  private craneCall(t: number, peak: number) {
    this.tone(this.ambBus!, 520, t, peak, 0.05, 0.4, 'sawtooth', 700);
    this.tone(this.ambBus!, 700, t + 0.5, peak, 0.05, 0.5, 'sawtooth', 560);
  }

  // ------------------------------------------------------------ effects

  car(heavy: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.hiss(this.fxBus!, t, 2, 'bandpass', 260, heavy ? 0.55 : 0.35, 1.2, heavy ? 900 : 1600, 0.8);
    this.tone(this.fxBus!, heavy ? 70 : 110, t, 0.06, 0.8, 1.1, 'sawtooth', heavy ? 48 : 70);
    this.mark('car');
  }

  hit() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.tone(this.fxBus!, 90, ctx.currentTime + 0.7, 0.5, 0.005, 0.5, 'sine', 38);
    this.mark('hit');
  }

  death() {
    const ctx = this.ctx;
    if (!ctx || !this.droneBus) return;
    const t = ctx.currentTime;
    // The drone falls silent, one low string sounds, then the drone returns.
    this.droneBus.gain.cancelScheduledValues(t);
    this.droneBus.gain.setTargetAtTime(0.004, t, 0.4);
    this.droneBus.gain.setTargetAtTime(this.scene.phase === 'fire' ? 0.03 : 0.05, t + 5, 2.5);
    this.tone(this.fxBus!, 55, t + 1.2, 0.3, 0.3, 4.5, 'triangle');
    this.mark('death');
  }

  flip() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const f of [146.83, 155.56, 220]) this.tone(this.fxBus!, f, t, 0.05, 0.9, 2.1, 'sawtooth');
    this.mark('flip');
  }

  safe() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [587.33, 880].forEach((f, i) => this.tone(this.fxBus!, f, t + i * 0.18, 0.09, 0.02, 2.2));
    this.mark('safe');
  }

  /** A blow lands. `delay` lets several play one after another. */
  blow(what: BlowKind, delay = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const fx = this.fxBus!;
    switch (what) {
      case 'fell':
        // A creak, then the crash and the ground's thud.
        this.tone(fx, 180, t, 0.05, 0.3, 0.5, 'sawtooth', 120);
        this.hiss(fx, t + 0.7, 1.4, 'lowpass', 2400, 0.5, 0.7, 200);
        this.tone(fx, 70, t + 0.75, 0.4, 0.01, 0.6, 'sine', 35);
        break;
      case 'doze':
        this.hiss(fx, t, 1.6, 'lowpass', 220, 0.4, 2, 140, 0.3);
        this.tone(fx, 46, t, 0.18, 0.3, 1.3, 'sawtooth', 40);
        break;
      case 'cut':
        for (let k = 0; k < 6; k++) this.hiss(fx, t + k * 0.12, 0.1, 'bandpass', 1600, 0.12, 3);
        this.tone(fx, 90, t, 0.08, 0.1, 0.8, 'sawtooth');
        break;
      case 'burst':
      case 'bigBurst': {
        const big = what === 'bigBurst';
        this.tone(fx, 900, t, 0.04, 0.05, 0.55, 'sine', 2400);
        this.hiss(fx, t + 0.6, big ? 1.4 : 0.8, 'lowpass', 3000, big ? 0.7 : 0.45, 0.7, 300, 0.005);
        if (big) for (let k = 0; k < 8; k++) this.hiss(fx, t + 0.9 + Math.random() * 0.8, 0.05, 'highpass', 3000, 0.12);
        break;
      }
      case 'shot':
        this.hiss(fx, t, 0.25, 'highpass', 900, 0.8, 0.7, undefined, 0.002);
        this.hiss(fx, t + 0.3, 1.2, 'lowpass', 800, 0.12, 0.7, 200, 0.05);
        break;
      case 'bark':
        for (let k = 0; k < 2; k++) {
          this.tone(fx, 420, t + k * 0.28, 0.18, 0.01, 0.14, 'sawtooth', 260);
          this.hiss(fx, t + k * 0.28, 0.12, 'bandpass', 900, 0.12, 2);
        }
        break;
      case 'suck':
        this.tone(fx, 160, t, 0.12, 0.05, 0.5, 'sine', 60);
        this.hiss(fx, t, 0.4, 'lowpass', 500, 0.1, 4, 150);
        break;
      case 'crane':
        this.craneCall(t, 0.08);
        break;
      case 'light':
        [1175, 1480, 1760].forEach((f, i) => this.tone(fx, f, t + i * 0.08, 0.015, 0.2, 1.4));
        break;
    }
    this.mark(`blow:${what}`);
  }

  /** A card is played: a soft flick. */
  card() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.hiss(this.fxBus!, ctx.currentTime, 0.09, 'highpass', 2500, 0.12, 0.8, 5000);
    this.mark('card');
  }

  /** A step, when we lead: the small high and light, the large low. */
  step(size: Size) {
    const ctx = this.ctx;
    if (!ctx) return;
    const f = size === 'small' ? 900 : size === 'medium' ? 400 : 180;
    const t = ctx.currentTime;
    this.hiss(this.fxBus!, t, 0.08, 'bandpass', f, 0.18, 2);
    this.hiss(this.fxBus!, t + 0.16, 0.08, 'bandpass', f * 0.9, 0.14, 2);
    this.mark(`step:${size}`);
  }

  /** No Kraft left this hour: a hollow chime. */
  empty() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.tone(this.fxBus!, 392, ctx.currentTime, 0.05, 0.01, 1.4, 'triangle');
    this.tone(this.fxBus!, 277.18, ctx.currentTime + 0.05, 0.03, 0.01, 1.4, 'triangle');
    this.mark('empty');
  }

  /** Hope moves: two notes up, or down. */
  hope(delta: number) {
    const ctx = this.ctx;
    if (!ctx || !delta) return;
    const t = ctx.currentTime + 0.2;
    const [a, b] = delta > 0 ? [440, 587.33] : [440, 349.23];
    this.tone(this.fxBus!, a, t, 0.06, 0.02, 0.5, 'triangle');
    this.tone(this.fxBus!, b, t + 0.18, 0.06, 0.02, 0.8, 'triangle');
    this.mark(delta > 0 ? 'hope:up' : 'hope:down');
  }

  /** Belief moves, softer than hope: one note. */
  belief(delta: number) {
    const ctx = this.ctx;
    if (!ctx || !delta) return;
    this.tone(this.fxBus!, delta > 0 ? 659.25 : 311.13, ctx.currentTime + 0.1, 0.025, 0.02, 0.5, 'sine');
    this.mark(delta > 0 ? 'belief:up' : 'belief:down');
  }

  /** On the map: footsteps on the way. */
  travel() {
    const ctx = this.ctx;
    if (!ctx) return;
    for (let k = 0; k < 4; k++) this.hiss(this.fxBus!, ctx.currentTime + k * 0.22, 0.08, 'bandpass', 500 + (k % 2) * 120, 0.14, 2);
    this.mark('travel');
  }

  /** A meeting opens: a short motif – a brighter one for a find. */
  meeting(find: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.3;
    const notes = find ? [587.33, 739.99, 880] : [293.66, 349.23, 440];
    notes.forEach((f, i) => this.tone(this.fxBus!, f, t + i * 0.25, 0.05, 0.05, 1.2, 'triangle'));
    this.mark(find ? 'meeting:find' : 'meeting');
  }

  /** The end: a full cadence and the melody when no one was left; slower, in minor, when some were; the drone dying alone when all fell. */
  end(kind: EndKind) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.5;
    if (kind === 'fallen') {
      this.droneBus!.gain.setTargetAtTime(0.0001, t, 4);
    } else {
      const chords = kind === 'all' ? [[146.83, 220, 293.66], [196, 246.94, 293.66], [220, 277.18, 329.63], [146.83, 220, 293.66, 369.99]] : [[146.83, 174.61, 220], [130.81, 196, 261.63], [110, 164.81, 220], [146.83, 220, 293.66]];
      chords.forEach((ch, i) => ch.forEach((f) => this.tone(this.musicBus!, f, t + i * 1.6, 0.04, 0.6, 2.4, 'triangle')));
      window.setTimeout(() => this.ctx && this.melody(this.ctx.currentTime, kind !== 'all'), 7000);
    }
    this.mark(`end:${kind}`);
  }
}

const order = (m: Scene['mood']) => ({ fortvivlan: 0, oro: 1, tillit: 2 })[m];

/** Each region's bed of sound, by day and by night: a lowpassed noise, its cutoff and level. */
const BEDS: Record<string, [{ f: number; g: number }, { f: number; g: number }]> = {
  dalen: [{ f: 600, g: 0.015 }, { f: 300, g: 0.01 }],
  akrarna: [{ f: 900, g: 0.02 }, { f: 2600, g: 0.006 }],
  staden: [{ f: 160, g: 0.06 }, { f: 120, g: 0.04 }],
  mossen: [{ f: 400, g: 0.012 }, { f: 250, g: 0.008 }],
  skogsbrynet: [{ f: 700, g: 0.03 }, { f: 450, g: 0.025 }],
};
