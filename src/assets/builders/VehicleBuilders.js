// ---------------------------------------------------------------------------
// VehicleBuilders — detailed ground vehicles: tank, APC, truck, technical,
// sedan, fuel truck. Each builder returns { group, parts } where parts hold
// animatable references (wheels, turret, tracks...).
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mat, variant, CAMO } from '../MaterialLibrary.js';
import { wedgeGeometry, boxUV, scaleUV, jitterGeometry } from '../GeometryKit.js';

const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  boxUV(g, Math.max(w, d) * 0.8);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
};
const cyl = (rTop, rBot, h, m, x = 0, y = 0, z = 0, seg = 12) => {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
};

function mats_() {
  return {
    camoForest: mat('v_camo_forest', { texture: 'camo', params: CAMO.forest }, { roughness: 0.85, metalness: 0.15, normalScale: 0.9 }),
    camoDesert: mat('v_camo_desert', { texture: 'camo', params: CAMO.desert }, { roughness: 0.85, metalness: 0.15, normalScale: 0.9 }),
    track: mat('v_track', { texture: 'tankTrack' }, { roughness: 0.95, metalness: 0.2, normalScale: 1.3 }),
    tire: mat('v_tire', { texture: 'tireSide' }, { roughness: 0.95 }),
    rim: mat('v_rim', { texture: 'wheelRim' }, { roughness: 0.55, metalness: 0.7 }),
    dark: mat('v_dark', { texture: 'metalPanel', params: { color: [42, 44, 46] } }, { roughness: 0.7, metalness: 0.4, normalScale: 0.7 }),
    steel: mat('v_steel', { texture: 'metalPanel', params: { color: [140, 144, 148] } }, { roughness: 0.5, metalness: 0.7, normalScale: 0.7 }),
    glass: mat('v_glass', { texture: 'glass' }, { roughness: 0.15, metalness: 0.5 }),
    tarp: mat('v_tarp', { texture: 'tarp' }, { roughness: 0.95 }),
    rust: mat('v_rust', { texture: 'rust' }, { roughness: 0.9, metalness: 0.25 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffeebb, emissiveIntensity: 1.6, roughness: 0.3 }),
    taillight: new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xaa1100, emissiveIntensity: 1.2, roughness: 0.3 }),
  };
}

// wheel with tire sides + steel rim (rotation around X)
function makeWheel(radius, width, M) {
  const g = new THREE.CylinderGeometry(radius, radius, width, 16);
  const materials = [M.tire, M.rim, M.tire];
  const wheel = new THREE.Mesh(g, materials);
  wheel.rotation.z = Math.PI / 2; // axis along X
  wheel.castShadow = true;
  return wheel;
}

