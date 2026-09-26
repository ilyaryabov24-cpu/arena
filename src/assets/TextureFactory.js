// ---------------------------------------------------------------------------
// TextureFactory — the core of the procedural asset pipeline.
//
// Textures are generated once (seeded, deterministic), cached per key+params,
// and served as PBR sets: { map, normalMap, roughnessMap }.
// Resolution scales with the active quality tier (PerformanceManager).
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { makeRNG, hashSeed } from '../core/Utils.js';
import { heightToNormal } from './CanvasKit.js';
import { groundRecipes } from './textures/recipesGround.js';
import { structureRecipes } from './textures/recipesStructures.js';
import { fxRecipes } from './textures/recipesFX.js';

const RECIPES = { ...groundRecipes, ...structureRecipes, ...fxRecipes };

// key -> [heroScale] (multiplier of base resolution)
const HERO = new Set(['camo', 'droneSkin', 'road']);
const SMALL = new Set(['roundel', 'stencil', 'spark', 'ring', 'flash', 'tireSide', 'wheelRim', 'grassCard', 'leafCard']);

const cache = new Map();

let sizeProfile = { hero: 1024, std: 512, small: 256 };

/** Configure resolution profile from quality tier. */
export function setTextureProfile(tierId) {
  if (tierId === 'high') sizeProfile = { hero: 1024, std: 512, small: 256 };
  else if (tierId === 'medium') sizeProfile = { hero: 512, std: 512, small: 256 };
  else sizeProfile = { hero: 256, std: 256, small: 128 };
  // clear cache so textures regenerate at the new size
  for (const set of cache.values()) disposeSet(set);
  cache.clear();
}

function disposeSet(set) {
  for (const k of ['map', 'normalMap', 'roughnessMap']) {
    if (set[k]) set[k].dispose();
  }
}

function sizeFor(key) {
  if (HERO.has(key)) return sizeProfile.hero;
  if (SMALL.has(key)) return sizeProfile.small;
  return sizeProfile.std;
}

/**
 * Build (or fetch cached) a texture set.
 * @param {string} key recipe name
 * @param {object} params recipe params (color variants etc.)
 */
export function getTextureSet(key, params = {}) {
  const pk = params && Object.keys(params).length ? JSON.stringify(params) : '';
  const ck = `${key}|${pk}`;
  if (cache.has(ck)) return cache.get(ck);

  const recipe = RECIPES[key];
  if (!recipe) throw new Error(`[TextureFactory] unknown texture "${key}"`);

  const size = sizeFor(key);
  const rng = makeRNG(hashSeed(ck));
  const res = recipe(size, rng, params);

  const set = {};
  if (res.color) {
    set.map = new THREE.CanvasTexture(res.color);
    set.map.wrapS = set.map.wrapT = THREE.RepeatWrapping;
    set.map.colorSpace = THREE.SRGBColorSpace;
    set.map.anisotropy = 4;
  }
  if (res.height) {
    const nrm = heightToNormal(res.height, res.normalStrength ?? 1.4, size);
    set.normalMap = new THREE.CanvasTexture(nrm);
    set.normalMap.wrapS = set.normalMap.wrapT = THREE.RepeatWrapping;
  }
  if (res.rough) {
    set.roughnessMap = new THREE.CanvasTexture(res.rough);
    set.roughnessMap.wrapS = set.roughnessMap.wrapT = THREE.RepeatWrapping;
  }
  set._colorCanvas = res.color; // raw canvas (for minimap previews)
  cache.set(ck, set);
  return set;
}

/** Alpha sprite textures (FX). Returns a THREE.Texture. */
export function getSpriteTexture(key) {
  const set = getTextureSet(key);
  return set.map;
}

/** List of textures used by the game — warmed up during loading. */
export function warmupList() {
  return [
    'grass', 'dirt', 'field', 'crop', 'wheat', 'bark', 'foliage',
    'asphalt', 'road', 'dirtRoad', 'concrete', 'concreteWall',
    'brick', 'plaster', 'siding', 'roofTiles', 'metalPanel', 'rust',
    'corrugated', 'wood', 'window', 'tarp', 'hay', 'sandbags', 'containerDoor',
    'camo', 'tankTrack', 'tireSide', 'wheelRim', 'droneSkin', 'glass',
    'smoke', 'fire', 'spark', 'flash', 'ring', 'cloud', 'scorch',
    'grassCard', 'leafCard', 'roundel', 'stencil', 'warningStripes',
  ];
}

/** Pre-generate textures, yielding between items so the loader can paint. */
export async function warmup(onProgress) {
  const list = warmupList();
  let done = 0;
  for (const key of list) {
    // skip duplicates of parameterized families handled by materials on demand
    getTextureSet(key);
    done++;
    if (onProgress) onProgress(done / list.length);
    await new Promise(r => setTimeout(r, 0));
  }
}

export const textureCacheStats = () => ({ count: cache.size });
