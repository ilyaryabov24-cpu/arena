// ---------------------------------------------------------------------------
// SkySystem — sky dome (THREE.Sky), sun, fog, clouds, environment map.
// Presets: day | evening | overcast | haze — each map picks one, so maps
// visually differ in lighting & atmosphere.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { getSpriteTexture } from '../assets/TextureFactory.js';
import { perf } from '../core/PerformanceManager.js';
import { TAU, DEG } from '../core/Utils.js';

export const SKY_PRESETS = {
  day: {
    sunElev: 52, sunAz: 135, turbidity: 6, rayleigh: 1.7,
    mie: 0.004, mieG: 0.8,
    sunColor: 0xfff2dd, sunIntensity: 2.8,
    hemiSky: 0xbdd3e8, hemiGround: 0x5a6b4a, hemiIntensity: 0.55,
    fog: 0xc4d2dc, fogDensity: 0.00030,
    envIntensity: 1.0,
  },
  evening: {
    sunElev: 7, sunAz: 255, turbidity: 9, rayleigh: 2.6,
    mie: 0.006, mieG: 0.85,
    sunColor: 0xffb070, sunIntensity: 2.4,
    hemiSky: 0x7a6f8a, hemiGround: 0x4a4438, hemiIntensity: 0.5,
    fog: 0xd8a878, fogDensity: 0.00048,
    envIntensity: 0.8,
  },
  overcast: {
    sunElev: 38, sunAz: 160, turbidity: 16, rayleigh: 0.5,
    mie: 0.008, mieG: 0.6,
    sunColor: 0xdfe4ea, sunIntensity: 1.1,
    hemiSky: 0xaeb6c0, hemiGround: 0x555a52, hemiIntensity: 0.95,
    fog: 0xb0b8c0, fogDensity: 0.00085,
    envIntensity: 0.7,
  },
  haze: {
    sunElev: 44, sunAz: 110, turbidity: 11, rayleigh: 1.2,
    mie: 0.006, mieG: 0.75,
    sunColor: 0xffe8c8, sunIntensity: 2.2,
    hemiSky: 0xc2c8bc, hemiGround: 0x606852, hemiIntensity: 0.7,
    fog: 0xc9cfc2, fogDensity: 0.00055,
    envIntensity: 0.85,
  },
};

export class SkySystem {
  constructor(scene, renderer, presetName = 'day') {
    this.scene = scene;
    this.renderer = renderer;
    this.preset = SKY_PRESETS[presetName] || SKY_PRESETS.day;
    this.presetName = presetName;
    this.time = 0;
    this.clouds = [];

    // ---- sky dome ----------------------------------------------------------
    this.sky = new Sky();
    this.sky.scale.setScalar(40000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = this.preset.turbidity;
    u.rayleigh.value = this.preset.rayleigh;
    u.mieCoefficient.value = this.preset.mie;
    u.mieDirectionalG.value = this.preset.mieG;
    const sunVec = this._sunVector();
    u.sunPosition.value.copy(sunVec);
    scene.add(this.sky);

    // ---- lights --------------------------------------------------------------
    this.sun = new THREE.DirectionalLight(this.preset.sunColor, this.preset.sunIntensity);
    this.sun.position.copy(sunVec).multiplyScalar(500);
    this.sun.castShadow = perf.tier.shadowMapSize > 0;
    const S = 260; // shadow camera half-extent (follows the drone)
    this.sun.shadow.camera.left = -S;
    this.sun.shadow.camera.right = S;
    this.sun.shadow.camera.top = S;
    this.sun.shadow.camera.bottom = -S;
    this.sun.shadow.camera.near = 50;
    this.sun.shadow.camera.far = 1400;
    this.sun.shadow.mapSize.setScalar(perf.tier.shadowMapSize || 1024);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.6;
    if (this.sun.castShadow) {
      this.sun.shadow.camera.updateProjectionMatrix();
    }
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(this.preset.hemiSky, this.preset.hemiGround, this.preset.hemiIntensity);
    scene.add(this.hemi);

    // ---- fog -----------------------------------------------------------------
    this.fog = new THREE.FogExp2(this.preset.fog, this.preset.fogDensity * (1 / Math.max(0.4, perf.tier.drawDistance)));
    scene.fog = this.fog;

    // ---- environment map (PBR reflections) ------------------------------------
    if (perf.tier.envMap) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      this._envRT = pmrem.fromScene(this.sky, 0.02);
      scene.environment = this._envRT.texture;
      scene.environmentIntensity = this.preset.envIntensity; // r160+
      pmrem.dispose();
    }

    this._makeClouds();
  }

  _sunVector() {
    const p = this.preset;
    const phi = (90 - p.sunElev) * DEG;
    const theta = p.sunAz * DEG;
    return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  }

  _makeClouds() {
    if (!perf.tier.clouds) return;
    const tex = getSpriteTexture('cloud');
    const count = 26;
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0.55, depthWrite: false, fog: false,
    });
    this.cloudGroup = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(mat);
      const scale = 180 + Math.random() * 320;
      s.scale.set(scale, scale * 0.45, 1);
      s.position.set(
        (Math.random() - 0.5) * 6000,
        500 + Math.random() * 450,
        (Math.random() - 0.5) * 6000
      );
      s.renderOrder = -10;
      this.clouds.push(s);
      this.cloudGroup.add(s);
    }
    this.scene.add(this.cloudGroup);
  }

  /** Keep the sun/shadow frustum centered on the player. */
  updateFocus(targetPos) {
    // snap to shadow-map texels to avoid shimmer
    const texel = (this.sun.shadow.camera.right - this.sun.shadow.camera.left) / (perf.tier.shadowMapSize || 1024);
    const sx = Math.round(targetPos.x / texel) * texel;
    const sz = Math.round(targetPos.z / texel) * texel;
    this.sun.position.set(sx, 0, sz).add(this._sunVector().multiplyScalar(600));
    this.sun.target.position.set(sx, 0, sz);
  }

  update(dt) {
    this.time += dt;
    if (this.cloudGroup) {
      this.cloudGroup.position.x = Math.sin(this.time * 0.004) * 260 + this.time * 0.5;
    }
  }

  dispose() {
    this.scene.remove(this.sky);
    this.scene.remove(this.sun);
    this.scene.remove(this.hemi);
    if (this.cloudGroup) this.scene.remove(this.cloudGroup);
    if (this._envRT) this._envRT.dispose();
    this.sky.material.dispose();
  }
}
