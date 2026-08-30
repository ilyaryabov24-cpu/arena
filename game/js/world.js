// ==== Карта, тайлы, постройки ====
export const TILE = 32;
export const MAPW = 64, MAPH = 44;

export const GROUND_NAMES = ["grass","grass_dry","dirt","sand","gravel","asphalt","paving",
  "brick_pave","snow","autumn_leaves","mud","moss","water","field","asphalt_old","grass_flowers"];
export const G = {};
GROUND_NAMES.forEach((n, i) => G[n] = i);

export function newWorld() {
  const n = MAPW * MAPH;
  return {
    ground: new Uint8Array(n).fill(G.grass),
    road: new Uint8Array(n),          // 0 нет, 1 дорога, 2 тротуар
    occ: new Int16Array(n).fill(-1),  // id сущности, занявшей тайл
    ents: [],
    nextId: 1,
  };
}

export const idx = (x, y) => y * MAPW + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < MAPW && y < MAPH;

// шум для пятен травы
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function genTerrain(w) {
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
    const h = hash2(x >> 2, y >> 2), h2 = hash2((x >> 1) + 91, (y >> 1) + 57);
    let g = G.grass;
    if (h > 0.72) g = G.grass_flowers;
    else if (h < 0.16) g = G.grass_dry;
    if (h2 > 0.86) g = G.dirt;
    w.ground[idx(x, y)] = g;
  }
  // пруд в парке (слева сверху)
  const px = 12, py = 12;
  for (let y = py - 3; y <= py + 3; y++) for (let x = px - 4; x <= px + 4; x++) {
    const dx = (x - px) / 4.4, dy = (y - py) / 3.2;
    if (dx * dx + dy * dy <= 1 + (hash2(x, y) - 0.5) * 0.25) w.ground[idx(x, y)] = G.water;
  }
  // поле справа снизу
  for (let y = MAPH - 9; y < MAPH - 2; y++) for (let x = MAPW - 14; x < MAPW - 3; x++)
    w.ground[idx(x, y)] = G.field;
  // лес по кромке
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
    const edge = Math.min(x, y, MAPW - 1 - x, MAPH - 1 - y);
    if (edge === 0 && hash2(x * 3, y * 7) > 0.2) w.ground[idx(x, y)] = G.moss;
  }
}

// ==== сущности ====
export function footprintFree(w, def, tx, ty) {
  for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
    const x = tx + dx, y = ty + dy;
    if (!inMap(x, y)) return false;
    const i = idx(x, y);
    if (w.occ[i] !== -1) return false;
    if (w.road[i] === 1) return false;
    if (w.ground[i] === G.water) return false;
  }
  return true;
}

export function roadNear(w, tx, ty, dw, dh) {
  for (let dy = -1; dy <= dh; dy++) for (let dx = -1; dx <= dw; dx++) {
    const x = tx + dx, y = ty + dy;
    if (inMap(x, y) && w.road[idx(x, y)] >= 1) return true;
  }
  return false;
}

export function placeEntity(w, defKey, def, tx, ty) {
  const e = { id: w.nextId++, def: defKey, x: tx, y: ty, w: def.w, h: def.h, seed: Math.random() };
  for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++)
    w.occ[idx(tx + dx, ty + dy)] = e.id;
  w.ents.push(e);
  return e;
}

export function removeEntity(w, e) {
  for (let dy = 0; dy < e.h; dy++) for (let dx = 0; dx < e.w; dx++)
    w.occ[idx(e.x + dx, e.y + dy)] = -1;
  w.ents = w.ents.filter(o => o.id !== e.id);
}

export function setRoad(w, x, y, kind) {
  const i = idx(x, y);
  if (!inMap(x, y) || w.occ[i] !== -1) return false;
  if (kind === 1 && w.ground[i] === G.water) return false;
  if (kind === 2 && w.road[i] === 1) return false; // тротуар не рвёт дорогу
  w.road[i] = kind;
  return true;
}

export function entityAt(w, tx, ty) {
  const i = inMap(tx, ty) ? w.occ[idx(tx, ty)] : -1;
  return i === -1 ? null : w.ents.find(e => e.id === i);
}

// BFS по дорогам для машин
export function roadBFS(w, sx, sy) {
  const dist = new Int32Array(MAPW * MAPH).fill(-1);
  const prev = new Int32Array(MAPW * MAPH).fill(-1);
  const q = [idx(sx, sy)];
  dist[idx(sx, sy)] = 0;
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % MAPW, y = (i / MAPW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inMap(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (w.road[ni] !== 1 || dist[ni] !== -1) continue;
      dist[ni] = dist[i] + 1; prev[ni] = i; q.push(ni);
    }
  }
  return { dist, prev };
}

export function pathTo(w, prev, from, to) {
  const path = [];
  let i = to;
  while (i !== -1 && i !== from) { path.push(i); i = prev[i]; }
  path.push(from);
  return path.reverse();
}

export function randomRoadTile(w) {
  const list = [];
  for (let i = 0; i < w.road.length; i++) if (w.road[i] === 1) list.push(i);
  return list.length ? list[(Math.random() * list.length) | 0] : -1;
}

export function walkable(w, x, y) {
  if (!inMap(x, y)) return false;
  const i = idx(x, y);
  if (w.ground[i] === G.water) return false;
  if (w.occ[i] !== -1) {
    const e = w.ents.find(o => o.id === w.occ[i]);
    if (e && e.w > 1) return false; // здания непроходимы, декор/деревья — проходимы визуально? нет: тоже нет
  }
  return true;
}

// ==== стартовый город ====
export function genStartTown(w, B) {
  // дороги: горизонталь и вертикаль
  for (let x = 6; x <= 42; x++) setRoad(w, x, 22, 1);
  for (let y = 10; y <= 36; y++) setRoad(w, 24, y, 1);
  for (let x = 24; x <= 36; x++) setRoad(w, x, 30, 1);
  // тротуары вдоль главной
  for (let x = 6; x <= 42; x++) { setRoad(w, x, 21, 2); setRoad(w, x, 23, 2); }
  for (let y = 10; y <= 36; y++) { setRoad(w, 23, y, 2); setRoad(w, 25, y, 2); }

  const put = (key, x, y) => { if (B[key] && footprintFree(w, B[key], x, y)) placeEntity(w, key, B[key], x, y); };
  put('townhall', 26, 19);
  put('khrush', 20, 18);
  put('khrush', 17, 18);
  put('izba', 28, 24);
  put('house_yellow', 31, 24);
  put('church', 20, 24);
  put('market', 27, 31);
  put('grocery', 30, 31);
  put('bakery', 33, 24);
  put('school', 27, 12);
  put('gasstation', 34, 31);
  put('substation', 36, 24);
  put('boilerhouse', 17, 24);
  // парк у пруда
  put('fountain', 13, 17);
  const parkDecor = [['bench', 10, 17], ['bench', 16, 17], ['lamp', 9, 16], ['lamp', 17, 16],
    ['lamp', 13, 19], ['bin', 11, 18], ['swings', 15, 18], ['sandbox', 16, 18]];
  for (const [k, x, y] of parkDecor) put(k, x, y);
  // деревья
  const trees = [[7, 12], [8, 15], [18, 13], [19, 15], [9, 19], [17, 10], [38, 20], [39, 24],
    [40, 27], [10, 26], [12, 27], [30, 20], [33, 19], [36, 15], [41, 12], [8, 30], [14, 31]];
  for (const [x, y] of trees) { if (hash2(x * 5, y * 3) > 0.5) put('tree_birch', x, y); else put('tree_fir', x, y); }
}
