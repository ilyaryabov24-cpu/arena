// ---------------------------------------------------------------------------
// DroneBuilder — the hero asset: a detailed twin-boom strike drone (LOD0-2).
// Scale ~2.4m long, 3.0m wingspan. Returns a THREE.Group with animated parts
// exposed on .userData: { propeller, gimbal, gimbalLens }
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mat, variant, CAMO } from '../MaterialLibrary.js';
import { wingGeometry, scaleUV, ensureUV } from '../GeometryKit.js';
import { getTextureSet } from '../TextureFactory.js';

const M = () => {
  const skin = mat('drone_skin', { texture: 'droneSkin' }, { roughness: 0.72, metalness: 0.3, normalScale: 1.0 });
  const dark = mat('drone_dark', { texture: 'droneSkin', params: {} },
    { color: 0x23282c, roughness: 0.8, metalness: 0.35 });
  const accent = mat('drone_accent', { texture: 'metalPanel', params: { color: [200, 92, 44] } },
    { color: 0xc8552c, roughness: 0.55, metalness: 0.25, normalScale: 0.7 });
  const steel = mat('drone_steel', { texture: 'metalPanel', params: { color: [150, 154, 158] } },
    { roughness: 0.45, metalness: 0.75, normalScale: 0.7 });
  const glass = mat('drone_glass', { texture: 'glass' }, { roughness: 0.15, metalness: 0.5 });
  const camoBody = mat('drone_camo', { texture: 'camo', params: CAMO.forest }, { roughness: 0.8, metalness: 0.15, normalScale: 0.8 });
  return { skin, dark, accent, steel, glass, camoBody };
};

/** Wing box with aileron seam — reused across LODs with different segment counts. */
function wingMesh(params, material, texScale = 1.6) {
  const g = wingGeometry(params);
  scaleUV(g, params.span / texScale, params.rootChord / texScale);
  return g;
}

