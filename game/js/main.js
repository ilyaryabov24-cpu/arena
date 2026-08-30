// ==== Точка входа ====
import { loadAssets, getSprite, getMeta, makeFallbacks } from './assets.js';
import { B, EVENTS, THOUGHTS, TOURIST_THOUGHTS, SEASON_RU } from './data.js';
import { TILE, MAPW, MAPH, idx, inMap, newWorld, genTerrain, genStartTown, footprintFree, roadNear,
  placeEntity, removeEntity, setRoad, entityAt } from './world.js';
import { createState, recompute, tickDay, seasonOf, syncPeople, updatePeople, syncCars, updateCars,
  updateWeather, spawnFx, serialize, deserialize, DAY_LEN } from './sim.js';
import { makeWorldLayer, darkness, drawEntities, drawParticles, drawLight, drawGlow, emitSmoke } from './render.js';
import { createPostFX } from './postfx.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const VIEW_W = 960, VIEW_H = 540;
let S, worldLayer, postfx, fallback2d = null;
const scene = document.createElement('canvas'); scene.width = VIEW_W; scene.height = VIEW_H;
const sctx = scene.getContext('2d');
const light = document.createElement('canvas'); light.width = VIEW_W; light.height = VIEW_H;
const lctx = light.getContext('2d');
const view = document.getElementById('view');
const cam = { x: 0, y: 0 };
const keys = {};
let hover = null, mouse = { x: 0, y: 0 };
let evTimer = 55, tickerTimer = 0, hudTimer = 0, saveTimer = 30, bellDone = -1, agentTimer = 0;
let menuOpen = false, booted = false;

// ---------- boot ----------
(async function boot() {
  await loadAssets((p, f) => {
    document.getElementById('boot-fill').style.width = (p * 100) + '%';
    document.getElementById('boot-msg').textContent = 'просыпается город… ' + f.split('/').pop();
  });
  makeFallbacks();
  const save = localStorage.getItem('tihii-gorod-save');
  S = save ? deserialize(save) : null;
  if (!S) {
    const w = newWorld();
    genTerrain(w);
    genStartTown(w, B);
    S = createState(w);
  }
  S._season = seasonOf(S.day);
  recompute(S);
  syncPeople(S); syncCars(S);
  worldLayer = makeWorldLayer(S.world, S._season);

  view.width = window.innerWidth; view.height = window.innerHeight;
  postfx = createPostFX(view);
  if (!postfx) fallback2d = view.getContext('2d');

  cam.x = clamp(26 * TILE - VIEW_W / 2, 0, MAPW * TILE - VIEW_W);
  cam.y = clamp(20 * TILE - VIEW_H / 2, 0, MAPH * TILE - VIEW_H);

  ui.initUI(S);
  bindUI();
  bindInput();
  ui.refreshHUD(S);
  ui.tickTicker();
  document.getElementById('boot').style.display = 'none';
  document.getElementById('game-wrap').classList.remove('hidden');
  booted = true;
  ui.toast('Добро пожаловать, мэр. Город ждал именно тебя.');
  requestAnimationFrame(loop);
})();

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function bindUI() {
  ui.on('tool', t => { audio.sfx('click'); });
  ui.on('sound', () => {
    audio.initAudio();
    audio.setEnabled(!audio.isEnabled());
    document.getElementById('btn-sound').textContent = audio.isEnabled() ? '♪' : '✕';
    if (audio.isEnabled()) ui.toast('Звук включён. Слушай: город дышит.');
  });
  ui.on('pause', () => { S.paused = !S.paused; ui.setPauseIcon(S.paused); audio.sfx('click'); });
  ui.on('menuchange', open => { menuOpen = open; });
  ui.on('save', () => { localStorage.setItem('tihii-gorod-save', serialize(S)); ui.toast('Сохранено. Город запомнил этот день.'); audio.sfx('click'); });
  ui.on('restart', () => {
    localStorage.removeItem('tihii-gorod-save');
    location.reload();
  });
}

