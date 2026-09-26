// ---------------------------------------------------------------------------
// AudioManager — fully procedural WebAudio: engine drone, wind, explosions,
// UI blips, menu music pad and map ambience. No audio files needed.
// Volumes: master / music / sfx (persisted via SaveManager).
// ---------------------------------------------------------------------------

import { EV, bus } from '../core/EventBus.js';
import { clamp } from '../core/Utils.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volumes = { master: 0.8, music: 0.55, sfx: 0.9 };
    this._engine = null;
    this._wind = null;
    this._musicTimer = null;
    this._started = false;
    this.mode = 'menu'; // 'menu' | 'game'
    this.ambience = 'birds';
    this._ambTimer = 0;
  }

  /** Must be called from a user gesture (autoplay policy). */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { console.warn('[Audio] unavailable', e); return; }
    this.master = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this._applyVolumes();
    this._noiseBuffer = this._makeNoise(2);
    this.enabled = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.ctx?.suspend();
      else this.ctx?.resume();
    });
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.musicGain.gain.value = this.volumes.music * 0.5;
    this.sfxGain.gain.value = this.volumes.sfx;
  }

  _makeNoise(seconds) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // pinkish
      d[i] = last * 3.5;
    }
    return buf;
  }

  resume() { this.ctx?.resume(); }

  // ---------------------------------------------------------------------------
  // ENGINE — two oscillators + filtered noise, pitch tied to speed/throttle
  // ---------------------------------------------------------------------------
  startEngine() {
    if (!this.enabled || this._engine) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.sfxGain);

    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 88;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 44;
    const oGain1 = ctx.createGain(); oGain1.gain.value = 0.16;
    const oGain2 = ctx.createGain(); oGain2.gain.value = 0.10;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 900; filt.Q.value = 2;

    // propeller chop (LFO on gain)
    const chop = ctx.createOscillator(); chop.type = 'sine'; chop.frequency.value = 26;
    const chopGain = ctx.createGain(); chopGain.gain.value = 0.05;
    chop.connect(chopGain);

    // mechanical whine
    const whine = ctx.createOscillator(); whine.type = 'triangle'; whine.frequency.value = 340;
    const whineGain = ctx.createGain(); whineGain.gain.value = 0.02;

    // air rush noise
    const noise = ctx.createBufferSource(); noise.buffer = this._noiseBuffer; noise.loop = true;
    const nFilt = ctx.createBiquadFilter(); nFilt.type = 'bandpass'; nFilt.frequency.value = 700; nFilt.Q.value = 0.6;
    const nGain = ctx.createGain(); nGain.gain.value = 0.05;

    chopGain.connect(out.gain);
    o1.connect(oGain1); o2.connect(oGain2);
    oGain1.connect(filt); oGain2.connect(filt);
    whine.connect(whineGain); whineGain.connect(filt);
    filt.connect(out);
    noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(out);

    o1.start(); o2.start(); chop.start(); whine.start(); noise.start();

    this._engine = { out, o1, o2, chop, whine, nFilt, filt, noise };
  }

  stopEngine() {
    const e = this._engine;
    if (!e) return;
    try {
      e.out.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      const stopAt = this.ctx.currentTime + 0.35;
      e.o1.stop(stopAt); e.o2.stop(stopAt); e.chop.stop(stopAt); e.whine.stop(stopAt); e.noise.stop(stopAt);
    } catch (err) { /* already stopped */ }
    this._engine = null;
  }

  updateEngine(speed, boosting, alive) {
    const e = this._engine;
    if (!e || !this.enabled) return;
    const t = this.ctx.currentTime;
    const target = alive ? 0.42 : 0;
    e.out.gain.setTargetAtTime(target, t, 0.1);
    const spd = clamp(speed / 80, 0, 1.6);
    e.o1.frequency.setTargetAtTime(70 + spd * 120 + (boosting ? 40 : 0), t, 0.15);
    e.o2.frequency.setTargetAtTime(35 + spd * 60 + (boosting ? 20 : 0), t, 0.15);
    e.chop.frequency.setTargetAtTime(18 + spd * 30, t, 0.2);
    e.whine.frequency.setTargetAtTime(280 + spd * 420 + (boosting ? 90 : 0), t, 0.12);
    e.filt.frequency.setTargetAtTime(600 + spd * 1400, t, 0.12);
    e.nFilt.frequency.setTargetAtTime(500 + spd * 1800, t, 0.12);
  }

  // ---------------------------------------------------------------------------
  // WIND
  // ---------------------------------------------------------------------------
  startWind() {
    if (!this.enabled || this._wind) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(filt); filt.connect(gain); gain.connect(this.sfxGain);
    src.start();
    this._wind = { src, filt, gain };
  }

  stopWind() {
    const w = this._wind;
    if (!w) return;
    try { w.src.stop(this.ctx.currentTime + 0.2); } catch (e) {}
    this._wind = null;
  }

  updateWind(speed) {
    if (!this._wind || !this.enabled) return;
    const t = this.ctx.currentTime;
    const spd = clamp(speed / 90, 0, 1.2);
    this._wind.gain.gain.setTargetAtTime(spd * 0.5, t, 0.2);
    this._wind.filt.frequency.setTargetAtTime(300 + spd * 2200, t, 0.2);
  }

  // ---------------------------------------------------------------------------
  // ONE-SHOTS
  // ---------------------------------------------------------------------------
  explosion(intensity = 1) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = 1.4 + intensity * 0.4;

    // brown-ish noise burst
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    src.playbackRate.value = 0.6;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2600, t);
    filt.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.1 * intensity, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.1);

    // sub thump
    const sub = ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(64, t);
    sub.frequency.exponentialRampToValueAtTime(26, t + 0.7);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.9 * intensity, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    sub.connect(sg); sg.connect(this.sfxGain);
    sub.start(t); sub.stop(t + 1);

    // crackle
    for (let i = 0; i < 5; i++) {
      const ct = t + 0.1 + Math.random() * 0.6;
      const c = ctx.createBufferSource(); c.buffer = this._noiseBuffer;
      c.playbackRate.value = 1.5 + Math.random();
      const cf = ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 1500;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.25 * Math.random() * intensity, ct);
      cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.12);
      c.connect(cf); cf.connect(cg); cg.connect(this.sfxGain);
      c.start(ct); c.stop(ct + 0.15);
    }
  }

  impact() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    src.playbackRate.value = 0.9;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(90, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.55);
  }

  rustle() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    src.playbackRate.value = 1.6;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2600; filt.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.3);
  }

  uiClick() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + 0.08);
  }

  uiHover() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1320;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + 0.05);
  }

  hitMarker() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const f of [1567, 2093]) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + 0.13);
    }
  }

  alarm() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(620, t + i * 0.22);
      o.frequency.setValueAtTime(480, t + i * 0.22 + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, t + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.2);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t + i * 0.22); o.stop(t + i * 0.22 + 0.22);
    }
  }

  missionComplete() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ctx.createGain();
      const at = t + i * 0.14;
      g.gain.setValueAtTime(0.16, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      o.connect(g); g.connect(this.sfxGain);
      o.start(at); o.stop(at + 0.55);
    });
  }

  // ---------------------------------------------------------------------------
  // AMBIENCE — sparse procedural chirps / hums per map
  // ---------------------------------------------------------------------------
  updateAmbience(dt, kind) {
    if (!this.enabled) return;
    this._ambTimer -= dt;
    if (this._ambTimer > 0) return;
    this._ambTimer = 1.2 + Math.random() * 4;
    const ctx = this.ctx, t = ctx.currentTime;
    if (kind === 'birds') {
      if (Math.random() < 0.7) this._chirp(t, 2200 + Math.random() * 1400);
    } else if (kind === 'industry') {
      if (Math.random() < 0.35) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = 55 + Math.random() * 30;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.015, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
        o.connect(f); f.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + 2.3);
      }
    } else if (kind === 'wind') {
      if (Math.random() < 0.5) {
        const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
        src.playbackRate.value = 0.5 + Math.random() * 0.3;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass';
        f.frequency.value = 300 + Math.random() * 500; f.Q.value = 1.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.03, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
        src.connect(f); f.connect(g); g.connect(this.musicGain);
        src.start(t); src.stop(t + 3.6);
      }
    }
  }

  _chirp(t, freq) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * (0.8 + Math.random() * 0.5), t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + 0.3);
  }

  // ---------------------------------------------------------------------------
  // MENU MUSIC — slow ambient pad progression
  // ---------------------------------------------------------------------------
  startMusic() {
    if (!this.enabled || this._musicTimer) return;
    this._musicStep = 0;
    this._musicNext = this.ctx.currentTime + 0.1;
    this._musicTimer = setInterval(() => this._musicTick(), 300);
  }

  stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
  }

  _musicTick() {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const CHORDS = [
      [110, 164.81, 220, 261.63],   // Am
      [87.31, 130.81, 174.61, 220], // F
      [130.81, 196, 261.63, 329.63],// C
      [98, 146.83, 196, 246.94],    // G
    ];
    const step = this._musicStep % CHORDS.length;
    const chord = CHORDS[step];
    const t = Math.max(ctx.currentTime, this._musicNext);
    const dur = 3.8;
    for (let i = 0; i < chord.length; i++) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'sawtooth';
      o.frequency.value = chord[i] * (i === 3 ? 1.003 : 1); // slight detune
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 1.2);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + dur + 0.1);
    }
    this._musicStep++;
    this._musicNext = t + dur * 0.9;
  }
}

export const audio = new AudioManager();
