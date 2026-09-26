// ---------------------------------------------------------------------------
// BuildingBuilders — detailed structures. All are static geometry, later
// merged by material for a handful of draw calls per map.
// Buildings sit on y=0 at their base; MapBuilder places them on terrain.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mat, variant } from '../MaterialLibrary.js';
import { boxUV, scaleUV, wedgeGeometry, ensureUV } from '../GeometryKit.js';
import { makeRNG } from '../../core/Utils.js';

const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  boxUV(g, Math.max(w, h, d) * 0.7);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
};
const plane = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);

const mats = () => ({
  concreteWall: mat('b_concreteWall', { texture: 'concreteWall' }, { roughness: 0.92 }),
  concrete: mat('b_concrete', { texture: 'concrete' }, { roughness: 0.9 }),
  metalPanel: mat('b_metal', { texture: 'metalPanel', params: { color: [150, 156, 162] } }, { roughness: 0.7, metalness: 0.35, normalScale: 1.1 }),
  metalPanelDark: mat('b_metal_dark', { texture: 'metalPanel', params: { color: [96, 100, 106] } }, { roughness: 0.7, metalness: 0.35, normalScale: 1.1 }),
  corrugated: mat('b_corr', { texture: 'corrugated', params: { color: [166, 120, 88] } }, { roughness: 0.7, metalness: 0.3, normalScale: 1.2 }),
  rust: mat('b_rust', { texture: 'rust' }, { roughness: 0.9, metalness: 0.25 }),
  wood: mat('b_wood', { texture: 'wood' }, { roughness: 0.95 }),
  dark: mat('b_dark', { texture: 'metalPanel', params: { color: [46, 48, 50] } }, { roughness: 0.75, metalness: 0.3 }),
  steel: mat('b_steel', { texture: 'metalPanel', params: { color: [150, 154, 158] } }, { roughness: 0.5, metalness: 0.7, normalScale: 0.8 }),
  brickRed: mat('b_brickRed', { texture: 'brick', params: { brick: [148, 74, 58] } }, { roughness: 0.95 }),
  brickYellow: mat('b_brickYellow', { texture: 'brick', params: { brick: [178, 148, 96] } }, { roughness: 0.95 }),
  plasterWarm: mat('b_plasterWarm', { texture: 'plaster', params: { color: [204, 188, 160] } }, { roughness: 0.95 }),
  plasterPale: mat('b_plasterPale', { texture: 'plaster', params: { color: [188, 194, 190] } }, { roughness: 0.95 }),
  plasterBlue: mat('b_plasterBlue', { texture: 'plaster', params: { color: [158, 178, 188] } }, { roughness: 0.95 }),
  roofRed: mat('b_roofRed', { texture: 'roofTiles', params: { color: [150, 74, 54] } }, { roughness: 0.95, normalScale: 1.4 }),
  roofBrown: mat('b_roofBrown', { texture: 'roofTiles', params: { color: [122, 92, 62] } }, { roughness: 0.95, normalScale: 1.4 }),
  roofMetal: mat('b_roofMetal', { texture: 'corrugated', params: { color: [110, 118, 124] } }, { roughness: 0.65, metalness: 0.4, normalScale: 1.1 }),
  windowDark: mat('b_windowDark', { texture: 'window', params: { lit: false } }, { roughness: 0.35, metalness: 0.15 }),
  windowLit: mat('b_windowLit', { texture: 'window', params: { lit: true } }, { roughness: 0.6, metalness: 0, emissive: 0xffc873, emissiveIntensity: 0.85 }),
  hay: mat('b_hay', { texture: 'hay' }, { roughness: 1 }),
  sandbags: mat('b_sandbags', { texture: 'sandbags' }, { roughness: 1, normalScale: 1.3 }),
});

