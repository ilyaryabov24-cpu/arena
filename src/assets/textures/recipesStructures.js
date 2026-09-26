// ---------------------------------------------------------------------------
// Structure / vehicle / military texture recipes
// ---------------------------------------------------------------------------
import {
  makeCanvas, ctx2d, fill, noisePass, palettePass, speckles, cracks, stains,
  drips, scratches, panelGrid, corrugationHeight, boxBlur,
} from '../CanvasKit.js';
import { fbm } from '../Noise.js';
import { TAU, clamp, makeRNG, hashSeed } from '../../core/Utils.js';

const cv = makeCanvas;

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

/** Brick. params: { brick: [r,g,b], mortar: [r,g,b], rows } */
function brick(size, rng, P = {}) {
  const brickCol = P.brick || [148, 74, 58];
  const mortar = P.mortar || [186, 178, 164];
  const rows = P.rows || 16;
  const c = cv(size), g = ctx2d(c);
  g.fillStyle = `rgb(${mortar[0]},${mortar[1]},${mortar[2]})`;
  g.fillRect(0, 0, size, size);
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#6a6a6a'; hg.fillRect(0, 0, size, size);
  const rh = size / rows;
  const bw = rh * 2.4;
  const gap = Math.max(1.4, size * 0.006);
  for (let row = 0; row < rows; row++) {
    const y = row * rh;
    const offset = (row % 2) * bw * 0.5;
    for (let x = -bw; x < size + bw; x += bw) {
      const bx = x + offset;
      const jitter = 0.82 + rng() * 0.36;
      const hueShift = (rng() - 0.5) * 26;
      const r = clamp(brickCol[0] * jitter + hueShift, 0, 255);
      const gg = clamp(brickCol[1] * jitter + hueShift * 0.6, 0, 255);
      const b = clamp(brickCol[2] * jitter + hueShift * 0.5, 0, 255);
      g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
      g.fillRect(bx + gap, y + gap, bw - gap * 2, rh - gap * 2);
      // darker bottom edge per brick
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fillRect(bx + gap, y + rh - gap * 2.2, bw - gap * 2, gap * 1.4);
      hg.fillStyle = `rgb(${170 + rng() * 40 | 0},${170 + rng() * 40 | 0},${170 + rng() * 40 | 0})`;
      hg.fillRect(bx + gap, y + gap, bw - gap * 2, rh - gap * 2);
    }
  }
  noisePass(g, size, { seed: 311, period: 10, octaves: 3, mono: 0.05, colorAmp: 0.02 });
  stains(g, size, rng, { count: 6, alpha: 0.08, color: '40,38,30', rMin: 0.06, rMax: 0.2 });
  drips(g, size, rng, { count: 10, alpha: 0.05 });
  const rough = roughCanvas(size, 222, 14, 321);
  return { color: c, height: h, rough };
}

