// ---------------------------------------------------------------------------
// VehicleTarget — ground vehicles: detailed models, wheel/track animation,
// suspension bobbing, convoy movement along roads, wreck visuals.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { Target, TargetState } from './Target.js';
import {
  buildTank, buildAPC, buildTruck, buildTechnical, buildCar, buildFuelTruck, charVehicle,
} from '../assets/builders/VehicleBuilders.js';
import { dampAngle, clamp } from '../core/Utils.js';

const BUILDERS = {
  tank: { build: (rng) => buildTank(rng() < 0.3 ? 'desert' : 'forest'), health: 160, radius: 2.6, height: 2.6, boom: 1.5 },
  apc: { build: (rng) => buildAPC(rng() < 0.3 ? 'desert' : 'forest'), health: 120, radius: 2.2, height: 2.4, boom: 1.2 },
  truck: { build: () => buildTruck(), health: 90, radius: 2.4, height: 2.9, boom: 1.4 },
  technical: { build: () => buildTechnical(), health: 70, radius: 1.6, height: 2.1, boom: 1 },
  car: { build: (rng) => buildCar((rng() * 7) | 0), health: 55, radius: 1.5, height: 1.5, boom: 0.9 },
  fueltruck: { build: () => buildFuelTruck(), health: 80, radius: 2.5, height: 3.1, boom: 2.6 },
};

export class VehicleTarget extends Target {
  constructor(type, position, scene, rng) {
    super(type, position, scene);
    const def = BUILDERS[type] || BUILDERS.car;
    this.health = this.maxHealth = def.health;
    this.radius = def.radius;
    this.height = def.height;
    this.explosionScale = def.boom;
    const built = def.build(rng);
    this.group.add(built.group);
    this.vehicle = built.group;
    this.parts = built.parts;
    this.wheels = built.parts.wheels || [];
    this.tracks = built.parts.tracks || [];
    this.turret = built.parts.turret || null;
    // movement state
    this.speed = 0;
    this.route = null;        // { pts, lengths, total } in world XZ
    this.routeT = 0;
    this.heading = rng() * Math.PI * 2;
    this._wheelSpin = 0;
    this._suspPhase = rng() * 10;
    this._turretPhase = rng() * 10;
    this._smokeTimer = 0;
    this.smokeAnchorOffset = new THREE.Vector3(0, this.height * 0.6, 0);
  }

  setRoute(pts, t0 = 0, speed = 0) {
    const lengths = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      lengths.push(l);
      total += l;
    }
    this.route = { pts, lengths, total };
    this.routeT = t0;
    this.speed = speed;
  }

  _sampleRoute(t) {
    const { pts, lengths, total } = this.route;
    let d = clamp(t, 0, 0.9999) * total;
    for (let i = 0; i < lengths.length; i++) {
      if (d <= lengths[i]) {
        const f = lengths[i] > 0 ? d / lengths[i] : 0;
        const a = pts[i], b = pts[i + 1];
        return {
          x: a.x + (b.x - a.x) * f,
          z: a.z + (b.z - a.z) * f,
          heading: Math.atan2(b.x - a.x, b.z - a.z),
        };
      }
      d -= lengths[i];
    }
    return null;
  }

  update(dt, dronePos, terrain) {
    if (this.destroyed) {
      this._deadTimer += dt;
      // burnt wreck slowly settles
      return;
    }
    // route following
    if (this.route && this.speed > 0.01) {
      this.routeT += (this.speed * dt) / this.route.total;
      if (this.routeT > 1) this.routeT -= 1;
      const s = this._sampleRoute(this.routeT);
      if (s) {
        this.group.position.x = s.x;
        this.group.position.z = s.z;
        if (terrain) this.group.position.y = terrain.getHeight(s.x, s.z);
        this.heading = dampAngle(this.heading, s.heading, 3, dt);
      }
    }
    this.group.rotation.y = this.heading;

    // wheels + suspension
    if (this.speed > 0.01 || this._driving) {
      this._wheelSpin += (this.speed / 0.45) * dt;
      for (const w of this.wheels) w.rotation.x = this._wheelSpin;
      // track UV scroll
      for (const t of this.tracks) {
        if (t.material?.map) t.material.map.offset.y -= (this.speed * dt) / 1.2;
      }
      // suspension bob
      this._suspPhase += dt * (2 + this.speed * 0.22);
      const bob = Math.sin(this._suspPhase) * 0.02 + Math.sin(this._suspPhase * 1.7) * 0.012;
      this.vehicle.position.y = bob;
      this.vehicle.rotation.z = Math.sin(this._suspPhase * 0.8) * 0.012;
    }
    // idle turret scan
    if (this.turret && this.type !== 'technical') {
      this._turretPhase += dt;
      this.turret.rotation.y = Math.sin(this._turretPhase * 0.25) * 0.6;
    } else if (this.turret) {
      this.turret.rotation.y = 0;
    }
  }

  onDamaged() {
    // start smoke
    if (!this.smokeAnchor) {
      this.smokeAnchor = this.group.position.clone().add(this.smokeAnchorOffset);
    }
  }

  onHit() {}

  onDestroyed(fromExplosion) {
    charVehicle(this.vehicle);
    this.group.rotation.y = this.heading + (Math.random() - 0.5) * 0.3;
    if (this.turret) this.turret.visible = true;
  }

  onWreck() {
    charVehicle(this.vehicle);
    this.vehicle.position.y -= 0.08;
  }
}
