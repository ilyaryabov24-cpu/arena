// ---------------------------------------------------------------------------
// PropBuilders — environment props designed for InstancedMesh rendering.
// Each builder returns { parts: [{ geometry, material }], size, shadow }
// All geometries are pre-transformed into local object space.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mat, variant } from '../MaterialLibrary.js';
import { scaleUV, jitterGeometry, ensureUV } from '../GeometryKit.js';
import { makeRNG, hashSeed } from '../../core/Utils.js';
import { getTextureSet } from '../TextureFactory.js';

const _rng = (seed) => makeRNG(seed);

function foliageBlob(rng, radius, squash = 0.85) {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  jitterGeometry(g, radius * 0.42, (rng() * 10000) | 0);
  g.scale(1, squash, 1);
  ensureUV(g);
  // spherical-project UVs so the foliage texture wraps smoothly
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    uv.setXY(i, (x / len + 1) / 2, (y / len + 1) / 2);
  }
  uv.needsUpdate = true;
  return g;
}

// =============================================================================
// TREES
// =============================================================================
export function buildOak(seed = 1) {
  const rng = _rng(seed);
  const parts = [];
  const bark = mat('p_bark', { texture: 'bark' }, { roughness: 1, normalScale: 1.5 });
  const leaf = mat('p_foliage', { texture: 'foliage' }, { roughness: 0.95, normalScale: 1.1 });

  // trunk with slight lean
  const trunkH = 2.2 + rng() * 1.2;
  const trunk = new THREE.CylinderGeometry(0.16, 0.28, trunkH, 7);
  trunk.translate(0, trunkH / 2, 0);
  scaleUV(trunk, 1.2, 1.2);
  // branches
  const branchGeoms = [trunk];
  const nb = 3 + ((rng() * 2) | 0);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rng();
    const bl = 1.0 + rng() * 0.8;
    const br = new THREE.CylinderGeometry(0.05, 0.1, bl, 5);
    br.translate(0, bl / 2, 0);
    const m = new THREE.Matrix4()
      .makeRotationZ(0.7 + rng() * 0.4)
      .multiply(new THREE.Matrix4().makeRotationY(a));
    br.applyMatrix4(m);
    br.translate(0, trunkH * (0.55 + rng() * 0.35), 0);
    branchGeoms.push(br);
  }
  parts.push({ geometry: mergeAll(branchGeoms), material: bark });

  // canopy: 3-5 blobs
  const blobs = [];
  const mainR = 1.6 + rng() * 0.7;
  blobs.push(foliageBlob(rng, mainR, 0.8));
  blobs[blobs.length - 1].translate(0, trunkH + mainR * 0.55, 0);
  const extra = 3 + ((rng() * 3) | 0);
  for (let i = 0; i < extra; i++) {
    const a = (i / extra) * Math.PI * 2 + rng() * 1.5;
    const r = mainR * (0.42 + rng() * 0.3);
    const d = mainR * (0.6 + rng() * 0.45);
    const b = foliageBlob(rng, r, 0.85);
    b.translate(Math.cos(a) * d, trunkH + mainR * 0.4 + rng() * mainR * 0.5, Math.sin(a) * d);
    blobs.push(b);
  }
  parts.push({ geometry: mergeAll(blobs), material: leaf });

  return { parts, size: { r: mainR + 1, h: trunkH + mainR * 1.6 }, seed, kind: 'oak' };
}

export function buildPine(seed = 2) {
  const rng = _rng(seed + 101);
  const parts = [];
  const bark = mat('p_bark_pine', { texture: 'bark' }, { color: 0x8a7160, roughness: 1, normalScale: 1.4 });
  const leaf = mat('p_foliage_pine', { texture: 'foliage' }, { color: 0x3d5a35, roughness: 0.95, normalScale: 1.1 });

  const trunkH = 5.5 + rng() * 3;
  const trunk = new THREE.CylinderGeometry(0.10, 0.24, trunkH, 7);
  trunk.translate(0, trunkH / 2, 0);
  scaleUV(trunk, 1.0, 2.0);
  parts.push({ geometry: trunk, material: bark });

  // stacked cone canopy
  const cones = [];
  const levels = 4 + ((rng() * 2) | 0);
  const baseR = 1.7 + rng() * 0.6;
  for (let i = 0; i < levels; i++) {
    const t = i / levels;
    const r = baseR * (1 - t * 0.78);
    const h = (trunkH * 0.42) * (1 - t * 0.35);
    const cone = new THREE.ConeGeometry(r, h, 8, 2);
    jitterGeometry(cone, r * 0.13, (seed + i * 77) | 0);
    ensureUV(cone);
    cone.translate(0, trunkH * (0.34 + t * 0.62) + h * 0.2, 0);
    cones.push(cone);
  }
  parts.push({ geometry: mergeAll(cones), material: leaf });
  return { parts, size: { r: baseR + 0.5, h: trunkH + 2 }, seed, kind: 'pine' };
}

