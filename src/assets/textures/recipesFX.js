// ---------------------------------------------------------------------------
// FX / decal texture recipes (mostly alpha sprites)
// ---------------------------------------------------------------------------
import {
  makeCanvas, ctx2d, fill, noisePass, radialAlpha, speckles, boxBlur,
} from '../CanvasKit.js';
import { fbm } from '../Noise.js';
import { TAU, clamp } from '../../core/Utils.js';

const cv = makeCanvas;

/** Soft smoke puff sprite. */
export function smoke(size) {
  const c = cv(size), g = ctx2d(c);
  for (let i = 0; i < 14; i++) {
    const x = size * (0.3 + Math.random() * 0.4);
    const y = size * (0.3 + Math.random() * 0.4);
    const r = size * (0.14 + Math.random() * 0.22);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.16 + Math.random() * 0.22;
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  radialAlpha(g, size, { outer: 0.62, feather: 0.5, power: 1.2 });
  return { color: c };
}

/** Fireball sprite — hot core. */
export function fire(size) {
  const c = cv(size), g = ctx2d(c);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5);
  grd.addColorStop(0, 'rgba(255,255,240,1)');
  grd.addColorStop(0.25, 'rgba(255,224,130,0.95)');
  grd.addColorStop(0.55, 'rgba(255,150,50,0.8)');
  grd.addColorStop(0.8, 'rgba(200,70,20,0.35)');
  grd.addColorStop(1, 'rgba(120,30,10,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  // turbulent edges
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * 5, (y / size) * 5, 5, 77, 4);
      const i = (y * size + x) * 4;
      const f = n > 0.5 ? 1 : 0.75;
      d[i] = clamp(d[i] * f, 0, 255);
      d[i + 3] = clamp(d[i + 3] * (n > 0.42 ? 1 : 0.8), 0, 255);
    }
  }
  g.putImageData(img, 0, 0);
  radialAlpha(g, size, { outer: 0.7, feather: 0.4, power: 1.0 });
  return { color: c };
}

/** Bright spark dot. */
export function spark(size) {
  const c = cv(size), g = ctx2d(c);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.2, 'rgba(255,230,170,0.9)');
  grd.addColorStop(0.5, 'rgba(255,160,60,0.35)');
  grd.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return { color: c };
}

/** Explosion flash — star burst. */
export function flash(size) {
  const c = cv(size), g = ctx2d(c);
  g.translate(size / 2, size / 2);
  // rays
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + Math.random() * 0.3;
    const len = size * (0.28 + Math.random() * 0.22);
    g.rotate(TAU / 10);
    g.fillStyle = `rgba(255,244,214,${0.5 + Math.random() * 0.4})`;
    g.beginPath();
    g.moveTo(0, -size * 0.03);
    g.lineTo(len, 0);
    g.lineTo(0, size * 0.03);
    g.closePath(); g.fill();
  }
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,235,180,0.8)');
  grd.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = grd;
  g.beginPath(); g.arc(0, 0, size * 0.3, 0, TAU); g.fill();
  return { color: c };
}

/** Shockwave ring. */
export function ring(size) {
  const c = cv(size), g = ctx2d(c);
  const grd = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.5);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.5, 'rgba(255,240,220,0.7)');
  grd.addColorStop(1, 'rgba(255,240,220,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return { color: c };
}

/** Cloud puff. */
export function cloud(size) {
  const c = cv(size), g = ctx2d(c);
  for (let i = 0; i < 22; i++) {
    const x = size * (0.2 + Math.random() * 0.6);
    const y = size * (0.35 + Math.random() * 0.3);
    const r = size * (0.08 + Math.random() * 0.16);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.10 + Math.random() * 0.16;
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // flat dark bottom
  const grd2 = g.createLinearGradient(0, size * 0.55, 0, size);
  grd2.addColorStop(0, 'rgba(120,130,150,0)');
  grd2.addColorStop(1, 'rgba(90,100,125,0.08)');
  g.fillStyle = grd2;
  g.fillRect(0, 0, size, size);
  radialAlpha(g, size, { outer: 0.75, feather: 0.45, power: 0.8 });
  return { color: c };
}

/** Scorch mark decal (alpha). */
export function scorch(size) {
  const c = cv(size), g = ctx2d(c);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5);
  grd.addColorStop(0, 'rgba(8,8,8,0.95)');
  grd.addColorStop(0.35, 'rgba(16,14,12,0.8)');
  grd.addColorStop(0.7, 'rgba(24,20,16,0.35)');
  grd.addColorStop(1, 'rgba(24,20,16,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  // ash flecks & cracks
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * TAU, r = Math.random() * size * 0.45;
    g.fillStyle = `rgba(60,56,52,${0.1 + Math.random() * 0.2})`;
    g.beginPath();
    g.arc(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r, 1 + Math.random() * 3, 0, TAU);
    g.fill();
  }
  g.strokeStyle = 'rgba(4,4,4,0.5)';
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * TAU;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    g.moveTo(size / 2, size / 2);
    g.lineTo(size / 2 + Math.cos(a) * size * (0.2 + Math.random() * 0.3), size / 2 + Math.sin(a) * size * (0.2 + Math.random() * 0.3));
    g.stroke();
  }
  return { color: c };
}