// =============================================================================
// TANK
// =============================================================================
export function buildTank(camo = 'forest') {
  const M = mats_();
  const body = camo === 'desert' ? M.camoDesert : M.camoForest;
  const g = new THREE.Group();
  const parts = { wheels: [], turret: null, tracks: [] };

  // hull — lower
  g.add(box(3.2, 0.55, 6.6, body, 0, 0.75, 0));
  // upper hull (narrower, sloped sides suggested)
  g.add(box(3.0, 0.45, 6.2, body, 0, 1.25, 0.1));
  // glacis (sloped front plate)
  const glacis = new THREE.Mesh(wedgeGeometry(3.0, 0.75, 1.5), body);
  glacis.position.set(0, 0.85, 3.3);
  glacis.rotation.y = Math.PI;
  glacis.castShadow = true;
  g.add(glacis);
  // rear plate slope
  const rear = new THREE.Mesh(wedgeGeometry(3.0, 0.5, 0.9), body);
  rear.position.set(0, 0.75, -3.3);
  rear.castShadow = true;
  g.add(rear);

  // tracks + skirts
  for (const side of [1, -1]) {
    const track = box(0.62, 0.85, 6.9, M.track, side * 1.62, 0.55, 0);
    track.userData.side = side;
    parts.tracks.push(track);
    // skirt
    g.add(box(0.1, 0.5, 5.6, body, side * 1.86, 1.2, 0));
    // fenders front/back
    g.add(box(0.66, 0.08, 0.8, body, side * 1.62, 1.0, 3.15));
    g.add(box(0.66, 0.08, 0.8, body, side * 1.62, 1.0, -3.15));
  }

  // turret
  const turret = new THREE.Group();
  const tBase = cyl(1.25, 1.45, 0.5, body, 0, 0, 0, 10);
  turret.add(tBase);
  // angular cheek plates
  const cheekL = new THREE.Mesh(wedgeGeometry(1.1, 0.42, 1.0), body);
  cheekL.position.set(0.75, 0.1, 0.85); cheekL.rotation.y = -0.5;
  const cheekR = new THREE.Mesh(wedgeGeometry(1.1, 0.42, 1.0), body);
  cheekR.position.set(-0.75, 0.1, 0.85); cheekR.rotation.y = 0.5 + Math.PI;
  turret.add(cheekL, cheekR);
  // roof + hatch
  turret.add(box(1.9, 0.22, 2.4, body, 0, 0.35, -0.1));
  const hatch = cyl(0.34, 0.34, 0.12, M.dark, 0.45, 0.5, -0.4, 10);
  turret.add(hatch);
  // cupola
  turret.add(cyl(0.22, 0.24, 0.2, body, -0.5, 0.5, -0.3, 10));
  // mantlet + barrel
  turret.add(box(0.62, 0.5, 0.5, M.dark, 0, 0.15, 1.25));
  const barrel = cyl(0.085, 0.1, 3.3, M.dark, 0, 0.15, 2.9, 10);
  barrel.rotation.x = Math.PI / 2;
  turret.add(barrel);
  // thermal sleeve
  const sleeve = cyl(0.13, 0.13, 1.1, body, 0, 0.15, 2.4, 10);
  sleeve.rotation.x = Math.PI / 2;
  turret.add(sleeve);
  // muzzle brake
  turret.add(box(0.24, 0.24, 0.42, M.dark, 0, 0.15, 4.5));
  // smoke launchers
  for (let i = 0; i < 4; i++) {
    const sl = cyl(0.05, 0.05, 0.28, M.dark, 0.9 - i * 0.22, 0.32, 0.7, 6);
    sl.rotation.x = Math.PI / 2 + 0.35;
    turret.add(sl);
  }
  // antenna
  const ant = cyl(0.012, 0.02, 1.6, M.dark, -0.85, 1.1, -0.8, 4);
  turret.add(ant);
  turret.position.set(0, 1.72, -0.3);
  parts.turret = turret;
  g.add(turret);

  // stowage + fuel drums
  g.add(box(0.5, 0.35, 1.2, body, 1.2, 1.62, -2.4));
  g.add(box(0.5, 0.35, 1.2, body, -1.2, 1.62, -2.4));
  for (const side of [0.42, -0.42]) {
    const drum = cyl(0.32, 0.32, 0.9, M.rust, side, 1.5, -3.35, 12);
    drum.rotation.x = Math.PI / 2 - Math.PI / 2 * 0; // along Z
    drum.rotation.z = Math.PI / 2;
    g.add(drum);
  }
  // exhaust
  g.add(box(0.3, 0.25, 0.7, M.rust, 1.45, 1.45, -1.6));

  g.userData.kind = 'tank';
  return { group: g, parts, size: { w: 3.7, h: 2.6, l: 7.2 } };
}

