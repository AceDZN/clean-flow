// Small synthesized sound kit (WebAudio, no files). Starts after the first user gesture.
export type Sfx = 'combo' | 'rush' | 'place' | 'connect' | 'clank' | 'chime' | 'ptui' | 'siren' | 'stamp' | 'wrongstamp' | 'whoosh' | 'win' | 'fail' | 'gurgle' | 'click' | 'hiss' | 'reveal';

export class Audio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;
  private last = new Map<Sfx, number>();
  private noise: AudioBuffer | null = null;
  private ambient: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  private startAmbient(): void {
    if (!this.ctx || !this.noise || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.04;
    src.connect(f).connect(gain).connect(this.master);
    src.start();
    this.ambient = { src, gain };
  }

  /** flow level 0..1 raises the gentle pipe rush */
  setFlow(level: number): void {
    if (this.ambient && this.ctx) this.ambient.gain.gain.setTargetAtTime(0.03 + level * 0.07, this.ctx.currentTime, 0.3);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private hissNoise(dur: number, freq: number, vol: number, q = 1, delay = 0): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  play(s: Sfx): void {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    const minGap = s === 'chime' || s === 'gurgle' || s === 'clank' || s === 'hiss' ? 90 : 40;
    if (now - (this.last.get(s) ?? 0) < minGap) return;
    this.last.set(s, now);
    switch (s) {
      case 'place': this.tone(180, 0.18, 'triangle', 0.4, -60); this.hissNoise(0.15, 900, 0.3, 2); break;
      case 'connect': this.tone(520, 0.12, 'sine', 0.25, 300); this.tone(880, 0.15, 'sine', 0.18, 0, 0.06); break;
      case 'clank': this.tone(310 + Math.random() * 60, 0.12, 'square', 0.06, -80); this.hissNoise(0.06, 3000, 0.08, 4); break;
      case 'chime': { const b = [660, 830, 990][Math.floor(Math.random() * 3)]; this.tone(b, 0.35, 'sine', 0.18); this.tone(b * 1.5, 0.3, 'sine', 0.08, 0, 0.05); break; }
      case 'ptui': this.tone(500, 0.25, 'square', 0.12, -380); this.hissNoise(0.25, 1200, 0.25, 1.5); break;
      case 'siren': this.tone(440, 0.5, 'sawtooth', 0.06, 220); break;
      case 'stamp': this.tone(120, 0.12, 'square', 0.25, -40); this.hissNoise(0.08, 400, 0.4, 1); this.tone(990, 0.3, 'sine', 0.15, 0, 0.08); break;
      case 'wrongstamp': this.tone(200, 0.2, 'triangle', 0.2, -90); break;
      case 'whoosh': this.hissNoise(0.4, 600, 0.25, 0.7); break;
      case 'gurgle': this.tone(160 + Math.random() * 120, 0.08, 'sine', 0.06, 120); break;
      case 'hiss': this.hissNoise(0.5, 4000, 0.05, 0.8); break;
      case 'click': this.tone(1200, 0.04, 'square', 0.05); break;
      case 'combo': [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, 0, i * 0.05)); break;
      case 'rush': this.tone(660, 0.12, 'square', 0.08); this.tone(880, 0.12, 'square', 0.08, 0, 0.13); this.tone(660, 0.12, 'square', 0.08, 0, 0.26); break;
      case 'reveal': this.tone(392, 0.2, 'triangle', 0.2); this.tone(523, 0.3, 'triangle', 0.2, 0, 0.15); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.22, 0, i * 0.12)); break;
      case 'fail': [392, 330, 262].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.2, 0, i * 0.18)); break;
    }
  }
}

export const audio = new Audio();
