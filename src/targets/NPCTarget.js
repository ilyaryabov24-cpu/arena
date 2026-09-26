// ---------------------------------------------------------------------------
// NPCTarget — soldier NPCs with the procedural animator, patrol/alert AI,
// death animation and persistent corpse.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { Target } from './Target.js';
import { buildNPC } from '../assets/builders/NPCBuilder.js';
import { NPCAnimator } from './NPCAnimator.js';
import { clamp } from '../core/Utils.js';

const VARIANTS = ['rifleman', 'officer', 'heavy'];
const CAMOS = ['forest', 'desert', 'urban'];

export class NPCTarget extends Target {
  constructor(position, scene, rng, variantKind = null) {
    super('npc', position, scene);
    this.health = this.maxHealth = 35;
    this.radius = 0.7;
    this.height = 1.8;
    this.explosionScale = 0.45;

    const variant = variantKind ?? VARIANTS[(rng() * VARIANTS.length) | 0];
    const camo = CAMOS[(rng() * CAMOS.length) | 0];
    const built = buildNPC(variant, camo, (rng() * 4) | 0);
    this.group.add(built.group);
    this.rig = built.rig;
    this.animator = new NPCAnimator(this.rig, built.group);
    this.animator.hipsY = this.rig.hips.position.y;

    // AI state
    this.waypoints = [];
    this.waypointI = 0;
    this.moveSpeed = 0;
    this.idleTimer = rng() * 4;
    this.alertLevel = 0;
    this.aim = 0;
    this._corpseFade = 0;
  }

  setPatrol(center, radius, rng) {
    const n = 3 + ((rng() * 3) | 0);
    this.waypoints = [];
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const r = radius * (0.3 + rng() * 0.7);
      this.waypoints.push(new THREE.Vector2(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r));
    }
    this.waypointI = (rng() * n) | 0;
    this.patrolCenter = center;
    this.patrolRadius = radius;
  }

  onHit() {
    this.animator.setState('hit');
  }

  onDamaged() {}

  update(dt, dronePos, terrain, alertness = 0) {
    const anim = this.animator;
    if (this.destroyed) {
      anim.update(dt);
      // corpse slowly sinks after a long while
      this._corpseFade += dt;
      if (this._corpseFade > 25) {
        this.group.position.y = Math.max(this.group.position.y - dt * 0.05, (terrain ? terrain.getHeight(this.group.position.x, this.group.position.z) : 0) - 0.55);
        if (this._corpseFade > 40) this.group.visible = false;
      }
      return;
    }

    const pos = this.group.position;
    const distToDrone = dronePos ? pos.distanceTo(dronePos) : 999;

    // threat response: drone close & low -> alert/aim
    const threatened = dronePos && distToDrone < 140 && dronePos.y - pos.y < 90;
    if (threatened) this.alertLevel = Math.min(1, this.alertLevel + dt * 1.5);
    else this.alertLevel = Math.max(0, this.alertLevel - dt * 0.1);
    this.aim = clamp(this.alertLevel, 0, 1);
    anim.aim = this.aim;

    // waypoint locomotion
    if (this.waypoints.length && this.alertLevel < 0.7) {
      const wp = this.waypoints[this.waypointI];
      const dx = wp.x - pos.x, dz = wp.y - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.2) {
        this.waypointI = (this.waypointI + 1) % this.waypoints.length;
        this.idleTimer = 1 + Math.random() * 3;
      } else if (this.idleTimer > 0) {
        this.idleTimer -= dt;
        this.moveSpeed = 0;
        anim.setState('idle');
      } else {
        const speed = 1.35;
        this.moveSpeed = speed;
        pos.x += (dx / d) * speed * dt;
        pos.z += (dz / d) * speed * dt;
        if (terrain) pos.y = terrain.getHeight(pos.x, pos.z);
        const targetHeading = Math.atan2(dx, dz);
        this._heading = dampAngleTo(this._heading ?? targetHeading, targetHeading, 6, dt);
        this.group.rotation.y = this._heading;
        anim.speed = speed;
        anim.setState('walk');
      }
    } else if (this.alertLevel >= 0.7) {
      // alerted: face the drone, aim
      this.moveSpeed = 0;
      if (dronePos) {
        const targetHeading = Math.atan2(dronePos.x - pos.x, dronePos.z - pos.z);
        this._heading = dampAngleTo(this._heading ?? targetHeading, targetHeading, 8, dt);
        this.group.rotation.y = this._heading;
      }
      anim.setState('alert');
    }

    anim.update(dt);
  }

  onDestroyed() {
    this.animator.setState('dead');
    // ragdoll-ish impulse handled by animator
  }

  onWreck() {
    // resumed mission: soldier already down — play dead pose instantly
    this.animator.setState('dead');
    for (let i = 0; i < 60; i++) this.animator.update(1 / 30);
    this.group.visible = true;
  }
}

const dampAngleTo = (a, b, lambda, dt) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
};