// ---------------------------------------------------------------------------
function buildLOD0() {
  const { skin, dark, accent, steel, glass, camoBody } = M();
  const g = new THREE.Group();
  const parts = { propeller: null, gimbal: null };

  // ---- fuselage ------------------------------------------------------------
  const body = new THREE.Group();
  // mid section (circular, flattened slightly)
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 1.15, 14, 1), skin);
  mid.rotation.x = Math.PI / 2;
  scaleUV(mid.geometry, 2.2, 1.4);
  // nose section — tapering cone to rounded tip
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.20, 0.55, 14, 1), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.85;
  scaleUV(nose.geometry, 1.1, 0.7);
  const noseCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin);
  noseCap.position.z = 1.12;
  // tail taper
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.13, 0.5, 14, 1), skin);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = -0.82;
  scaleUV(tail.geometry, 1.0, 0.7);
  // flatten the fuselage a bit
  for (const m of [mid, nose, tail]) m.scale.y = 0.86;
  body.add(mid, nose, noseCap, tail);

  // dorsal spine
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.09, 1.5), dark);
  spine.position.set(0, 0.17, 0.1);
  // GPS puck
  const gps = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.035, 10), dark);
  gps.position.set(0, 0.23, 0.35);
  // antenna blade
  const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.05), dark);
  antenna.position.set(0.06, 0.24, -0.5);
  // tech blisters
  const blister = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), dark);
  blister.position.set(-0.13, -0.09, -0.2);
  blister.scale.set(1, 0.6, 1.6);
  body.add(spine, gps, antenna, blister);

  // ---- wings ----------------------------------------------------------------
  const wingParams = { span: 1.5, rootChord: 0.55, tipChord: 0.30, sweep: 0.38, thickness: 0.075, dihedral: 0.07, camber: 0.4 };
  const wingGeom = wingMesh(wingParams, skin, 1.5);
  const wingL = new THREE.Mesh(wingGeom, skin);
  wingL.position.set(0.06, 0.04, 0.28);
  const wingR = new THREE.Mesh(wingGeom, skin);
  wingR.position.set(-0.06, 0.04, 0.28);
  wingR.scale.x = -1;
  // winglets
  const letGeom = wingMesh({ span: 0.16, rootChord: 0.26, tipChord: 0.16, sweep: 0.08, thickness: 0.04, dihedral: 0, camber: 0.3 }, accent, 0.4);
  const letL = new THREE.Mesh(letGeom, accent);
  letL.rotation.z = -Math.PI / 2;
  letL.position.set(1.55, 0.04 + 1.5 * 0.07, 0.28 + 0.38 + 0.06);
  const letR = letL.clone();
  letR.rotation.z = Math.PI / 2;
  letR.position.x = -1.55;
  // accent wingtips
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.30), accent);
  tipL.position.set(1.49, 0.135, 0.66);
  const tipR = tipL.clone(); tipR.position.x = -1.49;
  body.add(wingL, wingR, letL, letR, tipL, tipR);

  // ---- tail booms + stabilizers ----------------------------------------------
  const boom = (side) => {
    const grp = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 1.35, 10), skin);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0.62 * side, 0.02, -0.55);
    scaleUV(tube.geometry, 1.2, 0.6);
    // vertical stabilizer
    const fin = new THREE.Mesh(wingMesh({ span: 0.42, rootChord: 0.30, tipChord: 0.18, sweep: 0.16, thickness: 0.035, dihedral: 0, camber: 0.3 }, accent, 0.45), accent);
    fin.rotation.z = -Math.PI / 2 * side;
    fin.position.set(0.62 * side, 0.02, -1.2);
    grp.add(tube, fin);
    return grp;
  };
  body.add(boom(1), boom(-1));
  // horizontal stabilizer connecting booms
  const stab = new THREE.Mesh(wingMesh({ span: 0.66, rootChord: 0.30, tipChord: 0.20, sweep: 0.10, thickness: 0.04, dihedral: 0, camber: 0.3 }, skin, 0.45), skin);
  stab.rotation.y = Math.PI;
  stab.position.set(0, 0.44, -1.28);
  body.add(stab);

  // ---- engine + propeller (pusher) --------------------------------------------
  const engine = new THREE.Group();
  const engHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.3, 12), steel);
  engHousing.rotation.x = Math.PI / 2;
  engHousing.position.z = -1.12;
  // cooling fins
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.03), steel);
    fin.position.set(0, 0, -1.0 - i * 0.055);
    fin.rotation.z = i * 0.4;
    engine.add(fin);
  }
  // mount struts to booms
  for (const side of [1, -1]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.34), dark);
    strut.position.set(0.62 * side, 0.02, -1.05);
    engine.add(strut);
    const strut2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.02), dark);
    strut2.position.set(0.62 * side, -0.07, -1.1);
    engine.add(strut2);
  }
  // propeller
  const prop = new THREE.Group();
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 10), steel);
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.z = -0.02;
  prop.add(spinner);
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.012), dark);
    blade.position.y = 0.23;
    const holder = new THREE.Group();
    holder.rotation.z = (i * Math.PI) + 0.3;
    holder.add(blade);
    // blade twist
    blade.rotation.x = 0.35;
    prop.add(holder);
  }
  prop.position.z = -1.32;
  parts.propeller = prop;
  engine.add(prop);
  // exhaust
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.1, 8), dark);
  exhaust.rotation.x = Math.PI / 2 + 0.3;
  exhaust.position.set(0.1, -0.08, -1.05);
  engine.add(engHousing, exhaust);
  body.add(engine);

  // ---- nose gimbal camera -------------------------------------------------------
  const gimbal = new THREE.Group();
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.06), steel);
  yoke.position.y = -0.02;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), dark);
  const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.06, 12), dark);
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.z = 0.08;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 12), glass);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.11;
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 14), steel);
  lensRing.position.z = 0.105;
  const sensor2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), glass);
  sensor2.rotation.x = Math.PI / 2;
  sensor2.position.set(0.05, 0.03, 0.06);
  ball.add(lensBarrel, lens, lensRing, sensor2);
  gimbal.add(yoke, ball);
  gimbal.position.set(0, -0.20, 0.78);
  parts.gimbal = gimbal;
  parts.gimbalBall = ball;
  body.add(gimbal);

  // pitot tube on nose
  const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), steel);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(0.12, 0.06, 1.05);
  body.add(pitot);

  g.add(body);
  g.userData.parts = parts;
  return g;
}

// ---------------------------------------------------------------------------
function buildLOD1() {
  const { skin, dark, accent, steel, glass } = M();
  const g = new THREE.Group();
  const parts = { propeller: null, gimbal: null };

  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 1.15, 8), skin);
  mid.rotation.x = Math.PI / 2; mid.scale.y = 0.86;
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.20, 0.55, 8), skin);
  nose.rotation.x = Math.PI / 2; nose.position.z = 0.85; nose.scale.y = 0.86;
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.13, 0.5, 8), skin);
  tail.rotation.x = Math.PI / 2; tail.position.z = -0.82; tail.scale.y = 0.86;
  g.add(mid, nose, tail);

  const wingGeom = wingMesh({ span: 1.5, rootChord: 0.55, tipChord: 0.30, sweep: 0.38, thickness: 0.075, dihedral: 0.07, camber: 0.4 }, skin, 1.5);
  const wingL = new THREE.Mesh(wingGeom, skin);
  wingL.position.set(0.06, 0.04, 0.28);
  const wingR = new THREE.Mesh(wingGeom, skin);
  wingR.position.set(-0.06, 0.04, 0.28); wingR.scale.x = -1;
  g.add(wingL, wingR);

  for (const side of [1, -1]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 1.35, 6), skin);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0.62 * side, 0.02, -0.55);
    g.add(tube);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.3), accent);
    fin.position.set(0.62 * side, 0.23, -1.2);
    g.add(fin);
  }
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.04, 0.3), skin);
  stab.position.set(0, 0.44, -1.28);
  g.add(stab);

  const prop = new THREE.Group();
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 8), steel);
  spinner.rotation.x = -Math.PI / 2;
  prop.add(spinner);
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.012), dark);
    blade.position.y = 0.23;
    const holder = new THREE.Group();
    holder.rotation.z = i * Math.PI;
    holder.add(blade);
    prop.add(holder);
  }
  prop.position.z = -1.32;
  parts.propeller = prop;
  g.add(prop);

  const gimbal = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), dark);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 8), dark);
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.08;
  ball.add(lens);
  gimbal.add(ball);
  gimbal.position.set(0, -0.20, 0.78);
  parts.gimbal = gimbal;
  g.add(gimbal);

  g.userData.parts = parts;
  return g;
}

