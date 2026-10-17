// Everything is synthesised with WebAudio: a nyckelharpa-like drone,
// wind, and short sounds for cars, hits, deaths and broken verses.

type Ctx = AudioContext;

function noiseBuffer(ctx: Ctx, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export class Sound {
  private ctx?: Ctx;
  private master?: GainNode;
  private droneBus?: GainNode;
  private noise?: AudioBuffer;
  muted = false;

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
    this.noise = noiseBuffer(ctx, 2);
    this.drone();
    this.wind();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2);
  }

  private drone() {
    const ctx = this.ctx!;
    const bus = ctx.createGain();
    bus.gain.value = 0.05;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.Q.value = 3;
    bus.connect(lp).connect(this.master!);
    this.droneBus = bus;
    // D and A with a high sympathetic D, slightly detuned like resonance strings.
    for (const [f, g] of [[73.42, 1], [73.7, 0.6], [110, 0.7], [146.83, 0.35], [293.66, 0.12]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(bus);
      o.start();
    }
    // Slow bowing: breathe the filter.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
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
    src.connect(bp).connect(g).connect(this.master!);
    src.start();
    lfo.start();
  }

  car(heavy: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(heavy ? 900 : 1600, t + 0.8);
    bp.frequency.exponentialRampToValueAtTime(200, t + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(heavy ? 0.55 : 0.35, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + 2.1);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(heavy ? 70 : 110, t);
    o.frequency.linearRampToValueAtTime(heavy ? 48 : 70, t + 1.8);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.06, t + 0.8);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    o.connect(og).connect(this.master!);
    o.start(t);
    o.stop(t + 2);
  }

  hit() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.7;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.55);
  }

  death() {
    const ctx = this.ctx;
    if (!ctx || !this.droneBus) return;
    const t = ctx.currentTime;
    // The drone falls silent, one low string sounds, then the drone returns.
    this.droneBus.gain.cancelScheduledValues(t);
    this.droneBus.gain.setTargetAtTime(0.004, t, 0.4);
    this.droneBus.gain.setTargetAtTime(0.05, t + 5, 2.5);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 55;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.3, t + 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    o.connect(g).connect(this.master!);
    o.start(t + 1.2);
    o.stop(t + 6.2);
  }

  flip() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const f of [146.83, 155.56, 220]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(lp).connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 3.1);
    }
  }

  safe() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [587.33, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.09, t + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 2.2);
      o.connect(g).connect(this.master!);
      o.start(t + i * 0.18);
      o.stop(t + i * 0.18 + 2.3);
    });
  }
}
