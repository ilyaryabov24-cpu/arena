// ---------------------------------------------------------------------------
// NPCBuilder — rigged soldier NPCs (3 variants) for procedural animation.
// The rig is a hierarchy of named groups; NPCAnimator drives rotations.
// Height ~1.8m.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mat, variant, CAMO } from '../MaterialLibrary.js';

const SKIN_TONES = [0xc9a180, 0xb08a62, 0x8f6a48, 0xd9b394];

function materials(camo) {
  return {
    uniform: mat(`npc_uniform_${camo}`, { texture: 'camo', params: CAMO[camo] }, { roughness: 0.9, metalness: 0.05, normalScale: 0.7 }),
    vest: mat(`npc_vest_${camo}`, { texture: 'camo', params: CAMO[camo] },
      { color: 0x6b6f5a, roughness: 0.95, metalness: 0.05, normalScale: 0.7 }),
    helmet: mat(`npc_helmet_${camo}`, { texture: 'camo', params: CAMO[camo] },
      { color: 0x5a6248, roughness: 0.8, metalness: 0.1 }),
    skin: mat('npc_skin', { texture: 'plaster', params: { color: [225, 225, 225] } },
      { roughness: 0.75, metalness: 0 }),
    boots: mat('npc_boots', { texture: 'metalPanel', params: { color: [40, 38, 36] } },
      { roughness: 0.85, metalness: 0.05, normalScale: 0.5 }),
    gear: mat('npc_gear', { texture: 'metalPanel', params: { color: [70, 72, 60] } },
      { roughness: 0.85, metalness: 0.15, normalScale: 0.5 }),
    gun: mat('npc_gun', { texture: 'metalPanel', params: { color: [36, 38, 40] } },
      { roughness: 0.6, metalness: 0.5, normalScale: 0.5 }),
  };
}

const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cylZ = (r1, r2, len, m, seg = 7) => {
  // cylinder aligned along Y by default; we rotate limbs in the rig
  const g = new THREE.CylinderGeometry(r1, r2, len, seg);
  g.translate(0, -len / 2, 0); // pivot at top
  return new THREE.Mesh(g, m);
};

/**
 * Build a soldier.
 * variants: 'rifleman' | 'officer' | 'heavy'
 * camo: 'forest' | 'desert' | 'urban'
 * Returns { group, rig } — rig bones are Groups with .rotation driven by the animator.
 */
