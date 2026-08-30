// ==== Симуляция: экономика, агенты, погода ====
import { B, SEASONS, DAYS_PER_SEASON } from './data.js';
import { MAPW, MAPH, idx, inMap, roadBFS, pathTo, randomRoadTile, TILE, G } from './world.js';

export const DAY_LEN = 110; // секунд реального времени в сутках

export function seasonOf(day) { return SEASONS[Math.floor((day - 1) / DAYS_PER_SEASON) % 4]; }

export function createState(world) {
  return {
    world,
    money: 26000, day: 12, t: 9,
    fuel: 72, power: 88, pop: 58, soul: 60,
    soulBonus: 0, incomeBoost: 0, tourBoost: 0,
    tourists: 0, attract: 2, jobs: 0, housing: 0,
    people: [], cars: [], parts: [], cats: [],
    rain: 0, paused: false, speed: 1,
    lastIncome: 0,
  };
}

export function recompute(S) {
  let housing = 0, jobs = 0, attract = 2, income = 0, upkeep = 0, powerUse = 0, powerGen = 6,
    fuelGen = 0, heatGen = 0, soulSum = 0;
  for (const e of S.world.ents) {
    const d = B[e.def]; if (!d) continue;
    housing += d.housing || 0; jobs += d.jobs || 0; attract += d.attract || 0;
    income += d.income || 0; upkeep += d.upkeep || 0;
    powerUse += d.powerUse || 0; powerGen += d.powerGen || 0;
    fuelGen += d.fuelGen || 0; heatGen += d.heatGen || 0;
    soulSum += d.soul || 0;
  }
  S.housing = housing; S.jobs = jobs; S.attract = attract;
  S._income = income; S._upkeep = upkeep;
  S._powerUse = powerUse + S.pop * 0.05; S._powerGen = powerGen;
  S._fuelGen = fuelGen; S._heatGen = heatGen; S._soulSum = soulSum;
}

export function tickDay(S) {
  recompute(S);
  const season = seasonOf(S.day);
  const mult = S.incomeBoost > 0 ? 1.15 : 1;
  const taxes = S.pop * 2.2;
  const tourIncome = S.tourists * 4;
  const income = Math.round((taxes + S._income * mult + tourIncome) - S._upkeep);
  S.money += income; S.lastIncome = income;
  if (S.incomeBoost > 0) S.incomeBoost--;

  // топливо
  const winter = season === 'winter';
  const heatNeed = winter ? (S._heatGen > 0 ? 6 : 9) : 1;
  const fd = (S._fuelGen ? S._fuelGen * 0.9 : 0) - (2.5 + S.cars.length * 0.12 + heatNeed);
  S.fuel = Math.max(0, Math.min(100, S.fuel + fd));

  // электричество
  S.power = Math.max(0, Math.min(100, (S._powerGen / Math.max(1, S._powerUse)) * 100));

  // душевность
  const employed = S.jobs > 0 ? Math.min(1, S.jobs / Math.max(1, S.pop * 0.6)) : 0.5;
  let target = 32 + S._soulSum * 0.6 + employed * 8
    + (S.fuel > 25 ? 3 : -7) + (S.power > 70 ? 3 : -7)
    + Math.min(8, S.attract * 0.4) + S.soulBonus
    + (winter ? (S._heatGen > 0 ? 1 : -6) : 0);
  target = Math.max(5, Math.min(96, target));
  S.soul = Math.round(S.soul + (target - S.soul) * 0.35);
  S.soulBonus = Math.round(S.soulBonus * 0.85);

  // население
  if (S.soul > 55 && S.pop < S.housing) S.pop += 1 + (Math.random() < 0.4 ? 1 : 0);
  else if (S.soul < 35) S.pop = Math.max(8, S.pop - 2);

  // туристы
  const sf = { spring: 1.0, summer: 1.35, autumn: 1.15, winter: 0.7 }[season];
  const tt = Math.round(S.attract * sf * (S.soul / 70) + S.tourBoost);
  S.tourists = Math.max(0, tt);
  if (S.tourBoost > 0) S.tourBoost--;
}

// ==== агенты ====
const PEOPLE_SPR = ['man', 'woman', 'babushka', 'ded', 'kid', 'schoolgirl', 'businessman', 'summer_girl', 'fisherman'];

export function syncPeople(S) {
  const want = Math.min(70, Math.round(S.pop * 0.55));
  while (S.people.filter(Boolean).length < want) {
    const p = spawnPerson(S, false); if (!p) break; S.people.push(p);
  }
  if (S.people.length > want) S.people.length = want;
  const wantT = Math.min(24, S.tourists);
  const have = S.people.filter(p => p && p.tourist).length;
  if (have < wantT) { const p = spawnPerson(S, true); if (p) S.people.push(p); }
  while (S.cats.filter(Boolean).length < 3) {
    const p = spawnPerson(S, false, 'cat'); if (!p) break; S.cats.push(p);
  }
}

