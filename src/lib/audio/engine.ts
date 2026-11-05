/**
 * Web Audio engine. Generates original lo-fi / ambient music and nature &
 * café ambience in real time, plus soft notification chimes.
 * Browser-only: nothing touches `window` until `ensure()` is called from a
 * user gesture.
 */
import type { LayerDef, TrackDef } from "./catalog";

type Stop = () => void;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicOut!: GainNode;
  private musicTone!: BiquadFilterNode;
  private ambienceOut!: GainNode;
  private sfxOut!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  analyser: AnalyserNode | null = null;
  private buffers: { white: AudioBuffer; pink: AudioBuffer; brown: AudioBuffer; crackle: AudioBuffer } | null = null;
  private track: { id: string; stop: Stop } | null = null;
  private layers = new Map<string, { gain: GainNode; stop: Stop }>();

  get supported() {
    return typeof window !== "undefined" && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  }

  ensure(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    if (!this.supported) return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.82;
    this.master.connect(comp).connect(this.analyser).connect(ctx.destination);

    this.musicTone = ctx.createBiquadFilter();
    this.musicTone.type = "lowpass";
    this.musicTone.frequency.value = 2600;
    this.musicOut = ctx.createGain();
    this.musicTone.connect(this.musicOut).connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.8, 2.6);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.6;
    this.reverbSend.connect(this.reverb).connect(this.musicTone);

    this.ambienceOut = ctx.createGain();
    this.ambienceOut.connect(this.master);
    this.sfxOut = ctx.createGain();
    this.sfxOut.connect(this.master);

    this.buffers = this.makeNoise();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  /* ---------------- volumes ---------------- */

  setMusicVolume(v: number) {
    if (!this.ctx) return;
    this.musicOut.gain.setTargetAtTime(v * v, this.ctx.currentTime, 0.08);
  }
  setAmbienceVolume(v: number) {
    if (!this.ctx) return;
    this.ambienceOut.gain.setTargetAtTime(v * v, this.ctx.currentTime, 0.08);
  }

  /* ---------------- music ---------------- */

  get currentTrackId() {
    return this.track?.id ?? null;
  }

  playTrack(def: TrackDef) {
    const ctx = this.ensure();
    if (!ctx) return false;
    this.stopTrack();
    this.musicTone.frequency.setTargetAtTime(def.tone, ctx.currentTime, 0.2);
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    bus.connect(this.musicTone);
    const send = ctx.createGain();
    send.gain.value = def.style === "lofi" ? 0.18 : 0.45;
    bus.connect(send).connect(this.reverbSend);

    const innerStop: Stop = def.src ? this.playFile(def.src, bus) : this.playGenerative(def, bus);

    this.track = {
      id: def.id,
      stop: () => {
        const t = ctx.currentTime;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(bus.gain.value, t);
        bus.gain.linearRampToValueAtTime(0, t + 0.5);
        innerStop();
        setTimeout(() => {
          bus.disconnect();
          send.disconnect();
        }, 3000);
      },
    };
    return true;
  }

  stopTrack() {
    this.track?.stop();
    this.track = null;
  }

  private playFile(src: string, dest: AudioNode): Stop {
    const el = new Audio(src);
    el.crossOrigin = "anonymous";
    el.loop = true;
    const node = this.ctx!.createMediaElementSource(el);
    node.connect(dest);
    void el.play().catch(() => {});
    return () => {
      el.pause();
      node.disconnect();
    };
  }

  private playGenerative(def: TrackDef, dest: AudioNode): Stop {
    const ctx = this.ctx!;
    const beat = 60 / def.bpm;
    const eighth = beat / 2;
    let step = 0;
    let next = ctx.currentTime + 0.15;
    let stopped = false;

    // vinyl dust for lo-fi
    let vinylStop: Stop = () => {};
    if (def.style === "lofi") {
      const src = ctx.createBufferSource();
      src.buffer = this.buffers!.crackle;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 900;
      src.connect(hp).connect(g).connect(dest);
      src.start();
      vinylStop = () => {
        window.setTimeout(() => {
          try {
            src.stop();
          } catch {
            /* already stopped */
          }
        }, 700);
      };
    }

    const schedule = (i: number, t: number) => {
      const bar = Math.floor(i / 8);
      const pos = i % 8;
      const chordBars = def.style === "pad" ? 2 : 1;
      const chord = def.chords[Math.floor(bar / chordBars) % def.chords.length];
      const barLen = eighth * 8 * chordBars;

      if (def.style === "lofi") {
        if (pos === 0) {
          chord.forEach((n, k) => this.rhodes(dest, mtof(n), t + k * 0.012, barLen * 0.95, 0.09));
          this.bass(dest, mtof(chord[0] - 12), t, beat * 1.6, 0.32);
        }
        if (pos === 5) this.bass(dest, mtof(chord[0] - 12), t, beat * 1.2, 0.22);
        if (pos === 3 && Math.random() < 0.4) chord.slice(1).forEach((n) => this.rhodes(dest, mtof(n), t, beat, 0.04));
        if (def.drums > 0) {
          if (pos === 0 || (pos === 5 && Math.random() < 0.8) || (pos === 7 && Math.random() < 0.2)) this.kick(dest, t, 0.8 * def.drums);
          if (pos === 2 || pos === 6) this.snare(dest, t, 0.28 * def.drums);
          this.hat(dest, t, (pos % 2 === 0 ? 0.07 : 0.04) * def.drums);
        }
        if (Math.random() < 0.22) {
          const n = chord[Math.floor(Math.random() * chord.length)] + 12;
          this.piano(dest, mtof(n), t, beat * 2, 0.06);
        }
      } else if (def.style === "piano") {
        if (pos === 0) {
          this.piano(dest, mtof(chord[0] - 12), t, barLen, 0.14);
          this.piano(dest, mtof(chord[1]), t + 0.03, barLen, 0.08);
        }
        if (pos === 4 && Math.random() < 0.6) this.piano(dest, mtof(chord[2]), t, barLen / 2, 0.07);
        if (Math.random() < 0.3) {
          const n = chord[Math.floor(Math.random() * chord.length)] + 12 + (Math.random() < 0.3 ? 12 : 0);
          this.piano(dest, mtof(n), t + rand(0, 0.04), beat * 3, 0.06);
        }
      } else if (def.style === "pluck") {
        if (pos === 0) chord.forEach((n) => this.pad(dest, mtof(n), t, barLen, 0.028));
        const arp = [0, 1, 2, 3, 2, 1, 2, 3];
        const n = chord[arp[pos] % chord.length] + 12;
        this.pluck(dest, mtof(n), t, beat * 1.5, pos === 0 ? 0.09 : 0.06);
        if (pos === 0) this.bass(dest, mtof(chord[0] - 12), t, barLen * 0.8, 0.12);
      } else {
        if (pos === 0 && bar % chordBars === 0) {
          chord.forEach((n) => this.pad(dest, mtof(n), t, barLen * 1.05, 0.05));
          this.pad(dest, mtof(chord[0] - 12), t, barLen * 1.05, 0.05);
        }
        if (Math.random() < 0.06) {
          const n = chord[Math.floor(Math.random() * chord.length)] + 24;
          this.piano(dest, mtof(n), t, beat * 4, 0.035);
        }
      }
    };

    const tickFn = () => {
      if (stopped) return;
      const lookahead = typeof document !== "undefined" && document.hidden ? 2.5 : 0.35;
      while (next < ctx.currentTime + lookahead) {
        const swing = def.style === "lofi" && step % 2 === 1 ? eighth * 0.16 : 0;
        schedule(step, next + swing);
        next += eighth;
        step++;
      }
    };
    tickFn();
    const id = window.setInterval(tickFn, 60);
    return () => {
      stopped = true;
      window.clearInterval(id);
      vinylStop();
    };
  }

  /* ---------------- instruments ---------------- */

  private env(g: GainNode, t: number, peak: number, attack: number, dur: number, sustain = 0.35) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sustain), t + attack + Math.min(0.8, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private osc(type: OscillatorType, f: number, t: number, dur: number, dest: AudioNode, detune = 0) {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private rhodes(dest: AudioNode, f: number, t: number, dur: number, vel: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;
    g.connect(lp).connect(dest);
    this.env(g, t, vel, 0.015, dur, 0.4);
    this.osc("sine", f, t, dur, g);
    this.osc("triangle", f, t, dur, g, 6);
    const bell = ctx.createGain();
    bell.connect(dest);
    this.env(bell, t, vel * 0.25, 0.005, 0.5, 0.1);
    this.osc("sine", f * 4, t, 0.5, bell);
  }

  private piano(dest: AudioNode, f: number, t: number, dur: number, vel: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(dest);
    const d = Math.max(dur, 1.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(vel * 0.25, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    this.osc("triangle", f, t, d, g);
    const h = ctx.createGain();
    h.gain.value = 0.35;
    h.connect(g);
    this.osc("sine", f * 2, t, d, h, -4);
  }

  private pluck(dest: AudioNode, f: number, t: number, dur: number, vel: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.4);
    g.connect(lp).connect(dest);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.osc("sawtooth", f, t, dur, g);
    this.osc("triangle", f, t, dur, g, 5);
  }

  private pad(dest: AudioNode, f: number, t: number, dur: number, vel: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    g.connect(lp).connect(dest);
    const a = Math.min(1.8, dur * 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + a);
    g.gain.setValueAtTime(vel, t + dur - a);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    this.osc("sawtooth", f, t, dur + 0.6, g, -7);
    this.osc("sawtooth", f, t, dur + 0.6, g, 7);
  }

  private bass(dest: AudioNode, f: number, t: number, dur: number, vel: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    g.connect(lp).connect(dest);
    this.env(g, t, vel, 0.01, dur, 0.55);
    this.osc("sine", f, t, dur, g);
    this.osc("triangle", f, t, dur, g);
  }

  private kick(dest: AudioNode, t: number, vel: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(115, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.4);
  }

  private noiseHit(dest: AudioNode, t: number, vel: number, dur: number, type: BiquadFilterType, freq: number, q = 0.8) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.buffers!.white;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.02);
  }

  private snare(dest: AudioNode, t: number, vel: number) {
    this.noiseHit(dest, t, vel, 0.2, "bandpass", 1700, 0.7);
    const g = this.ctx!.createGain();
    g.connect(dest);
    g.gain.setValueAtTime(vel * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    this.osc("sine", 185, t, 0.1, g);
  }

  private hat(dest: AudioNode, t: number, vel: number) {
    this.noiseHit(dest, t, vel, 0.045, "highpass", 7500, 0.5);
  }

  /* ---------------- chimes ---------------- */

  chime(volume: number, kind: "focus" | "break" = "focus") {
    const ctx = this.ensure();
    if (!ctx) return;
    this.sfxOut.gain.value = volume;
    const notes = kind === "focus" ? [76, 79, 83, 88] : [72, 76, 79];
    const t0 = ctx.currentTime + 0.05;
    notes.forEach((n, i) => {
      const t = t0 + i * 0.16;
      const g = ctx.createGain();
      g.connect(this.sfxOut);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      this.osc("sine", mtof(n), t, 2.2, g);
      const h = ctx.createGain();
      h.gain.value = 0.15;
      h.connect(g);
      this.osc("sine", mtof(n) * 3, t, 1, h);
    });
  }

  /* ---------------- ambience ---------------- */

  isLayerOn(id: string) {
    return this.layers.has(id);
  }

  setLayer(def: LayerDef, on: boolean, volume: number) {
    const ctx = on ? this.ensure() : this.ctx;
    if (!ctx) return;
    const existing = this.layers.get(def.id);
    if (!on) {
      if (existing) {
        existing.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        const s = existing.stop;
        setTimeout(() => {
          s();
          existing.gain.disconnect();
        }, 1500);
        this.layers.delete(def.id);
      }
      return;
    }
    if (existing) {
      existing.gain.gain.setTargetAtTime(volume * volume, ctx.currentTime, 0.1);
      return;
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(volume * volume, ctx.currentTime, 0.4);
    gain.connect(this.ambienceOut);
    const stop = def.src ? this.playFile(def.src, gain) : this.buildLayer(def.id, gain);
    this.layers.set(def.id, { gain, stop });
  }

  stopAllLayers() {
    if (!this.ctx) return;
    for (const [id] of this.layers) this.setLayer({ id, name: id, group: "nature", hint: "" }, false, 0);
  }

  private loopNoise(kind: "white" | "pink" | "brown", dest: AudioNode) {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.buffers![kind];
    src.loop = true;
    src.connect(dest);
    src.start(0, Math.random() * 3);
    return src;
  }

  private filter(type: BiquadFilterType, freq: number, q = 0.7) {
    const f = this.ctx!.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  private lfo(freq: number, depth: number, target: AudioParam) {
    const o = this.ctx!.createOscillator();
    o.frequency.value = freq;
    const g = this.ctx!.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    return o;
  }

  private buildLayer(id: string, out: GainNode): Stop {
    const ctx = this.ctx!;
    const nodes: (AudioScheduledSourceNode)[] = [];
    const timers = new Set<number>();
    let alive = true;
    const every = (fn: () => void, min: number, max: number) => {
      const loop = (id: number) => {
        timers.delete(id);
        if (!alive) return;
        fn();
        const nextId: number = window.setTimeout(() => loop(nextId), rand(min, max));
        timers.add(nextId);
      };
      const first: number = window.setTimeout(() => loop(first), rand(min, max));
      timers.add(first);
    };
    const gainNode = (v: number) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };

    switch (id) {
      case "rain": {
        const g1 = gainNode(0.5);
        const hp = this.filter("highpass", 600);
        const lp = this.filter("lowpass", 5200);
        hp.connect(lp).connect(g1).connect(out);
        nodes.push(this.loopNoise("white", hp));
        const g2 = gainNode(0.45);
        const lp2 = this.filter("lowpass", 900);
        lp2.connect(g2).connect(out);
        nodes.push(this.loopNoise("pink", lp2));
        nodes.push(this.lfo(0.07, 0.12, g1.gain));
        every(() => {
          const t = ctx.currentTime;
          this.noiseHit(out, t, rand(0.05, 0.16), rand(0.02, 0.05), "bandpass", rand(2500, 5000), 3);
        }, 40, 160);
        break;
      }
      case "forest": {
        const g = gainNode(0.18);
        const bp = this.filter("bandpass", 1100, 0.4);
        bp.connect(g).connect(out);
        nodes.push(this.loopNoise("pink", bp));
        nodes.push(this.lfo(0.11, 0.08, g.gain));
        every(() => {
          const t0 = ctx.currentTime + 0.05;
          const count = Math.floor(rand(2, 6));
          const base = rand(2400, 3800);
          for (let i = 0; i < count; i++) {
            const t = t0 + i * rand(0.09, 0.16);
            const o = ctx.createOscillator();
            const cg = ctx.createGain();
            o.frequency.setValueAtTime(base, t);
            o.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.6), t + 0.06);
            o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.1);
            cg.gain.setValueAtTime(0.0001, t);
            cg.gain.linearRampToValueAtTime(0.05, t + 0.01);
            cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
            o.connect(cg).connect(out);
            o.start(t);
            o.stop(t + 0.12);
          }
        }, 1400, 5200);
        break;
      }
      case "ocean": {
        const swell = gainNode(0.4);
        const lp = this.filter("lowpass", 650);
        lp.connect(swell).connect(out);
        nodes.push(this.loopNoise("brown", lp));
        nodes.push(this.lfo(0.085, 0.35, swell.gain));
        const foam = gainNode(0.06);
        const hp = this.filter("highpass", 1800);
        hp.connect(foam).connect(out);
        nodes.push(this.loopNoise("white", hp));
        nodes.push(this.lfo(0.085, 0.05, foam.gain));
        nodes.push(this.lfo(0.031, 250, lp.frequency));
        break;
      }
      case "fireplace": {
        const g = gainNode(0.5);
        const lp = this.filter("lowpass", 420);
        lp.connect(g).connect(out);
        nodes.push(this.loopNoise("brown", lp));
        nodes.push(this.lfo(0.3, 0.1, g.gain));
        every(() => {
          this.noiseHit(out, ctx.currentTime, rand(0.08, 0.35), rand(0.008, 0.035), "highpass", rand(1200, 3500), 0.6);
        }, 30, 260);
        every(() => {
          this.noiseHit(out, ctx.currentTime, rand(0.3, 0.55), 0.06, "bandpass", rand(600, 1400), 1.2);
        }, 1500, 5000);
        break;
      }
      case "wind": {
        const g = gainNode(0.4);
        const bp = this.filter("bandpass", 500, 1.4);
        bp.connect(g).connect(out);
        nodes.push(this.loopNoise("pink", bp));
        nodes.push(this.lfo(0.05, 260, bp.frequency));
        nodes.push(this.lfo(0.08, 0.2, g.gain));
        break;
      }
      case "cafe": {
        const g = gainNode(0.32);
        const bp = this.filter("bandpass", 520, 0.6);
        bp.connect(g).connect(out);
        nodes.push(this.loopNoise("pink", bp));
        const rumble = gainNode(0.2);
        const lp = this.filter("lowpass", 250);
        lp.connect(rumble).connect(out);
        nodes.push(this.loopNoise("brown", lp));
        every(() => {
          g.gain.setTargetAtTime(rand(0.22, 0.42), ctx.currentTime, 0.3);
        }, 300, 900);
        every(() => {
          const t = ctx.currentTime;
          const f = rand(2300, 3800);
          const cg = ctx.createGain();
          cg.connect(out);
          cg.gain.setValueAtTime(0.0001, t);
          cg.gain.linearRampToValueAtTime(rand(0.03, 0.07), t + 0.003);
          cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
          this.osc("sine", f, t, 0.45, cg);
          this.osc("sine", f * 1.52, t, 0.3, cg);
        }, 1800, 6500);
        break;
      }
      case "library": {
        const g = gainNode(0.25);
        const lp = this.filter("lowpass", 300);
        lp.connect(g).connect(out);
        nodes.push(this.loopNoise("brown", lp));
        every(() => {
          const t = ctx.currentTime;
          const src = ctx.createBufferSource();
          src.buffer = this.buffers!.white;
          const bp = this.filter("bandpass", rand(2500, 4500), 0.5);
          const pg = ctx.createGain();
          pg.gain.setValueAtTime(0.0001, t);
          pg.gain.linearRampToValueAtTime(0.06, t + 0.12);
          pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
          src.connect(bp).connect(pg).connect(out);
          src.start(t, Math.random());
          src.stop(t + 0.4);
        }, 6000, 15000);
        break;
      }
      case "chatter": {
        const formants = [450, 1050, 2300];
        formants.forEach((f) => {
          const g = gainNode(0);
          const bp = this.filter("bandpass", f, 5);
          bp.connect(g).connect(out);
          nodes.push(this.loopNoise("pink", bp));
          every(() => {
            const on = Math.random() < 0.65;
            g.gain.setTargetAtTime(on ? rand(0.25, 0.7) : 0.02, ctx.currentTime, 0.04);
            bp.frequency.setTargetAtTime(f * rand(0.85, 1.2), ctx.currentTime, 0.05);
          }, 90, 220);
        });
        break;
      }
    }

    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      for (const n of nodes) {
        try {
          n.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }

  /* ---------------- buffers ---------------- */

  private makeNoise() {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 4;
    const white = ctx.createBuffer(1, len, ctx.sampleRate);
    const pink = ctx.createBuffer(1, len, ctx.sampleRate);
    const brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const crackle = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = white.getChannelData(0);
    const p = pink.getChannelData(0);
    const b = brown.getChannelData(0);
    const c = crackle.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1;
      w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179;
      b1 = 0.99332 * b1 + x * 0.0750759;
      b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856;
      b4 = 0.55 * b4 + x * 0.5329522;
      b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11;
      b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02;
      b[i] = last * 3.5;
      c[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.9 : x * 0.012;
    }
    return { white, pink, brown, crackle };
  }

  private makeImpulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
}

export const engine = new AudioEngine();