export function buildBirch(seed = 3) {
  const rng = _rng(seed + 202);
  const parts = [];
  const barkMat = mat('p_bark_birch', { texture: 'plaster', params: { color: [232, 230, 222] } },
    { color: 0xe8e6de, roughness: 0.9, normalScale: 0.5 });
  const leaf = mat('p_foliage_birch', { texture: 'foliage' }, { color: 0x7fa050, roughness: 0.95, normalScale: 1.1 });

  // often twin trunks
  const trunks = [];
  const nt = rng() < 0.5 ? 2 : 1;
  for (let t = 0; t < nt; t++) {
    const h = 4.5 + rng() * 2.5;
    const tr = new THREE.CylinderGeometry(0.06, 0.12, h, 6);
    tr.translate((rng() - 0.5) * 0.5, h / 2, (rng() - 0.5) * 0.5);
    scaleUV(tr, 0.8, 1.6);
    trunks.push(tr);
  }
  parts.push({ geometry: mergeAll(trunks), material: barkMat });

  const blobs = [];
  const r = 1.3 + rng() * 0.5;
  const top = 5.5;
  blobs.push(foliageBlob(rng, r, 1.1));
  blobs[blobs.length - 1].translate(0, top + r * 0.3, 0);
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2;
    const b = foliageBlob(rng, r * 0.55, 1.2);
    b.translate(Math.cos(a) * r * 0.7, top - r * (0.4 + rng() * 0.5), Math.sin(a) * r * 0.7);
    blobs.push(b);
  }
  parts.push({ geometry: mergeAll(blobs), material: leaf });
  return { parts, size: { r: r + 0.8, h: top + r * 1.5 }, seed, kind: 'birch' };
}

