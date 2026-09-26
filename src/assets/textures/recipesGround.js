// ---------------------------------------------------------------------------
// Ground & nature texture recipes.
// Each recipe: (size, rng, params) -> { color, height, rough } canvases.
// The height canvas is converted to a normal map; rough is roughnessMap.
// ---------------------------------------------------------------------------
import {
  makeCanvas, ctx2d, fill, noisePass, palettePass, speckles, cracks, stains,
  drips, boxBlur,
} from '../CanvasKit.js';
import { fbm } from '../Noise.js';
import { TAU, clamp } from '../../core/Utils.js';

const cv = makeCanvas;

// ---- helpers ---------------------------------------------------------------

/** Fill roughness canvas with base value + fbm variance. */
function roughCanvas(size, base, variance, seed = 31) {
  const c = cv(size); const g = ctx2d(c);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * 6, (y / size) * 6, 6, seed, 3);
      const v = clamp(base + (n - 0.5) * 2 * variance, 0, 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function fbmHeight(size, { period = 6, octaves = 4, seed = 7, amp = 1 } = {}) {
  const c = cv(size); const g = ctx2d(c);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * period, (y / size) * period, period, seed, octaves);
      const v = clamp(128 + (n - 0.5) * 255 * amp, 0, 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ---- nature ----------------------------------------------------------------

function grass(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#57713c');
  palettePass(g, size, (n) => {
    // three green tones mixed by noise
    const a = [86, 113, 60], b = [68, 96, 50], d = [104, 130, 70];
    const t = n;
    return t < 0.5
      ? [b[0] + (a[0] - b[0]) * t * 2, b[1] + (a[1] - b[1]) * t * 2, b[2] + (a[2] - b[2]) * t * 2]
      : [a[0] + (d[0] - a[0]) * (t - 0.5) * 2, a[1] + (d[1] - a[1]) * (t - 0.5) * 2, a[2] + (d[2] - a[2]) * (t - 0.5) * 2];
  }, { seed: 12, period: 5, octaves: 4 });
  // blades: short strokes
  for (let i = 0; i < size * 1.6; i++) {
    const x = rng() * size, y = rng() * size;
    const len = 2 + rng() * 5, ang = -Math.PI / 2 + (rng() - 0.5) * 1.1;
    const tone = 0.75 + rng() * 0.55;
    g.strokeStyle = `rgba(${Math.round(96 * tone)},${Math.round(126 * tone)},${Math.round(62 * tone)},0.5)`;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }
  // clover / dry patches
  stains(g, size, rng, { count: 7, alpha: 0.10, color: '96,86,40', rMin: 0.06, rMax: 0.2 });
  speckles(g, size, rng, { count: size * 0.9, alpha: 0.16, rMin: 0.5, rMax: 1.6, light: true, dark: true });
  noisePass(g, size, { seed: 99, period: 10, octaves: 3, mono: 0.05, colorAmp: 0.02 });
  return { color: c, height: fbmHeight(size, { period: 9, octaves: 3, seed: 41, amp: 0.5 }), rough: roughCanvas(size, 238, 12, 51) };
}

function dirt(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#7d6c50');
  palettePass(g, size, (n) => {
    const a = [125, 108, 80], b = [98, 84, 60], d = [146, 130, 100];
    return n < 0.5
      ? [b[0] + (a[0] - b[0]) * 2 * n, b[1] + (a[1] - b[1]) * 2 * n, b[2] + (a[2] - b[2]) * 2 * n]
      : [a[0] + (d[0] - a[0]) * (n - 0.5) * 2, a[1] + (d[1] - a[1]) * (n - 0.5) * 2, a[2] + (d[2] - a[2]) * (n - 0.5) * 2];
  }, { seed: 21, period: 5, octaves: 4 });
  speckles(g, size, rng, { count: size * 1.4, alpha: 0.28, rMin: 0.6, rMax: 2.6, light: true, dark: true });
  cracks(g, size, rng, { count: 4, alpha: 0.16, width: 1.2 });
  stains(g, size, rng, { count: 8, alpha: 0.08, rMin: 0.05, rMax: 0.22 });
  noisePass(g, size, { seed: 5, period: 9, octaves: 3, mono: 0.05, colorAmp: 0.025 });
  const h = fbmHeight(size, { period: 7, octaves: 4, seed: 61, amp: 0.8 });
  const hg = ctx2d(h);
  // pebbles raised
  for (let i = 0; i < size * 0.8; i++) {
    const x = rng() * size, y = rng() * size, r = 0.8 + rng() * 1.6;
    hg.fillStyle = `rgba(255,255,255,${0.25 + rng() * 0.3})`;
    hg.beginPath(); hg.arc(x, y, r, 0, TAU); hg.fill();
  }
  return { color: c, height: h, rough: roughCanvas(size, 228, 16, 71) };
}

function mud(size, rng) {
  const r = dirt(size, rng);
  const g = ctx2d(r.color);
  g.fillStyle = 'rgba(30,24,16,0.30)';
  g.fillRect(0, 0, size, size);
  // glossy wet spots go into roughness
  const rg = ctx2d(r.rough);
  for (let i = 0; i < 10; i++) {
    const x = rng() * size, y = rng() * size, rr = size * (0.06 + rng() * 0.16);
    const grd = rg.createRadialGradient(x, y, 0, x, y, rr);
    grd.addColorStop(0, 'rgba(70,70,70,1)');
    grd.addColorStop(1, 'rgba(70,70,70,0)');
    rg.fillStyle = grd;
    rg.beginPath(); rg.arc(x, y, rr, 0, TAU); rg.fill();
  }
  return r;
}

/** Plowed field — strong directional furrows. params: { soil: [r,g,b] } */
function field(size, rng, P = {}) {
  const soil = P.soil || [96, 74, 52];
  const c = cv(size), g = ctx2d(c);
  const img = g.createImageData(size, size);
  const rows = 10;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const wob = (fbm(u * 4, v * 4, 4, 3, 3) - 0.5) * 0.14;
      const phase = ((v * rows + wob * rows) % 1);
      const furrow = Math.sin(phase * TAU) * 0.5 + 0.5; // 0 valley .. 1 ridge
      const grain = fbm(u * 24, v * 6, 24, 8, 3) - 0.5;
      const shade = 0.72 + furrow * 0.4 + grain * 0.18;
      const i = (y * size + x) * 4;
      img.data[i] = clamp(soil[0] * shade, 0, 255);
      img.data[i + 1] = clamp(soil[1] * shade, 0, 255);
      img.data[i + 2] = clamp(soil[2] * shade, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  stains(g, size, rng, { count: 6, alpha: 0.07, color: '40,30,16', rMin: 0.08, rMax: 0.3 });
  speckles(g, size, rng, { count: size * 0.5, alpha: 0.12, rMin: 0.5, rMax: 1.4 });
  // height follows furrows
  const h = cv(size), hg = ctx2d(h);
  const himg = hg.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const wob = (fbm(u * 4, v * 4, 4, 3, 3) - 0.5) * 0.14;
      const phase = ((v * rows + wob * rows) % 1);
      const furrow = Math.sin(phase * TAU) * 0.5 + 0.5;
      const val = clamp(90 + furrow * 110 + (fbm(u * 20, v * 20, 20, 9, 2) - 0.5) * 30, 0, 255);
      const i = (y * size + x) * 4;
      himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = val; himg.data[i + 3] = 255;
    }
  }
  hg.putImageData(himg, 0, 0);
  return { color: c, height: h, rough: roughCanvas(size, 232, 10, 81) };
}

/** Crop field — green/golden row crop. params: { crop: [r,g,b] } */
function crop(size, rng, P = {}) {
  const cropCol = P.crop || [140, 150, 70];
  const r = field(size, rng, { soil: cropCol.map(v => Math.round(v * 0.55)) });
  const g = ctx2d(r.color);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n = fbm(u * 30, v * 8, 30, 17, 3);
      const stalk = n > 0.55 ? 1 : 0.55;
      const i = (y * size + x) * 4;
      d[i] = clamp(d[i] * (0.7 + stalk * 0.55), 0, 255);
      d[i + 1] = clamp(d[i + 1] * (0.75 + stalk * 0.5), 0, 255);
      d[i + 2] = clamp(d[i + 2] * (0.8 + stalk * 0.35), 0, 255);
    }
  }
  g.putImageData(img, 0, 0);
  return r;
}