// windows with frames ----------------------------------------------------------------
function windowsOn(g, M, { w, h, d, floors = 1, cols = 3, y0 = 1.1, lit = false, spacingY = 3.0, facing = ['front', 'back', 'left', 'right'] }) {
  const wm = lit ? M.windowLit : M.windowDark;
  const wW = 1.1, wH = 1.4;
  const put = (x, y, z, ry) => {
    const p = plane(wW, wH, wm);
    p.position.set(x, y, z);
    p.rotation.y = ry;
    g.add(p);
    // sill
    const sill = box(wW + 0.2, 0.09, 0.14, M.concrete, x, y - wH / 2 - 0.12, z);
    sill.rotation.y = ry;
    g.add(sill);
  };
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * spacingY;
    for (let c = 0; c < cols; c++) {
      const off = (c - (cols - 1) / 2) * (w / cols);
      if (facing.includes('front')) put(off, y, d / 2 + 0.02, 0);
      if (facing.includes('back')) put(off, y, -d / 2 - 0.02, Math.PI);
    }
  }
  // sides
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * spacingY;
    for (let c = 0; c < Math.max(1, cols - 1); c++) {
      const off = (c - (cols - 1) / 2 + 0.5) * (d / cols);
      if (facing.includes('left')) put(w / 2 + 0.02, y, off, Math.PI / 2);
      if (facing.includes('right')) put(-w / 2 - 0.02, y, off, -Math.PI / 2);
    }
  }
}

// gable roof ------------------------------------------------------------------------
function gableRoof(g, M, { w, d, h, y, mat: roofMat, overhang = 0.45 }) {
  const W = w + overhang * 2, D = d + overhang;
  // two sloped planes
  const slopeLen = Math.hypot(W / 2, h);
  const ang = Math.atan2(h, W / 2);
  for (const s of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(slopeLen, D, 1, 1), roofMat);
    scaleUV(p.geometry, slopeLen / 2.2, D / 2.2);
    p.rotation.order = 'YXZ';
    p.rotation.y = s > 0 ? 0 : Math.PI;
    p.rotation.x = -ang * s;
    p.position.set(s * W / 4, y + h / 2, 0);
    p.castShadow = true;
    g.add(p);
  }
  // gable ends (triangles) via wedge
  const gableMat = M.plasterWarm;
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(wedgeGeometry(0.1, h, W / 2), gableMat);
    tri.rotation.y = Math.PI / 2 * s;
    tri.rotation.x = s > 0 ? 0 : Math.PI;
    // orient: slope facing inward; simpler — use custom triangle
    g.remove(tri);
  }
  // ridge cap
  const ridge = box(W + 0.1, 0.09, 0.16, M.dark, 0, y + h - 0.03, 0);
  g.add(ridge);
  // gable triangles via Shape
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(0, h); shape.closePath();
  const triGeo = new THREE.ShapeGeometry(shape);
  for (const s of [1, -1]) {
    const tri = new THREE.Mesh(triGeo, gableMat);
    tri.position.set(0, y, s * (d / 2 + 0.01));
    if (s < 0) tri.rotation.y = Math.PI;
    g.add(tri);
  }
}

// =============================================================================
// HOUSE — suburban/rural home with pitched roof, windows, chimney, details
// =============================================================================
export function buildHouse(rng, opts = {}) {
  const M = mats();
  const g = new THREE.Group();
  const w = opts.w ?? (7 + rng() * 3);
  const d = opts.d ?? (8 + rng() * 3);
  const h = opts.h ?? (3.2 + rng() * 0.6);
  const floors = opts.floors ?? (rng() < 0.4 ? 2 : 1);
  const lit = !!opts.lit;
  const wallMat = pickWall(rng, M);

  const H = h * floors;
  g.add(box(w, H, d, wallMat, 0, opts.foundation ?? 0.25, 0));
  // foundation band
  g.add(box(w + 0.15, 0.3, d + 0.15, M.concrete, 0, 0, 0));

  gableRoof(g, M, { w, d, h: opts.roofH ?? (1.8 + rng() * 1.2), y: H + 0.25, mat: rng() < 0.5 ? M.roofRed : M.roofBrown });

  // door
  const doorMat = M.wood;
  const door = box(1.1, 2.2, 0.12, doorMat, (rng() - 0.5) * w * 0.4, 0.25, d / 2 + 0.05);
  g.add(door);
  // porch step
  g.add(box(1.8, 0.18, 1.0, M.concrete, door.position.x, 0.25, d / 2 + 0.5));
  // windows
  windowsOn(g, M, { w, h: H, d, floors, cols: Math.max(2, Math.round(w / 2.6)), y0: 1.5, spacingY: h, lit });

  // chimney
  if (rng() < 0.7) {
    const ch = box(0.7, 1.2 + H * 0.4, 0.7, M.brickRed, w / 2 - 1.2, H + 0.4, d / 2 - 1.5);
    g.add(ch);
    const cap = box(0.9, 0.12, 0.9, M.concrete, w / 2 - 1.2, H + 0.4 + 1.2 + H * 0.4 - 0.1, d / 2 - 1.5);
    g.add(cap);
  }
  // AC unit + utility box
  g.add(box(0.9, 0.7, 0.7, M.steel, -w / 2 - 0.7, 0.25, d / 2 - 2));
  g.add(box(0.5, 0.6, 0.3, M.dark, w / 2 + 0.3, 0.25, 0.5));
  // drain pipes
  for (const s of [1, -1]) {
    g.add(box(0.12, H + 0.2, 0.12, M.dark, s * (w / 2 - 0.15), 0.25, d / 2 + 0.1));
  }
  g.userData.size = { w, d, h: H + 2.5 };
  return g;
}