// =============================================================================
// BUSH / ROCK / STUMP
// =============================================================================
export function buildBush(seed = 4) {
  const rng = _rng(seed + 303);
  const parts = [];
  const leaf = mat('p_foliage_bush', { texture: 'foliage' }, { roughness: 0.95, normalScale: 1.1 });
  const blobs = [];
  const n = 2 + ((rng() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const r = 0.5 + rng() * 0.45;
    const b = foliageBlob(rng, r, 0.7);
    b.translate((rng() - 0.5) * 0.6, r * 0.55, (rng() - 0.5) * 0.6);
    blobs.push(b);
  }
  parts.push({ geometry: mergeAll(blobs), material: leaf });
  return { parts, size: { r: 1.1, h: 1.1 }, seed, kind: 'bush' };
}

export function buildRock(seed = 5, scale = 1) {
  const rng = _rng(seed + 404);
  const parts = [];
  const rockMat = mat('p_rock', { texture: 'concreteWall' }, { color: 0x9a958e, roughness: 1, normalScale: 1.6 });
  const r = scale * (0.5 + rng() * 0.9);
  const g = new THREE.DodecahedronGeometry(r, 1);
  jitterGeometry(g, r * 0.25, (seed * 31) | 0);
  g.scale(1, 0.65 + rng() * 0.3, 1);
  g.translate(0, r * 0.3, 0);
  ensureUV(g);
  parts.push({ geometry: g, material: rockMat });
  return { parts, size: { r: r * 1.2, h: r }, seed, kind: 'rock' };
}

// =============================================================================
// FENCES — wooden fence segment (4m), post-and-rail
// =============================================================================
export function buildFenceSegment() {
  const parts = [];
  const wood = mat('p_wood', { texture: 'wood' }, { roughness: 0.95 });
  const geoms = [];
  // posts every 2m
  for (const x of [-2, 0, 2]) {
    const post = new THREE.BoxGeometry(0.12, 1.15, 0.12);
    boxT(post, x, 0.55, 0);
    geoms.push(post);
  }
  // rails
  for (const y of [0.55, 1.0]) {
    const rail = new THREE.BoxGeometry(4.1, 0.09, 0.05);
    boxT(rail, 0, y, 0.04);
    geoms.push(rail);
    const rail2 = new THREE.BoxGeometry(4.1, 0.09, 0.05);
    boxT(rail2, 0, y + 0.42, 0.04);
    geoms.push(rail2);
  }
  parts.push({ geometry: mergeAll(geoms), material: wood });
  return { parts, size: { r: 2.2, h: 1.2 }, kind: 'fence' };
}

const boxT = (g, x, y, z) => {
  const m = new THREE.Matrix4().makeTranslation(x, y, z);
  g.applyMatrix4(m);
  ensureUV(g);
  scaleUV(g, 0.6, 0.6);
};

// =============================================================================
// POWER PYLON + wires anchor
// =============================================================================
export function buildPowerPylon() {
  const parts = [];
  const steel = mat('p_steel', { texture: 'metalPanel', params: { color: [120, 124, 128] } },
    { roughness: 0.6, metalness: 0.7, normalScale: 0.8 });
  const geoms = [];
  const H = 18;
  const W = (y) => 1.6 + (1 - y / H) * 2.2; // tapering
  // 4 legs
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const leg = new THREE.BoxGeometry(0.16, H, 0.16);
    // slant legs by translating top? approximate with shear via rotation
    const m = new THREE.Matrix4().makeTranslation(0, H / 2, 0);
    leg.applyMatrix4(m);
    // shear toward center at top
    const sxx = sx * 1.4, szz = sz * 1.4;
    const shear = new THREE.Matrix4().set(
      1, 0, 0, -sxx,
      0, 1, 0, 0,
      0, 0, 1, -szz,
      0, 0, 0, 1);
    // shear about base: translate down, shear, translate up
    const t1 = new THREE.Matrix4().makeTranslation(0, -H / 2, 0);
    const t2 = new THREE.Matrix4().makeTranslation(0, H / 2, 0);
    leg.applyMatrix4(t1).applyMatrix4(shear).applyMatrix4(t2);
    geoms.push(leg);
  }
  // cross braces (X patterns)
  for (let i = 0; i < 5; i++) {
    const y = 1.2 + i * 3.2;
    const w = W(y) * 0.8;
    for (const [dx, dz] of [[w, w], [-w, w]]) {
      const braceLen = Math.hypot(3.2, w * 2);
      const b = new THREE.BoxGeometry(0.09, braceLen, 0.09);
      b.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.atan2(w * 2, 3.2)));
      b.applyMatrix4(new THREE.Matrix4().makeTranslation(dx * 0.7, y + 1.6, dz * 0.7));
      geoms.push(b);
    }
    // horizontal ring
    const ring = new THREE.BoxGeometry(w * 1.5, 0.09, 0.09);
    boxT(ring, 0, y + 3.0, 0);
    geoms.push(ring);
    const ring2 = new THREE.BoxGeometry(0.09, 0.09, w * 1.5);
    boxT(ring2, 0, y + 3.0, 0);
    geoms.push(ring2);
  }
  // arms at top
  for (const y of [H - 1.5, H - 4.5]) {
    const arm = new THREE.BoxGeometry(7, 0.12, 0.12);
    boxT(arm, 0, y, 0);
    geoms.push(arm);
    // insulator hangers
    for (const x of [-3.2, -1.6, 1.6, 3.2]) {
      const hang = new THREE.BoxGeometry(0.08, 0.5, 0.08);
      boxT(hang, x, y - 0.25, 0);
      geoms.push(hang);
    }
  }
  parts.push({ geometry: mergeAll(geoms), material: steel });
  return { parts, size: { r: 2.5, h: H }, kind: 'pylon', wireOffsets: [-3.2, -1.6, 1.6, 3.2], wireY: [H - 1.8, H - 4.8] };
}

