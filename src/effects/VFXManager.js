// ---------------------------------------------------------------------------
// VFXManager — pooled explosion & particle effects:
// flash, fireball, smoke, sparks, debris, shockwave ring, scorch decals,
// plus a single reusable dynamic explosion light. All counts scale with the
// quality tier (PerformanceManager).
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { getSpriteTexture } from '../assets/TextureFactory.js';
import { perf } from '../core/PerformanceManager.js';
import { clamp } from '../core/Utils.js';
import { EV, bus } from '../core/EventBus.js';

const tmpV = new THREE.Vector3();

class Particle {
  constructor() {
    this.active = false;
    this.sprite = null;
    this.vel = new THREE.Vector3();
    this.life = 0;
    this.ttl = 1;
    this.growth = 0;
    this.spin = 0;
    this.baseScale = 1;
    this.fadeIn = 0.15;
    this.type = 'smoke';
  }
}

class Debris {
  constructor() {
    this.active = false;
    this.mesh = null;
    this.vel = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.life = 0;
    this.ttl = 2;
  }
}

export class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.quality = perf.tier.particles;
    this.particles = [];
    this.debris = [];
    this.rings = [];
    this.decals = [];
    this.smokeAnchors = []; // continuous emitters { pos, rate, timer, dark, scale }
    this._time = 0;

    this._buildPools();
    this._explosionLight = new THREE.PointLight(0xffa050, 0, 90, 2);
    scene.add(this._explosionLight);
    this._lightTimer = 0;
  }

  _buildPools() {
    const q = this.quality;
    const counts = {
      fire: Math.round(48 * q),
      smoke: Math.round(90 * q),
      spark: Math.round(60 * q),
      debris: Math.round(36 * q),
      ring: 6,
    };
    this.matFire = new THREE.SpriteMaterial({
      map: getSpriteTexture('fire'), blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: 1,
    });
    this.matSmoke = new THREE.SpriteMaterial({
      map: getSpriteTexture('smoke'), transparent: true, depthWrite: false, opacity: 0.85,
    });
    this.matSpark = new THREE.SpriteMaterial({
      map: getSpriteTexture('spark'), blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false,
    });
    this.matRing = new THREE.MeshBasicMaterial({
      map: getSpriteTexture('ring'), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x1e1a16, roughness: 0.9, metalness: 0.3 });
    this.debrisGeoms = [
      new THREE.TetrahedronGeometry(0.22),
      new THREE.BoxGeometry(0.3, 0.14, 0.2),
      new THREE.DodecahedronGeometry(0.16),
    ];

    for (const [type, n] of Object.entries(counts)) {
      if (type === 'debris') {
        for (let i = 0; i < n; i++) {
          const d = new Debris();
          d.mesh = new THREE.Mesh(this.debrisGeoms[i % this.debrisGeoms.length], this.debrisMat);
          d.mesh.visible = false;
          this.scene.add(d.mesh);
          this.debris.push(d);
        }
        continue;
      }
      if (type === 'ring') {
        for (let i = 0; i < n; i++) {
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.matRing);
          mesh.rotation.x = -Math.PI / 2;
          mesh.visible = false;
          this.scene.add(mesh);
          this.rings.push({ mesh, active: false, life: 0, ttl: 0.6, scale: 1 });
        }
        continue;
      }
      const mat = type === 'fire' ? this.matFire : type === 'spark' ? this.matSpark : this.matSmoke;
      for (let i = 0; i < n; i++) {
        const p = new Particle();
        p.type = type;
        // per-particle material clone (shares the texture) so color/opacity
        // can vary per particle — sprites are one draw call each anyway.
        p.sprite = new THREE.Sprite(mat.clone());
        p.sprite.visible = false;
        this.scene.add(p.sprite);
        this.particles.push(p);
      }
    }
  }

  _takeParticle(type) {
    for (const p of this.particles) {
      if (!p.active && p.type === type) return p;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  addSmokeAnchor(pos, { rate = 0.4, dark = false, scale = 1, ttl = Infinity } = {}) {
    this.smokeAnchors.push({ pos: pos.clone(), rate, dark, scale, timer: 0, ttl });
  }

  clearSmokeAnchors() { this.smokeAnchors.length = 0; }

  // ---------------------------------------------------------------------------
  spawnExplosion(pos, scale = 1, { ground = false } = {}) {
    const q = this.quality;
    bus.emit(EV.EXPLOSION, { position: pos.clone(), scale });

    // light flash
    this._explosionLight.position.copy(pos).add(tmpV.set(0, 1.5, 0));
    this._explosionLight.intensity = 260 * scale;
    this._lightTimer = 0.5;

    // fire particles
    const fireN = Math.round(10 + 10 * q) * (scale > 1.2 ? 1.4 : 1);
    for (let i = 0; i < fireN; i++) {
      const p = this._takeParticle('fire');
      if (!p) break;
      this._initParticle(p, pos, scale, {
        speed: [4, 14 * scale], ttl: [0.35, 0.7], size: [2.2, 4.5],
        up: 2, growth: 3.5, drag: 2.2,
      });
    }
    // sparks
    const sparkN = Math.round(10 + 8 * q);
    for (let i = 0; i < sparkN; i++) {
      const p = this._takeParticle('spark');
      if (!p) break;
      this._initParticle(p, pos, scale * 0.5, {
        speed: [10, 26 * scale], ttl: [0.4, 1.1], size: [0.35, 0.9],
        up: 6, growth: 0, drag: 0.6, gravity: -18,
      });
    }
    // smoke
    const smokeN = Math.round(10 + 12 * q);
    for (let i = 0; i < smokeN; i++) {
      const p = this._takeParticle('smoke');
      if (!p) break;
      const dark = Math.random() < 0.75;
      p.sprite.material = this.matSmoke;
      this._initParticle(p, pos, scale, {
        speed: [2, 8], ttl: [1.4, 3.2], size: [2.5, 5],
        up: 3.5, growth: 2.4, drag: 1.2, buoyancy: 2.2,
      });
      p.sprite.material = this.matSmoke;
      const shade = dark ? 0.12 + Math.random() * 0.2 : 0.45 + Math.random() * 0.3;
      p.sprite.material.color.setRGB(shade, shade * 0.96, shade * 0.92);
    }
    // debris
    const debN = Math.round(5 + 6 * q);
    for (let i = 0; i < debN; i++) {
      const d = this.debris.find(x => !x.active);
      if (!d) break;
      d.active = true;
      d.mesh.visible = true;
      d.mesh.position.copy(pos);
      d.baseScale = 0.6 + Math.random() * scale;
      d.mesh.scale.setScalar(d.baseScale);
      d.vel.set((Math.random() - 0.5) * 26, 6 + Math.random() * 18, (Math.random() - 0.5) * 26);
      d.spin.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      d.life = 0;
      d.ttl = 1.6 + Math.random() * 1.4;
    }
    // shockwave ring
    const ring = this.rings.find(r => !r.active);
    if (ring) {
      ring.active = true;
      ring.mesh.visible = true;
      ring.mesh.position.set(pos.x, pos.y + (ground ? 0.3 : 0), pos.z);
      ring.mesh.scale.setScalar(2);
      ring.life = 0;
      ring.scale = 26 * scale;
    }
    // scorch decal on ground
    if (ground && this.decals.length < 24) {
      const decal = this._makeDecal();
      decal.position.set(pos.x, pos.y + 0.12, pos.z);
      decal.rotation.z = Math.random() * Math.PI;
      decal.scale.setScalar(7 * scale + Math.random() * 3);
    }
  }

  _makeDecal() {
    const mat = new THREE.MeshBasicMaterial({
      map: getSpriteTexture('scorch'), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    this.decals.push(m);
    return m;
  }

  /** Small impact puff (crash into ground / near miss). */
  spawnImpact(pos, scale = 0.5) {
    const q = this.quality;
    for (let i = 0; i < Math.round(6 * q); i++) {
      const p = this._takeParticle('smoke');
      if (!p) break;
      p.sprite.material = this.matSmoke;
      const shade = 0.5 + Math.random() * 0.3;
      p.sprite.material.color.setRGB(shade * 0.9, shade * 0.82, shade * 0.65);
      this._initParticle(p, pos, scale, {
        speed: [3, 9], ttl: [0.8, 1.6], size: [1.4, 2.6],
        up: 3, growth: 2.2, drag: 1.6, buoyancy: 1,
      });
    }
    for (let i = 0; i < Math.round(5 * q); i++) {
      const p = this._takeParticle('spark');
      if (!p) break;
      this._initParticle(p, pos, scale, {
        speed: [4, 14], ttl: [0.3, 0.7], size: [0.25, 0.5],
        up: 5, growth: 0, drag: 0.8, gravity: -22,
      });
    }
  }

  /** Leaves burst when clipping a tree. */
  spawnLeaves(pos) {
    const q = this.quality;
    for (let i = 0; i < Math.round(7 * q); i++) {
      const p = this._takeParticle('smoke');
      if (!p) break;
      p.sprite.material = this.matSmoke;
      const g = 0.35 + Math.random() * 0.25;
      p.sprite.material.color.setRGB(g * 0.6, g, g * 0.35);
      this._initParticle(p, pos, 0.35, {
        speed: [2, 7], ttl: [0.5, 1.1], size: [0.35, 0.8],
        up: 1, growth: 0.4, drag: 2, gravity: -6,
      });
    }
  }

  _initParticle(p, pos, scale, { speed, ttl, size, up, growth, drag, gravity = 0, buoyancy = 0 }) {
    p.active = true;
    p.sprite.visible = true;
    p.sprite.position.copy(pos);
    const a = Math.random() * Math.PI * 2;
    const s = speed[0] + Math.random() * (speed[1] - speed[0]);
    p.vel.set(Math.cos(a) * s, (Math.random() * 0.7 + 0.4) * up * scale, Math.sin(a) * s);
    p.ttl = ttl[0] + Math.random() * (ttl[1] - ttl[0]);
    p.life = 0;
    p.baseScale = (size[0] + Math.random() * (size[1] - size[0])) * Math.max(0.6, scale);
    p.growth = growth;
    p.drag = drag ?? 1;
    p.gravity = gravity;
    p.buoyancy = buoyancy;
    p.spin = (Math.random() - 0.5) * 2;
    p.sprite.material.rotation = Math.random() * Math.PI;
    p.sprite.scale.setScalar(p.baseScale);
    p.sprite.material.opacity = 1;
  }

  update(dt) {
    this._time += dt;
    // particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.ttl) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.life / p.ttl;
      // fade in/out
      const fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      p.sprite.material.opacity = fade * (p.type === 'fire' ? 1 : 0.8);
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.vel.y += (p.buoyancy || 0) * dt + (p.gravity || 0) * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.scale.setScalar(p.baseScale * (1 + p.growth * t));
      if (p.type === 'fire') {
        // fire color shifts to smoke-orange
        const c = p.sprite.material.color;
        if (c.r === 1 && c.g === 1 && c.b === 1) { /* shared mat, skip per-particle color */ }
      }
      p.sprite.material.rotation += p.spin * dt;
    }
    // debris
    for (const d of this.debris) {
      if (!d.active) continue;
      d.life += dt;
      if (d.life >= d.ttl) {
        d.active = false;
        d.mesh.visible = false;
        continue;
      }
      d.vel.y -= 22 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      const t = 1 - d.life / d.ttl;
      d.mesh.scale.setScalar(Math.max(0.01, d.mesh.scale.x * (1 - dt * 0.4)) * (t > 0 ? 1 : 0.01) || 0.01);
      // simple ground stop
      if (d.mesh.position.y < 0.1) { d.vel.set(0, 0, 0); d.spin.multiplyScalar(0.9); }
    }
    // rings
    for (const r of this.rings) {
      if (!r.active) continue;
      r.life += dt;
      const t = r.life / r.ttl;
      if (t >= 1) { r.active = false; r.mesh.visible = false; continue; }
      r.mesh.scale.setScalar(2 + r.scale * Math.pow(t, 0.6));
      this.matRing.opacity = (1 - t) * 0.7;
    }
    // light decay
    if (this._lightTimer > 0) {
      this._lightTimer -= dt;
      this._explosionLight.intensity *= Math.pow(0.001, dt * 2.2);
      if (this._lightTimer <= 0) this._explosionLight.intensity = 0;
    }
    // ambient smoke anchors
    for (let i = this.smokeAnchors.length - 1; i >= 0; i--) {
      const a = this.smokeAnchors[i];
      a.ttl -= dt;
      if (a.ttl <= 0) { this.smokeAnchors.splice(i, 1); continue; }
      a.timer -= dt;
      if (a.timer <= 0) {
        a.timer = a.rate * (0.7 + Math.random() * 0.6);
        const p = this._takeParticle('smoke');
        if (p) {
          p.sprite.material = this.matSmoke;
          const shade = a.dark ? 0.1 + Math.random() * 0.12 : 0.55 + Math.random() * 0.25;
          p.sprite.material.color.setRGB(shade, shade, shade);
          this._initParticle(p, a.pos, a.scale, {
            speed: [0.3, 1.2], ttl: [2.5, 4.5], size: [1.6, 3],
            up: 1.4, growth: 1.6, drag: 0.5, buoyancy: 1.6,
          });
        }
      }
    }
  }

  clearDecals() {
    for (const d of this.decals) {
      this.scene.remove(d);
      d.material.dispose();
      d.geometry.dispose();
    }
    this.decals.length = 0;
  }

  reset() {
    for (const p of this.particles) { p.active = false; p.sprite.visible = false; }
    for (const d of this.debris) { d.active = false; d.mesh.visible = false; }
    for (const r of this.rings) { r.active = false; r.mesh.visible = false; }
    this.clearDecals();
    this.clearSmokeAnchors();
    this._explosionLight.intensity = 0;
  }
}