function pickWall(rng, M) {
  const r = rng();
  if (r < 0.3) return M.plasterWarm;
  if (r < 0.5) return M.plasterPale;
  if (r < 0.7) return M.plasterBlue;
  if (r < 0.85) return M.brickYellow;
  return M.brickRed;
}

// =============================================================================
// BARN — wooden farm barn
// =============================================================================
export function buildBarn(rng) {
  const M = mats();
  const g = new THREE.Group();
  const w = 10 + rng() * 4, d = 14 + rng() * 6, h = 5;
  g.add(box(w, h, d, M.wood, 0, 0.2, 0));
  // gambrel-ish roof (two slopes)
  const roofH = 3.4;
  gableRoof(g, M, { w, d, h: roofH, y: h + 0.2, mat: M.roofMetal });
  // big doors
  const door = box(3.4, 3.8, 0.16, variant(M.wood, 0x9a6a4a), 0, 0.2, d / 2 + 0.06);
  g.add(door);
  // door cross planks
  for (let i = 0; i < 2; i++) {
    const plank = box(3.4, 0.18, 0.05, M.dark, 0, 0.6 + i * 1.6, d / 2 + 0.16);
    plank.rotation.z = i === 0 ? 0.12 : -0.12;
    g.add(plank);
  }
  // hay loft window
  const loft = box(1.2, 1.2, 0.1, M.dark, 0, h + 1.2, d / 2 + 0.05);
  g.add(loft);
  // side ventilation slats
  for (let i = 0; i < 4; i++) {
    g.add(box(0.1, 0.24, d * 0.5, M.dark, w / 2 + 0.06, 2 + i * 0.8, 0));
  }
  g.userData.size = { w, d, h: h + roofH + 1 };
  return g;
}

// =============================================================================
// WAREHOUSE — industrial shed
// =============================================================================
export function buildWarehouse(rng, opts = {}) {
  const M = mats();
  const g = new THREE.Group();
  const w = opts.w ?? (18 + rng() * 10), d = opts.d ?? (26 + rng() * 14), h = opts.h ?? (7 + rng() * 3);
  const panelMat = rng() < 0.6 ? M.metalPanel : M.metalPanelDark;
  g.add(box(w, h, d, panelMat, 0, 0.15, 0));
  gableRoof(g, M, { w, d, h: h * 0.35, y: h + 0.15, mat: M.roofMetal, overhang: 0.3 });
  // sliding door (partly open)
  const doorH = Math.min(h - 0.5, 5);
  const doorW = Math.min(w * 0.5, 7);
  const opening = box(doorW, doorH, 0.2, M.dark, 0, 0.15, d / 2 + 0.02);
  g.add(opening);
  // door panel slid aside
  const slid = box(doorW * 0.9, doorH, 0.24, M.corrugated, -w / 2 + doorW * 0.5, 0.15, d / 2 + 0.12);
  g.add(slid);
  // roof vents
  for (let i = 0; i < 4; i++) {
    const vent = box(1.4, 0.8, 1.4, M.dark, (i - 1.5) * (w / 4.5), h + h * 0.35 + 0.1, (rng() - 0.5) * d * 0.5);
    g.add(vent);
  }
  // personnel door + small windows high up
  g.add(box(1.0, 2.2, 0.12, M.dark, w / 2 - 1.5, 0.15, d / 2 + 0.06));
  windowsOn(g, M, { w, d, h, floors: 1, cols: 3, y0: h - 1.4, facing: ['front'], lit: false });
  // loading dock
  g.add(box(w * 0.5, 1.1, 3, M.concrete, 0, 0, -d / 2 - 1.5));
  g.userData.size = { w, d, h: h + h * 0.35 + 1 };
  return g;
}

