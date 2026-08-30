// Headless smoke-test: jsdom + canvas/webgl stubs, настоящий код игры
import { JSDOM } from 'jsdom';

const BASE = 'http://127.0.0.1:8000/';
const FILE = '/home/user/arena/game/js/main.js';
const errors = [];

const dom = await JSDOM.fromURL(BASE, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;

// ---- stub 2d context ----
function ctx2d() {
  const grad = { addColorStop() {} };
  const target = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }) };
  return new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; return () => undefined; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
// ---- stub webgl ----
function glStub() {
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
const GL = glStub();
window.HTMLCanvasElement.prototype.getContext = function (type) {
  return String(type).startsWith('webgl') ? GL : ctx2d();
};

class FakeImage {
  constructor() { this.width = 32; this.height = 32; }
  set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 1); }
  get src() { return this._src; }
}

const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => realFetch(new URL(u, BASE), o);
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.Image = FakeImage;
globalThis.requestAnimationFrame = cb => window.requestAnimationFrame(cb);
globalThis.addEventListener = window.addEventListener.bind(window);
window.addEventListener('error', e => errors.push('window error: ' + e.message));
const origErr = console.error;
console.error = (...a) => { errors.push('console.error: ' + a.join(' ')); origErr(...a); };

const main = await import(FILE);
await new Promise(r => setTimeout(r, 1200));
const S = main.__debug.S;
if (!S) { console.log('FAIL: state not created'); process.exit(1); }
console.log('BOOT ok | pop=' + S.pop, 'money=' + S.money, 'ents=' + S.world.ents.length, 'people=' + S.people.length, 'cars=' + S.cars.length);

await new Promise(r => setTimeout(r, 2500));
console.log('LIVE 3.5s | day=' + S.day, 't=' + S.t.toFixed(2), 'soul=' + S.soul, 'fuel=' + S.fuel.toFixed(1), 'people=' + S.people.length, 'cars=' + S.cars.length, 'parts=' + S.parts.length);

// построить хрущёвку кликом
const uiMod = await import('/home/user/arena/game/js/ui.js');
uiMod.uiState.tool = 'khrush';
const view = window.document.getElementById('view');
view.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 400, clientY: 300, bubbles: true }));
view.dispatchEvent(new window.MouseEvent('mousedown', { clientX: 400, clientY: 300, button: 0, bubbles: true }));
await new Promise(r => setTimeout(r, 400));
const entsAfter = S.world.ents.length;
console.log('PLACE khrush | money=' + S.money, 'ents=' + entsAfter);

uiMod.uiState.tool = 'road';
view.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 430, clientY: 310, bubbles: true }));
view.dispatchEvent(new window.MouseEvent('mousedown', { clientX: 430, clientY: 310, button: 0, bubbles: true }));
await new Promise(r => setTimeout(r, 300));
console.log('PLACE road ok');

// экономика: 12 дневных тиков
const sim = await import('/home/user/arena/game/js/sim.js');
for (let i = 0; i < 12; i++) { S.day++; sim.tickDay(S); }
console.log('TICK x12 | money=' + S.money, 'pop=' + S.pop, 'soul=' + S.soul, 'fuel=' + S.fuel.toFixed(1), 'power=' + S.power.toFixed(1), 'tourists=' + S.tourists);

const data = await import('/home/user/arena/game/js/data.js');
const evc = data.EVENTS.find(e => e.id === 'cats_market');
console.log('EVENT apply:', evc.choices[0].apply(S));

// сериализация/десериализация
const ser = sim.serialize(S);
const S2 = sim.deserialize(ser);
console.log('SAVE/LOAD ok | pop=' + S2.pop, 'ents=' + S2.world.ents.length);

console.log('ERRORS:', errors.length ? errors.slice(0, 10) : 'none');
process.exit(errors.length ? 2 : 0);
