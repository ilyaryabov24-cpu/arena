// ==== Рендер мира ====
import { getSprite, getMeta } from './assets.js';
import { B, SEASON_SWAP } from './data.js';
import { TILE, MAPW, MAPH, idx, G } from './world.js';

const WORLD_W = MAPW * TILE, WORLD_H = MAPH * TILE;

function spr(key) { return getSprite(key); }

// сезонная замена тайлов земли
function groundSwap(season) {
  const m = [];
  for (let i = 0; i < 16; i++) m[i] = i;
  if (season === 'winter') {
    m[G.grass] = G.snow; m[G.grass_flowers] = G.snow; m[G.grass_dry] = G.snow;
    m[G.dirt] = G.snow; m[G.moss] = G.snow; m[G.field] = G.snow; m[G.mud] = G.snow;
  } else if (season === 'autumn') {
    m[G.grass_flowers] = G.autumn_leaves; m[G.grass_dry] = G.autumn_leaves;
  }
  return m;
}

export function makeWorldLayer(world, season) {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W; cv.height = WORLD_H;
  const c = cv.getContext('2d');
  const swap = groundSwap(season);
  // земля
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
    const g = swap[world.ground[idx(x, y)]];
    const im = spr('ground.' + ['grass','grass_dry','dirt','sand','gravel','asphalt','paving','brick_pave','snow','autumn_leaves','mud','moss','water','field','asphalt_old','grass_flowers'][g]);
    if (im) c.drawImage(im, x * TILE, y * TILE);
  }
  // тротуары
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
    if (world.road[idx(x, y)] === 2) {
      const im = spr('ground.paving');
      if (im) c.drawImage(im, x * TILE, y * TILE);
    }
  }
  // дороги
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
    const i = idx(x, y);
    if (world.road[i] !== 1) continue;
    const im = spr('ground.asphalt');
    if (im) c.drawImage(im, x * TILE, y * TILE);
    const L = x > 0 && world.road[idx(x - 1, y)] >= 1, R = x < MAPW - 1 && world.road[idx(x + 1, y)] >= 1;
    const U = y > 0 && world.road[idx(x, y - 1)] >= 1, D = y < MAPH - 1 && world.road[idx(x, y + 1)] >= 1;
    const px = x * TILE, py = y * TILE;
    // бордюры
    c.fillStyle = '#9aa0a8';
    if (!U) c.fillRect(px, py, TILE, 3);
    if (!D) c.fillRect(px, py + TILE - 3, TILE, 3);
    if (!L) c.fillRect(px, py, 3, TILE);
    if (!R) c.fillRect(px + TILE - 3, py, 3, TILE);
    // разметка
    c.fillStyle = '#d8c96a';
    const straightH = L && R && !U && !D, straightV = U && D && !L && !R;
    if (straightH) { if ((x % 2) === 0) c.fillRect(px + 6, py + 15, 14, 2); }
    if (straightV) { if ((y % 2) === 0) c.fillRect(px + 15, py + 6, 2, 14); }
    // зебра на въездах к перекрёстку
    if (L && R && (U || D) && !((U) && (D))) {
      c.fillStyle = '#cfd4da';
      for (let s = 0; s < 4; s++) c.fillRect(px + 3 + s * 8, U ? py + 4 : py + TILE - 10, 4, 6);
    }
  }
  return cv;
}

// темнота по времени суток
export function darkness(t) {
  if (t < 5) return 1;
  if (t < 8) return 1 - (t - 5) / 3;
  if (t < 19) return 0;
  if (t < 22) return (t - 19) / 3;
  return 1;
}

export function drawEntities(S, ctx, cam, viewW, viewH, timeSec) {
  const w = S.world;
  const season = S._season;
  const list = [];
  const x0 = Math.max(0, (cam.x / TILE | 0) - 3), x1 = Math.min(MAPW, ((cam.x + viewW) / TILE | 0) + 3);
  const y0 = Math.max(0, (cam.y / TILE | 0) - 4), y1 = Math.min(MAPH, ((cam.y + viewH) / TILE | 0) + 4);

  for (const e of w.ents) {
    if (e.x + e.w < x0 || e.x > x1 || e.y + e.h < y0 || e.y > y1) continue;
    const d = B[e.def]; if (!d || !d.sprite) continue;
    let key = d.sprite;
    if (SEASON_SWAP[season] && SEASON_SWAP[season][key]) key = SEASON_SWAP[season][key];
    const im = spr(key); if (!im) continue;
    const m = getMeta(key);
    const ax = (e.x * TILE + e.w * TILE / 2), ay = (e.y + e.h) * TILE;
    list.push({ y: ay, f: () => {
      ctx.drawImage(im, Math.round(ax - m.ax), Math.round(ay - m.ay));
      // ночные окна
      const dk = darkness(S.t);
      if (dk > 0.25 && e.w > 1 && S.power > 25) {
        const n = 2 + ((e.id * 7) % 3);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < n; k++) {
          const wx = ax - m.ax + 8 + ((e.id * 13 + k * 29) % (m.w - 16));
          const wy = ay - m.ay + m.h * 0.45 + ((e.id * 17 + k * 23) % Math.max(4, m.h * 0.3));
          const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, 7);
          g.addColorStop(0, `rgba(255,190,90,${0.35 * dk})`);
          g.addColorStop(1, 'rgba(255,190,90,0)');
          ctx.fillStyle = g; ctx.fillRect(wx - 7, wy - 7, 14, 14);
        }
        ctx.restore();
      }
    }});
  }
  // люди и коты
  for (const p of S.people) {
    if (!p || p.x < cam.x - 40 || p.x > cam.x + viewW + 40 || p.y < cam.y - 40 || p.y > cam.y + viewH + 40) continue;
    let key = 'people.' + p.spr;
    if (p.tourist) key = 'people.tourist';
    const im = spr(key) || spr('people.man'); if (!im) continue;
    const bob = Math.sin(p.ph * 6) * 1.2;
    list.push({ y: p.y, f: () => ctx.drawImage(im, Math.round(p.x - im.width / 2), Math.round(p.y - im.height + 4 + bob)) });
  }
  for (const p of S.cats) {
    if (!p) continue;
    const im = spr('people.cat'); if (!im) continue;
    list.push({ y: p.y, f: () => ctx.drawImage(im, Math.round(p.x - im.width / 2), Math.round(p.y - im.height + 4)) });
  }
  // машины
  for (const car of S.cars) {
    const im = spr('vehicles.' + car.spr); if (!im) continue;
    list.push({ y: car.y, f: () => {
      ctx.save();
      ctx.translate(Math.round(car.x), Math.round(car.y));
      ctx.rotate((car.dir || 0) * Math.PI / 180);
      ctx.drawImage(im, -im.width / 2, -im.height / 2);
      ctx.restore();
      // фары ночью
      const dk = darkness(S.t);
      if (dk > 0.3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.translate(car.x, car.y); ctx.rotate((car.dir || 0) * Math.PI / 180);
        const g = ctx.createRadialGradient(0, -im.height / 2 - 8, 2, 0, -im.height / 2 - 8, 26);
        g.addColorStop(0, `rgba(255,240,180,${0.30 * dk})`); g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g; ctx.fillRect(-26, -im.height / 2 - 34, 52, 52);
        ctx.restore();
      }
    }});
  }
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.f();
}