// =============================================================================
// HANGAR — arched roof
// =============================================================================
export function buildHangar(rng) {
  const M = mats();
  const g = new THREE.Group();
  const w = 16, d = 24 + rng() * 8, h = 5;
  // walls
  g.add(box(w, h, d, M.metalPanelDark, 0, 0.15, 0));
  // arched roof (half cylinder)
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, d, 20, 1, false, 0, Math.PI), M.roofMetal);
  arch.rotation.z = Math.PI / 2;
  arch.rotation.y = Math.PI / 2;
  arch.position.set(0, h + 0.1, 0);
  arch.castShadow = true;
  g.add(arch);
  scaleUV(arch.geometry, d / 6, Math.PI / 6);
  // ribs
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.08, 0.07, 6, 16, Math.PI), M.steel);
    rib.position.set(0, h + 0.1, -d / 2 + 1.5 + i * (d - 3) / 4);
    g.add(rib);
  }
  // big open front (dark interior box)
  g.add(box(w - 1, h - 0.4, 0.4, M.dark, 0, 0.15, d / 2 - 0.1));
  // rear closed
  const rear = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 16, 0, Math.PI), M.metalPanelDark);
  rear.position.set(0, h + 0.1, -d / 2);
  rear.rotation.y = 0;
  const rearBot = box(w, h, 0.2, M.metalPanelDark, 0, 0.15, -d / 2);
  g.add(rearBot);
  g.userData.size = { w, d, h: h + w / 2 + 1 };
  return g;
}

// =============================================================================
// SHOP — small street-front store
// =============================================================================
export function buildShop(rng, opts = {}) {
  const M = mats();
  const g = new THREE.Group();
  const w = opts.w ?? (10 + rng() * 4), d = 8, h = 4.2;
  const lit = !!opts.lit;
  g.add(box(w, h, d, rng() < 0.5 ? M.plasterWarm : M.plasterPale, 0, 0.15, 0));
  // flat roof + parapet
  g.add(box(w + 0.3, 0.35, d + 0.3, M.concrete, 0, h + 0.15, 0));
  // storefront glass
  const glassMat = lit ? M.windowLit : M.windowDark;
  const front = plane(w * 0.8, 2.4, glassMat);
  front.position.set(0, 2.0, d / 2 + 0.03);
  g.add(front);
  // door
  g.add(box(1.2, 2.4, 0.1, M.dark, w * 0.32, 0.15, d / 2 + 0.04));
  // sign band
  g.add(box(w * 0.85, 0.9, 0.15, variant(M.plasterBlue, 0x2a4a56), 0, h - 0.9, d / 2 + 0.08));
  const signText = ['MARKET', 'CAFE', 'TOOLS', 'PHARMACY'][(rng() * 4) | 0];
  g.userData.signText = signText;
  // awning
  const awning = box(w * 0.8, 0.08, 1.6, variant(M.corrugated, 0x9a4030), 0, 3.4, d / 2 + 0.8);
  awning.rotation.x = 0.18;
  g.add(awning);
  // roof units
  g.add(box(1.6, 1.0, 1.2, M.steel, -w / 4, h + 0.4, 0));
  g.userData.size = { w, d, h: h + 1 };
  return g;
}