export function buildNPC(variantKind = 'rifleman', camo = 'forest', skinTone = 0) {
  const M = materials(camo);
  const skin = variant(M.skin, 0xffffff, {});
  skin.color = new THREE.Color(SKIN_TONES[skinTone % SKIN_TONES.length]);

  const scale = variantKind === 'heavy' ? 1.06 : (variantKind === 'officer' ? 0.98 : 1.0);
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  // ---- rig hierarchy ---------------------------------------------------------
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const spine = new THREE.Group();
  spine.position.y = 0.12;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.position.y = 0.28;
  spine.add(chest);

  const neck = new THREE.Group();
  neck.position.y = 0.22;
  chest.add(neck);

  const shoulderL = new THREE.Group(); shoulderL.position.set(0.24, 0.14, 0);
  const shoulderR = new THREE.Group(); shoulderR.position.set(-0.24, 0.14, 0);
  chest.add(shoulderL, shoulderR);

  const elbowL = new THREE.Group(); elbowL.position.y = -0.30;
  const elbowR = new THREE.Group(); elbowR.position.y = -0.30;
  shoulderL.add(elbowL); shoulderR.add(elbowR);

  const thighL = new THREE.Group(); thighL.position.set(0.115, -0.06, 0);
  const thighR = new THREE.Group(); thighR.position.set(-0.115, -0.06, 0);
  hips.add(thighL, thighR);

  const kneeL = new THREE.Group(); kneeL.position.y = -0.44;
  const kneeR = new THREE.Group(); kneeR.position.y = -0.44;
  thighL.add(kneeL); thighR.add(kneeR);

  // ---- meshes ----------------------------------------------------------------
  const addMesh = (bone, mesh) => { mesh.castShadow = true; bone.add(mesh); return mesh; };

  // pelvis
  addMesh(hips, box(0.30, 0.16, 0.20, M.uniform));
  // torso
  const torso = addMesh(spine, box(0.34, 0.34, 0.22, M.uniform));
  torso.position.y = 0.16;
  const chestBox = addMesh(chest, box(0.38, 0.30, 0.24, M.uniform));
  chestBox.position.y = 0.06;
  // vest
  const vest = addMesh(chest, box(0.40, 0.34, 0.28, M.vest));
  vest.position.y = 0.05;
  // pouches
  for (let i = 0; i < 3; i++) {
    const p = addMesh(chest, box(0.09, 0.10, 0.05, M.gear));
    p.position.set(-0.11 + i * 0.11, -0.06, 0.15);
  }
  // belt
  const belt = addMesh(hips, box(0.33, 0.05, 0.23, M.gear));
  belt.position.y = 0.06;

  // backpack (rifleman & heavy)
  if (variantKind !== 'officer') {
    const pack = addMesh(chest, box(0.30, 0.36, 0.14, M.gear));
    pack.position.set(0, 0.05, -0.20);
    if (variantKind === 'heavy') {
      const pack2 = addMesh(chest, box(0.24, 0.16, 0.10, M.gear));
      pack2.position.set(0, 0.24, -0.22);
      // radio antenna
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.010, 0.7, 4), M.gun);
      ant.position.set(0.1, 0.55, -0.2);
      chest.add(ant);
    }
  }

  // head + helmet/cap
  const head = addMesh(neck, new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 9), skin));
  head.position.y = 0.10;
  if (variantKind === 'officer') {
    const cap = addMesh(neck, new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), M.gear));
    cap.position.y = 0.13;
    const brim = addMesh(neck, box(0.16, 0.015, 0.12, M.gear));
    brim.position.set(0, 0.125, 0.10);
  } else {
    const helmet = addMesh(neck, new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M.helmet));
    helmet.position.y = 0.115;
    // chin strap hint via small boxes
    const strap = addMesh(neck, box(0.02, 0.10, 0.02, M.gear));
    strap.position.set(0.09, 0.04, 0.06);
  }

  // arms
  const upperArmGeo = () => cylZ(0.052, 0.045, 0.30, M.uniform);
  const foreArmGeo = (m) => cylZ(0.045, 0.038, 0.28, m);
  addMesh(shoulderL, upperArmGeo());
  addMesh(shoulderR, upperArmGeo());
  addMesh(elbowL, foreArmGeo(skin));
  addMesh(elbowR, foreArmGeo(skin));
  const handL = addMesh(elbowL, box(0.06, 0.08, 0.05, skin));
  handL.position.y = -0.30;
  const handR = addMesh(elbowR, box(0.06, 0.08, 0.05, skin));
  handR.position.y = -0.30;

  // legs
  addMesh(thighL, cylZ(0.075, 0.062, 0.44, M.uniform));
  addMesh(thighR, cylZ(0.075, 0.062, 0.44, M.uniform));
  addMesh(kneeL, cylZ(0.06, 0.05, 0.42, M.uniform));
  addMesh(kneeR, cylZ(0.06, 0.05, 0.42, M.uniform));
  const bootL = addMesh(kneeL, box(0.10, 0.09, 0.24, M.boots));
  bootL.position.set(0, -0.42, 0.05);
  const bootR = addMesh(kneeR, box(0.10, 0.09, 0.24, M.boots));
  bootR.position.set(0, -0.42, 0.05);

  // ---- weapons ---------------------------------------------------------------
  const gunGroup = new THREE.Group();
  if (variantKind === 'heavy') {
    // light MG
    const receiver = box(0.07, 0.10, 0.5, M.gun);
    receiver.position.set(0, -0.02, 0.18);
    const barrel = cylZ(0.018, 0.02, 0.5, M.gun);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.0, 0.55);
    const mag = box(0.05, 0.16, 0.07, M.gun);
    mag.position.set(0, -0.12, 0.1);
    const stock = box(0.05, 0.09, 0.2, M.gun);
    stock.position.set(0, -0.02, -0.15);
    const bipodL = cylZ(0.008, 0.008, 0.3, M.gun); bipodL.rotation.z = 0.4; bipodL.position.set(0.05, -0.06, 0.45);
    const bipodR = cylZ(0.008, 0.008, 0.3, M.gun); bipodR.rotation.z = -0.4; bipodR.position.set(-0.05, -0.06, 0.45);
    gunGroup.add(receiver, barrel, mag, stock, bipodL, bipodR);
  } else if (variantKind === 'officer') {
    // pistol
    const p = box(0.035, 0.07, 0.16, M.gun);
    p.position.set(0, -0.01, 0.08);
    const grip = box(0.035, 0.10, 0.05, M.gun);
    grip.position.set(0, -0.07, 0.02);
    gunGroup.add(p, grip);
  } else {
    // rifle
    const receiver = box(0.055, 0.09, 0.34, M.gun);
    receiver.position.set(0, -0.01, 0.12);
    const barrel = cylZ(0.012, 0.014, 0.34, M.gun);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, 0.42);
    const mag = box(0.04, 0.13, 0.06, M.gun);
    mag.position.set(0, -0.10, 0.06);
    const stock = box(0.045, 0.08, 0.22, M.gun);
    stock.position.set(0, -0.02, -0.14);
    const scope = cylZ(0.018, 0.018, 0.12, M.gun);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.06, 0.15);
    gunGroup.add(receiver, barrel, mag, stock, scope);
  }
  // hold gun with right hand
  handR.add(gunGroup);
  gunGroup.position.set(0, -0.02, 0.02);

  const rig = { hips, spine, chest, neck, shoulderL, shoulderR, elbowL, elbowR, thighL, thighR, kneeL, kneeR };
  root.userData.rig = rig;
  root.userData.variant = variantKind;

  return { group: root, rig };
}
