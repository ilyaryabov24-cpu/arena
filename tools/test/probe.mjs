import { JSDOM } from 'jsdom';
import { SoftCanvas, loadPNG } from './softcanvas.mjs';
const BASE='http://127.0.0.1:8000/';
const dom = await JSDOM.fromURL(BASE, { runScripts:'outside-only', pretendToBeVisual:true });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = function(type){
  if (String(type).startsWith('webgl')) return new Proxy({}, { get:(t,k)=> (k==='getShaderParameter'||k==='getProgramParameter')?()=>true:(String(k).startsWith('create')?()=>({}):(()=>undefined)), set:()=>true });
  if (!this._soft || this._soft.width!==this.width || this._soft.height!==this.height) this._soft = new SoftCanvas(this.width||300,this.height||150);
  return this._soft.getContext();
};
class RealImage { constructor(){this.width=0;this.height=0;this.data=null;}
  set src(v){ this._src=v; setTimeout(()=>{ try{ const p=loadPNG('/home/user/arena/game/'+v); this.width=p.width;this.height=p.height;this.data=p.data; this.onload&&this.onload(); }catch(e){ this.onerror&&this.onerror(); } },1); }
  get src(){return this._src;} }
const _rf=globalThis.fetch; globalThis.fetch=(u,o)=>_rf(new URL(u,BASE),o);
globalThis.window=window; globalThis.document=window.document; globalThis.localStorage=window.localStorage;
globalThis.Image=RealImage; globalThis.requestAnimationFrame=cb=>window.requestAnimationFrame(cb);
globalThis.addEventListener=window.addEventListener.bind(window);
const main = await import('/home/user/arena/game/js/main.js');
await new Promise(r=>setTimeout(r,2000));
const wl = main.__debug.worldLayer;
console.log('worldLayer el:', !!wl, wl && wl.width, wl && wl.height, 'soft:', !!wl._soft);
if (wl._soft) { let nz=0, al=0; for(let i=0;i<wl._soft.data.length;i+=4){ if(wl._soft.data[i+3]) al++; if(wl._soft.data[i]||wl._soft.data[i+1]||wl._soft.data[i+2]) nz++; }
  console.log('worldLayer alpha px:', al, 'rgb px:', nz); }
const sc = main.__debug.scene._soft;
let nz2=0, al2=0;
for (let i=0;i<sc.data.length;i+=4){ if(sc.data[i+3]) al2++; if(sc.data[i]||sc.data[i+1]||sc.data[i+2]) nz2++; }
console.log('scene alpha:', al2, 'rgb:', nz2);
const { savePNG } = await import('./softcanvas.mjs');
savePNG('/tmp/scene_raw.png', sc.width, sc.height, sc.data);
process.exit(0);