// =============================================================================
// APC — 6x6 wheeled
// =============================================================================
export function buildAPC(camo = 'forest') {
  const M = mats_();
  const body = camo === 'desert' ? M.camoDesert : M.camoForest;
  const g = new THREE.Group();
  const parts = { wheels: [], turret: null, tracks: [] };

  g.add(box(2.6, 0.9, 6.2, body, 0, 1.15, 0));
  // sloped front
  const nose = new THREE.Mesh(wedgeGeometry(2.6, 0.75, 1.3), body);
  nose.position.set(0, 0.85, 3.1);
  nose.rotation.y = Math.PI;
  g.add(nose);
  // upper deck
  g.add(box(2.5, 0.45, 5.4, body, 0, 1.8, -0.3));
  // vision block strip
  g.add(box(2.3, 0.18, 0.06, M.glass, 0, 1.85, 2.42));
  // small turret
  const turret = new THREE.Group();
  turret.add(cyl(0.42, 0.5, 0.35, body, 0, 0, 0, 10));
  turret.add(box(0.4, 0.24, 0.5, M.dark, 0, 0.12, 0.35));
  const mg = cyl(0.035, 0.04, 1.1, M.dark, 0, 0.12, 1.0, 6);
  mg.rotation.x = Math.PI / 2;
  turret.add(mg);
  turret.position.set(0, 2.1, 0.6);
  parts.turret = turret;
  g.add(turret);

  // wheels 6x6
  const positions = [[1.25, 2.1], [1.25, 0], [1.25, -2.1], [-1.25, 2.1], [-1.25, 0], [-1.25, -2.1]];
  for (const [x, z] of positions) {
    const w = makeWheel(0.62, 0.42, M);
    w.position.set(x, 0.62, z);
    parts.wheels.push(w);
    g.add(w);
    // hub
  }
  // bumpers, stowage
  g.add(box(2.5, 0.18, 0.3, M.dark, 0, 0.75, 3.35));
  g.add(box(0.6, 0.4, 1.4, body, 1.1, 2.1, -1.9));
  g.add(box(0.6, 0.4, 1.4, body, -1.1, 2.1, -1.9));
  g.add(cyl(0.012, 0.02, 1.4, M.dark, -1.1, 2.9, -2.2, 4));

  g.userData.kind = 'apc';
  return { group: g, parts, size: { w: 2.9, h: 2.5, l: 6.6 } };
}

// =============================================================================
// MILITARY TRUCK
// =============================================================================
export function buildTruck(camo = 'forest') {
  const M = mats_();
  const body = camo === 'desert' ? M.camoDesert : M.camoForest;
  const g = new THREE.Group();
  const parts = { wheels: [], turret: null, tracks: [] };

  // chassis
  g.add(box(1.4, 0.16, 6.8, M.dark, 0, 0.78, 0));
  // cab
  const cab = new THREE.Group();
  cab.add(box(2.3, 1.15, 1.9, body, 0, 1.55, 2.15));
  // windshield + side windows
  cab.add(box(2.0, 0.55, 0.06, M.glass, 0, 1.75, 3.06));
  cab.add(box(0.06, 0.5, 1.1, M.glass, 1.14, 1.75, 2.2));
  cab.add(box(0.06, 0.5, 1.1, M.glass, -1.14, 1.75, 2.2));
  // hood
  cab.add(box(1.9, 0.5, 1.1, body, 0, 1.28, 3.55));
  // grille + bumper
  cab.add(box(1.7, 0.4, 0.1, M.dark, 0, 1.25, 4.1));
  cab.add(box(2.1, 0.22, 0.3, M.dark, 0, 0.92, 4.15));
  // headlights
  cab.add(box(0.3, 0.18, 0.08, M.headlight, 0.75, 1.28, 4.14));
  cab.add(box(0.3, 0.18, 0.08, M.headlight, -0.75, 1.28, 4.14));
  // mirrors
  cab.add(box(0.06, 0.3, 0.2, M.dark, 1.25, 2.0, 3.0));
  cab.add(box(0.06, 0.3, 0.2, M.dark, -1.25, 2.0, 3.0));
  // exhaust stack
  cab.add(cyl(0.06, 0.06, 1.3, M.dark, 1.2, 1.7, 1.2, 8));
  g.add(cab);

  // cargo bed with tarp
  const bed = new THREE.Group();
  bed.add(box(2.4, 0.5, 4.0, body, 0, 1.25, -1.6));
  // tarp hump
  const hump = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.8, 12, 1, false, 0, Math.PI), M.tarp);
  hump.rotation.z = Math.PI / 2;
  hump.rotation.y = Math.PI / 2;
  hump.scale.set(1, 1, 0.95);
  hump.position.set(0, 1.5, -1.6);
  hump.castShadow = true;
  bed.add(hump);
  // rear canvas flap
  const flap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.05, 12, 1, false, 0, Math.PI), M.tarp);
  flap.rotation.x = Math.PI / 2;
  flap.position.set(0, 1.5, -3.6);
  bed.add(flap);
  g.add(bed);

  // fuel tank + stowage
  const tank = cyl(0.3, 0.3, 1.1, M.steel, 1.05, 0.95, 0.8, 10);
  tank.rotation.z = Math.PI / 2;
  g.add(tank);

  // wheels
  const positions = [
    [1.15, 3.3], [1.15, 0.4], [1.15, -0.9], [1.15, -2.5],
    [-1.15, 3.3], [-1.15, 0.4], [-1.15, -0.9], [-1.15, -2.5],
  ];
  for (const [x, z] of positions) {
    const w = makeWheel(0.62, 0.4, M);
    w.position.set(x, 0.62, z);
    parts.wheels.push(w);
    g.add(w);
  }

  g.userData.kind = 'truck';
  return { group: g, parts, size: { w: 2.5, h: 2.8, l: 7.6 } };
}

