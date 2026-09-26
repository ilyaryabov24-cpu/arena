// ---------------------------------------------------------------------------
// DroneCamera — FPV (onboard) and chase camera with smoothing, vibration
// and trauma-based shake. FOV widens with speed & boost.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { clamp, damp, lerp } from '../core/Utils.js';

export class DroneCamera {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'fpv';
    this.shake = 0;         // trauma 0..1
    this.vibration = 0.4;   // constant engine vibration amount
    this.time = 0;
    this._smoothedQuat = new THREE.Quaternion();
    this._tmpQ = new THREE.Quaternion();
    this._tmpE = new THREE.Euler();
    this._tmpV = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
    this.baseFov = 72;
  }

  toggle() {
    this.mode = this.mode === 'fpv' ? 'chase' : 'fpv';
    return this.mode;
  }

  addShake(amount) {
    this.shake = clamp(this.shake + amount, 0, 1);
  }

  update(dt, drone) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 1.4);

    const speedT = clamp((drone.speed - 30) / 80, 0, 1);

    if (this.mode === 'fpv') {
      // onboard camera: at nose, slightly above centerline
      const nose = this._tmpV.set(0, 0.06, 1.05).applyQuaternion(drone.quaternion).add(drone.position);
      this.camera.position.copy(nose);
      // orientation follows drone with slight lag (gimbal feel)
      this._smoothedQuat.slerp(drone.quaternion, 1 - Math.exp(-18 * dt));
      // gimbal counter-tilt: stabilize horizon a bit
      this.camera.quaternion.copy(this._smoothedQuat);
      // vibration + shake
      const vib = this.vibration * (0.35 + speedT * 0.65) * (drone.boosting ? 1.6 : 1);
      this._tmpE.set(
        Math.sin(this.time * 61) * 0.0016 * vib + this._shake('x'),
        Math.sin(this.time * 47 + 1.7) * 0.0018 * vib + this._shake('y'),
        Math.sin(this.time * 53 + 0.6) * 0.0022 * vib + this._shake('r'),
      );
      this._tmpQ.setFromEuler(this._tmpE);
      this.camera.quaternion.multiply(this._tmpQ);
      // FOV: speed feel
      const targetFov = this.baseFov + speedT * 9 + (drone.boosting ? 7 : 0);
      this.camera.fov = damp(this.camera.fov, targetFov, 4, dt);
      this.camera.updateProjectionMatrix();
    } else {
      // chase camera
      const back = this._tmpV.set(0, 2.2, -8.5).applyQuaternion(drone.quaternion).add(drone.position);
      // keep above terrain
      this.camera.position.lerp(back, 1 - Math.exp(-6 * dt));
      this._lookTarget.copy(drone.position).addScaledVector(drone.forward, 6);
      this.camera.lookAt(this._lookTarget);
      this._tmpE.set(this._shake('x') * 0.5, this._shake('y') * 0.5, 0);
      this.camera.rotateX(this._tmpE.x);
      this.camera.rotateY(this._tmpE.y);
      const targetFov = this.baseFov - 6 + speedT * 6;
      this.camera.fov = damp(this.camera.fov, targetFov, 4, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  _shake(kind) {
    if (this.shake <= 0.001) return 0;
    const s = this.shake * this.shake;
    const t = this.time * 30;
    if (kind === 'x') return Math.sin(t * 1.1) * 0.05 * s;
    if (kind === 'y') return Math.sin(t * 1.7 + 2) * 0.05 * s;
    return Math.sin(t * 1.3 + 4) * 0.06 * s;
  }

  /** Fixed camera for the death sequence: orbit slowly around a point. */
  updateDeathOrbit(dt, point) {
    this.time += dt;
    const r = 26;
    const a = this.time * 0.12 + 1.2;
    this.camera.position.set(
      point.x + Math.cos(a) * r,
      point.y + 9,
      point.z + Math.sin(a) * r
    );
    this.camera.lookAt(point.x, point.y + 2, point.z);
  }
}