// ---------------------------------------------------------------------------
function buildLOD2() {
  const { skin, dark } = M();
  const g = new THREE.Group();
  const parts = { propeller: null, gimbal: null };
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.2, 6), skin);
  mid.rotation.x = Math.PI / 2; mid.scale.y = 0.86;
  g.add(mid);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 0.5), skin);
  wing.position.set(0, 0.05, 0.28);
  g.add(wing);
  for (const side of [1, -1]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 5), skin);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0.62 * side, 0.02, -0.55);
    g.add(tube);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.3), skin);
  fin.position.set(0, 0.22, -1.2);
  g.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.04, 0.28), skin);
  stab.position.set(0, 0.4, -1.28);
  g.add(stab);
  g.userData.parts = parts;
  return g;
}

// ---------------------------------------------------------------------------
let cachedFull = null;

/**
 * Build the drone with LODs + decals. 
 * @param {boolean} withDecals stencil/roundel decorations (menu & close-ups)
 */
export function buildDrone(withDecals = true) {
  if (cachedFull && !withDecals) return cachedFull.clone(true);

  const lod = new THREE.LOD();

  const l0 = buildLOD0();
  // decals on LOD0
  if (withDecals) {
    const { mat } = _decalMats();
    const roundelL = new THREE.Mesh(_decalGeom(0.5), mat.roundel);
    roundelL.rotation.x = -Math.PI / 2;
    roundelL.rotation.z = 0.2;
    roundelL.position.set(0.85, 0.085, 0.35);
    const roundelR = roundelL.clone();
    roundelR.position.x = -0.85;
    roundelR.scale.x = -1;
    const num = new THREE.Mesh(_decalGeom(0.3), mat.num);
    num.rotation.y = -Math.PI / 2;
    num.position.set(0.07, 0.02, -0.6);
    const num2 = new THREE.Mesh(_decalGeom(0.3), mat.num);
    num2.rotation.y = Math.PI / 2;
    num2.position.set(-0.07, 0.02, -0.6);
    const stripe = new THREE.Mesh(_stripeGeom(), mat.stripe);
    stripe.position.set(0, 0, -0.95);
    l0.add(roundelL, roundelR, num, num2, stripe);
  }
  lod.addLevel(l0, 0);

  const l1 = buildLOD1();
  lod.addLevel(l1, 90);
  const l2 = buildLOD2();
  lod.addLevel(l2, 300);

  const root = new THREE.Group();
  root.add(lod);
  root.userData.lod = lod;
  root.userData.parts = l0.userData.parts;
  // propagate parts from LOD0 (the LOD swaps children but we drive LOD0 parts)
  if (!withDecals && !cachedFull) cachedFull = root;
  return root;
}

// decals -----------------------------------------------------------------------
let _decalCache = null;
function _decalMats() {
  if (_decalCache) return _decalCache;
  const roundelSet = getTextureSet('roundel', { ring: '#c8402e', center: '#e8e4da' });
  const numSet = getTextureSet('stencil', { text: '01', color: '#e2e2d8' });
  const stripeSet = getTextureSet('warningStripes');
  _decalCache = {
    mat: {
      roundel: decalMat(roundelSet.map),
      num: decalMat(numSet.map),
      stripe: decalMat(stripeSet.map),
    },
  };
  return _decalCache;
}

function decalMat(map) {
  return new THREE.MeshStandardMaterial({
    map, transparent: true, roughness: 0.8, metalness: 0.1,
    polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false,
  });
}

const _decalGeoms = new Map();
function _decalGeom(size) {
  const k = `d${size}`;
  if (!_decalGeoms.has(k)) {
    _decalGeoms.set(k, new THREE.PlaneGeometry(size, size));
  }
  return _decalGeoms.get(k);
}
function _stripeGeom() {
  const g = new THREE.CylinderGeometry(0.205, 0.205, 0.1, 16, 1, true);
  scaleUV(g, 3, 1);
  return g;
}