function wheat(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#b09648');
  palettePass(g, size, (n) => {
    const a = [196, 164, 84], b = [150, 122, 58], d = [214, 186, 110];
    return n < 0.5
      ? [b[0] + (a[0] - b[0]) * 2 * n, b[1] + (a[1] - b[1]) * 2 * n, b[2] + (a[2] - b[2]) * 2 * n]
      : [a[0] + (d[0] - a[0]) * (n - 0.5) * 2, a[1] + (d[1] - a[1]) * (n - 0.5) * 2, a[2] + (d[2] - a[2]) * (n - 0.5) * 2];
  }, { seed: 44, period: 6, octaves: 4 });
  // stalks
  for (let i = 0; i < size * 2.2; i++) {
    const x = rng() * size, y = rng() * size;
    const len = 3 + rng() * 7, ang = -Math.PI / 2 + (rng() - 0.5) * 0.7;
    const tone = 0.8 + rng() * 0.5;
    g.strokeStyle = `rgba(${Math.round(210 * tone)},${Math.round(180 * tone)},${Math.round(100 * tone)},0.42)`;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke();
  }
  // harvest swaths
  stains(g, size, rng, { count: 5, alpha: 0.10, color: '90,70,30', rMin: 0.1, rMax: 0.3 });
  noisePass(g, size, { seed: 91, period: 12, octaves: 3, mono: 0.06, colorAmp: 0.03 });
  return { color: c, height: fbmHeight(size, { period: 14, octaves: 3, seed: 141, amp: 0.7 }), rough: roughCanvas(size, 235, 10, 61) };
}