/** Painted plaster. params: { color: [r,g,b] } */
function plaster(size, rng, P = {}) {
  const col = P.color || [196, 186, 168];
  const c = cv(size), g = ctx2d(c);
  fill(g, size, `rgb(${col[0]},${col[1]},${col[2]})`);
  noisePass(g, size, { seed: 401, period: 8, octaves: 4, mono: 0.045, colorAmp: 0.02 });
  // damp patches at bottom
  const grd = g.createLinearGradient(0, size * 0.82, 0, size);
  grd.addColorStop(0, 'rgba(60,55,40,0)');
  grd.addColorStop(1, 'rgba(60,55,40,0.16)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  drips(g, size, rng, { count: 12, alpha: 0.05, color: '40,38,28' });
  stains(g, size, rng, { count: 6, alpha: 0.06, color: '48,44,32', rMin: 0.05, rMax: 0.2 });
  cracks(g, size, rng, { count: 2, alpha: 0.10, width: 1 });
  // paint chips
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(120,110,90,${0.12 + rng() * 0.15})`;
    g.beginPath(); g.arc(rng() * size, rng() * size, 1 + rng() * 2.4, 0, TAU); g.fill();
  }
  return { color: c, height: fbmHeight(size, { period: 9, octaves: 3, seed: 421, amp: 0.35 }), rough: roughCanvas(size, 224, 12, 431) };
}

/** Horizontal siding planks. params: { color } */
function siding(size, rng, P = {}) {
  const col = P.color || [168, 150, 118];
  const c = cv(size), g = ctx2d(c);
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, size, size);
  const rows = 8;
  const rh = size / rows;
  for (let row = 0; row < rows; row++) {
    const y = row * rh;
    const j = 0.94 + rng() * 0.12;
    g.fillStyle = `rgb(${col[0] * j | 0},${col[1] * j | 0},${col[2] * j | 0})`;
    g.fillRect(0, y, size, rh);
    // bevel: light top, dark bottom
    g.fillStyle = 'rgba(255,255,250,0.20)';
    g.fillRect(0, y, size, rh * 0.16);
    g.fillStyle = 'rgba(0,0,0,0.30)';
    g.fillRect(0, y + rh * 0.88, size, rh * 0.12);
    // height bevel
    const lg = hg.createLinearGradient(0, y, 0, y + rh);
    lg.addColorStop(0, 'rgba(255,255,255,0.55)');
    lg.addColorStop(1, 'rgba(0,0,0,0.55)');
    hg.fillStyle = lg;
    hg.fillRect(0, y, size, rh);
    // nails
    for (let x = rh * 0.6; x < size; x += size / 6) {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.arc(x, y + rh * 0.5, 1.3, 0, TAU); g.fill();
    }
  }
  noisePass(g, size, { seed: 501, period: 10, octaves: 3, mono: 0.035 });
  stains(g, size, rng, { count: 4, alpha: 0.05, color: '50,46,34' });
  return { color: c, height: h, rough: roughCanvas(size, 218, 12, 531) };
}

/** Clay roof tiles. params: { color } */
function roofTiles(size, rng, P = {}) {
  const col = P.color || [148, 74, 54];
  const c = cv(size), g = ctx2d(c);
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#707070'; hg.fillRect(0, 0, size, size);
  const rows = 8, tw = size / 7;
  const rh = size / rows;
  for (let row = rows; row >= 0; row--) {
    const y = row * rh;
    const offset = (row % 2) * tw * 0.5;
    for (let x = -tw; x < size + tw; x += tw) {
      const bx = x + offset;
      const j = 0.88 + rng() * 0.24;
      // tile body with rounded bottom
      const grd = g.createLinearGradient(0, y, 0, y + rh);
      grd.addColorStop(0, `rgb(${col[0] * j * 0.92 | 0},${col[1] * j * 0.92 | 0},${col[2] * j * 0.92 | 0})`);
      grd.addColorStop(0.75, `rgb(${col[0] * j | 0},${col[1] * j | 0},${col[2] * j | 0})`);
      grd.addColorStop(1, `rgb(${col[0] * j * 0.7 | 0},${col[1] * j * 0.7 | 0},${col[2] * j * 0.7 | 0})`);
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(bx, y);
      g.lineTo(bx + tw, y);
      g.lineTo(bx + tw, y + rh * 0.8);
      g.quadraticCurveTo(bx + tw / 2, y + rh * 1.12, bx, y + rh * 0.8);
      g.closePath(); g.fill();
      // height dome
      const hg2 = hg.createLinearGradient(0, y, 0, y + rh);
      hg2.addColorStop(0, 'rgba(230,230,230,0.8)');
      hg2.addColorStop(1, 'rgba(70,70,70,0.8)');
      hg.fillStyle = hg2;
      hg.beginPath();
      hg.moveTo(bx, y);
      hg.lineTo(bx + tw, y);
      hg.lineTo(bx + tw, y + rh * 0.8);
      hg.quadraticCurveTo(bx + tw / 2, y + rh * 1.12, bx, y + rh * 0.8);
      hg.closePath(); hg.fill();
    }
  }
  noisePass(g, size, { seed: 601, period: 8, octaves: 3, mono: 0.05, colorAmp: 0.02 });
  // moss
  for (let i = 0; i < 24; i++) {
    g.fillStyle = `rgba(96,116,60,${0.08 + rng() * 0.14})`;
    g.beginPath(); g.ellipse(rng() * size, rng() * size, 3 + rng() * 8, 2 + rng() * 4, 0, 0, TAU); g.fill();
  }
  stains(g, size, rng, { count: 4, alpha: 0.06, color: '40,30,20' });
  return { color: c, height: h, rough: roughCanvas(size, 232, 12, 631) };
}

/** Painted metal panels with seams & rivets. params: { color } */
function metalPanel(size, rng, P = {}) {
  const col = P.color || [126, 132, 138];
  const c = cv(size), g = ctx2d(c);
  fill(g, size, `rgb(${col[0]},${col[1]},${col[2]})`);
  // brushed streaks
  for (let i = 0; i < 220; i++) {
    const y = rng() * size;
    g.strokeStyle = `rgba(${rng() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + rng() * 0.04})`;
    g.lineWidth = 0.8 + rng() * 1.4;
    g.beginPath(); g.moveTo(0, y); g.lineTo(size, y + (rng() - 0.5) * 6); g.stroke();
  }
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, size, size);
  panelGrid(g, hg, size, { cols: 3, rows: 2, seam: 2.4, rivets: true, seamAlpha: 0.38 });
  scratches(g, size, rng, { count: 10, alpha: 0.10 });
  noisePass(g, size, { seed: 701, period: 12, octaves: 3, mono: 0.028 });
  // grime near seams
  stains(g, size, rng, { count: 6, alpha: 0.05, color: '30,30,26' });
  const rough = roughCanvas(size, 186, 12, 741);
  const rgh = ctx2d(rough);
  scratches(rgh, size, rng, { count: 10, alpha: 0.5 });
  return { color: c, height: h, rough };
}

/** Rusted metal. */
function rust(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#4e4a45');
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#787878'; hg.fillRect(0, 0, size, size);
  const rough = roughCanvas(size, 150, 20, 811);
  const rgh = ctx2d(rough);
  const rustCols = ['rgba(138,90,46,0.85)', 'rgba(160,106,53,0.8)', 'rgba(110,69,31,0.85)', 'rgba(184,124,66,0.7)'];
  for (let i = 0; i < 26; i++) {
    const x = rng() * size, y = rng() * size;
    const r = size * (0.04 + rng() * 0.13);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, rustCols[(rng() * rustCols.length) | 0]);
    grd.addColorStop(1, 'rgba(138,90,46,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // lumpy cluster
    for (let k = 0; k < 5; k++) {
      const ax = x + (rng() - 0.5) * r * 1.6, ay = y + (rng() - 0.5) * r * 1.6;
      g.fillStyle = rustCols[(rng() * rustCols.length) | 0];
      g.globalAlpha = 0.5 + rng() * 0.4;
      g.beginPath(); g.arc(ax, ay, r * (0.2 + rng() * 0.4), 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
    // rust raised in height, rough in roughness
    const hgrd = hg.createRadialGradient(x, y, 0, x, y, r);
    hgrd.addColorStop(0, 'rgba(255,255,255,0.5)');
    hgrd.addColorStop(1, 'rgba(255,255,255,0)');
    hg.fillStyle = hgrd; hg.beginPath(); hg.arc(x, y, r, 0, TAU); hg.fill();
    const rgrd = rgh.createRadialGradient(x, y, 0, x, y, r);
    rgrd.addColorStop(0, 'rgba(240,240,240,0.85)');
    rgrd.addColorStop(1, 'rgba(240,240,240,0)');
    rgh.fillStyle = rgrd; rgh.beginPath(); rgh.arc(x, y, r, 0, TAU); rgh.fill();
    // drips below rust
    g.fillStyle = 'rgba(120,78,40,0.25)';
    g.fillRect(x - 1, y, 2 + rng() * 2, r * (1 + rng() * 2));
  }
  panelGrid(g, hg, size, { cols: 3, rows: 3, seam: 2, rivets: false, seamAlpha: 0.25 });
  speckles(g, size, rng, { count: size * 0.5, alpha: 0.2, rMin: 0.4, rMax: 1.5, light: true });
  noisePass(g, size, { seed: 821, period: 10, octaves: 3, mono: 0.05, colorAmp: 0.03 });
  return { color: c, height: h, rough };
}

/** Corrugated metal (containers, sheds, roofs). params: { color } */
function corrugated(size, rng, P = {}) {
  const col = P.color || [150, 74, 58];
  const ridgeW = size / 8;
  const h = corrugationHeight(size, { ridgeW, amp: 0.6 });
  const c = cv(size), g = ctx2d(c);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const phase = ((x % ridgeW) / ridgeW) * TAU;
      const shade = 0.82 + Math.sin(phase) * 0.18;
      const i = (y * size + x) * 4;
      img.data[i] = clamp(col[0] * shade, 0, 255);
      img.data[i + 1] = clamp(col[1] * shade, 0, 255);
      img.data[i + 2] = clamp(col[2] * shade, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  scratches(g, size, rng, { count: 12, alpha: 0.09 });
  stains(g, size, rng, { count: 7, alpha: 0.07, color: '30,26,20' });
  // rust at bottom edge
  const grd = g.createLinearGradient(0, size * 0.85, 0, size);
  grd.addColorStop(0, 'rgba(120,74,38,0)');
  grd.addColorStop(1, 'rgba(120,74,38,0.35)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  noisePass(g, size, { seed: 901, period: 8, octaves: 3, mono: 0.04 });
  const rough = roughCanvas(size, 196, 12, 931);
  const rgh = ctx2d(rough);
  rgh.fillStyle = grd; rgh.fillRect(0, 0, size, size);
  return { color: c, height: h, rough };
}

/** Wood planks. */
function wood(size, rng) {
  const c = cv(size), g = ctx2d(c);
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#787878'; hg.fillRect(0, 0, size, size);
  const planks = 6;
  const pw = size / planks;
  for (let p = 0; p < planks; p++) {
    const x = p * pw;
    const base = 0.85 + rng() * 0.3;
    g.fillStyle = `rgb(${138 * base | 0},${106 * base | 0},${74 * base | 0})`;
    g.fillRect(x, 0, pw, size);
    // grain
    for (let i = 0; i < 14; i++) {
      const gx = x + rng() * pw;
      g.strokeStyle = `rgba(60,42,24,${0.10 + rng() * 0.15})`;
      g.lineWidth = 0.7 + rng() * 0.8;
      g.beginPath(); g.moveTo(gx, 0);
      g.bezierCurveTo(gx + (rng() - 0.5) * 8, size * 0.33, gx + (rng() - 0.5) * 8, size * 0.66, gx + (rng() - 0.5) * 6, size);
      g.stroke();
    }
    // knots
    if (rng() < 0.6) {
      const kx = x + pw * (0.25 + rng() * 0.5), ky = rng() * size;
      for (let r = 5; r > 0; r--) {
        g.strokeStyle = `rgba(52,36,20,${0.10 + (5 - r) * 0.06})`;
        g.lineWidth = 1;
        g.beginPath(); g.ellipse(kx, ky, r * 1.6, r * 2.4, 0, 0, TAU); g.stroke();
      }
    }
    // gaps
    g.fillStyle = 'rgba(20,14,8,0.65)';
    g.fillRect(x + pw - 1.6, 0, 1.8, size);
    hg.fillStyle = 'rgba(0,0,0,0.5)';
    hg.fillRect(x + pw - 1.6, 0, 1.8, size);
  }
  noisePass(g, size, { seed: 1001, period: 10, octaves: 3, mono: 0.05, colorAmp: 0.02 });
  scratches(g, size, rng, { count: 6, alpha: 0.07 });
  return { color: c, height: h, rough: roughCanvas(size, 228, 14, 1041) };
}

/** Window plane. params: { lit: bool, frame: [r,g,b] } */
function window(size, rng, P = {}) {
  const lit = !!P.lit;
  const frame = P.frame || [58, 54, 48];
  const c = cv(size), g = ctx2d(c);
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#a8a8a8'; hg.fillRect(0, 0, size, size);
  const F = size * 0.055;
  // glass
  if (lit) {
    const grd = g.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.62);
    grd.addColorStop(0, '#ffe9b8');
    grd.addColorStop(0.55, '#f7d290');
    grd.addColorStop(1, '#c99a54');
    g.fillStyle = grd;
  } else {
    const grd = g.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, '#2c3844');
    grd.addColorStop(0.5, '#1e2833');
    grd.addColorStop(1, '#33414e');
    g.fillStyle = grd;
  }
  g.fillRect(F, F, size - 2 * F, size - 2 * F);
  // reflection streaks
  g.save();
  g.beginPath(); g.rect(F, F, size - 2 * F, size - 2 * F); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.save(); g.translate(size * 0.25, 0); g.rotate(0.5); g.fillRect(0, -size, size * 0.09, size * 3); g.restore();
  g.save(); g.translate(size * 0.6, 0); g.rotate(0.5); g.fillRect(0, -size, size * 0.05, size * 3); g.restore();
  g.restore();
  // frame + cross
  g.strokeStyle = `rgb(${frame[0]},${frame[1]},${frame[2]})`;
  g.lineWidth = F * 1.6;
  g.strokeRect(F * 0.5, F * 0.5, size - F, size - F);
  g.beginPath(); g.moveTo(size / 2, F); g.lineTo(size / 2, size - F); g.stroke();
  hg.strokeStyle = 'rgb(235,235,235)';
  hg.lineWidth = F * 1.6;
  hg.strokeRect(F * 0.5, F * 0.5, size - F, size - F);
  hg.beginPath(); hg.moveTo(size / 2, F); hg.lineTo(size / 2, size - F); hg.stroke();
  // sill shadow
  g.fillStyle = 'rgba(0,0,0,0.20)';
  g.fillRect(F * 0.4, size - F * 1.5, size - F * 0.8, F * 1.2);
  const rough = cv(size); const rg = ctx2d(rough);
  rg.fillStyle = lit ? 'rgb(120,120,120)' : 'rgb(55,55,55)';
  rg.fillRect(0, 0, size, size);
  rg.fillStyle = 'rgb(190,190,190)';
  rg.fillRect(0, 0, F * 1.4, size); rg.fillRect(size - F * 1.4, 0, F * 1.4, size);
  rg.fillRect(0, 0, size, F * 1.4); rg.fillRect(0, size - F * 1.4, size, F * 1.4);
  return { color: c, height: h, rough };
}

/** Truck tarpaulin. */
function tarp(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#4e5a50');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const wave = Math.sin(u * TAU * 5) * 0.5 + 0.5;
      const i = (y * size + x) * 4;
      const s = 0.85 + wave * 0.25;
      img.data[i] = clamp(img.data[i] * s, 0, 255);
      img.data[i + 1] = clamp(img.data[i + 1] * s, 0, 255);
      img.data[i + 2] = clamp(img.data[i + 2] * s, 0, 255);
    }
  }
  g.putImageData(img, 0, 0);
  // straps
  for (let x = size / 6; x < size; x += size / 6) {
    g.fillStyle = 'rgba(24,24,22,0.55)';
    g.fillRect(x - 2, 0, 4, size);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(x + 2, 0, 2, size);
  }
  noisePass(g, size, { seed: 1101, period: 8, octaves: 3, mono: 0.04 });
  stains(g, size, rng, { count: 6, alpha: 0.06, color: '20,22,18' });
  const h = corrugationHeight(size, { ridgeW: size / 5, amp: 0.3 });
  return { color: c, height: h, rough: roughCanvas(size, 234, 10, 1131) };
}

/** Hay / straw. */
function hay(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#b39448');
  for (let i = 0; i < size * 3; i++) {
    const x = rng() * size, y = rng() * size;
    const ang = -Math.PI / 2 + (rng() - 0.5) * 1.2;
    const len = 4 + rng() * 9;
    const tone = 0.75 + rng() * 0.5;
    g.strokeStyle = `rgba(${190 * tone | 0},${156 * tone | 0},${88 * tone | 0},${0.35 + rng() * 0.3})`;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke();
  }
  noisePass(g, size, { seed: 1201, period: 10, octaves: 3, mono: 0.07, colorAmp: 0.04 });
  return { color: c, height: fbmHeight(size, { period: 18, octaves: 3, seed: 1231, amp: 0.9 }), rough: roughCanvas(size, 240, 8, 1251) };
}

/** Sandbag wall. */
function sandbags(size, rng) {
  const c = cv(size), g = ctx2d(c);
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#787878'; hg.fillRect(0, 0, size, size);
  fill(g, size, '#9c8f68');
  const rows = 5, bw = size / 3.4, bh = size / rows;
  for (let row = 0; row < rows; row++) {
    const y = row * bh;
    const off = (row % 2) * bw * 0.5;
    for (let x = -bw; x < size + bw; x += bw) {
      const j = 0.88 + rng() * 0.24;
      g.fillStyle = `rgb(${156 * j | 0},${143 * j | 0},${104 * j | 0})`;
      g.beginPath();
      g.ellipse(x + off + bw / 2, y + bh / 2, bw * 0.52, bh * 0.46, 0, 0, TAU);
      g.fill();
      // stitch + shading
      g.strokeStyle = 'rgba(60,54,38,0.4)';
      g.lineWidth = 1;
      g.beginPath(); g.ellipse(x + off + bw / 2, y + bh / 2, bw * 0.52, bh * 0.46, 0, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.14)';
      g.beginPath(); g.ellipse(x + off + bw / 2, y + bh * 0.72, bw * 0.5, bh * 0.3, 0, 0, TAU); g.fill();
      const hg2 = hg.createRadialGradient(x + off + bw / 2, y + bh * 0.4, 1, x + off + bw / 2, y + bh / 2, bw * 0.55);
      hg2.addColorStop(0, 'rgba(255,255,255,0.85)');
      hg2.addColorStop(1, 'rgba(0,0,0,0.4)');
      hg.fillStyle = hg2;
      hg.beginPath(); hg.ellipse(x + off + bw / 2, y + bh / 2, bw * 0.52, bh * 0.46, 0, 0, TAU); hg.fill();
    }
  }
  noisePass(g, size, { seed: 1301, period: 12, octaves: 3, mono: 0.06, colorAmp: 0.03 });
  return { color: c, height: h, rough: roughCanvas(size, 244, 8, 1331) };
}

/** Container door end. params: { color } */
function containerDoor(size, rng, P = {}) {
  const col = P.color || [150, 74, 58];
  const r = corrugated(size, rng, { color: col });
  const g = ctx2d(r.color);
  const hg = ctx2d(r.height);
  // door frame
  const F = size * 0.06;
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = F;
  g.strokeRect(F * 0.6, F * 0.6, size - F * 1.2, size - F * 1.2);
  hg.strokeStyle = 'rgba(0,0,0,0.8)'; hg.lineWidth = F;
  hg.strokeRect(F * 0.6, F * 0.6, size - F * 1.2, size - F * 1.2);
  // lock rods
  for (let i = 1; i <= 4; i++) {
    const x = (i / 5) * size;
    g.fillStyle = 'rgba(190,196,200,0.85)';
    g.fillRect(x - 3, F, 6, size - 2 * F);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(x + 3, F, 2, size - 2 * F);
    hg.fillStyle = 'rgba(255,255,255,0.75)';
    hg.fillRect(x - 3, F, 6, size - 2 * F);
    // handles
    g.fillStyle = 'rgba(150,156,160,0.95)';
    g.fillRect(x - 8, size * 0.44, 16, size * 0.12);
  }
  // stencil marking
  g.fillStyle = 'rgba(240,240,235,0.65)';
  g.font = `bold ${size * 0.07}px 'Share Tech Mono', monospace`;
  g.textAlign = 'left';
  g.fillText('CL', F * 1.6, size * 0.2);
  g.fillText('42-06', F * 1.6, size * 0.28);
  return r;
}

// ---- military / vehicles -----------------------------------------------------

/**
 * Camouflage. params: { base, c2, c3, c4 } arrays of rgb, { panels: bool }
 */
function camo(size, rng, P = {}) {
  const base = P.base || [74, 86, 58];
  const c2 = P.c2 || [50, 60, 40];
  const c3 = P.c3 || [94, 106, 70];
  const c4 = P.c4 || [38, 44, 32];
  const c = cv(size), g = ctx2d(c);
  fill(g, size, `rgb(${base[0]},${base[1]},${base[2]})`);
  const blob = (col, count, rMin, rMax) => {
    g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    for (let i = 0; i < count; i++) {
      const cx = rng() * size, cy = rng() * size;
      const R = size * (rMin + rng() * (rMax - rMin));
      g.beginPath();
      const pts = 14;
      for (let p = 0; p <= pts; p++) {
        const a = (p / pts) * TAU;
        const wob = 0.55 + rng() * 0.75;
        const x = cx + Math.cos(a) * R * wob;
        const y = cy + Math.sin(a) * R * wob * 0.8;
        p === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.closePath(); g.fill();
    }
  };
  blob(c2, 9, 0.07, 0.16);
  blob(c3, 7, 0.05, 0.13);
  blob(c4, 5, 0.04, 0.10);
  // fabric noise + weave
  noisePass(g, size, { seed: 1401, period: 14, octaves: 3, mono: 0.045, colorAmp: 0.015 });
  g.strokeStyle = 'rgba(0,0,0,0.03)'; g.lineWidth = 1;
  for (let i = 0; i < size; i += 3) {
    g.beginPath(); g.moveTo(0, i); g.lineTo(size, i); g.stroke();
  }
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, size, size);
  if (P.panels !== false) {
    panelGrid(g, hg, size, { cols: 3, rows: 3, seam: 1.8, rivets: true, seamAlpha: 0.22 });
  }
  scratches(g, size, rng, { count: 8, alpha: 0.08 });
  const rough = roughCanvas(size, 212, 12, 1441);
  const rgh = ctx2d(rough);
  scratches(rgh, size, rng, { count: 8, alpha: 0.4 });
  return { color: c, height: h, rough };
}

/** Tank tread. */
function tankTrack(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#2c2c2e');
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#707070'; hg.fillRect(0, 0, size, size);
  // track links along V
  const linkH = size / 8;
  for (let y = 0; y < size; y += linkH) {
    const j = 0.85 + rng() * 0.3;
    g.fillStyle = `rgb(${44 * j | 0},${44 * j | 0},${46 * j | 0})`;
    g.fillRect(0, y, size, linkH * 0.92);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, y + linkH * 0.88, size, linkH * 0.12);
    // guide bars / grousers
    g.fillStyle = 'rgba(120,122,124,0.55)';
    for (let x = size * 0.06; x < size; x += size * 0.2) {
      g.fillRect(x, y + linkH * 0.15, size * 0.07, linkH * 0.62);
      hg.fillStyle = 'rgba(255,255,255,0.7)';
      hg.fillRect(x, y + linkH * 0.15, size * 0.07, linkH * 0.62);
    }
  }
  // mud
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(102,84,56,${0.10 + rng() * 0.22})`;
    g.beginPath(); g.ellipse(rng() * size, rng() * size, 3 + rng() * 9, 2 + rng() * 5, rng() * TAU, 0, TAU); g.fill();
  }
  speckles(g, size, rng, { count: size * 0.4, alpha: 0.15, rMin: 0.4, rMax: 1.2, light: true });
  return { color: c, height: h, rough: roughCanvas(size, 226, 12, 1501) };
}

