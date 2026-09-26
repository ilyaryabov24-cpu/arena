// ---------------------------------------------------------------------------
// NPCAnimator — procedural animation state machine for soldier NPCs.
// States: idle | walk | run | alert | hit | dead
// Each state computes target joint angles procedurally; joints are damped
// toward targets every frame, which gives free, smooth blending between states.
// ---------------------------------------------------------------------------

import { clamp } from '../core/Utils.js';

const BONES = ['hips', 'spine', 'chest', 'neck', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'thighL', 'thighR', 'kneeL', 'kneeR'];

function zeroPose() {
  const p = {};
  for (const b of BONES) p[b] = { x: 0, y: 0, z: 0 };
  p.rootY = 0; // hips height offset
  p.rootPitch = 0; // whole-body pitch (death fall)
  p.rootRoll = 0;
  return p;
}

export class NPCAnimator {
  constructor(rig, root) {
    this.rig = rig;
    this.root = root;
    this.state = 'idle';
    this.time = Math.random() * 10;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 0;          // actual locomotion speed (m/s)
    this._current = zeroPose();
    this._target = zeroPose();
    this.hitTimer = 0;
    this.deathTimer = 0;
    this.deathDir = 1;
    this.dead = false;
    this.aim = 0;            // aim pose amount (raise weapon)
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    if (s === 'hit') this.hitTimer = 0.45;
    if (s === 'dead') {
      this.dead = true;
      this.deathTimer = 0;
      this.deathDir = Math.random() < 0.5 ? 1 : -1;
    }
  }

  update(dt) {
    this.time += dt;
    const t = this._target;

    // reset target
    for (const b of BONES) { t[b].x = 0; t[b].y = 0; t[b].z = 0; }
    t.rootY = 0; t.rootPitch = 0; t.rootRoll = 0;

    if (this.dead) {
      this.updateDeath(dt, t);
    } else {
      switch (this.state) {
        case 'walk': this.locomotion(dt, t, 1.0, 1.55, 4.2); break;
        case 'run': this.locomotion(dt, t, 1.7, 3.4, 8.0); break;
        case 'alert': this.alert(t); break;
        case 'hit': this.hit(dt, t); break;
        default: this.idle(t);
      }
    }

    // damp current toward target (this is the "blend tree")
    const blend = this.dead ? 6.5 : 8.5;
    const c = this._current;
    for (const b of BONES) {
      c[b].x = damp(c[b].x, t[b].x, blend, dt);
      c[b].y = damp(c[b].y, t[b].y, blend, dt);
      c[b].z = damp(c[b].z, t[b].z, blend, dt);
    }
    c.rootY = damp(c.rootY, t.rootY, blend, dt);
    c.rootPitch = damp(c.rootPitch, t.rootPitch, 5, dt);
    c.rootRoll = damp(c.rootRoll, t.rootRoll, 5, dt);

    // apply to bones
    const r = this.rig;
    for (const b of BONES) {
      if (b === 'hips') continue;
      r[b].rotation.set(c[b].x, c[b].y, c[b].z);
    }
    // hips: local pose + whole-body death rotation; hips.position.y bobs
    if (this.hipsY == null) this.hipsY = r.hips.position.y;
    r.hips.position.y = this.hipsY + c.rootY;
    r.hips.rotation.set(c.hips.x + c.rootPitch, c.hips.y, c.hips.z + c.rootRoll);
  }

  // ---- states ----------------------------------------------------------------

  idle(t) {
    const s = Math.sin(this.time * 1.1);
    const s2 = Math.sin(this.time * 0.7 + 1.3);
    t.spine.x = 0.03 + s * 0.012;
    t.chest.y = s2 * 0.02;
    t.neck.y = Math.sin(this.time * 0.45) * 0.3;      // look around
    t.neck.x = 0.05 + Math.sin(this.time * 0.9) * 0.04;
    t.rootY = s * 0.008;
    // arms relaxed, slight sway
    t.shoulderL.x = 0.08 + s * 0.02; t.shoulderL.z = -0.10;
    t.shoulderR.x = 0.08 - s * 0.02; t.shoulderR.z = 0.10;
    t.elbowL.x = -0.25; t.elbowR.x = -0.30 - this.aim * 0.9;
    // legs at ease stance
    t.thighL.z = -0.04; t.thighR.z = 0.04;
    t.kneeL.x = -0.05; t.kneeR.x = -0.05;
    if (this.aim > 0.01) this.aimPose(t);
  }