// =============================================================================
// APARTMENT BLOCK — for the city corner of the combined map
// =============================================================================
export function buildApartment(rng, opts = {}) {
  const M = mats();
  const g = new THREE.Group();
  const w = opts.w ?? 16, d = opts.d ?? 12, floors = opts.floors ?? (4 + ((rng() * 3) | 0));
  const fh = 3.0, h = floors * fh;
  const lit = !!opts.lit;
  const wall = rng() < 0.5 ? M.plasterPale : M.plasterWarm;
  g.add(box(w, h, d, wall, 0, 0.2, 0));
  // stairwell band
  g.add(box(3, h, 0.4, M.concrete, 0, 0.2, d / 2 + 0.05));
  windowsOn(g, M, { w, d, h, floors, cols: Math.round(w / 2.8), y0: 1.7, spacingY: fh, lit, facing: ['front', 'back', 'left', 'right'] });
  // balconies on front
  for (let f = 1; f < floors; f++) {
    for (let c = 0; c < 2; c++) {
      const bx = (c === 0 ? -1 : 1) * w * 0.22;
      const by = f * fh;
      g.add(box(2.6, 0.12, 1.1, M.concrete, bx, by, d / 2 + 0.55));
      g.add(box(2.6, 0.9, 0.08, variant(M.dark, 0x3a4a52), bx, by + 0.1, d / 2 + 1.05));
    }
  }
  // roof paraphet + units
  g.add(box(w + 0.2, 0.4, d + 0.2, M.concrete, 0, h + 0.2, 0));
  g.add(box(2, 1.2, 1.6, M.steel, -w / 4, h + 0.6, 0));
  g.add(box(1.4, 1.0, 1.2, M.steel, w / 4, h + 0.5, -1));
  g.userData.size = { w, d, h: h + 2 };
  return g;
}

// =============================================================================
// SHED — small utility
// =============================================================================
export function buildShed(rng) {
  const M = mats();
  const g = new THREE.Group();
  const w = 3 + rng() * 1.5, d = 4 + rng() * 2, h = 2.4;
  g.add(box(w, h, d, rng() < 0.5 ? M.corrugated : M.wood, 0, 0.1, 0));
  gableRoof(g, M, { w, d, h: 0.7, y: h + 0.1, mat: M.roofMetal, overhang: 0.2 });
  g.add(box(0.9, 1.9, 0.08, M.dark, 0, 0.1, d / 2 + 0.04));
  g.userData.size = { w, d, h: h + 1.2 };
  return g;
}

// =============================================================================
// RUINED HOUSE — war-torn ruin with rubble
// =============================================================================
export function buildRuin(rng) {
  const M = mats();
  const g = new THREE.Group();
  const w = 8 + rng() * 3, d = 9 + rng() * 3, h = 3.4;
  // broken walls: vary heights via several boxes
  const wallMat = rng() < 0.5 ? M.brickRed : M.plasterWarm;
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const hh = 1 + rng() * (h - 0.8);
    const seg = box(2.4, hh, 0.4, wallMat, Math.cos(a) * w / 2, 0, Math.sin(a) * d / 2);
    seg.rotation.y = -a + Math.PI / 2;
    g.add(seg);
  }
  // burnt beams
  for (let i = 0; i < 3; i++) {
    const beam = box(0.25, 0.25, 3 + rng() * 3, M.dark, (rng() - 0.5) * w * 0.7, 0.4 + rng() * h, (rng() - 0.5) * d * 0.7);
    beam.rotation.set(rng() * 0.5, rng() * 3, rng() * 0.5);
    g.add(beam);
  }
  // rubble pile
  for (let i = 0; i < 8; i++) {
    const r = 0.3 + rng() * 0.7;
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), wallMat);
    chunk.position.set((rng() - 0.5) * w * 0.8, r * 0.4, (rng() - 0.5) * d * 0.8);
    chunk.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    chunk.castShadow = true;
    g.add(chunk);
  }
  // scorch floor
  const floor = box(w * 0.9, 0.1, d * 0.9, M.dark, 0, 0.02, 0);
  g.add(floor);
  g.userData.size = { w, d, h: h + 0.5 };
  return g;
}

