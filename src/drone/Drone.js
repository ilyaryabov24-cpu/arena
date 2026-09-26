// ---------------------------------------------------------------------------
// Drone — the player: arcade flight physics, model with animated parts,
// collision + destruction flow. Physics params are exposed for tuning.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { buildDrone } from '../assets/builders/DroneBuilder.js';
import { clamp, damp, dampAngle, lerp } from '../core/Utils.js';
import { EV, bus } from '../core/EventBus.js';
import { perf } from '../core/PerformanceManager.js';

export const DRONE_PARAMS = {
  maxSpeed: 78,          // m/s cruise
  boostSpeed: 125,
  minSpeed: 22,
  acceleration: 34,
  deceleration: 26,
  turnSpeed: 1.9,        // rad/s yaw
  pitchSpeed: 1.6,
  rollSpeed: 2.4,
  maxPitch: 1.15,          // ~66 deg — enough for a committed strike dive
  gravity: 9.8,
  drag: 0.06,
  collisionRadius: 1.4,
  bankFactor: 0.9,
};

export class Drone {
  constructor(scene) {
    this.scene = scene;
    this.params = { ...DRONE_PARAMS };
    this.model = buildDrone(true);
    scene.add(this.model);
    this.model.visible = false;

    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.forward = new THREE.Vector3(0, 0, 1);
    this.velocity = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.speed = 0;
    this.targetSpeed = 45;
    this.boosting = false;
    this.alive = false;
    this.propSpin = 0;
    this._visualRoll = 0;
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.effectsEnabled = perf.tier.particles > 0.4;
  }

  spawn(pos, heading, speed = 55) {
    this.position.copy(pos);
    this.yaw = heading;
    this.pitch = 0;
    this.roll = 0;
    this._visualRoll = 0;
    this.speed = speed;
    this.targetSpeed = speed;
    this.alive = true;
    this.model.visible = true;
    this._syncTransform(0);
    bus.emit(EV.DRONE_SPAWNED, { position: pos.clone() });
  }

  destroy() {
    this.alive = false;
    this.model.visible = false;
  }

  update(dt, input, terrain) {
    if (!this.alive) return;
    const p = this.params;
    const a = input.axes;

    // ---- throttle / speed --------------------------------------------------
    this.boosting = input.boost && this.speed > 10;
    const maxSpd = this.boosting ? p.boostSpeed : p.maxSpeed;
    if (a.throttle > 0.05) this.targetSpeed = Math.min(maxSpd, this.targetSpeed + a.throttle * p.acceleration * dt);
    else if (a.throttle < -0.05) this.targetSpeed = Math.max(p.minSpeed, this.targetSpeed + a.throttle * p.deceleration * dt);
    else this.targetSpeed = damp(this.targetSpeed, clamp(this.targetSpeed, p.minSpeed, maxSpd), 1.2, dt);
    this.speed = damp(this.speed, this.targetSpeed, this.boosting ? 1.8 : 1.1, dt);

    // ---- attitude ------------------------------------------------------------
    // a.yawRate / a.pitchRate: accumulated look deltas for this frame.
    // mouse right / stick right -> yaw right; mouse up -> climb (invertable).
    const yawRate = a.yawRate * p.turnSpeed;
    this.yaw -= yawRate * dt;
    const pitchDelta = a.pitchRate * p.pitchSpeed;
    this.pitch = clamp(this.pitch - pitchDelta, -p.maxPitch, p.maxPitch);
    if (Math.abs(a.pitchRate) < 1e-6 && Math.abs(a.roll) < 0.1) {
      this.pitch = damp(this.pitch, 0, 0.1, dt); // gentle self-leveling when hands-off
    }
    // roll: bank into the turn + manual roll axis
    const rollTarget = clamp(-yawRate * 1.6 - a.roll * 0.9, -1.2, 1.2);
    this.roll = damp(this.roll, rollTarget, 3.2, dt);

    // ---- motion ---------------------------------------------------------------
    this._euler.set(-this.pitch, this.yaw, this.roll, 'YXZ');
    this.quaternion.setFromEuler(this._euler);
    this.forward.set(0, 0, 1).applyQuaternion(this.quaternion);
    // gravity / lift: below cruise speed the drone sinks
    const lift = clamp(this.speed / 46, 0, 1);
    const sink = (1 - lift) * p.gravity * 0.85;
    this.velocity.copy(this.forward).multiplyScalar(this.speed);
    this.velocity.y -= sink;
    this.position.addScaledVector(this.velocity, dt);

    // ground effect: cannot go below terrain
    const groundY = terrain ? terrain.getHeight(this.position.x, this.position.z) : 0;
    this._groundY = groundY;

    this._syncTransform(dt);

    // ---- propeller & gimbal ----------------------------------------------------
    this.propSpin += dt * (30 + this.speed * 1.6 + (this.boosting ? 60 : 0));
    const parts = this.model.userData.parts;
    if (parts?.propeller) parts.propeller.rotation.z = this.propSpin;
    if (parts?.gimbal) {
      // gimbal counter-stabilizes: gently level the camera ball
      parts.gimbal.rotation.x = damp(parts.gimbal.rotation.x, -this.pitch * 0.35, 4, dt);
    }
  }

  _syncTransform(dt) {
    // visual roll is slightly exaggerated for feel
    this._visualRoll = damp(this._visualRoll, this.roll * 1.25, 8, dt);
    this._euler.set(-this.pitch, this.yaw, this._visualRoll, 'YXZ');
    this.model.quaternion.setFromEuler(this._euler);
    this.model.position.copy(this.position);
    // subtle airframe bobbing
    const bob = Math.sin(this.propSpin * 0.05) * 0.02;
    this.model.position.y += bob;
  }

  /** Collision sample point (nose). */
  nosePoint(out = new THREE.Vector3()) {
    return out.set(0, 0, 1.1).applyQuaternion(this.quaternion).add(this.position);
  }

  get altitude() {
    return this.position.y - (this._groundY ?? 0);
  }
}