function bark(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#5d4a38');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const r1 = fbm(u * 3, v * 14, 14, 26, 4); // stretched vertically
      const r2 = fbm(u * 9, v * 40, 40, 37, 3);
      const shade = 0.55 + r1 * 0.55 + (r2 - 0.5) * 0.3;
      const i = (y * size + x) * 4;
      img.data[i] = clamp(96 * shade, 0, 255);
      img.data[i + 1] = clamp(76 * shade, 0, 255);
      img.data[i + 2] = clamp(58 * shade, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // moss flecks
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(90,110,60,${0.08 + rng() * 0.12})`;
    g.beginPath(); g.ellipse(rng() * size, rng() * size, 2 + rng() * 6, 1 + rng() * 3, 0, 0, TAU); g.fill();
  }
  const h = fbmHeight(size, { period: 20, octaves: 4, seed: 116, amp: 1 });
  const hg = ctx2d(h);
  // vertical ridge emphasis
  const himg = hg.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const r2 = fbm(u * 9, v * 40, 40, 37, 3);
      const i = (y * size + x) * 4;
      const add = (r2 - 0.5) * 90;
      himg.data[i] = clamp(himg.data[i] + add, 0, 255);
      himg.data[i + 1] = himg.data[i];
      himg.data[i + 2] = himg.data[i];
    }
  }
  hg.putImageData(himg, 0, 0);
  return { color: c, height: h, rough: roughCanvas(size, 242, 8, 66) };
}

/** Foliage canopy texture — near-white base so instance color can tint it. */
function foliage(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#dfe2d8');
  // leaf cluster speckle
  for (let i = 0; i < size * 2.2; i++) {
    const x = rng() * size, y = rng() * size;
    const r = 1.5 + rng() * 3.5;
    const tone = 0.78 + rng() * 0.42;
    g.fillStyle = `rgba(${Math.round(222 * tone)},${Math.round(226 * tone)},${Math.round(210 * tone)},${0.35 + rng() * 0.4})`;
    g.beginPath(); g.ellipse(x, y, r, r * (0.6 + rng() * 0.6), rng() * TAU, 0, TAU); g.fill();
  }
  // darker depth blotches
  stains(g, size, rng, { count: 14, alpha: 0.16, color: '70,86,60', rMin: 0.04, rMax: 0.14 });
  // bright highlights
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,255,244,${0.10 + rng() * 0.14})`;
    g.beginPath(); g.arc(rng() * size, rng() * size, 2 + rng() * 4, 0, TAU); g.fill();
  }
  noisePass(g, size, { seed: 123, period: 10, octaves: 3, mono: 0.08 });
  return { color: c, height: fbmHeight(size, { period: 16, octaves: 3, seed: 161, amp: 1.1 }), rough: roughCanvas(size, 225, 20, 76) };
}