export function drawParticles(S, ctx, cam, viewW, viewH) {
  for (const p of S.parts) {
    if (p.x < cam.x - 20 || p.x > cam.x + viewW + 20 || p.y < cam.y - 20 || p.y > cam.y + viewH + 20) continue;
    if (p.k === 'snow') { const im = spr('fx.snowflake'); if (im) ctx.drawImage(im, p.x | 0, p.y | 0, 6, 6); else { ctx.fillStyle = '#fff'; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); } }
    else if (p.k === 'leaf') { const im = spr('fx.leaf'); if (im) ctx.drawImage(im, p.x | 0, p.y | 0, 8, 8); }
    else if (p.k === 'rain') { ctx.strokeStyle = 'rgba(160,190,255,0.5)'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 1, p.y + 6); ctx.stroke(); }
    else if (p.k === 'fly') {
      const a = 0.4 + 0.4 * Math.sin(p.ph * 6);
      const im = spr('fx.glow');
      if (im) { ctx.globalAlpha = a; ctx.drawImage(im, p.x - 4, p.y - 4, 8, 8); ctx.globalAlpha = 1; }
    }
    else if (p.k === 'heart') { const im = spr('fx.heart'); if (im) { ctx.globalAlpha = Math.min(1, p.life); ctx.drawImage(im, p.x - 5, p.y - 5, 10, 10); ctx.globalAlpha = 1; } }
    else if (p.k === 'spark') { const im = spr('fx.sparkle'); if (im) { ctx.globalAlpha = Math.min(1, p.life); ctx.drawImage(im, p.x - 5, p.y - 5, 10, 10); ctx.globalAlpha = 1; } }
    else if (p.k === 'smoke') { const im = spr('fx.smoke'); if (im) { ctx.globalAlpha = Math.min(0.7, p.life * 0.6); ctx.drawImage(im, p.x - 6, p.y - 6, 12, 12); ctx.globalAlpha = 1; } }
  }
}

// дым из труб промышленных зданий
export function emitSmoke(S) {
  for (const e of S.world.ents) {
    if ((e.def === 'factory' || e.def === 'boilerhouse' || e.def === 'sawmill') && Math.random() < 0.05) {
      S.parts.push({ k: 'smoke', x: e.x * TILE + e.w * TILE / 2 + 8, y: (e.y) * TILE + 4, vy: -12, life: 2.2, ph: 0 });
    }
  }
}

// ==== освещение ====
export function drawLight(S, lctx, cam, viewW, viewH) {
  const dk = darkness(S.t);
  lctx.clearRect(0, 0, viewW, viewH);
  if (dk <= 0.02) return;
  lctx.fillStyle = `rgba(10,14,42,${0.82 * dk})`;
  lctx.fillRect(0, 0, viewW, viewH);
  lctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const g = lctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, 7); lctx.fill();
  };
  // фонари
  for (const e of S.world.ents) {
    if (B[e.def] && B[e.def].light) {
      hole(e.x * TILE + 16 - cam.x, e.y * TILE + 10 - cam.y, 62, 0.9);
    }
    if (e.w > 1 && S.power > 25) {
      hole(e.x * TILE + e.w * 16 - cam.x, (e.y + e.h * 0.5) * TILE - cam.y, 40, 0.35);
    }
  }
  // фары
  for (const c of S.cars) hole(c.x - cam.x, c.y - cam.y, 40, 0.5);
  // луна/рассветное небо слегка высвечивает всё
  lctx.globalCompositeOperation = 'source-over';
}

export function drawGlow(S, ctx, cam, viewW, viewH) {
  const dk = darkness(S.t);
  if (dk <= 0.05) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const e of S.world.ents) {
    if (B[e.def] && B[e.def].light) {
      const x = e.x * TILE + 16 - cam.x, y = e.y * TILE + 10 - cam.y;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
      g.addColorStop(0, `rgba(255,190,100,${0.35 * dk})`); g.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
    }
  }
  ctx.restore();
}
