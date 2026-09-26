// ---------------------------------------------------------------------------
// TargetManager — owns all targets, runs their updates + collision grid
// entries, answers proximity queries (HUD markers, splash damage).
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { VehicleTarget } from './VehicleTarget.js';
import { NPCTarget } from './NPCTarget.js';
import { EV, bus } from '../core/EventBus.js';
import { perf } from '../core/PerformanceManager.js';

export class TargetManager {
  constructor(scene, map, vfx) {
    this.scene = scene;
    this.map = map;
    this.vfx = vfx;
    this.targets = new Map();
    this.grid = map.colliders;
    this.civilians = [];
  }

  addVehicle(type, pos, rng, opts = {}) {
    const t = new VehicleTarget(type, pos, this.scene, rng);
    t.vfx = this.vfx;
    if (opts.route) t.setRoute(opts.route, opts.t0 ?? 0, opts.speed ?? 0);
    if (opts.civilian) { t.civilian = true; t.countsTowardMission = false; }
    if (opts.heading != null) t.heading = opts.heading;
    this.targets.set(t.id, t);
    if (!t.route || t.speed < 0.01) {
      this.grid.insertDynamic(t.id, t.aabb);
    }
    return t;
  }

  addNPC(pos, rng, opts = {}) {
    const t = new NPCTarget(pos, this.scene, rng, opts.variant);
    t.vfx = this.vfx;
    if (opts.patrol) t.setPatrol(opts.patrol, opts.radius ?? 40, rng);
    this.targets.set(t.id, t);
    this.grid.insertDynamic(t.id, t.aabb);
    return t;
  }

  remove(id) {
    const t = this.targets.get(id);
    if (!t) return;
    this.grid.removeDynamic(id);
    t.dispose();
    this.targets.delete(id);
  }

  get list() { return [...this.targets.values()]; }

  aliveTargets() { return this.list.filter(t => !t.destroyed); }

  countBy(predicate) {
    let n = 0;
    for (const t of this.targets.values()) if (predicate(t)) n++;
    return n;
  }

  /** Nearest N alive, mission-relevant targets to a position. */
  nearest(pos, n = 5, filter = null) {
    const arr = [];
    for (const t of this.targets.values()) {
      if (t.destroyed) continue;
      if (t.civilian) continue;
      if (filter && !filter(t)) continue;
      const d = t.worldPos.distanceTo(pos);
      arr.push({ t, d });
    }
    arr.sort((a, b) => a.d - b.d);
    return arr.slice(0, n);
  }

  update(dt, dronePos) {
    for (const t of this.targets.values()) {
      if (t.route && t.speed > 0.01 && !t.destroyed) {
        t.update(dt, dronePos, this.map.terrain);
        this.grid.updateDynamic(t.id, t.aabb);
      } else if (t.type === 'npc') {
        // NPC animation LOD: full rate near, chunked updates far away
        const d = dronePos ? t.worldPos.distanceTo(dronePos) : 999;
        if (d < 250) {
          t.update(dt, dronePos, this.map.terrain);
        } else {
          t._farAcc = (t._farAcc || 0) + dt;
          if (t._farAcc > 0.12) {
            t.update(t._farAcc, null, this.map.terrain);
            t._farAcc = 0;
          }
        }
      } else {
        t.update(dt, dronePos, this.map.terrain);
      }
    }
  }

  /**
   * Drone collision test. Returns the target hit (if any).
   * @param {THREE.Vector3} pos drone position, radius collision radius
   */
  checkDroneHit(pos, radius) {
    const boxes = this.grid.query(pos.x, pos.z, radius + 4);
    for (const box of boxes) {
      if (!box.target || box.target.destroyed) continue;
      if (pos.y < box.minY - 1 || pos.y > box.maxY + 1.2) continue;
      // sphere vs AABB
      const cx = Math.max(box.minX, Math.min(pos.x, box.maxX));
      const cz = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
      const dx = pos.x - cx, dz = pos.z - cz;
      const dy = Math.max(0, box.minY - pos.y, pos.y - box.maxY);
      if (dx * dx + dz * dz + dy * dy < radius * radius) {
        return box.target;
      }
    }
    return null;
  }

  /** Explosion splash: damage nearby targets (chain reactions). */
  splashDamage(pos, radius, damage, excludeId) {
    for (const t of this.targets.values()) {
      if (t.destroyed || t.id === excludeId) continue;
      const d = t.worldPos.distanceTo(pos);
      if (d < radius) {
        const falloff = 1 - d / radius;
        t.damage(damage * falloff, true);
      }
    }
  }

  dispose() {
    for (const t of this.targets.values()) {
      this.grid.removeDynamic(t.id);
      t.dispose();
    }
    this.targets.clear();
  }
}