// ---- urban ground ----------------------------------------------------------

function asphalt(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#43464a');
  palettePass(g, size, (n) => {
    const a = [67, 70, 74], b = [50, 52, 56], d = [84, 87, 90];
    return n < 0.5
      ? [b[0] + (a[0] - b[0]) * 2 * n, b[1] + (a[1] - b[1]) * 2 * n, b[2] + (a[2] - b[2]) * 2 * n]
      : [a[0] + (d[0] - a[0]) * (n - 0.5) * 2, a[1] + (d[1] - a[1]) * (n - 0.5) * 2, a[2] + (d[2] - a[2]) * (n - 0.5) * 2];
  }, { seed: 33, period: 6, octaves: 4 });
  speckles(g, size, rng, { count: size * 3, alpha: 0.20, rMin: 0.4, rMax: 1.4, light: true, dark: true });
  cracks(g, size, rng, { count: 5, alpha: 0.22, width: 1.1, color: '18,18,20' });
  // oil stains (darker + glossier)
  const rg2 = null;
  stains(g, size, rng, { count: 5, alpha: 0.13, color: '12,12,14', rMin: 0.04, rMax: 0.14 });
  noisePass(g, size, { seed: 77, period: 8, octaves: 3, mono: 0.04 });
  const h = fbmHeight(size, { period: 12, octaves: 4, seed: 201, amp: 0.6 });
  const hg = ctx2d(h);
  for (let i = 0; i < size * 2; i++) {
    hg.fillStyle = `rgba(255,255,255,${0.10 + rng() * 0.18})`;
    hg.beginPath(); hg.arc(rng() * size, rng() * size, 0.6 + rng() * 1.1, 0, TAU); hg.fill();
  }
  const rough = roughCanvas(size, 216, 14, 88);
  const rgh = ctx2d(rough);
  for (let i = 0; i < 6; i++) {
    const x = rng() * size, y = rng() * size, rr = size * 0.08;
    const grd = rgh.createRadialGradient(x, y, 0, x, y, rr);
    grd.addColorStop(0, 'rgba(90,90,90,0.9)');
    grd.addColorStop(1, 'rgba(90,90,90,0)');
    rgh.fillStyle = grd; rgh.beginPath(); rgh.arc(x, y, rr, 0, TAU); rgh.fill();
  }
  return { color: c, height: h, rough };
}