// ---------- ввод ----------
function bindInput() {
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Escape') {
      if (!document.getElementById('menu').classList.contains('hidden')) {
        document.getElementById('menu').classList.add('hidden'); menuOpen = false;
      } else ui.uiState.tool = null;
    }
  });
  addEventListener('keyup', e => keys[e.code] = false);
  addEventListener('resize', () => { view.width = window.innerWidth; view.height = window.innerHeight; });
  view.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; updateHover(); });
  view.addEventListener('contextmenu', e => { e.preventDefault(); ui.uiState.tool = null; ui.setInfo('Инструмент убран.'); });
  view.addEventListener('mousedown', e => {
    if (e.button !== 0 || !booted || menuOpen) return;
    if (!document.getElementById('modal').classList.contains('hidden')) return;
    // пост-обработка растягивает scene на весь экран — переводим экранные координаты в scene
    const sx = (mouse.x / view.width) * VIEW_W, sy = (mouse.y / view.height) * VIEW_H;
    const tx = Math.floor((cam.x + sx) / TILE), ty = Math.floor((cam.y + sy) / TILE);
    handleClick(tx, ty, sx, sy);
  });
}

function updateHover() {
  const sx = (mouse.x / view.width) * VIEW_W, sy = (mouse.y / view.height) * VIEW_H;
  hover = { tx: Math.floor((cam.x + sx) / TILE), ty: Math.floor((cam.y + sy) / TILE) };
}

function handleClick(tx, ty, sx, sy) {
  const tool = ui.uiState.tool;
  if (!tool) {
    // инспекция: человек или здание
    const wx = cam.x + sx, wy = cam.y + sy;
    const person = S.people.find(p => p && Math.hypot(p.x - wx, p.y - wy) < 14) ||
      S.cats.find(p => p && Math.hypot(p.x - wx, p.y - wy) < 14);
    if (person) {
      const pool = person.tourist ? TOURIST_THOUGHTS : person.kind === 'cat' ? ['Мрр. Это мой город.', 'Дай колбаски, мэр.'] : THOUGHTS;
      ui.showThought(mouse.x, mouse.y, pool[(Math.random() * pool.length) | 0]);
      audio.sfx('click');
      return;
    }
    const e = entityAt(S.world, tx, ty);
    if (e) {
      const d = B[e.def];
      ui.setInfo(`${d.name} · ${d.desc}`);
      if (Math.random() < 0.4) spawnFx(S, e.x * TILE + 16, e.y * TILE + 8, 'heart');
      audio.sfx('click');
    }
    return;
  }
  const d = B[tool];
  if (tool === 'bulldoze') {
    const e = entityAt(S.world, tx, ty);
    if (e) {
      removeEntity(S.world, e);
      S.money += Math.round((B[e.def].cost || 0) / 2);
      recompute(S); worldLayer = makeWorldLayer(S.world, S._season);
      ui.toast(`Снесено: ${B[e.def].name}. Половину вернули.`);
      audio.sfx('build');
    }
    return;
  }
  if (tool === 'road' || tool === 'sidewalk') {
    if (setRoad(S.world, tx, ty, tool === 'road' ? 1 : 2)) {
      S.money -= d.cost; worldLayer = makeWorldLayer(S.world, S._season); audio.sfx('build');
    } else audio.sfx('error');
    return;
  }
  // здания и декор
  if (!inMap(tx, ty)) return;
  const needRoad = ['res', 'civic', 'econ'].includes(d.cat);
  if (S.money < d.cost) { ui.toast('В бюджете пусто. Подожди налогов или продай что-нибудь душевное.'); audio.sfx('error'); return; }
  if (!footprintFree(S.world, d, tx, ty)) { audio.sfx('error'); return; }
  if (needRoad && !roadNear(S.world, tx, ty, d.w, d.h)) { ui.toast('Нужна дорога рядом — иначе как к нему подъехать?'); audio.sfx('error'); return; }
  placeEntity(S.world, tool, d, tx, ty);
  S.money -= d.cost;
  recompute(S); syncPeople(S); syncCars(S);
  spawnFx(S, tx * TILE + d.w * 16, ty * TILE, 'smoke');
  if (d.soul >= 3) spawnFx(S, tx * TILE + d.w * 16, ty * TILE + 8, 'heart');
  audio.sfx('build');
}

