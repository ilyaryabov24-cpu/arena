// ---------------------------------------------------------------------------
// SaveManager — persists mission progress + settings in localStorage
// ---------------------------------------------------------------------------

const SAVE_KEY = 'drone-strike-save-v1';

const DEFAULT_SETTINGS = {
  quality: 'auto',          // 'auto' | 'low' | 'medium' | 'high'
  performanceMode: false,   // battery-saver: caps particles/shadows/pixel ratio
  shadows: true,
  particles: 1.0,           // particle scale multiplier
  drawDistance: 1.0,        // fog/draw distance multiplier
  sensitivity: 1.0,         // look sensitivity
  invertY: false,
  cameraShake: true,
  cameraMode: 'fpv',        // 'fpv' | 'chase'
  vibration: true,
  masterVolume: 0.8,
  musicVolume: 0.55,
  sfxVolume: 0.9,
  showFps: false,
  graphicsAutoApplied: null, // remembers which tier auto-detect chose
};

const DEFAULT_SAVE = {
  version: 1,
  settings: { ...DEFAULT_SETTINGS },
  missions: {}, // missionId -> { destroyedIds: [], completed: false, bestTime: null, attempts: 0 }
  stats: { totalTargets: 0, dronesLost: 0 },
};

class SaveManagerImpl {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...structuredClone(DEFAULT_SAVE),
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          stats: { ...DEFAULT_SAVE.stats, ...(parsed.stats || {}) },
        };
      }
    } catch (e) { console.warn('[Save] failed to read save, resetting', e); }
    return structuredClone(DEFAULT_SAVE);
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('[Save] failed to write save', e); }
  }

  // ---- settings -----------------------------------------------------------
  get settings() { return this.data.settings; }

  updateSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  resetSettings() {
    this.data.settings = structuredClone(DEFAULT_SETTINGS);
    this.save();
  }

  // ---- missions -----------------------------------------------------------
  getMission(missionId) {
    if (!this.data.missions[missionId]) {
      this.data.missions[missionId] = {
        seed: (Math.random() * 0xffffffff) >>> 0,
        destroyedIds: [],
        completed: false,
        bestTime: null,
        attempts: 0,
      };
      this.save();
    }
    return this.data.missions[missionId];
  }

  resetMission(missionId) {
    this.data.missions[missionId] = {
      seed: (Math.random() * 0xffffffff) >>> 0,
      destroyedIds: [], completed: false, bestTime: null, attempts: 0,
    };
    this.save();
  }

  addDestroyedTarget(missionId, targetId) {
    const m = this.getMission(missionId);
    if (!m.destroyedIds.includes(targetId)) m.destroyedIds.push(targetId);
    this.data.stats.totalTargets++;
    this.save();
  }

  setMissionCompleted(missionId, timeSec) {
    const m = this.getMission(missionId);
    m.completed = true;
    if (m.bestTime == null || timeSec < m.bestTime) m.bestTime = Math.round(timeSec);
    this.save();
  }

  countDroneLost() { this.data.stats.dronesLost++; this.save(); }

  wipe() {
    localStorage.removeItem(SAVE_KEY);
    this.data = structuredClone(DEFAULT_SAVE);
  }
}

export const saveManager = new SaveManagerImpl();