/** Roundel decal (alpha). params: { ring, center } css colors */
export function roundel(size, P = {}) {
  const ring = P.ring || '#c8402e';
  const center = P.center || '#e8e4da';
  const c = cv(size), g = ctx2d(c);
  const R = size * 0.42;
  g.fillStyle = ring;
  g.beginPath(); g.arc(size / 2, size / 2, R, 0, TAU); g.fill();
  g.fillStyle = center;
  g.beginPath(); g.arc(size / 2, size / 2, R * 0.55, 0, TAU); g.fill();
  // worn
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    g.beginPath();
    g.arc(size / 2 + (Math.random() - 0.5) * size * 0.8, size / 2 + (Math.random() - 0.5) * size * 0.8, 1 + Math.random() * 2, 0, TAU);
    g.fill();
  }
  return { color: c };
}

/** Stencil text decal (alpha). params: { text, color, font } */
export function stencil(size, P = {}) {
  const text = P.text || '01';
  const color = P.color || '#dcdcd2';
  const c = cv(size), g = ctx2d(c);
  g.fillStyle = color;
  g.font = `bold ${size * 0.5}px 'Rajdhani', 'Arial Narrow', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, size / 2, size / 2);
  // worn
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.3})`;
    g.beginPath();
    g.arc(size / 2 + (Math.random() - 0.5) * size * 0.7, size / 2 + (Math.random() - 0.5) * size * 0.4, 1 + Math.random() * 2.2, 0, TAU);
    g.fill();
  }
  return { color: c };
}

/** Hazard stripes (alpha). */
export function warningStripes(size) {
  const c = cv(size), g = ctx2d(c);
  g.fillStyle = '#d8b428';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#181614';
  const w = size / 6;
  for (let i = -size; i < size * 2; i += w * 2) {
    g.save();
    g.beginPath();
    g.moveTo(i, 0); g.lineTo(i + w, 0); g.lineTo(i + w - size, size); g.lineTo(i - size, size);
    g.closePath(); g.fill();
    g.restore();
  }
  // grime
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(40,36,30,${Math.random() * 0.14})`;
    g.beginPath(); g.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 6, 0, TAU); g.fill();
  }
  return { color: c };
}

/** Grass blade card (alpha). */
export function grassCard(size) {
  const c = cv(size), g = ctx2d(c);
  const cx = size / 2;
  for (let i = 0; i < 16; i++) {
    const x0 = cx + (Math.random() - 0.5) * size * 0.34;
    const x1 = x0 + (Math.random() - 0.5) * size * 0.42;
    const h = size * (0.45 + Math.random() * 0.5);
    const w = 1.6 + Math.random() * 2.4;
    const grd = g.createLinearGradient(0, size, 0, size - h);
    const tone = 0.72 + Math.random() * 0.5;
    grd.addColorStop(0, `rgba(${52 * tone | 0},${78 * tone | 0},${34 * tone | 0},1)`);
    grd.addColorStop(1, `${Math.random() < 0.24 ? `rgba(${168 * tone | 0},${178 * tone | 0},${72 * tone | 0},1)` : `rgba(${96 * tone | 0},${128 * tone | 0},${52 * tone | 0},1)`}`);
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x0 - w, size);
    g.quadraticCurveTo((x0 + x1) / 2 - w * 0.4, size - h * 0.6, x1, size - h);
    g.quadraticCurveTo((x0 + x1) / 2 + w * 0.6, size - h * 0.55, x0 + w, size);
    g.closePath(); g.fill();
  }
  return { color: c };
}

/** Leaf cluster card (alpha) — bushes. */
export function leafCard(size) {
  const c = cv(size), g = ctx2d(c);
  for (let i = 0; i < 42; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.55;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.5;
    const r = size * (0.03 + Math.random() * 0.05);
    const tone = 0.7 + Math.random() * 0.55;
    g.fillStyle = `rgba(${64 * tone | 0},${100 * tone | 0},${44 * tone | 0},${0.85})`;
    g.beginPath();
    g.ellipse(x, y, r * 1.5, r, Math.random() * TAU, 0, TAU);
    g.fill();
    if (Math.random() < 0.3) {
      g.fillStyle = `rgba(${150 * tone | 0},${160 * tone | 0},${70 * tone | 0},0.7)`;
      g.beginPath(); g.ellipse(x, y, r * 0.7, r * 0.45, Math.random() * TAU, 0, TAU); g.fill();
    }
  }
  radialAlpha(g, size, { outer: 0.55, feather: 0.6, power: 0.9 });
  return { color: c };
}

export const fxRecipes = {
  smoke, fire, spark, flash, ring, cloud, scorch, roundel, stencil,
  warningStripes, grassCard, leafCard,
};