// =============================================================================
// TECHNICAL (pickup + mounted gun)
// =============================================================================
export function buildTechnical() {
  const M = mats_();
  const body = M.camoDesert;
  const g = new THREE.Group();
  const parts = { wheels: [], turret: null, tracks: [] };

  // frame
  g.add(box(1.7, 0.14, 5.0, M.dark, 0, 0.62, 0));
  // cab
  g.add(box(1.85, 0.75, 1.6, body, 0, 1.1, 0.6));
  g.add(box(1.7, 0.65, 1.5, body, 0, 1.75, 0.55));
  // windows
  g.add(box(1.5, 0.45, 0.06, M.glass, 0, 1.78, 1.32));
  g.add(box(1.5, 0.45, 0.06, M.glass, 0, 1.78, -0.22));
  g.add(box(0.06, 0.4, 1.1, M.glass, 0.92, 1.78, 0.55));
  g.add(box(0.06, 0.4, 1.1, M.glass, -0.92, 1.78, 0.55));
  // hood
  g.add(box(1.75, 0.35, 1.3, body, 0, 0.95, 2.0));
  g.add(box(1.9, 0.18, 0.25, M.dark, 0, 0.72, 2.7));
  g.add(box(0.26, 0.14, 0.06, M.headlight, 0.62, 0.98, 2.66));
  g.add(box(0.26, 0.14, 0.06, M.headlight, -0.62, 0.98, 2.66));
  // bed
  g.add(box(1.8, 0.16, 2.0, body, 0, 0.92, -1.7));
  g.add(box(0.1, 0.35, 2.0, body, 0.86, 1.1, -1.7));
  g.add(box(0.1, 0.35, 2.0, body, -0.86, 1.1, -1.7));
  g.add(box(1.8, 0.35, 0.1, body, 0, 1.1, -2.66));
  g.add(box(1.8, 0.35, 0.1, body, 0, 1.1, -0.76));
  // mounted gun
  const gun = new THREE.Group();
  gun.add(cyl(0.03, 0.035, 1.4, M.dark, 0, 0.5, 0.4, 6)).children;
  const gunBarrel = gun.children[0];
  gunBarrel.rotation.x = Math.PI / 2 - 0.15;
  gun.add(cyl(0.05, 0.06, 0.3, M.dark, 0, 0.28, 0.05, 8));
  gun.add(box(0.3, 0.1, 0.4, M.dark, 0, 0.3, -0.1));
  // tripod
  for (const s of [1, -1]) {
    const leg = cyl(0.02, 0.02, 0.7, M.dark, s * 0.22, 0.15, -0.15, 4);
    leg.rotation.z = s * 0.5;
    gun.add(leg);
  }
  gun.position.set(0, 1.0, -1.7);
  parts.turret = gun;
  g.add(gun);
  // roll bar
  g.add(box(0.08, 0.6, 0.08, M.dark, 0.8, 1.7, -0.75));
  g.add(box(0.08, 0.6, 0.08, M.dark, -0.8, 1.7, -0.75));
  g.add(box(1.7, 0.08, 0.08, M.dark, 0, 1.98, -0.75));

  const positions = [[0.95, 1.75], [0.95, -1.55], [-0.95, 1.75], [-0.95, -1.55]];
  for (const [x, z] of positions) {
    const w = makeWheel(0.48, 0.34, M);
    w.position.set(x, 0.48, z);
    parts.wheels.push(w);
    g.add(w);
  }

  g.userData.kind = 'technical';
  return { group: g, parts, size: { w: 2.0, h: 2.2, l: 5.2 } };
}