function spawnPerson(S, tourist, kind) {
  const w = S.world;
  for (let tries = 0; tries < 60; tries++) {
    const x = (Math.random() * MAPW) | 0, y = (Math.random() * MAPH) | 0;
    if (!walkableFor(S, x, y)) continue;
    const spr = kind === 'cat' ? 'cat'
      : tourist ? 'tourist'
      : seasonOf(S.day) === 'winter' ? 'winter_person'
      : PEOPLE_SPR[(Math.random() * PEOPLE_SPR.length) | 0];
    return { x: x * TILE + 16, y: y * TILE + 16, tx: x, ty: y, wt: Math.random() * 2,
      spr, tourist, kind: kind || 'person', sp: kind === 'cat' ? 26 : 14 + Math.random() * 8, ph: Math.random() * 7 };
  }
  return null;
}

function walkableFor(S, x, y) {
  if (!inMap(x, y)) return false;
  const i = idx(x, y);
  if (S.world.ground[i] === G.water) return false;
  const o = S.world.occ[i];
  if (o !== -1) { const e = S.world.ents.find(q => q.id === o); if (e && e.w > 1) return false; }
  return true;
}

export function updatePeople(S, dt) {
  for (const p of S.people) {
    if (!p) continue;
    const cx = p.tx * TILE + 16, cy = p.ty * TILE + 16;
    const dx = cx - p.x, dy = cy - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      p.wt -= dt;
      if (p.wt <= 0) {
        const opts = [];
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
          if (walkableFor(S, p.tx + ox, p.ty + oy)) opts.push([p.tx + ox, p.ty + oy]);
        if (opts.length) { const [nx, ny] = opts[(Math.random() * opts.length) | 0]; p.tx = nx; p.ty = ny; }
        p.wt = 0.5 + Math.random() * 2.5;
      }
    } else {
      p.x += dx / d * p.sp * dt; p.y += dy / d * p.sp * dt;
    }
    p.ph += dt;
  }
  for (const c of S.cats) if (c) { /* коты гуляют как люди, но реже */ }
  // используем тот же код для котов
  for (const arr of [S.cats]) for (const p of arr) {
    if (!p) continue;
    const cx = p.tx * TILE + 16, cy = p.ty * TILE + 16;
    const dx = cx - p.x, dy = cy - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) { p.wt -= dt; if (p.wt <= 0) {
      const opts = [];
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        if (walkableFor(S, p.tx + ox, p.ty + oy)) opts.push([p.tx + ox, p.ty + oy]);
      if (opts.length) { const [nx, ny] = opts[(Math.random() * opts.length) | 0]; p.tx = nx; p.ty = ny; }
      p.wt = 1 + Math.random() * 4; } }
    else { p.x += dx / d * p.sp * dt; p.y += dy / d * p.sp * dt; }
  }
}

export function syncCars(S) {
  const season = seasonOf(S.day);
  let want = Math.min(22, Math.floor(S.pop / 6));
  if (S.fuel <= 3) want = Math.floor(want * 0.3);
  const w = S.world;
  if (S.cars.length < want && randomRoadTile(w) !== -1) {
    const start = randomRoadTile(w);
    const { dist, prev } = roadBFS(w, start % MAPW, (start / MAPW) | 0);
    const dest = randomRoadTile(w);
    if (dest !== -1 && dist[dest] > 2) {
      const spr = ['lada_white', 'hatch_red', 'sedan_silver', 'taxi', 'uaz_green', 'van_blue', 'truck_blue'][(Math.random() * 7) | 0];
      S.cars.push({ i: start, path: pathTo(w, prev, start, dest), pi: 0, x: 0, y: 0, dir: 0, sp: 55 + Math.random() * 25, spr, init: false });
    }
  }
  if (S.cars.length > want + 3) S.cars.length = want + 3;
  // автобус, если есть остановки и топливо
  const hasBus = S.cars.some(c => c.spr === 'bus');
  const stops = S.world.ents.some(e => e.def === 'busstop');
  if (!hasBus && stops && S.fuel > 10 && S.cars.length < 24) {
    const start = randomRoadTile(w);
    if (start !== -1) {
      const { dist, prev } = roadBFS(w, start % MAPW, (start / MAPW) | 0);
      const dest = randomRoadTile(w);
      if (dest !== -1 && dist[dest] > 3)
        S.cars.push({ i: start, path: pathTo(w, prev, start, dest), pi: 0, x: 0, y: 0, dir: 0, sp: 45, spr: 'bus', init: false });
    }
  }
}

