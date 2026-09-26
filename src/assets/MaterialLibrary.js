// ---------------------------------------------------------------------------
// MaterialLibrary — PBR materials built from the texture pipeline.
// Materials are cached; use `variant()` for cheap tinted clones that share
// the same textures.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { getTextureSet } from './TextureFactory.js';

const cache = new Map();

/**
 * Create or fetch a cached MeshStandardMaterial.
 * @param {string} key unique material key
 * @param {object} tex texture set params { texture, params }
 * @param {object} props material props
 */
export function mat(key, tex, props = {}) {
  if (cache.has(key)) return cache.get(key);
  const set = getTextureSet(tex.texture, tex.params || {});
  const m = new THREE.MeshStandardMaterial({
    map: set.map || null,
    normalMap: set.normalMap || null,
    roughnessMap: set.roughnessMap || null,
    metalness: props.metalness ?? 0.1,
    roughness: props.roughness ?? 1.0,
    color: props.color ?? 0xffffff,
    normalScale: new THREE.Vector2(props.normalScale ?? 1, props.normalScale ?? 1),
    envMapIntensity: props.envMapIntensity ?? 1.0,
    side: props.side ?? THREE.FrontSide,
    transparent: props.transparent ?? false,
    alphaTest: props.alphaTest ?? 0,
    emissive: props.emissive ?? 0x000000,
    emissiveIntensity: props.emissiveIntensity ?? 1,
    ...(props.emissiveMap ? { emissiveMap: props.emissiveMap } : {}),
    ...(props.flatShading ? { flatShading: true } : {}),
  });
  cache.set(key, m);
  return m;
}

/** Tinted clone sharing textures — for color variants (cars, plaster...). */
export function variant(baseMat, color, extra = {}) {
  const m = baseMat.clone();
  m.color = new THREE.Color(color);
  Object.assign(m, extra);
  return m;
}

// ---- frequently used material getters ---------------------------------------

export const mats = {
  // nature
  grassGround: () => mat('ground_grass', { texture: 'grass' }, { roughness: 1, metalness: 0 }),
  dirtGround: () => mat('ground_dirt', { texture: 'dirt' }, { roughness: 1, metalness: 0 }),
  bark: () => mat('bark', { texture: 'bark' }, { roughness: 1, metalness: 0, normalScale: 1.6 }),
  foliage: () => mat('foliage', { texture: 'foliage' }, { roughness: 0.95, metalness: 0, normalScale: 1.2, flatShading: false }),

  // ground / roads
  asphalt: () => mat('asphalt', { texture: 'asphalt' }, { roughness: 0.95, metalness: 0.02 }),
  road: () => mat('road', { texture: 'road' }, { roughness: 0.92, metalness: 0.02 }),
  dirtRoad: () => mat('dirtRoad', { texture: 'dirtRoad' }, { roughness: 1, metalness: 0 }),
  concrete: () => mat('concrete', { texture: 'concrete' }, { roughness: 0.9, metalness: 0.02 }),

  // buildings
  brick: (c = [148, 74, 58]) => mat(`brick_${c.join('_')}`, { texture: 'brick', params: { brick: c } }, { roughness: 0.95 }),
  plaster: (c = [196, 186, 168]) => mat(`plaster_${c.join('_')}`, { texture: 'plaster', params: { color: c } }, { roughness: 0.95 }),
  siding: (c = [168, 150, 118]) => mat(`siding_${c.join('_')}`, { texture: 'siding', params: { color: c } }, { roughness: 0.9 }),
  roofTiles: (c = [148, 74, 54]) => mat(`roofTiles_${c.join('_')}`, { texture: 'roofTiles', params: { color: c } }, { roughness: 0.95, normalScale: 1.5 }),
  metalPanel: (c = [126, 132, 138]) => mat(`metalPanel_${c.join('_')}`, { texture: 'metalPanel', params: { color: c } }, { roughness: 0.75, metalness: 0.35, normalScale: 1.1 }),
  corrugated: (c = [150, 74, 58]) => mat(`corrugated_${c.join('_')}`, { texture: 'corrugated', params: { color: c } }, { roughness: 0.7, metalness: 0.3, normalScale: 1.3 }),
  rust: () => mat('rust', { texture: 'rust' }, { roughness: 0.9, metalness: 0.25, normalScale: 1.2 }),
  wood: () => mat('wood', { texture: 'wood' }, { roughness: 0.95, metalness: 0 }),
  window: (lit = false) => mat(`window_${lit}`, { texture: 'window', params: { lit } },
    lit
      ? { roughness: 0.6, metalness: 0, emissive: 0xffc873, emissiveIntensity: 0.9 }
      : { roughness: 0.35, metalness: 0.15 }),
  concreteWall: () => mat('concreteWall', { texture: 'concreteWall' }, { roughness: 0.92, metalness: 0.02 }),
  sandbags: () => mat('sandbags', { texture: 'sandbags' }, { roughness: 1, metalness: 0, normalScale: 1.4 }),
  tarp: () => mat('tarp', { texture: 'tarp' }, { roughness: 0.95, metalness: 0 }),
  hay: () => mat('hay', { texture: 'hay' }, { roughness: 1, metalness: 0 }),
  containerDoor: (c = [150, 74, 58]) => mat(`containerDoor_${c.join('_')}`, { texture: 'containerDoor', params: { color: c } }, { roughness: 0.7, metalness: 0.3, normalScale: 1.2 }),
  glass: () => mat('glass', { texture: 'glass' }, { roughness: 0.18, metalness: 0.4 }),

  // vehicles / military
  camo: (name, cols) => mat(`camo_${name}`, { texture: 'camo', params: cols }, { roughness: 0.85, metalness: 0.15, normalScale: 0.9 }),
  tankTrack: () => mat('tankTrack', { texture: 'tankTrack' }, { roughness: 0.95, metalness: 0.2, normalScale: 1.3 }),
  tireSide: () => mat('tireSide', { texture: 'tireSide' }, { roughness: 0.95, metalness: 0 }),
  wheelRim: () => mat('wheelRim', { texture: 'wheelRim' }, { roughness: 0.55, metalness: 0.7 }),
  droneSkin: () => mat('droneSkin', { texture: 'droneSkin' }, { roughness: 0.72, metalness: 0.3, normalScale: 1.0 }),
  carPaint: (color) => mat(`carPaint_${color}`, { texture: 'metalPanel', params: { color: [225, 225, 225] } },
    { color, roughness: 0.35, metalness: 0.55, normalScale: 0.6 }),

  // fx-facing
  smokeSprite: () => null, // handled by VFX
};

// Camo palettes used by drone + vehicles
export const CAMO = {
  forest: { base: [74, 86, 58], c2: [50, 60, 40], c3: [94, 106, 70], c4: [38, 44, 32] },
  desert: { base: [176, 154, 106], c2: [140, 120, 82], c3: [200, 178, 132], c4: [110, 96, 72] },
  urban: { base: [104, 108, 104], c2: [76, 80, 78], c3: [126, 130, 126], c4: [58, 62, 60] },
};

export function disposeMaterials() {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}
