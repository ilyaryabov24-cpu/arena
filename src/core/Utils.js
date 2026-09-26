// ---------------------------------------------------------------------------
// Utils — math, seeded RNG, misc helpers shared across the game
// ---------------------------------------------------------------------------

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, min, max) => v < min ? min : (v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dampAngle = (a, b, lambda, dt) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-lambda * dt));
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export const dist2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const randRange = (rng, a, b) => a + rng() * (b - a);
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/**
 * Mulberry32 — tiny, fast, seedable PRNG.
 * Same seed => same "map layout", which lets us persist mission progress.
 */
export function makeRNG(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic hash of a string -> 32-bit int seed. */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Format seconds -> m:ss */
export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Simple mobile test (used together with touch detection in PerformanceManager). */
export function isTouchLike() {
  return (typeof window !== 'undefined') &&
    (('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)));
}

/** Yield to the browser event loop so loading screens can paint. */
export const nextFrame = () => new Promise(res => requestAnimationFrame(() => res()));

export function formatSpeed(ms) { return Math.round(ms * 3.6); }