// =============================================================================
// CIVILIAN SEDAN
// =============================================================================
const CAR_COLORS = [0x9c2b23, 0x23486e, 0x6e6e6e, 0xe8e4dc, 0x2d2f33, 0x7a6a3a, 0x4a6b4e];
export const carColors = CAR_COLORS;

export function buildCar(colorIdx = 0, rng = Math.random) {
  const M = mats_();
  const color = CAR_COLORS[colorIdx % CAR_COLORS.length];
  const paint = variant(M.steel, color, { roughness: 0.35, metalness: 0.55 });
  const g = new THREE.Group();
  const parts = { wheels: [], turret: null, tracks: [] };

  // body
  g.add(box(1.8, 0.5, 4.4, paint, 0, 0.62, 0));
  // cabin
  g.add(box(1.65, 0.52, 2.2, paint, 0, 1.12, -0.15));
  // windows (band)
  g.add(box(1.5, 0.36, 2.1, M.glass, 0, 1.14, -0.15));
  // pillars — paint over window band edges
  g.add(box(1.66, 0.38, 0.14, paint, 0, 1.14, 0.92));
  g.add(box(1.66, 0.38, 0.14, paint, 0, 1.14, -1.2));
  // hood/trunk lids
  g.add(box(1.7, 0.06, 1.0, paint, 0, 0.88, 1.7));
  g.add(box(1.7, 0.06, 0.9, paint, 0, 0.88, -1.85));
  // bumpers
  g.add(box(1.85, 0.22, 0.3, M.dark, 0, 0.45, 2.2));
  g.add(box(1.85, 0.22, 0.3, M.dark, 0, 0.45, -2.2));
  // lights
  g.add(box(0.4, 0.14, 0.06, M.headlight, 0.58, 0.72, 2.36));
  g.add(box(0.4, 0.14, 0.06, M.headlight, -0.58, 0.72, 2.36));
  g.add(box(0.4, 0.14, 0.06, M.taillight, 0.58, 0.72, -2.36));
  g.add(box(0.4, 0.14, 0.06, M.taillight, -0.58, 0.72, -2.36));
  // plates
  g.add(box(0.44, 0.13, 0.03, variant(M.steel, 0xdddddd), 0, 0.42, 2.37));
  // mirrors
  g.add(box(0.05, 0.12, 0.16, M.dark, 0.93, 1.05, 0.85));
  g.add(box(0.05, 0.12, 0.16, M.dark, -0.93, 1.05, 0.85));

  const positions = [[0.85, 1.45], [0.85, -1.45], [-0.85, 1.45], [-0.85, -1.45]];
  for (const [x, z] of positions) {
    const w = makeWheel(0.36, 0.26, M);
    w.position.set(x, 0.36, z);
    parts.wheels.push(w);
    g.add(w);
  }

  g.userData.kind = 'car';
  return { group: g, parts, size: { w: 1.9, h: 1.5, l: 4.5 } };
}

