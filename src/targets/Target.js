// ---------------------------------------------------------------------------
// Target — base class for all destructible game objects.
// id / type / health / destroyed / position per the game design.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { EV, bus } from '../core/EventBus.js';

let NEXT_ID = 1;

export const TargetState = {
  ALIVE: 'alive',
  DAMAGED: 'damaged',
  DESTROYED: 'destroyed',
};

export class Target {
  constructor(type, position, scene) {
    this.id = `T${NEXT_ID++}`;
    this.type = type;             // 'tank' | 'apc' | 'truck' | 'technical' | 'car' | 'fueltruck' | 'npc'
    this.health = 100;
    this.maxHealth = 100;
    this.state = TargetState.ALIVE;
    this.destroyed = false;
    this.position = position.clone();
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);
    this.countsTowardMission = true;
    this.civilian = false;
    this.radius = 2;              // collision radius
    this.height = 2;
    this.explosionScale = 1;
    this.smokeAnchor = null;
    this._deadTimer = 0;
  }

  get aabb() {
    const p = this.group.position;
    return {
      minX: p.x - this.radius, maxX: p.x + this.radius,
      minZ: p.z - this.radius, maxZ: p.z + this.radius,
      minY: p.y, maxY: p.y + this.height,
      target: this,
      isStatic: false,
    };
  }

  /** World position (accounts for group offset). */
  get worldPos() {
    return this.group.position;
  }

  damage(amount, fromExplosion = false) {
    if (this.destroyed) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.destroy(fromExplosion);
    } else if (this.health < this.maxHealth * 0.45) {
      this.state = TargetState.DAMAGED;
      this.onDamaged?.();
    } else {
      this.onHit?.();
    }
  }

  destroy(fromExplosion = false) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.state = TargetState.DESTROYED;
    this.onDestroyed?.(fromExplosion);
    // target's own detonation (chain reactions get their own boom + audio)
    if (this.vfx) {
      const p = this.worldPos.clone();
      p.y += this.height * 0.5;
      this.vfx.spawnExplosion(p, this.explosionScale * (fromExplosion ? 1.0 : 0.75), { ground: true });
    }
    bus.emit(EV.TARGET_DESTROYED, {
      id: this.id,
      uid: this.uid ?? this.id,
      type: this.type,
      counts: this.countsTowardMission && !this.civilian,
      position: this.worldPos.clone(),
      civilian: this.civilian,
      fromExplosion,
    });
  }

  /** Spawn directly as a persistent wreck (resumed mission progress). */
  spawnAsWreck() {
    this.destroyed = true;
    this.state = TargetState.DESTROYED;
    this.onWreck?.();
  }

  update(dt, dronePos) { /* override */ }

  dispose() {
    this.scene.remove(this.group);
  }
}