  alert(t) {
    // startled — looking up (drone spotted)
    t.spine.x = -0.08;
    t.neck.x = -0.55 + Math.sin(this.time * 2.2) * 0.08;
    t.neck.y = Math.sin(this.time * 1.4) * 0.25;
    t.shoulderL.z = -0.16; t.shoulderR.z = 0.16;
    this.aimPose(t, 1);
    t.rootY = Math.sin(this.time * 2.0) * 0.01;
  }

  aimPose(t, w = this.aim) {
    // right arm raises weapon toward sky
    t.shoulderR.x = -1.15 * w; t.shoulderR.z = 0.18 * w;
    t.elbowR.x = -0.35 * w;
    t.shoulderL.x = -1.05 * w; t.shoulderL.z = -0.32 * w;
    t.elbowL.x = -0.9 * w;
    t.chest.y = -0.25 * w;
  }

  locomotion(dt, t, amp, speed, freq) {
    this.phase += freq * dt * (this.speed > 0.1 ? clamp(this.speed / speed, 0.6, 1.4) : 1);
    const ph = this.phase;
    const swing = Math.sin(ph);
    const swingOff = Math.sin(ph + Math.PI);
    const runFactor = amp / 1.7;
    // legs
    t.thighL.x = swing * (0.55 * amp);
    t.thighR.x = swingOff * (0.55 * amp);
    t.kneeL.x = -Math.max(0, -swing) * (0.9 * amp) - 0.12;
    t.kneeR.x = -Math.max(0, -swingOff) * (0.9 * amp) - 0.12;
    // hips bob & counter-rotation
    t.rootY = Math.abs(Math.cos(ph)) * 0.03 * runFactor - 0.02 * runFactor;
    t.hips.y = -swing * 0.12 * runFactor;
    t.hips.z = Math.cos(ph) * 0.04 * runFactor;
    // torso
    t.spine.x = 0.06 + 0.14 * runFactor;
    t.chest.y = swing * 0.14 * runFactor;
    t.neck.x = -0.04 - 0.1 * runFactor;
    t.neck.y = Math.sin(this.time * 0.5) * 0.1;
    // arms counter-swing (unless aiming)
    const aimW = this.aim;
    if (aimW < 0.5) {
      t.shoulderL.x = swingOff * 0.45 * amp - 0.05;
      t.shoulderR.x = swing * 0.45 * amp - 0.05;
      t.shoulderL.z = -0.10;
      t.shoulderR.z = 0.10;
      t.elbowL.x = -0.35 - Math.max(0, swingOff) * 0.3;
      t.elbowR.x = -0.4 - Math.max(0, swing) * 0.3;
    }
  }

  hit(t) {
    this.hitTimer -= 1 / 60;
    const k = clamp(this.hitTimer / 0.45, 0, 1);
    const shake = Math.sin(this.time * 40) * 0.06 * k;
    t.spine.x = -0.25 * k + shake;
    t.spine.y = 0.18 * k;
    t.neck.x = -0.3 * k + shake;
    t.shoulderL.z = -0.5 * k;
    t.shoulderR.z = 0.5 * k;
    t.rootY = -0.04 * k;
    if (this.hitTimer <= 0 && !this.dead) this.state = 'alert';
  }

  updateDeath(dt, t) {
    this.deathTimer += dt;
    const dur = 0.55;
    const k = clamp(this.deathTimer / dur, 0, 1);
    const ease = 1 - Math.pow(1 - k, 3);
    // crumple + fall backward/sideways
    t.rootPitch = -this.deathDir * 0; // pitch unused
    t.rootRoll = this.deathDir * 1.45 * ease; // fall to the side
    t.rootY = -0.72 * ease; // drop to ground
    t.spine.x = 0.35 * ease;
    t.spine.z = -this.deathDir * 0.3 * ease;
    t.neck.x = 0.4 * ease;
    // limbs sprawl loose
    t.thighL.x = -0.5 * ease; t.thighR.x = -0.25 * ease;
    t.thighL.z = -0.35 * ease; t.thighR.z = 0.3 * ease;
    t.kneeL.x = -0.7 * ease; t.kneeR.x = -0.4 * ease;
    t.shoulderL.x = -0.6 * ease; t.shoulderR.x = -0.3 * ease;
    t.shoulderL.z = -0.9 * ease; t.shoulderR.z = 0.7 * ease;
    t.elbowL.x = -0.5 * ease; t.elbowR.x = -0.3 * ease;
    // slight residual twitch early on
    if (k < 1) {
      const tw = Math.sin(this.deathTimer * 30) * (1 - k) * 0.08;
      t.kneeL.x += tw; t.elbowR.x += tw;
    }
  }
}

const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
