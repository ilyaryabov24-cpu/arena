// ---------------------------------------------------------------------------
// PerformanceManager — device detection, quality tiers, adaptive degradation
//
// Tiers control: texture resolution, shadow quality, particle counts,
// draw distance, grass/tree density, pixel ratio and various effects.
// The manager also monitors FPS during play and steps quality down/up.
// ---------------------------------------------------------------------------

import { clamp } from './Utils.js';
import { bus, EV } from './EventBus.js';

export const TIERS = {
  low: {
    id: 'low', label: 'LOW',
    textureSize: 256,          // canvas texture resolution multiplier
    shadowMapSize: 0,          // 0 = disabled
    particles: 0.45,
    drawDistance: 0.65,
    grassDensity: 0.25,
    treeDensity: 0.55,
    pixelRatioCap: 1.0,
    anisotropy: 1,
    maxAnisoSet: 1,
    envMap: false,
    clouds: false,
    propExtra: 0.5,
    npcAnimRate: 20,           // Hz update for distant NPCs
    targetMarkers: 3,
  },
  medium: {
    id: 'medium', label: 'MEDIUM',
    textureSize: 512,
    shadowMapSize: 1024,
    particles: 0.75,
    drawDistance: 0.85,
    grassDensity: 0.55,
    treeDensity: 0.8,
    pixelRatioCap: 1.5,
    anisotropy: 4,
    envMap: true,
    clouds: true,
    propExtra: 0.8,
    npcAnimRate: 30,
    targetMarkers: 4,
  },
  high: {
    id: 'high', label: 'HIGH',
    textureSize: 1024,         // hero textures; secondary stay 512/1024
    shadowMapSize: 2048,
    particles: 1.0,
    drawDistance: 1.0,
    grassDensity: 1.0,
    treeDensity: 1.0,
    pixelRatioCap: 2.0,
    anisotropy: 8,
    envMap: true,
    clouds: true,
    propExtra: 1.0,
    npcAnimRate: 60,
    targetMarkers: 5,
  },
};

const TIER_ORDER = ['low', 'medium', 'high'];

class PerformanceManagerImpl {
  constructor() {
    this.device = 'desktop';          // 'desktop' | 'tablet' | 'mobile'
    this.tier = TIERS.medium;
    this.userPreference = 'auto';     // from settings
    this.adaptiveEnabled = true;

    // FPS monitoring
    this._samples = [];
    this._lastCheck = 0;
    this.fps = 60;
    this._downgradeCooldown = 0;

    this._detectDevice();
  }

  _detectDevice() {
    const ua = navigator.userAgent;
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const small = Math.min(screen.width, screen.height) < 500;
    const medium = Math.min(screen.width, screen.height) < 1024;

    if (touch && small) this.device = 'mobile';
    else if (touch && medium) this.device = 'tablet';
    else if (touch && !medium && /iPad|Tablet/i.test(ua)) this.device = 'tablet';
    else this.device = 'desktop';

    // Weak hardware heuristics
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 8; // GB (Chrome only, fallback 8)
    this.weakHardware = cores <= 4 || mem <= 4;
  }

  /** Pick the initial tier from user setting + device class. */
  autoTier() {
    if (this.device === 'mobile') return this.weakHardware ? TIERS.low : TIERS.medium;
    if (this.device === 'tablet') return this.weakHardware ? TIERS.low : TIERS.medium;
    if (this.weakHardware) return TIERS.medium;
    return TIERS.high;
  }

  applyUserPreference(pref, renderer) {
    this.userPreference = pref;
    if (pref === 'auto') {
      this.adaptiveEnabled = true;
      this.setTier(this.autoTier(), renderer);
    } else {
      this.adaptiveEnabled = false;
      this.setTier(TIERS[pref], renderer);
    }
  }

  setTier(tier, renderer, force = false) {
    if (!tier || (this.tier === tier && !force)) return;
    const changed = tier.id !== this.tier?.id;
    this.tier = tier;
    if (renderer) {
      // phones never render above 1.5x regardless of tier (fill-rate)
      const cap = this.device === 'mobile' ? Math.min(tier.pixelRatioCap, 1.5) : tier.pixelRatioCap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
      renderer.shadowMap.enabled = tier.shadowMapSize > 0;
    }
    if (changed) {
      bus.emit(EV.QUALITY_CHANGED, tier);
    }
  }

  /** Battery-saver profile layered on top of the current tier. */
  setPerformanceMode(on, renderer) {
    on = !!on;
    if (on === !!this.performanceMode && this.tier) return;
    this.performanceMode = on;
    if (on) {
      const base = this._baseTier || this.tier;
      this._baseTier = base;
      this.adaptiveEnabled = false; // no auto-stepping while overridden
      this.setTier({
        ...base,
        shadowMapSize: 0,
        particles: Math.min(base.particles, 0.45),
        drawDistance: Math.min(base.drawDistance, 0.7),
        grassDensity: Math.min(base.grassDensity, 0.3),
        treeDensity: Math.min(base.treeDensity, 0.6),
        pixelRatioCap: 1,
        clouds: false,
        envMap: false,
        propExtra: Math.min(base.propExtra, 0.5),
        performanceMode: true,
      }, renderer, true);
    } else if (this._baseTier) {
      const base = this._baseTier;
      this._baseTier = null;
      this.adaptiveEnabled = this.userPreference === 'auto';
      this.setTier(base, renderer, true);
    }
  }

  stepDown(renderer) {
    const idx = TIER_ORDER.indexOf(this.tier.id);
    if (idx > 0) {
      const next = TIERS[TIER_ORDER[idx - 1]];
      if (this.userPreference === 'auto' && next.id !== 'low' || this.tier.id !== 'low') {
        this.setTier(next, renderer);
        return next.id;
      }
    }
    return null;
  }

  get tierIndex() { return TIER_ORDER.indexOf(this.tier.id); }

  /** Called every frame with the current delta. */
  update(dt, renderer) {
    this.fps = lerpNum(this.fps, 1 / Math.max(dt, 1e-4), 0.05);
    this._downgradeCooldown -= dt;
    if (!this.adaptiveEnabled) return;

    this._samples.push(1 / Math.max(dt, 1e-4));
    if (this._samples.length > 120) this._samples.shift();

    this._lastCheck += dt;
    if (this._lastCheck > 4 && this._samples.length > 60) {
      this._lastCheck = 0;
      let sum = 0;
      for (const s of this._samples) sum += s;
      const avg = sum / this._samples.length;
      // Sustained low FPS -> degrade one step. Never below low.
      if (avg < 34 && this.tier.id !== 'low' && this._downgradeCooldown <= 0) {
        this._downgradeCooldown = 20;
        this._samples.length = 0;
        const dropped = this.stepDown(renderer);
        if (dropped) console.info(`[Perf] avg ${avg.toFixed(0)} fps -> quality ${dropped}`);
      }
    }
  }

  get isMobile() { return this.device === 'mobile'; }
  get isTouch() { return this.device !== 'desktop'; }
}

const lerpNum = (a, b, t) => a + (b - a) * t;

export const perf = new PerformanceManagerImpl();