// =============================================================================
// STREET LAMP
// =============================================================================
export function buildLamp() {
  const parts = [];
  const steel = mat('p_lamp_steel', { texture: 'metalPanel', params: { color: [70, 74, 78] } },
    { roughness: 0.6, metalness: 0.6, normalScale: 0.7 });
  const glow = mat('p_lamp_glow', { texture: 'plaster', params: { color: [255, 240, 200] } },
    { color: 0xfff0c8, emissive: 0xffdf9e, emissiveIntensity: 1.8, roughness: 0.4 });
  const geoms = [];
  const pole = new THREE.CylinderGeometry(0.07, 0.11, 7, 8);
  pole.translate(0, 3.5, 0);
  scaleUV(pole, 0.5, 3);
  geoms.push(pole);
  const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6);
  arm.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
  arm.translate(0.8, 6.9, 0);
  geoms.push(arm);
  parts.push({ geometry: mergeAll(geoms), material: steel });
  const head = new THREE.BoxGeometry(0.7, 0.18, 0.32);
  head.translate(1.5, 6.82, 0);
  parts.push({ geometry: head, material: glow });
  return { parts, size: { r: 0.4, h: 7 }, kind: 'lamp', glowAt: [1.5, 6.7, 0] };
}

// =============================================================================
// ROAD SIGNS
// =============================================================================
export function buildSign(kind = 'stop') {
  const parts = [];
  const steel = mat('p_sign_steel', { texture: 'metalPanel', params: { color: [130, 134, 138] } },
    { roughness: 0.55, metalness: 0.6, normalScale: 0.6 });
  const geoms = [];
  const pole = new THREE.CylinderGeometry(0.045, 0.05, 2.6, 6);
  pole.translate(0, 1.3, 0);
  geoms.push(pole);
  parts.push({ geometry: mergeAll(geoms), material: steel });

  let faceMat;
  if (kind === 'stop') {
    faceMat = mat('p_sign_stop', { texture: 'plaster', params: { color: [180, 40, 32] } }, { color: 0xb42820, roughness: 0.5 });
    const face = new THREE.BoxGeometry(0.75, 0.75, 0.04);
    face.translate(0, 2.35, 0);
    face.rotateY(0);
    parts.push({ geometry: face, material: faceMat });
    // oct feel via text decal — keep simple box + white band
    const band = new THREE.BoxGeometry(0.5, 0.14, 0.05);
    band.translate(0, 2.35, 0.02);
    parts.push({ geometry: band, material: mat('p_sign_white', { texture: 'plaster', params: { color: [235, 235, 235] } }, { roughness: 0.5 }) });
  } else if (kind === 'speed') {
    faceMat = mat('p_sign_speed', { texture: 'plaster', params: { color: [235, 235, 235] } }, { roughness: 0.5 });
    const face = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20);
    face.rotateX(Math.PI / 2);
    face.translate(0, 2.3, 0);
    parts.push({ geometry: face, material: faceMat });
    const num = new THREE.BoxGeometry(0.34, 0.15, 0.045);
    num.translate(0, 2.36, 0);
    parts.push({ geometry: num, material: mat('p_sign_black', { texture: 'plaster', params: { color: [30, 30, 32] } }, { roughness: 0.5 }) });
  } else {
    // arrow / directional
    faceMat = mat('p_sign_arrow', { texture: 'plaster', params: { color: [48, 92, 168] } }, { roughness: 0.5 });
    const face = new THREE.BoxGeometry(0.9, 0.4, 0.04);
    face.translate(0, 2.35, 0);
    parts.push({ geometry: face, material: faceMat });
    const arrow = new THREE.BoxGeometry(0.5, 0.1, 0.05);
    arrow.translate(0.08, 2.35, 0.01);
    parts.push({ geometry: arrow, material: mat('p_sign_white2', { texture: 'plaster', params: { color: [235, 235, 235] } }, { roughness: 0.5 }) });
  }
  return { parts, size: { r: 0.3, h: 2.7 }, kind: 'sign' };
}

// =============================================================================
// HAY BALE / CRATE / BARREL / TIRE STACK — small scatter
// =============================================================================
export function buildHayBale(seed = 6) {
  const rng = _rng(seed + 505);
  const parts = [];
  const hayMat = mat('p_hay', { texture: 'hay' }, { roughness: 1 });
  const g = new THREE.CylinderGeometry(0.75, 0.75, 1.2, 12);
  g.rotateZ(Math.PI / 2);
  g.rotateY(rng() * Math.PI);
  ensureUV(g);
  scaleUV(g, 1, 2);
  g.translate(0, 0.75, 0);
  parts.push({ geometry: g, material: hayMat });
  return { parts, size: { r: 0.9, h: 1.5 }, kind: 'hay' };
}