// =============================================================================
// FUEL SILO / TANK
// =============================================================================
export function buildSilo(rng) {
  const M = mats();
  const g = new THREE.Group();
  const r = 2 + rng() * 1.5, h = 9 + rng() * 6;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), M.metalPanel);
  scaleUV(tank.geometry, 4, h / 3);
  tank.position.y = h / 2 + 0.4;
  tank.castShadow = true;
  g.add(tank);
  // domed top
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.metalPanel);
  top.position.y = h + 0.4;
  g.add(top);
  // legs / skirt
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, 0.8, 16), M.rust)).position.y = 0.4;
  // spiral staircase hint
  for (let i = 0; i < Math.floor(h / 0.8); i++) {
    const step = box(0.7, 0.06, 0.25, M.steel, r + 0.25, 0.8 + i * 0.8, 0);
    step.rotation.y = i * 0.5;
    g.add(step);
  }
  // pipes
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, h * 0.8, 8), M.steel);
  pipe.position.set(r * 0.8, h * 0.4, r * 0.5);
  g.add(pipe);
  g.userData.size = { w: r * 2.4, d: r * 2.4, h: h + r };
  return g;
}

// =============================================================================
// WATER TOWER — tank on a lattice frame, iconic industrial silhouette
// =============================================================================
export function buildWaterTower(rng) {
  const M = mats();
  const g = new THREE.Group();
  const tankR = 3.4 + rng() * 1.2, tankH = 4.2 + rng() * 1.4;
  const legH = 12 + rng() * 5;
  // 4 angled lattice legs
  const legSpread = tankR * 0.85;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (const off of [-0.28, 0.28]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, legH * 1.06, 6), M.steel);
      strut.position.set(sx * legSpread * 0.5 + off, legH / 2, sz * legSpread * 0.5);
      strut.rotation.z = -sx * 0.1;
      strut.rotation.x = sz * 0.1;
      g.add(strut);
    }
    // cross bracing
    for (let i = 0; i < 3; i++) {
      const y = 2 + i * (legH / 3.4);
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, legSpread * 1.25, 5), M.steel);
      brace.position.set(sx * legSpread * 0.28, y, sz * legSpread * 0.28);
      brace.rotation.y = Math.atan2(sz, sx) + Math.PI / 2 + (i % 2 ? 0.35 : -0.35);
      brace.rotation.z = 0.5;
      g.add(brace);
    }
  }
  // cylindrical tank with conical roof
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(tankR, tankR * 0.92, tankH, 18), M.metalPanel);
  scaleUV(tank.geometry, 4, 2);
  tank.position.y = legH + tankH / 2 + 0.3;
  tank.castShadow = true;
  g.add(tank);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(tankR + 0.35, 1.8, 18), M.roofMetal);
  roof.position.y = legH + tankH + 1.2;
  g.add(roof);
  // ring platform + railing
  const ring = new THREE.Mesh(new THREE.TorusGeometry(tankR + 0.3, 0.08, 6, 24), M.steel);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = legH + 0.5;
  g.add(ring);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.add(box(0.06, 0.9, 0.06, M.steel, Math.cos(a) * (tankR + 0.3), legH + 0.9, Math.sin(a) * (tankR + 0.3)));
  }
  // central feed pipe
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, legH + 1, 8), M.rust);
  pipe.position.set(0, (legH + 1) / 2, 0);
  g.add(pipe);
  g.userData.size = { w: tankR * 2.6, d: tankR * 2.6, h: legH + tankH + 2 };
  return g;
}

// =============================================================================
// RADIO MAST — tapered lattice truss with antenna arrays and a red beacon
// =============================================================================
export function buildRadioMast(rng) {
  const M = mats();
  const g = new THREE.Group();
  const h = 22 + rng() * 12;
  const baseR = 1.7, topR = 0.45;
  const sections = Math.max(4, Math.round(h / 4));
  // 3 tower faces
  for (let f = 0; f < 3; f++) {
    const a = (f / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 6), M.steel);
    const spread = (t) => baseR + (topR - baseR) * t;
    leg.position.set(Math.cos(a) * spread(0.5), h / 2, Math.sin(a) * spread(0.5));
    leg.rotation.z = -Math.cos(a) * (baseR - topR) / h * 2.2;
    leg.rotation.x = Math.sin(a) * (baseR - topR) / h * 2.2;
    g.add(leg);
  }
  // horizontal rings + diagonals
  for (let i = 1; i <= sections; i++) {
    const t = i / sections, y = t * h, r = baseR + (topR - baseR) * t;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 4, 6), M.steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
    if (i < sections) {
      const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(r * 1.7, h / sections), 4), M.steel);
      diag.position.y = y + h / sections / 2;
      diag.rotation.z = 0.95;
      diag.rotation.y = i * 1.05;
      g.add(diag);
    }
  }
  // dish + antenna whips near the top
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), M.metalPanel);
  dish.rotation.x = -0.9;
  dish.position.set(0.7, h * 0.82, 0.2);
  g.add(dish);
  for (const [dx, dz] of [[-0.5, -0.4], [0.2, 0.6], [-0.2, 0.1]]) {
    g.add(box(0.05, 2.4, 0.05, M.dark, dx, h + 1, dz));
  }
  // red beacon (emissive)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff3020, emissiveIntensity: 2.2, roughness: 0.4 }));
  beacon.position.y = h + 2.6;
  g.add(beacon);
  g.userData.size = { w: baseR * 2.4, d: baseR * 2.4, h: h + 3 };
  return g;
}

