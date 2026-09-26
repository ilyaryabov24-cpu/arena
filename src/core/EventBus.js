// ---------------------------------------------------------------------------
// EventBus — lightweight pub/sub used to decouple game systems from UI
// ---------------------------------------------------------------------------

export class EventBus {
  constructor() { this.listeners = new Map(); }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) { this.listeners.get(type)?.delete(fn); }

  once(type, fn) {
    const off = this.on(type, (payload) => { off(); fn(payload); });
    return off;
  }

  emit(type, payload) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error(`[EventBus] listener for "${type}" failed`, e); }
    }
  }

  clear() { this.listeners.clear(); }
}

// Global bus — one instance for the whole game.
export const bus = new EventBus();

// Event name constants
export const EV = {
  // gameplay
  TARGET_DESTROYED: 'target:destroyed',
  TARGET_DAMAGED: 'target:damaged',
  DRONE_DESTROYED: 'drone:destroyed',
  DRONE_SPAWNED: 'drone:spawned',
  MISSION_PROGRESS: 'mission:progress',
  MISSION_COMPLETE: 'mission:complete',
  // fx / audio cues
  EXPLOSION: 'fx:explosion',
  NEAR_MISS: 'fx:nearmiss',
  RUSTLE: 'fx:rustle',
  UI_CLICK: 'ui:click',
  // engine
  QUALITY_CHANGED: 'quality:changed',
  STATE_CHANGED: 'state:changed',
  LOADING_STEP: 'loading:step',
};