// =============================================================================
// FUEL TRUCK
// =============================================================================
export function buildFuelTruck() {
  const M = mats_();
  const g = new THREE.Group();
  const parts = { wheels: [], turret: null, tracks: [] };
  const paint = variant(M.steel, 0xb03a30, { roughness: 0.5, metalness: 0.4 });

  g.add(box(1.4, 0.16, 7.2, M.dark, 0, 0.8, 0));
  // cab (like truck)
  g.add(box(2.2, 1.1, 1.8, paint, 0, 1.55, 2.4));
  g.add(box(1.9, 0.5, 0.06, M.glass, 0, 1.75, 3.28));
  g.add(box(0.06, 0.45, 1.0, M.glass, 1.08, 1.75, 2.42));
  g.add(box(0.06, 0.45, 1.0, M.glass, -1.08, 1.75, 2.42));
  g.add(box(1.8, 0.45, 1.0, paint, 0, 1.25, 3.75));
  g.add(box(2.0, 0.2, 0.28, M.dark, 0, 0.92, 4.3));
  g.add(box(0.28, 0.16, 0.06, M.headlight, 0.7, 1.2, 4.28));
  g.add(box(0.28, 0.16, 0.06, M.headlight, -0.7, 1.2, 4.28));

  // tank cylinder
  const tank = cyl(1.05, 1.05, 4.6, variant(M.steel, 0xcfcfcf, { roughness: 0.4, metalness: 0.6 }), 0, 1.85, -1.2, 16);
  tank.rotation.x = Math.PI / 2;
  g.add(tank);
  // tank rings
  for (let i = -1; i <= 1; i++) {
    const ring = cyl(1.08, 1.08, 0.12, paint, 0, 1.85, -1.2 + i * 1.5, 16);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  // dome caps
  const cap1 = cyl(0.28, 0.28, 0.1, M.steel, 0.4, 2.9, -2.0, 10);
  g.add(cap1);
  const cap2 = cyl(0.28, 0.28, 0.1, M.steel, -0.4, 2.9, -0.4, 10);
  g.add(cap2);
  // ladder
  g.add(box(0.05, 2.2, 0.05, M.steel, 0.9, 1.2, -3.5));
  g.add(box(0.05, 2.2, 0.05, M.steel, 0.65, 1.2, -3.5));
  // hazard plate
  g.add(box(0.5, 0.4, 0.04, M.rust, 0, 1.2, -3.62));

  const positions = [
    [1.1, 3.4], [1.1, -1.4], [1.1, -2.6], [-1.1, 3.4], [-1.1, -1.4], [-1.1, -2.6],
  ];
  for (const [x, z] of positions) {
    const w = makeWheel(0.58, 0.38, M);
    w.position.set(x, 0.58, z);
    parts.wheels.push(w);
    g.add(w);
  }

  g.userData.kind = 'fueltruck';
  return { group: g, parts, size: { w: 2.4, h: 3.0, l: 8.0 } };
}

// =============================================================================
// Destroyed / wreck visuals — shared for all vehicles
// =============================================================================
let _charMat = null;
export function charVehicle(group) {
  if (!_charMat) {
    _charMat = mat('charred', { texture: 'rust' },
      { color: 0x1c1a18, roughness: 0.95, metalness: 0.3, normalScale: 1.4 });
  }
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.material = _charMat;
    // deform slightly
    o.rotation.z += (Math.random() - 0.5) * 0.14;
    o.rotation.x += (Math.random() - 0.5) * 0.1;
    o.scale.multiplyScalar(0.96 + Math.random() * 0.06);
  });
  group.rotation.z = (Math.random() - 0.5) * 0.16;
}