/** Vehicle tire sidewall (cap texture). */
function tireSide(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#1e1e20');
  // concentric grooves
  for (let r = size * 0.2; r < size * 0.48; r += size * 0.055) {
    g.strokeStyle = `rgba(0,0,0,0.6)`;
    g.lineWidth = 3;
    g.beginPath(); g.arc(size / 2, size / 2, r, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(size / 2, size / 2, r + 2.4, 0, TAU); g.stroke();
  }
  // sidewall text
  g.fillStyle = 'rgba(200,200,200,0.16)';
  g.font = `bold ${size * 0.05}px 'Share Tech Mono', monospace`;
  g.textAlign = 'center';
  g.fillText('ALL TERRAIN 36x12', size / 2, size * 0.68);
  noisePass(g, size, { seed: 1601, period: 10, octaves: 3, mono: 0.05 });
  return { color: c, rough: roughCanvas(size, 232, 10, 1621) };
}

/** Steel wheel rim (cap texture). */
function wheelRim(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#8e9296');
  const grd = g.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5);
  grd.addColorStop(0, 'rgba(255,255,255,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0.30)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  // bolts
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const x = size / 2 + Math.cos(a) * size * 0.2;
    const y = size / 2 + Math.sin(a) * size * 0.2;
    g.fillStyle = 'rgba(40,42,44,0.9)';
    g.beginPath(); g.arc(x, y, size * 0.028, 0, TAU); g.fill();
    g.fillStyle = 'rgba(220,222,224,0.5)';
    g.beginPath(); g.arc(x - 1, y - 1, size * 0.012, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(30,32,34,0.6)';
  g.lineWidth = 4;
  g.beginPath(); g.arc(size / 2, size / 2, size * 0.3, 0, TAU); g.stroke();
  noisePass(g, size, { seed: 1701, period: 12, octaves: 3, mono: 0.04 });
  return { color: c, rough: roughCanvas(size, 150, 20, 1721) };
}

/** Drone composite skin — dark, paneled, technical. */
function droneSkin(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#2c3236');
  const h = cv(size), hg = ctx2d(h);
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, size, size);
  // subtle carbon weave
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      if (((x / 4 | 0) + (y / 4 | 0)) % 2 === 0) {
        g.fillStyle = 'rgba(255,255,255,0.025)';
        g.fillRect(x, y, 4, 4);
      }
    }
  }
  panelGrid(g, hg, size, { cols: 4, rows: 3, seam: 1.6, rivets: true, seamAlpha: 0.28 });
  // vents
  for (let i = 0; i < 3; i++) {
    const vx = size * (0.12 + rng() * 0.7), vy = size * (0.15 + rng() * 0.7);
    const vw = size * 0.08, vh = size * 0.05;
    g.fillStyle = 'rgba(8,10,10,0.8)';
    g.fillRect(vx, vy, vw, vh);
    g.strokeStyle = 'rgba(160,168,172,0.35)';
    g.lineWidth = 1;
    g.strokeRect(vx, vy, vw, vh);
    for (let s = 1; s < 5; s++) {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(vx + (s / 5) * vw, vy, 1.4, vh);
    }
    hg.fillStyle = 'rgba(0,0,0,0.8)';
    hg.fillRect(vx, vy, vw, vh);
  }
  // tiny stencils
  g.fillStyle = 'rgba(190,200,205,0.4)';
  g.font = `bold ${size * 0.028}px 'Share Tech Mono', monospace`;
  g.fillText('SN-0472-C', size * 0.05, size * 0.06);
  g.fillStyle = 'rgba(220,120,70,0.5)';
  g.fillText('RESCUE ROUND', size * 0.05, size * 0.095);
  scratches(g, size, rng, { count: 6, alpha: 0.07 });
  noisePass(g, size, { seed: 1801, period: 14, octaves: 3, mono: 0.03 });
  const rough = roughCanvas(size, 182, 14, 1821);
  const rgh = ctx2d(rough);
  scratches(rgh, size, rng, { count: 6, alpha: 0.35 });
  return { color: c, height: h, rough };
}

/** Glass (cockpit etc.) */
function glass(size, rng) {
  const c = cv(size), g = ctx2d(c);
  fill(g, size, '#1c242e');
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.save(); g.translate(size * 0.3, 0); g.rotate(0.4); g.fillRect(0, -size, size * 0.14, size * 3); g.restore();
  g.save(); g.translate(size * 0.68, 0); g.rotate(0.4); g.fillRect(0, -size, size * 0.07, size * 3); g.restore();
  noisePass(g, size, { seed: 1901, period: 8, octaves: 3, mono: 0.02 });
  return { color: c, rough: roughCanvas(size, 46, 10, 1921) };
}

export const structureRecipes = {
  brick, plaster, siding, roofTiles, metalPanel, rust, corrugated, wood,
  window, tarp, hay, sandbags, containerDoor,
  camo, tankTrack, tireSide, wheelRim, droneSkin, glass,
};
