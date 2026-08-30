// Визуальный прогон: рендерим реальные кадры игры в PNG
import { JSDOM } from 'jsdom';
import { SoftCanvas, loadPNG, savePNG } from './softcanvas.mjs';

const BASE = 'http://127.0.0.1:8000/';
const FILE = '/home/user/arena/game/js/main.js';
const ASSETS = '/home/user/arena/game/';

const dom = await JSDOM.fromURL(BASE, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;

window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (String(type).startsWith('webgl')) {
    const obj = {};
    return new Proxy(obj, {
      get(t, k) {
        if (k === 'getShaderParameter' || k === 'getProgramParameter') return () => true;
        if (k === 'getUniformLocation' || k === 'getAttribLocation') return () => 0;
        if (String(k).startsWith('create')) return () => ({});
        if (k in t) return t[k];
        return () => undefined;
      },
      set(t, k, v) { t[k] = v; return true; },
    });
  }
  if (!this._soft || this._soft.width !== this.width || this._soft.height !== this.height)
    this._soft = new SoftCanvas(this.width || 300, this.height || 150);
  return this._soft.getContext();
};

class RealImage {
  constructor() { this.width = 0; this.height = 0; this.data = null; }
  set src(v) {
    this._src = v;
    setTimeout(() => {
      try {
        const p = loadPNG(ASSETS + v.replace(/^assets\//, 'assets/'));
        this.width = p.width; this.height = p.height; this.data = p.data;
        this.onload && this.onload();
      } catch (e) { this.onerror && this.onerror(); }
    }, 1);
  }
  get src() { return this._src; }
}

const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => realFetch(new URL(u, BASE), o);
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.Image = RealImage;
globalThis.requestAnimationFrame = cb => window.requestAnimationFrame(cb);
globalThis.addEventListener = window.addEventListener.bind(window);

const main = await import(FILE);
await new Promise(r => setTimeout(r, 2500));
const S = main.__debug.S;
console.log('state:', S.pop, S.world.ents.length, 'cars', S.cars.length);

function capture(path) {
  const sc = main.__debug.scene._soft, li = main.__debug.light._soft;
  let sum = 0; for (let i = 0; i < sc.data.length; i += 40) sum += sc.data[i + 3];
  console.log('capture', path, 'alpha sum:', sum, 'size', sc.width, sc.height);
  const out = new Uint8ClampedArray(sc.data);
  // наложить light поверх
  const lctx2 = new SoftCanvas(1, 1);
  for (let i = 0; i < out.length; i += 4) {
    const la = li.data[i + 3] / 255;
    if (la > 0) {
      out[i] = out[i] * (1 - la) + li.data[i] * la;
      out[i + 1] = out[i + 1] * (1 - la) + li.data[i + 1] * la;
      out[i + 2] = out[i + 2] * (1 - la) + li.data[i + 2] * la;
    }
    out[i + 3] = 255;
  }
  savePNG(path, sc.width, sc.height, out);
  savePNG(path.replace('.png', '_raw.png'), sc.width, sc.height, sc.data);
  console.log('saved', path);
}

await new Promise(r => setTimeout(r, 400));
capture('/tmp/frame_day.png');

// ночь
S.t = 23;
await new Promise(r => setTimeout(r, 400));
capture('/tmp/frame_night.png');

// зима: день 31 => seasonOf = winter, loop сам пересоздаст worldLayer
S.day = 31; S.t = 12;
await new Promise(r => setTimeout(r, 800));
capture('/tmp/frame_winter.png');
console.log('done');
process.exit(0);