// =============================================================================
// CHIMNEY (industrial, with smoke anchor)
// =============================================================================
export function buildChimney(rng) {
  const M = mats();
  const g = new THREE.Group();
  const h = 16 + rng() * 10, r = 1.1;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 12), M.brickRed);
  scaleUV(body.geometry, 3, h / 2.5);
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  // red-white bands
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85 + i * 0.04, r * 0.87 + i * 0.04, 1.2, 12), variant(M.plasterPale, 0xd8d4cc));
    band.position.y = h * 0.72 + i * 1.6;
    g.add(band);
  }
  // cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.8, 0.4, 12), M.concrete);
  cap.position.y = h;
  g.add(cap);
  g.userData.size = { w: r * 2, d: r * 2, h };
  g.userData.smokeAnchor = new THREE.Vector3(0, h + 0.5, 0);
  return g;
}

// =============================================================================
// CONTAINER STACK
// =============================================================================
export function buildContainers(rng, count = 3) {
  const M = mats();
  const g = new THREE.Group();
  const colors = [[150, 74, 58], [64, 96, 118], [126, 116, 66], [96, 106, 96], [140, 92, 48]];
  const doorColors = [...colors];
  const CW = 6.06, CH = 2.6, CD = 2.44;
  let y = 0;
  for (let i = 0; i < count; i++) {
    const c = colors[(rng() * colors.length) | 0];
    const body = mat(`ct_${c.join('_')}_${i}`, { texture: 'corrugated', params: { color: c } }, { roughness: 0.7, metalness: 0.3, normalScale: 1.2 });
    const door = mat(`ctd_${c.join('_')}_${i}`, { texture: 'containerDoor', params: { color: c } }, { roughness: 0.7, metalness: 0.3, normalScale: 1.2 });
    const cont = new THREE.Group();
    const b = box(CW, CH, CD, body, 0, y, 0);
    const d1 = box(0.05, CH, CD, door, CW / 2 + 0.01, y, 0);
    cont.add(b, d1);
    // slight random rotation per layer
    cont.rotation.y = (rng() - 0.5) * 0.06;
    g.add(cont);
    y += CH + 0.02;
  }
  g.userData.size = { w: CW, d: CD, h: y };
  return g;
}

// =============================================================================
// GUARD POST / CHECKPOINT
// =============================================================================
export function buildCheckpoint(rng) {
  const M = mats();
  const g = new THREE.Group();
  // booth
  g.add(box(2.4, 2.6, 2.4, M.plasterPale, 0, 0, 0));
  const roof = box(3.0, 0.18, 3.0, M.dark, 0, 2.6, 0);
  g.add(roof);
  // window band
  const glass = plane(1.9, 0.9, M.windowDark);
  glass.position.set(0, 1.7, 1.21);
  g.add(glass);
  // striped barrier arm
  const arm = box(4.5, 0.18, 0.1, mat('chk_stripe', { texture: 'warningStripes' }, { roughness: 0.8 }), 2.5, 1.15, 0);
  arm.rotation.z = rng() < 0.5 ? 0 : 0.5;
  g.add(arm);
  // sandbag ring
  const sb = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.8, 10, 1, true), M.sandbags);
  scaleUV(sb.geometry, 8, 0.5);
  sb.position.y = 0.4;
  g.add(sb);
  g.userData.size = { w: 7, d: 7, h: 3 };
  return g;
}
