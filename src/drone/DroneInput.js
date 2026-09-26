// ---------------------------------------------------------------------------
// DroneInput — unified input for keyboard+mouse and touch.
// Exposes axes: throttle, yaw, pitch, roll, boost.
// Mobile virtual sticks (MobileControls) write directly into this state.
// ---------------------------------------------------------------------------

import { clamp } from '../core/Utils.js';

export class DroneInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.axes = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
    this.boost = false;
    this.keys = {};
    this.mouse = { dx: 0, dy: 0 };
    this.touch = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, boost: false };
    this.sensitivity = 1.0;
    this.invertY = false;
    this.enabled = false;
    this.onPauseRequested = null; // callback
    this.onCameraToggle = null;

    this._bind();
  }

  _bind() {
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'Escape') {
        this.onPauseRequested?.();
      }
      if (e.code === 'KeyC') this.onCameraToggle?.();
      if (e.code === 'Space') e.preventDefault();
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    this._onMouseMove = (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    };
    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  requestPointerLock() {
    if (!this.pointerLocked && !this.isTouch) {
      this.canvas.requestPointerLock?.();
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  get isTouch() {
    return this._touchActive === true || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
  }

  setTouchActive(v) { this._touchActive = v; }

  /** Called by the game loop; consumes accumulated mouse delta. */
  sample(dt) {
    const k = this.keys;
    const a = this.axes;
    // keyboard axes
    a.throttle = (k['KeyW'] ? 1 : 0) + (k['KeyS'] ? -1 : 0) + this.touch.leftY;
    a.roll = (k['KeyD'] ? 1 : 0) + (k['KeyA'] ? -1 : 0) + this.touch.leftX;
    a.throttle = clamp(a.throttle, -1, 1);
    a.roll = clamp(a.roll, -1, 1);

    // mouse look OR right touch stick
    const mouseScale = 0.0022 * this.sensitivity;
    let yawIn = this.mouse.dx * mouseScale;
    let pitchIn = this.mouse.dy * mouseScale * (this.invertY ? -1 : 1);
    yawIn += this.touch.rightX * 2.4 * dt;
    pitchIn += this.touch.rightY * 2.2 * dt * (this.invertY ? -1 : 1);
    a.yaw = clamp(yawIn / Math.max(dt, 1e-3) / 3.2, -1, 1); // normalized rate
    a.pitch = clamp(pitchIn / Math.max(dt, 1e-3) / 3.2, -1, 1);
    // store raw rates for direct use
    a.yawRate = yawIn;
    a.pitchRate = pitchIn;

    this.boost = !!k['Space'] || this.touch.boost;
    // consume mouse
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return a;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}