// ---------- цикл ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!booted) return;
  const tSec = now / 1000;

  if (!S.paused && !menuOpen) {
    // время
    S.t += dt * 24 / DAY_LEN;
    if (S.t >= 24) {
      S.t -= 24; S.day++;
      tickDay(S);
      onDay();
    }
    const season = seasonOf(S.day);
    if (season !== S._season) {
      S._season = season;
      worldLayer = makeWorldLayer(S.world, season);
      ui.toast({ spring: 'Весна. Пахнет талой водой и надеждой.', summer: 'Лето. Тополиный пух атакует.', autumn: 'Осень. Листва золото, мысли — тоже.', winter: 'Зима. Город укутался снегом.' }[season]);
      ui.pushNews('В городе ' + SEASON_RU[season] + '. Настроение соответствующее.');
    }
    // камера
    const sp = 420 * dt;
    if (keys['KeyW'] || keys['ArrowUp']) cam.y -= sp;
    if (keys['KeyS'] || keys['ArrowDown']) cam.y += sp;
    if (keys['KeyA'] || keys['ArrowLeft']) cam.x -= sp;
    if (keys['KeyD'] || keys['ArrowRight']) cam.x += sp;
    cam.x = clamp(cam.x, 0, MAPW * TILE - VIEW_W);
    cam.y = clamp(cam.y, 0, MAPH * TILE - VIEW_H);

    updatePeople(S, dt);
    updateCars(S, dt);
    updateWeather(S, dt, S.t);
    agentTimer -= dt;
    if (agentTimer <= 0) { agentTimer = 2; syncPeople(S); syncCars(S); }
    emitSmoke(S);
    // туристы щёлкают камерами
    if (Math.random() < dt * 0.3 && S.tourists > 0) {
      const t = S.people.find(p => p && p.tourist);
      if (t) spawnFx(S, t.x, t.y - 20, 'spark');
    }
    // колокол по воскресеньям
    if (S.day % 7 === 0 && Math.floor(S.t) === 9 && bellDone !== S.day && S.world.ents.some(e => e.def === 'church')) {
      bellDone = S.day; audio.sfx('bell');
      ui.toast('Воскресенье. Колокол плывёт над крышами.');
    }
    // события
    evTimer -= dt;
    if (evTimer <= 0) { evTimer = 45 + Math.random() * 35; tryEvent(); }
    // тикер
    tickerTimer += dt;
    if (tickerTimer > 14) { tickerTimer = 0; ui.tickTicker(); }
    // автосохранение
    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = 30; localStorage.setItem('tihii-gorod-save', serialize(S)); }
    audio.ambient(dt, S);
  }

  render(tSec);
  hudTimer += dt;
  if (hudTimer > 0.25) { hudTimer = 0; S._seasonRu = SEASON_RU[S._season]; ui.refreshHUD(S); }
}

function onDay() {
  ui.pushNews(`День ${S.day}. Бюджет: ${ui.fmt(S.money)} тыс. ₽ (${S.lastIncome >= 0 ? '+' : ''}${S.lastIncome}).`);
}

function tryEvent() {
  const pool = EVENTS.filter(e => (!e.cond || e.cond(S)) && (S._lastEv?.[e.id] === undefined || S.day - S._lastEv[e.id] > 4));
  if (!pool.length) return;
  const ev = pool[(Math.random() * pool.length) | 0];
  S.paused = true; ui.setPauseIcon(true);
  audio.sfx('event');
  ui.showModal(ev, ch => {
    const msg = ch.apply(S);
    S._lastEv = S._lastEv || {}; S._lastEv[ev.id] = S.day;
    recompute(S);
    ui.toast(msg);
    ui.pushNews(msg);
    S.paused = false; ui.setPauseIcon(false);
  });
}