/** Road tile: U across the road width, V along the road (repeats). */
function road(size, rng) {
  const r = asphalt(size, rng);
  const g = ctx2d(r.color);
  // wheel-wear tracks (two darker bands)
  for (const u of [0.32, 0.68]) {
    const grd = g.createLinearGradient((u - 0.09) * size, 0, (u + 0.09) * size, 0);
    grd.addColorStop(0, 'rgba(20,20,22,0)');
    grd.addColorStop(0.5, 'rgba(20,20,22,0.22)');
    grd.addColorStop(1, 'rgba(20,20,22,0)');
    g.fillStyle = grd;
    g.fillRect((u - 0.09) * size, 0, 0.18 * size, size);
  }
  // edge lines (solid white, worn)
  g.fillStyle = 'rgba(224,224,214,0.85)';
  g.fillRect(size * 0.055, 0, size * 0.018, size);
  g.fillRect(size * (1 - 0.073), 0, size * 0.018, size);
  // center dashes
  g.fillStyle = 'rgba(228,222,200,0.88)';
  g.fillRect(size * 0.491, size * 0.05, size * 0.018, size * 0.42);
  // wear the paint
  speckles(g, size, rng, { count: size * 0.8, alpha: 0.25, rMin: 0.4, rMax: 1.2, dark: true, light: false });
  // height: slight crown (center raised)
  const hg = ctx2d(r.height);
  const himg = hg.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const crown = (1 - Math.abs(u - 0.5) * 2) * 14;
      const i = (y * size + x) * 4;
      himg.data[i] = clamp(himg.data[i] + crown, 0, 255);
      himg.data[i + 1] = himg.data[i]; himg.data[i + 2] = himg.data[i];
    }
  }
  hg.putImageData(himg, 0, 0);
  // paint slightly raised in height too
  hg.fillStyle = 'rgba(255,255,255,0.5)';
  hg.fillRect(size * 0.055, 0, size * 0.018, size);
  hg.fillRect(size * (1 - 0.073), 0, size * 0.018, size);
  hg.fillRect(size * 0.491, size * 0.05, size * 0.018, size * 0.42);
  return r;
}

function dirtRoad(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#7a6a4e');
  palettePass(g, size, (n) => {
    const a = [122, 106, 78], b = [96, 84, 62], d = [150, 136, 106];
    return n < 0.5
      ? [b[0] + (a[0] - b[0]) * 2 * n, b[1] + (a[1] - b[1]) * 2 * n, b[2] + (a[2] - b[2]) * 2 * n]
      : [a[0] + (d[0] - a[0]) * (n - 0.5) * 2, a[1] + (d[1] - a[1]) * (n - 0.5) * 2, a[2] + (d[2] - a[2]) * (n - 0.5) * 2];
  }, { seed: 55, period: 5, octaves: 4 });
  // ruts: two compressed darker bands
  const h = fbmHeight(size, { period: 7, octaves: 3, seed: 221, amp: 0.7 });
  const hg = ctx2d(h);
  const himg = hg.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let rut = 0;
      for (const cu of [0.34, 0.66]) rut += Math.max(0, 1 - Math.abs(u - cu) / 0.10) * 46;
      const edgeGrass = (u < 0.10 || u > 0.90) ? 20 : 0;
      const i = (y * size + x) * 4;
      himg.data[i] = clamp(himg.data[i] - rut + edgeGrass, 0, 255);
      himg.data[i + 1] = himg.data[i]; himg.data[i + 2] = himg.data[i];
    }
  }
  hg.putImageData(himg, 0, 0);
  const img = g.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let rut = 0;
      for (const cu of [0.34, 0.66]) rut += Math.max(0, 1 - Math.abs(u - cu) / 0.11);
      const i = (y * size + x) * 4;
      img.data[i] = clamp(img.data[i] * (1 - rut * 0.22), 0, 255);
      img.data[i + 1] = clamp(img.data[i + 1] * (1 - rut * 0.22), 0, 255);
      img.data[i + 2] = clamp(img.data[i + 2] * (1 - rut * 0.20), 0, 255);
    }
  }
  g.putImageData(img, 0, 0);
  // grass encroaching on edges
  for (let i = 0; i < size * 1.4; i++) {
    const side = rng() < 0.5;
    const x = side ? rng() * size * 0.12 : size - rng() * size * 0.12;
    const y = rng() * size;
    g.fillStyle = `rgba(${70 + rng() * 40},${100 + rng() * 40},${48 + rng() * 20},${0.25 + rng() * 0.4})`;
    g.fillRect(x, y, 1.5 + rng() * 2, 2 + rng() * 4);
  }
  speckles(g, size, rng, { count: size * 1.2, alpha: 0.22, rMin: 0.5, rMax: 2.2, light: true, dark: true });
  return { color: c, height: h, rough: roughCanvas(size, 230, 14, 95) };
}