export function updateCars(S, dt) {
  const w = S.world;
  for (let ci = S.cars.length - 1; ci >= 0; ci--) {
    const c = S.cars[ci];
    if (!c.path || c.pi >= c.path.length - 1) {
      // новый маршрут
      const { dist, prev } = roadBFS(w, c.i % MAPW, (c.i / MAPW) | 0);
      const dest = randomRoadTile(w);
      if (dest === -1 || dist[dest] < 1) { S.cars.splice(ci, 1); continue; }
      c.path = pathTo(w, prev, c.i, dest); c.pi = 0;
    }
    const a = c.path[c.pi], b = c.path[c.pi + 1];
    const ax = (a % MAPW) * TILE + 16, ay = ((a / MAPW) | 0) * TILE + 16;
    const bx = (b % MAPW) * TILE + 16, by = ((b / MAPW) | 0) * TILE + 16;
    if (!c.init) { c.x = ax; c.y = ay; c.init = true; }
    const dx = bx - c.x, dy = by - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) { c.i = b; c.pi++; }
    else {
      c.x += dx / d * c.sp * dt; c.y += dy / d * c.sp * dt;
      const ang = Math.atan2(dy, dx);
      c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 90 : 270) : (dy > 0 ? 180 : 0);
      c.ang = ang;
    }
  }
}

// ==== погодные частицы ====
export function updateWeather(S, dt, time) {
  const season = seasonOf(S.day);
  const night = time < 6 || time > 21;
  // дождь
  if ((season === 'spring' || season === 'autumn') && S.rain <= 0 && Math.random() < dt / 90) S.rain = 12 + Math.random() * 18;
  if (S.rain > 0) S.rain -= dt;

  const cap = 260;
  if (season === 'winter') {
    for (let i = 0; i < 3 && S.parts.length < cap; i++)
      S.parts.push({ k: 'snow', x: Math.random() * MAPW * TILE, y: -10, vx: 8 + Math.random() * 10, vy: 26 + Math.random() * 22, ph: Math.random() * 7 });
  } else if (season === 'autumn') {
    if (Math.random() < dt * 2 && S.parts.length < cap)
      S.parts.push({ k: 'leaf', x: Math.random() * MAPW * TILE, y: -10, vx: 16, vy: 20, ph: Math.random() * 7 });
  }
  if (S.rain > 0) for (let i = 0; i < 4 && S.parts.length < cap; i++)
    S.parts.push({ k: 'rain', x: Math.random() * MAPW * TILE, y: -10, vx: 6, vy: 260, ph: 0 });
  if (season === 'summer' && night && Math.random() < dt * 3 && S.parts.length < cap)
    S.parts.push({ k: 'fly', x: Math.random() * MAPW * TILE, y: Math.random() * MAPH * TILE, vx: 0, vy: 0, ph: Math.random() * 7, life: 6 });

  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.ph += dt;
    if (p.k === 'snow') { p.x += (p.vx * Math.sin(p.ph * 1.3) + 6) * dt; p.y += p.vy * dt; }
    else if (p.k === 'leaf') { p.x += (p.vx * Math.sin(p.ph)) * dt + 10 * dt; p.y += p.vy * dt; }
    else if (p.k === 'rain') { p.x += p.vx * dt; p.y += p.vy * dt; }
    else if (p.k === 'fly') { p.x += Math.sin(p.ph * 2.1) * 14 * dt; p.y += Math.cos(p.ph * 1.7) * 10 * dt; p.life -= dt; if (p.life <= 0) { S.parts.splice(i, 1); continue; } }
    else if (p.k === 'spark' || p.k === 'heart' || p.k === 'smoke') { p.y += (p.vy || -14) * dt; p.life -= dt; if (p.life <= 0) { S.parts.splice(i, 1); continue; } }
    if (p.y > MAPH * TILE + 12) S.parts.splice(i, 1);
  }
}

export function spawnFx(S, wx, wy, k) {
  S.parts.push({ k, x: wx, y: wy, vy: -16, life: 1.4, ph: Math.random() * 7 });
}

// ==== сериализация ====
export function serialize(S) {
  const w = S.world;
  return JSON.stringify({
    money: S.money, day: S.day, t: S.t, fuel: S.fuel, power: S.power, pop: S.pop, soul: S.soul,
    ground: Array.from(w.ground), road: Array.from(w.road), occ: Array.from(w.occ),
    ents: w.ents, nextId: w.nextId,
  });
}

export function deserialize(json) {
  try {
    const d = JSON.parse(json);
    const w = { ground: Uint8Array.from(d.ground), road: Uint8Array.from(d.road), occ: Int16Array.from(d.occ), ents: d.ents, nextId: d.nextId };
    const S = createState(w);
    Object.assign(S, { money: d.money, day: d.day, t: d.t, fuel: d.fuel, power: d.power, pop: d.pop, soul: d.soul });
    return S;
  } catch (e) { return null; }
}