// ---------- рендер ----------
function render(tSec) {
  const dk = darkness(S.t);
  sctx.imageSmoothingEnabled = false;
  sctx.clearRect(0, 0, VIEW_W, VIEW_H);
  // вода анимация: мерцание
  sctx.drawImage(worldLayer, cam.x, cam.y, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  // лёгкое мерцание воды
  if ((tSec * 2 | 0) % 2 === 0) {
    sctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < MAPH; y++) for (let x = (cam.x / TILE | 0); x < (cam.x + VIEW_W) / TILE + 1; x++) {
      if (inMap(x, y) && S.world.ground[idx(x, y)] === 12) {
        const h = (x * 31 + y * 17 + (tSec | 0)) % 7;
        if (h === 0) sctx.fillRect(x * TILE - cam.x + 8, y * TILE - cam.y + 10, 8, 2);
      }
    }
  }
  sctx.save();
  sctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  drawEntities(S, sctx, { x: cam.x, y: cam.y }, VIEW_W, VIEW_H, tSec);
  drawParticles(S, sctx, { x: cam.x, y: cam.y }, VIEW_W, VIEW_H);
  // превью постройки
  drawGhost(sctx);
  sctx.restore();
  drawGlow(S, sctx, { x: cam.x, y: cam.y }, VIEW_W, VIEW_H);
  drawLight(S, lctx, { x: cam.x, y: cam.y }, VIEW_W, VIEW_H);

  if (postfx) postfx.render(scene, light, tSec, dk);
  else if (fallback2d) {
    fallback2d.imageSmoothingEnabled = false;
    fallback2d.clearRect(0, 0, view.width, view.height);
    fallback2d.drawImage(scene, 0, 0, view.width, view.height);
    fallback2d.drawImage(light, 0, 0, view.width, view.height);
  }
}

// отладочная ручка для тестов
export const __debug = { get S() { return S; }, get cam() { return cam; }, scene, light, get worldLayer() { return worldLayer; } };

function drawGhost(ctx) {
  const tool = ui.uiState.tool;
  if (!tool || !hover || tool === 'bulldoze') {
    if (tool === 'bulldoze' && hover) {
      const e = entityAt(S.world, hover.tx, hover.ty);
      if (e) { ctx.fillStyle = 'rgba(200,60,50,0.35)'; ctx.fillRect(e.x * TILE, e.y * TILE, e.w * TILE, e.h * TILE); }
    }
    return;
  }
  const d = B[tool];
  const { tx, ty } = hover;
  if (tool === 'road' || tool === 'sidewalk') {
    const ok = inMap(tx, ty) && S.world.occ[idx(tx, ty)] === -1;
    ctx.fillStyle = ok ? 'rgba(120,200,90,0.4)' : 'rgba(200,60,50,0.4)';
    ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    return;
  }
  const ok = footprintFree(S.world, d, tx, ty) && (!['res', 'civic', 'econ'].includes(d.cat) || roadNear(S.world, tx, ty, d.w, d.h)) && S.money >= d.cost;
  ctx.fillStyle = ok ? 'rgba(120,200,90,0.3)' : 'rgba(200,60,50,0.3)';
  ctx.fillRect(tx * TILE, ty * TILE, d.w * TILE, d.h * TILE);
  if (d.sprite) {
    const im = getSprite(d.sprite);
    if (im) {
      const m = getMeta(d.sprite);
      ctx.globalAlpha = 0.6;
      ctx.drawImage(im, tx * TILE + d.w * TILE / 2 - m.ax, (ty + d.h) * TILE - m.ay);
      ctx.globalAlpha = 1;
    }
  }
}