function concrete(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#9b9b95');
  palettePass(g, size, (n) => {
    const a = [155, 155, 149], b = [128, 128, 122], d = [176, 176, 170];
    return n < 0.5
      ? [b[0] + (a[0] - b[0]) * 2 * n, b[1] + (a[1] - b[1]) * 2 * n, b[2] + (a[2] - b[2]) * 2 * n]
      : [a[0] + (d[0] - a[0]) * (n - 0.5) * 2, a[1] + (d[1] - a[1]) * (n - 0.5) * 2, a[2] + (d[2] - a[2]) * (n - 0.5) * 2];
  }, { seed: 66, period: 5, octaves: 4 });
  // expansion joint grid
  const joints = 2;
  g.strokeStyle = 'rgba(60,60,56,0.55)';
  g.lineWidth = 2.4;
  const h = fbmHeight(size, { period: 8, octaves: 3, seed: 231, amp: 0.5 });
  const hg = ctx2d(h);
  hg.strokeStyle = 'rgba(0,0,0,0.85)';
  hg.lineWidth = 3;
  for (let i = 1; i < joints; i++) {
    const p = (i / joints) * size;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(size, p); g.stroke();
    hg.beginPath(); hg.moveTo(p, 0); hg.lineTo(p, size); hg.stroke();
    hg.beginPath(); hg.moveTo(0, p); hg.lineTo(size, p); hg.stroke();
  }
  // tie holes
  for (let i = 0; i < 4; i++) {
    const x = (0.18 + 0.64 * rng()) * size, y = (0.18 + 0.64 * rng()) * size;
    g.fillStyle = 'rgba(50,50,46,0.7)';
    g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
    hg.fillStyle = 'rgba(0,0,0,0.9)';
    hg.beginPath(); hg.arc(x, y, 2.6, 0, TAU); hg.fill();
  }
  cracks(g, size, rng, { count: 3, alpha: 0.16, width: 1.2, color: '52,52,48' });
  stains(g, size, rng, { count: 7, alpha: 0.09, color: '44,42,34', rMin: 0.05, rMax: 0.2 });
  speckles(g, size, rng, { count: size * 0.8, alpha: 0.13, rMin: 0.4, rMax: 1.2, light: true, dark: true });
  return { color: c, height: h, rough: roughCanvas(size, 208, 18, 105) };
}

/** Poured concrete wall: form lines, tie holes, water streaks. */
function concreteWall(size, rng) {
  const r = concrete(size, rng);
  const g = ctx2d(r.color);
  // remove slab grid look -> subtle board lines
  g.fillStyle = 'rgba(155,155,149,0.5)';
  g.fillRect(0, 0, size, size);
  palettePass(g, size, (n) => {
    const a = [150, 150, 143], b = [132, 132, 126];
    const t = n;
    return [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, b[2] + (a[2] - b[2]) * t];
  }, { seed: 67, period: 6, octaves: 4 });
  // board lines
  g.strokeStyle = 'rgba(90,90,84,0.25)';
  g.lineWidth = 1.4;
  for (let y = size / 4; y < size; y += size / 4) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(size, y); g.stroke();
  }
  // tie holes grid
  const hg = ctx2d(r.height);
  hg.fillStyle = 'rgba(155,155,149,0.6)'; hg.fillRect(0, 0, size, size);
  const step = size / 4;
  for (let x = step / 2; x < size; x += step) {
    for (let y = step / 2; y < size; y += step) {
      g.fillStyle = 'rgba(56,56,52,0.75)';
      g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(200,200,195,0.4)';
      g.beginPath(); g.arc(x + 0.8, y - 0.8, 1.2, 0, TAU); g.fill();
      hg.fillStyle = 'rgba(0,0,0,0.9)';
      hg.beginPath(); hg.arc(x, y, 3.2, 0, TAU); hg.fill();
    }
  }
  drips(g, size, rng, { count: 18, alpha: 0.07, color: '52,50,40' });
  stains(g, size, rng, { count: 6, alpha: 0.08, color: '60,58,48', rMin: 0.06, rMax: 0.25 });
  return r;
}

export const groundRecipes = {
  grass, dirt, mud, field, crop, wheat, bark, foliage,
  asphalt, road, dirtRoad, concrete, concreteWall,
};