export function buildCrate(seed = 7) {
  const rng = _rng(seed + 606);
  const parts = [];
  const wood = mat('p_crate_wood', { texture: 'wood' }, { roughness: 0.95 });
  const s = 0.8 + rng() * 0.5;
  const g = new THREE.BoxGeometry(s, s, s);
  g.translate(0, s / 2, 0);
  scaleUV(g, s);
  parts.push({ geometry: g, material: wood });
  return { parts, size: { r: s, h: s }, kind: 'crate' };
}

export function buildBarrel(seed = 8) {
  const rng = _rng(seed + 707);
  const parts = [];
  const rusty = rng() < 0.5;
  const m = rusty
    ? mat('p_barrel_rust', { texture: 'rust' }, { roughness: 0.9, metalness: 0.3 })
    : mat('p_barrel_paint', { texture: 'metalPanel', params: { color: [90, 108, 122] } }, { roughness: 0.6, metalness: 0.4, normalScale: 0.8 });
  const g = new THREE.CylinderGeometry(0.32, 0.32, 0.92, 10);
  g.translate(0, 0.46, 0);
  scaleUV(g, 1, 0.6);
  parts.push({ geometry: g, material: m });
  return { parts, size: { r: 0.4, h: 1 }, kind: 'barrel' };
}

// sandbag wall segment (defensive position)
export function buildSandbagWall(len = 3) {
  const parts = [];
  const sb = mat('p_sandbag', { texture: 'sandbags' }, { roughness: 1, normalScale: 1.3 });
  const g = new THREE.BoxGeometry(len, 0.9, 0.7);
  g.translate(0, 0.45, 0);
  scaleUV(g, len / 2, 0.5);
  parts.push({ geometry: g, material: sb });
  return { parts, size: { r: len * 0.55, h: 1 }, kind: 'sandbags' };
}

// guard rail (roadside)
export function buildGuardRail(len = 4) {
  const parts = [];
  const steel = mat('p_rail_steel', { texture: 'metalPanel', params: { color: [176, 180, 184] } },
    { roughness: 0.5, metalness: 0.65, normalScale: 0.8 });
  const geoms = [];
  for (const x of [-len / 2, 0, len / 2]) {
    const post = new THREE.BoxGeometry(0.1, 0.55, 0.1);
    boxT(post, x, 0.28, 0);
    geoms.push(post);
  }
  const rail = new THREE.BoxGeometry(len, 0.32, 0.06);
  boxT(rail, 0, 0.55, 0.08);
  geoms.push(rail);
  const rail2 = new THREE.BoxGeometry(len, 0.1, 0.05);
  boxT(rail2, 0, 0.25, 0.06);
  geoms.push(rail2);
  parts.push({ geometry: mergeAll(geoms), material: steel });
  return { parts, size: { r: len * 0.55, h: 0.8 }, kind: 'rail' };
}

// concrete jersey barrier
export function buildJerseyBarrier() {
  const parts = [];
  const conc = mat('p_jersey', { texture: 'concreteWall' }, { roughness: 0.95, normalScale: 1.1 });
  const geoms = [];
  const g = new THREE.BoxGeometry(2.4, 0.85, 0.55);
  g.translate(0, 0.42, 0);
  scaleUV(g, 1.2);
  geoms.push(g);
  const top = new THREE.BoxGeometry(2.4, 0.16, 0.3);
  boxT(top, 0, 0.9, 0);
  geoms.push(top);
  parts.push({ geometry: mergeAll(geoms), material: conc });
  return { parts, size: { r: 1.3, h: 1 }, kind: 'jersey' };
}

// grass card (instanced crossed quads handled by ScatterSystem)
export function grassCardGeometry() {
  const set = getTextureSet('grassCard');
  const geoms = [];
  for (let i = 0; i < 2; i++) {
    const p = new THREE.PlaneGeometry(1.1, 0.9);
    p.translate(0, 0.45, 0);
    if (i === 1) p.rotateY(Math.PI / 2);
    geoms.push(p);
  }
  return { geometry: mergeAll(geoms), material: null, map: set.map };
}

// merge helper (local import to avoid circulars)
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
const mergeAll = (geoms) => {
  for (const g of geoms) {
    if (!g.attributes.uv) ensureUV(g);
    if (!g.attributes.normal) g.computeVertexNormals();
  }
  return BufferGeometryUtils.mergeGeometries(geoms, false);
};
