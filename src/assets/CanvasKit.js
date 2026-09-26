// ---------------------------------------------------------------------------
// CanvasKit — drawing helpers for the procedural texture pipeline.
// Textures are composed of: base fill -> patterns -> per-pixel noise ->
// grime/wear -> normal map (from a painted height canvas).
// ---------------------------------------------------------------------------

import { fbm, valueNoise, ridged } from './Noise.js';
import { TAU, clamp } from '../core/Utils.js';

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function ctx2d(c) {
  const g = c.getContext('2d', { willReadFrequently: true });
  return g;
}

// ---- per-pixel noise passes ------------------------------------------------

/**
 * Adds tileable fBm luminance/color variation to the whole canvas.
 * opts: { seed, period, octaves, monochrome (0..1 strength), colorShift (rgb amplitude) }
 */
export function noisePass(g, size, opts = {}) {
  const {
    seed = 1, period = 8, octaves = 4,
    mono = 0.08, colorAmp = 0,
    ridge = false, monoContrast = 1,
  } = opts;
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = ridge
        ? ridged(u * period, v * period, period, seed, octaves)
        : fbm(u * period, v * period, period, seed, octaves);
      let nm = (n - 0.5) * 2 * mono * monoContrast;
      nm = Math.max(-0.5, Math.min(0.5, nm));
      const i = (y * size + x) * 4;
      if (colorAmp > 0) {
        const n2 = fbm(u * period * 1.7, v * period * 1.7, Math.round(period * 1.7), seed + 77, 3);
        const n3 = fbm(u * period * 0.6, v * period * 0.6, Math.max(2, Math.round(period * 0.6)), seed + 991, 3);
        d[i] = clamp(d[i] + nm * 255 + (n2 - 0.5) * colorAmp * 255, 0, 255);
        d[i + 1] = clamp(d[i + 1] + nm * 255 + (n3 - 0.5) * colorAmp * 255, 0, 255);
        d[i + 2] = clamp(d[i + 2] + nm * 255 - (n2 - 0.5) * colorAmp * 130, 0, 255);
      } else {
        const v2 = clamp(d[i] + nm * 255, 0, 255);
        d[i] = v2; d[i + 1] = v2; d[i + 2] = v2;
      }
    }
  }
  g.putImageData(img, 0, 0);
}

/** Per-pixel color remap using a palette function: fn(n) -> [r,g,b] in 0..255 */
export function palettePass(g, size, fn, opts = {}) {
  const { seed = 5, period = 6, octaves = 4 } = opts;
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = fbm(u * period, v * period, period, seed, octaves);
      const [r, gg, b] = fn(n, u, v);
      const i = (y * size + x) * 4;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    }
  }
  g.putImageData(img, 0, 0);
}

/** Multiply canvas by soft radial falloff (for particles/decals with alpha). */
export function radialAlpha(g, size, { inner = 0.0, outer = 1.0, power = 1.6, feather = 0.35 } = {}) {
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  const R = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - R, y - R) / R;
      const e = clamp((outer + feather * 0.5 - r) / feather, 0, 1);
      const a = Math.pow(e, power);
      d[(y * size + x) * 4 + 3] = clamp(a * d[(y * size + x) * 4 + 3], 0, 255);
    }
  }
  g.putImageData(img, 0, 0);
}

// ---- drawn detail helpers ---------------------------------------------------

/** Random cracks: dark meandering polylines with light inner edge. */
export function cracks(g, size, rng, { count = 6, alpha = 0.35, color = '0,0,0', width = 1.5 } = {}) {
  for (let i = 0; i < count; i++) {
    let x = rng() * size, y = rng() * size;
    let ang = rng() * TAU;
    const segs = 8 + Math.floor(rng() * 14);
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < segs; s++) {
      ang += (rng() - 0.5) * 1.2;
      const len = size * (0.02 + rng() * 0.05);
      x += Math.cos(ang) * len; y += Math.sin(ang) * len;
      g.lineTo(x, y);
    }
    g.strokeStyle = `rgba(${color},${alpha})`;
    g.lineWidth = width;
    g.stroke();
    g.strokeStyle = `rgba(${color},${alpha * 0.45})`;
    g.lineWidth = width * 2.2;
    g.stroke();
  }
}

