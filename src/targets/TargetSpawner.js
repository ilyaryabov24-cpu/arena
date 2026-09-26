// ---------------------------------------------------------------------------
// TargetSpawner — spawns mission targets from the map definition using a
// deterministic seed (persisted in the save) so destroyed targets stay
// destroyed across respawns and page reloads.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { makeRNG, hashSeed, TAU } from '../core/Utils.js';

export class TargetSpawner {
  constructor(manager, map) {
    this.manager = manager;
    this.map = map;
    this.spawnedIds = []; // ordered deterministic ids
  }

  /**
   * @param {object} mission active mission def
   * @param {number} seed deterministic seed (saved)
   * @param {Set<string>} destroyedIds previously destroyed target ids
   */
  spawnAll(mission, seed, destroyedIds) {
    const rng = makeRNG(seed);
    const def = this.map.def;
    let idx = 0;

    for (const tdef of def.targets || []) {
      switch (tdef.kind) {
        case 'cluster': idx = this._spawnCluster(tdef, rng, idx, destroyedIds); break;
        case 'convoy': idx = this._spawnConvoy(tdef, rng, idx, destroyedIds); break;
        case 'traffic': idx = this._spawnTraffic(tdef, rng, idx, destroyedIds); break;
        case 'npcPatrol': idx = this._spawnNPCs(tdef, rng, idx, destroyedIds); break;
        default: break;
      }
    }
    return this.spawnedIds;
  }

  _make(pos, factory, destroyedIds, idx) {
    const t = factory();
    const uid = `${this.map.def.id}:${idx}`;
    t.uid = uid;
    this.spawnedIds.push(uid);
    if (destroyedIds.has(uid)) {
      t.spawnAsWreck();
    }
    return t;
  }

  _spawnCluster(tdef, rng, idx, destroyedIds) {
    const [cx, cz] = tdef.at;
    const placed = [];
    for (let i = 0; i < tdef.count; i++) {
      const type = tdef.types[i % tdef.types.length];
      let x, z, tries = 0;
      do {
        const a = rng() * TAU;
        const r = Math.sqrt(rng()) * tdef.r;
        x = cx + Math.cos(a) * r;
        z = cz + Math.sin(a) * r;
      } while (tries++ < 12 && placed.some(p => Math.hypot(p.x - x, p.z - z) < 9));
      placed.push({ x, z });
      const heading = rng() * TAU;
      this._make(null, () => this.manager.addVehicle(type,
        new THREE.Vector3(x, this.map.terrain.getHeight(x, z), z), rng, { heading }),
        destroyedIds, idx++);
    }
    return idx;
  }

  _spawnConvoy(tdef, rng, idx, destroyedIds) {
    const road = this.map.roads.polylines[tdef.road];
    if (!road) return idx;
    const pts = road.pts.map(p => new THREE.Vector3(p.x, 0, p.y));
    for (let i = 0; i < tdef.count; i++) {
      const type = tdef.types[i % tdef.types.length];
      const t0 = (tdef.t0 ?? 0.1) + i * (tdef.spacing ?? 32) / this._roadLength(road);
      const target = this._make(null, () => this.manager.addVehicle(type,
        new THREE.Vector3(0, 0, 0), rng, {
          route: pts,
          t0: t0 % 1,
          speed: tdef.speed ?? 9,
        }), destroyedIds, idx++);
      if (target.destroyed) target.speed = 0;
    }
    return idx;
  }

  _spawnTraffic(tdef, rng, idx, destroyedIds) {
    const road = this.map.roads.polylines[tdef.road];
    if (!road) return idx;
    const pts = road.pts.map(p => new THREE.Vector3(p.x, 0, p.y));
    for (let i = 0; i < tdef.count; i++) {
      const colorIdx = (rng() * 7) | 0;
      this._make(null, () => this.manager.addVehicle('car',
        new THREE.Vector3(0, 0, 0), () => colorIdx / 7 + rng() * 0.01, {
          route: pts,
          t0: rng(),
          speed: (tdef.speed ?? 11) * (0.9 + rng() * 0.2),
          civilian: true,
        }), destroyedIds, idx++);
    }
    return idx;
  }

  _spawnNPCs(tdef, rng, idx, destroyedIds) {
    const [cx, cz] = tdef.at;
    const y = this.map.terrain.getHeight(cx, cz);
    const center = new THREE.Vector2(cx, cz);
    for (let i = 0; i < tdef.count; i++) {
      const a = rng() * TAU;
      const r = rng() * tdef.r * 0.7;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      this._make(null, () => this.manager.addNPC(
        new THREE.Vector3(x, this.map.terrain.getHeight(x, z), z), rng,
        { patrol: center, radius: tdef.r }), destroyedIds, idx++);
    }
    return idx;
  }

  _roadLength(road) {
    let total = 0;
    for (let i = 1; i < road.pts.length; i++) {
      total += Math.hypot(road.pts[i].x - road.pts[i - 1].x, road.pts[i].y - road.pts[i - 1].y);
    }
    return total;
  }
}
