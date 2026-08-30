// Программный canvas 2d для headless-рендера кадров игры
import { PNG } from 'pngjs';
import fs from 'fs';

export function loadPNG(path) {
  const p = PNG.sync.read(fs.readFileSync(path));
  return { width: p.width, height: p.height, data: new Uint8ClampedArray(p.data) };
}

export function savePNG(path, w, h, data) {
  const p = new PNG({ width: w, height: h });
  p.data = Buffer.from(data);
  fs.writeFileSync(path, PNG.sync.write(p));
}

function parseColor(s) {
  if (typeof s !== 'string') return null;
  if (s[0] === '#') {
    const h = s.slice(1);
    if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 255];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const a = m[1].split(',').map(Number);
    return [a[0], a[1], a[2], a.length > 3 ? Math.round(a[3] * 255) : 255];
  }
  return [0, 0, 0, 255];
}

class Grad { constructor(x, y, r) { this.x = x; this.y = y; this.r = r; this.stops = []; }
  addColorStop(t, c) { this.stops.push([t, parseColor(c)]); } }

export class SoftCanvas {
  constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
  getContext() { if (!this._ctx) this._ctx = new SoftCtx(this); return this._ctx; }
}

class SoftCtx {
  constructor(cv) {
    this.canvas = cv; this.tx = 0; this.ty = 0; this.stack = [];
    this.globalAlpha = 1; this.globalCompositeOperation = 'source-over';
    this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1;
    this.imageSmoothingEnabled = false; this._circle = null;
  }
  save() { this.stack.push([this.tx, this.ty, this.globalAlpha, this.globalCompositeOperation, this.fillStyle]); }
  restore() { const s = this.stack.pop(); if (s) [this.tx, this.ty, this.globalAlpha, this.globalCompositeOperation, this.fillStyle] = s; }
  translate(x, y) { this.tx += x; this.ty += y; }
  rotate() {}
  beginPath() { this._circle = null; }
  arc(x, y, r) { this._circle = [x, y, r]; }
  stroke() {}
  quadraticCurveTo() {} moveTo() {} lineTo() {}
  measureText() { return { width: 10 }; }
  createRadialGradient(x, y, r0, x1, y1, r1) { return new Grad(x1, y1, r1); }
  createLinearGradient() { return new Grad(0, 0, 1); }

  _px(x, y, r, g, b, a) {
    const cv = this.canvas;
    if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return;
    const i = (y * cv.width + x) * 4, d = cv.data;
    const mode = this.globalCompositeOperation;
    if (mode === 'copy') { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; return; }
    if (mode === 'destination-out') { d[i + 3] = d[i + 3] * (1 - a / 255); return; }
    if (mode === 'lighter') {
      d[i] = Math.min(255, d[i] + r * a / 255); d[i + 1] = Math.min(255, d[i + 1] + g * a / 255);
      d[i + 2] = Math.min(255, d[i + 2] + b * a / 255); d[i + 3] = Math.max(d[i + 3], a); return;
    }
    // source-over
    const sa = a / 255, da = d[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    d[i] = (r * sa + d[i] * da * (1 - sa)) / oa;
    d[i + 1] = (g * sa + d[i + 1] * da * (1 - sa)) / oa;
    d[i + 2] = (b * sa + d[i + 2] * da * (1 - sa)) / oa;
    d[i + 3] = oa * 255;
  }

  fillRect(x, y, w, h) {
    x = Math.round(x + this.tx); y = Math.round(y + this.ty);
    const fs = this.fillStyle;
    if (fs instanceof Grad) { this._gradFill(fs, x, y, w, h); return; }
    const c = parseColor(fs); const a = Math.round(c[3] * this.globalAlpha);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this._px(xx, yy, c[0], c[1], c[2], a);
  }

  _gradFill(g, x, y, w, h) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const d = Math.hypot(xx - g.x, yy - g.y);
      const t = Math.min(1, d / g.r);
      const col = this._sample(g, t);
      this._px(xx, yy, col[0], col[1], col[2], Math.round(col[3] * this.globalAlpha));
    }
  }
  _sample(g, t) {
    if (!g.stops.length) return [0, 0, 0, 0];
    if (t <= g.stops[0][0]) return g.stops[0][1];
    for (let i = 0; i < g.stops.length - 1; i++) {
      const [t0, c0] = g.stops[i], [t1, c1] = g.stops[i + 1];
      if (t <= t1) { const k = (t - t0) / Math.max(0.001, t1 - t0);
        return [0, 1, 2, 3].map(j => c0[j] + (c1[j] - c0[j]) * k); }
    }
    return g.stops[g.stops.length - 1][1];
  }

  fill() { if (this._circle && this.fillStyle instanceof Grad) {
    const [x, y, r] = this._circle;
    this._gradFill(this.fillStyle, Math.round(x - r), Math.round(y - r), r * 2, r * 2);
  } }

  clearRect(x, y, w, h) {
    const old = this.globalCompositeOperation, oldFs = this.fillStyle;
    this.globalCompositeOperation = 'copy'; this.fillStyle = 'rgba(0,0,0,0)';
    this.fillRect(x - this.tx, y - this.ty, w, h);
    this.globalCompositeOperation = old; this.fillStyle = oldFs;
  }

  drawImage(img, a, b, c, d, e, f, g2, h2) {
    if (img && img._soft) img = img._soft;
    if (!img || !img.data) return;
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
    if (h2 !== undefined) { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g2; dh = h2; }
    else if (c !== undefined) { dx = a; dy = b; dw = c; dh = d; }
    else { dx = a; dy = b; dw = img.width; dh = img.height; }
    dx = Math.round(dx + this.tx); dy = Math.round(dy + this.ty);
    for (let yy = 0; yy < dh; yy++) {
      const syy = Math.min(sh - 1, Math.floor(yy * sh / dh));
      for (let xx = 0; xx < dw; xx++) {
        const sxx = Math.min(sw - 1, Math.floor(xx * sw / dw));
        const si = ((sy + syy) * img.width + (sx + sxx)) * 4;
        const al = img.data[si + 3];
        if (al === 0) continue;
        this._px(dx + xx, dy + yy, img.data[si], img.data[si + 1], img.data[si + 2], Math.round(al * this.globalAlpha));
      }
    }
  }
}