/** Dark organic stains / blotches with soft edges (multiply-ish). */
export function stains(g, size, rng, { count = 10, alpha = 0.12, rMin = 0.05, rMax = 0.25, color = '20,18,14' } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng() * size, y = rng() * size;
    const r = size * (rMin + rng() * (rMax - rMin));
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${color},${alpha})`);
    grd.addColorStop(0.7, `rgba(${color},${alpha * 0.5})`);
    grd.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Vertical grime streaks (dirt running down walls). */
export function drips(g, size, rng, { count = 24, alpha = 0.08, color = '15,14,10', fromTop = true } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng() * size;
    const y0 = fromTop ? -size * 0.05 * rng() : rng() * size;
    const w = size * (0.004 + rng() * 0.012);
    const h = size * (0.15 + rng() * 0.6);
    const grd = g.createLinearGradient(0, y0, 0, y0 + h);
    grd.addColorStop(0, `rgba(${color},${alpha})`);
    grd.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grd;
    g.fillRect(x, y0, w, h);
  }
}

/** Speckle dots — aggregate stones, grain, wear chips. */
export function speckles(g, size, rng, { count = 400, alpha = 0.2, rMin = 0.5, rMax = 2.2, light = false, dark = true } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng() * size, y = rng() * size;
    const r = rMin + rng() * (rMax - rMin);
    const a = alpha * (0.3 + rng() * 0.7);
    if (dark) {
      g.fillStyle = `rgba(10,10,12,${a})`;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    if (light) {
      g.fillStyle = `rgba(235,235,225,${a * 0.7})`;
      g.beginPath(); g.arc(x + r * 0.4, y - r * 0.4, r * 0.6, 0, TAU); g.fill();
    }
  }
}

/** Panel grid — seams (recessed) with rivets (raised) on both color+height. */
export function panelGrid(g, h, size, { cols = 4, rows = 4, seam = 2, rivets = true, seamAlpha = 0.5 } = {}) {
  g.strokeStyle = `rgba(0,0,0,${seamAlpha})`;
  h.strokeStyle = 'rgba(0,0,0,0.9)';
  g.lineWidth = seam; h.lineWidth = seam;
  for (let i = 1; i < cols; i++) {
    const x = (i / cols) * size;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, size); g.stroke();
    h.beginPath(); h.moveTo(x, 0); h.lineTo(x, size); h.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = (j / rows) * size;
    g.beginPath(); g.moveTo(0, y); g.lineTo(size, y); g.stroke();
    h.beginPath(); h.moveTo(0, y); h.lineTo(size, y); h.stroke();
  }
  if (rivets) {
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const x = clamp((i / cols) * size, 4, size - 4);
        const y = clamp((j / rows) * size, 4, size - 4);
        if ((i === 0 || i === cols) && (j === 0 || j === rows)) continue;
        const off = size * 0.012;
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.beginPath(); g.arc(x + off, y - off, 1.6, 0, TAU); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
        h.fillStyle = 'rgba(255,255,255,0.85)';
        h.beginPath(); h.arc(x, y, 1.8, 0, TAU); h.fill();
      }
    }
  }
}

/** Scratches — thin bright scuffs with dark edge. */
export function scratches(g, size, rng, { count = 14, alpha = 0.14 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng() * size, y = rng() * size;
    const ang = rng() * TAU;
    const len = size * (0.03 + rng() * 0.12);
    g.strokeStyle = `rgba(220,220,215,${alpha * (0.4 + rng() * 0.6)})`;
    g.lineWidth = 0.8 + rng();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }
}

/** Bordered frame vignette (darker edges) for tiles that shouldn't bleed. */
export function edgeDarken(g, size, strength = 0.1) {
  const grd = g.createLinearGradient(0, 0, 0, size);
  grd.addColorStop(0, `rgba(0,0,0,${strength})`);
  grd.addColorStop(0.15, 'rgba(0,0,0,0)');
  grd.addColorStop(0.85, 'rgba(0,0,0,0)');
  grd.addColorStop(1, `rgba(0,0,0,${strength})`);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
}

// ---- height -> normal map ---------------------------------------------------

/**
 * Computes a tangent-space normal map from a grayscale height canvas
 * using a Sobel filter with wrap-around sampling (keeps tileability).
 */
export function heightToNormal(heightCanvas, strength = 2.0, size = heightCanvas.width) {
  const src = heightCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, size, size).data;
  const out = makeCanvas(size);
  const og = ctx2d(out);
  const img = og.createImageData(size, size);
  const d = img.data;
  const H = (x, y) => {
    x = ((x % size) + size) % size; y = ((y % size) + size) % size;
    return src[(y * size + x) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = H(x - 1, y - 1), t = H(x, y - 1), tr = H(x + 1, y - 1);
      const l = H(x - 1, y), r = H(x + 1, y);
      const bl = H(x - 1, y + 1), b = H(x, y + 1), br = H(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      const i = (y * size + x) * 4;
      d[i] = clamp(128 - dx * 255 * strength * 0.5, 0, 255);
      d[i + 1] = clamp(128 + dy * 255 * strength * 0.5, 0, 255);
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  og.putImageData(img, 0, 0);
  return out;
}

/** Blur a canvas onto itself (cheap box blur, for soft height layers). */
export function boxBlur(canvas, radius = 2) {
  const size = canvas.width;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const src = g.getImageData(0, 0, size, size);
  const out = g.createImageData(size, size);
  const s = src.data, o = out.data;
  const w = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = ((x + dx) % size + size) % size, yy = ((y + dy) % size + size) % size;
          acc += s[(yy * size + xx) * 4];
        }
      }
      const v = acc / (w * w);
      const i = (y * size + x) * 4;
      o[i] = v; o[i + 1] = v; o[i + 2] = v; o[i + 3] = s[i + 3];
    }
  }
  g.putImageData(out, 0, 0);
  return canvas;
}

/** Fill entire canvas with a color. */
export function fill(g, size, css) { g.fillStyle = css; g.fillRect(0, 0, size, size); }

/** Vertical wave shading (corrugated metal ridges) — returns height canvas. */
export function corrugationHeight(size, { ridgeW = 32, amp = 0.55 } = {}) {
  const c = makeCanvas(size); const g = ctx2d(c);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const phase = ((x % ridgeW) / ridgeW) * TAU;
      const v = 128 + Math.sin(phase) * amp * 90;
      const i = (y * size + x) * 4;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
