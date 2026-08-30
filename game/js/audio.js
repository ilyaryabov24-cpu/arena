// ==== Атмосферный звук на WebAudio ====
let ctx = null, master = null, enabled = false, started = false;
let windGain = null, padTimer = null;

export function initAudio() {
  if (started) return;
  started = true;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);
  // ветер
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
  windGain = ctx.createGain(); windGain.gain.value = 0.05;
  src.connect(f); f.connect(windGain); windGain.connect(master);
  src.start();
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lg = ctx.createGain(); lg.gain.value = 140;
  lfo.connect(lg); lg.connect(f.frequency); lfo.start();
}

export function setEnabled(on) {
  enabled = on;
  if (!ctx) return;
  if (on && ctx.state === 'suspended') ctx.resume();
  master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ctx.currentTime + 0.5);
}
export function isEnabled() { return enabled; }

function tone(freq, t0, dur, type = 'sine', vol = 0.05, slide = 0) {
  if (!ctx || !enabled) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}

export function sfx(name) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime;
  if (name === 'click') tone(740, t, 0.07, 'square', 0.03);
  else if (name === 'build') { tone(140, t, 0.22, 'sine', 0.09, -60); tone(520, t + 0.02, 0.08, 'square', 0.02); }
  else if (name === 'error') tone(180, t, 0.16, 'square', 0.05, -40);
  else if (name === 'coin') { tone(880, t, 0.08, 'square', 0.03); tone(1320, t + 0.08, 0.12, 'square', 0.03); }
  else if (name === 'event') { tone(523, t, 0.25, 'triangle', 0.05); tone(659, t + 0.18, 0.3, 'triangle', 0.05); }
  else if (name === 'bell') {
    for (let i = 0; i < 3; i++) {
      const bt = t + i * 1.1;
      tone(392, bt, 2.2, 'sine', 0.06); tone(784, bt, 1.6, 'sine', 0.03); tone(1176, bt, 1.0, 'sine', 0.015);
    }
  }
}

let birdT = 0, cricT = 0, padStep = 0, pluckT = 0;
const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9]];
const PENTA = [440, 523.25, 587.33, 659.25, 783.99, 880];

export function ambient(dt, S) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime;
  const night = S.t < 6 || S.t > 21;
  birdT -= dt; cricT -= dt; padTimer = (padTimer || 0) - dt; pluckT -= dt;
  if (!night && birdT <= 0) {
    birdT = 3 + Math.random() * 8;
    const base = 1800 + Math.random() * 1600;
    for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++)
      tone(base + Math.random() * 500, t + i * 0.12, 0.09, 'sine', 0.018, 300);
  }
  if (night && cricT <= 0) {
    cricT = 0.4 + Math.random() * 0.8;
    tone(4200, t, 0.05, 'sine', 0.006);
    tone(4200, t + 0.09, 0.05, 'sine', 0.005);
  }
  if (padTimer <= 0) {
    padTimer = 9;
    const ch = CHORDS[padStep++ % CHORDS.length];
    for (const fq of ch) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = fq / 2;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.016, t + 2.5);
      g.gain.linearRampToValueAtTime(0.0, t + 9);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 9.2);
    }
  }
  if (pluckT <= 0) {
    pluckT = 1.6 + Math.random() * 3.4;
    if (Math.random() < 0.7)
      tone(PENTA[(Math.random() * PENTA.length) | 0], t, 0.5, 'triangle', 0.014);
  }
}
