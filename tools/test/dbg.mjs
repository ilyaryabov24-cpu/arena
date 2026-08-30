import { JSDOM, VirtualConsole } from 'jsdom';
import { SoftCanvas, loadPNG } from './softcanvas.mjs';
const BASE='http://127.0.0.1:8000/';
const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('JSDOM ERROR:', e.message, e.detail && e.detail.stack ? e.detail.stack.split('\n').slice(0,4).join('\n') : ''));
vc.on('error', (...a)=>console.log('console.error', ...a));
const dom = await JSDOM.fromURL(BASE, { runScripts:'outside-only', pretendToBeVisual:true, virtualConsole: vc });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = function(type){
  if (String(type).startsWith('webgl')) return new Proxy({}, { get:(t,k)=> (k==='getShaderParameter'||k==='getProgramParameter')?()=>true: (String(k).startsWith('create')?()=>({}):(()=>undefined)), set:()=>true });
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
await new Promise(r=>setTimeout(r,2500));
const sc = main.__debug.scene._soft;
let sum=0; for(let i=0;i<sc.data.length;i+=40) sum+=sc.data[i+3];
console.log('scene alpha sum sample:', sum);
process.exit(0);
