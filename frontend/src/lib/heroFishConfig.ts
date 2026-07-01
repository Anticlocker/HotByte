/**
 * HotByte Hero Fish — Central Configuration
 *
 * All animation settings, sizes, paths, and tunables live here.
 * Adjust any value to tweak the fish behavior without touching component code.
 */

// ─── Fish Sizing ────────────────────────────────────────────────────────────
export const FISH_SIZE = {
  desktop: 120,
  tablet: 100,
  mobile: 80,
} as const;

// ─── Animation Speeds ───────────────────────────────────────────────────────
export const FISH_SPEED = {
  /** Tail wag cycle duration in seconds */
  tailWag: 1.0,
  /** Fin flutter cycle in seconds */
  finFlutter: 1.8,
  /** Body sway (breathing) cycle in seconds */
  bodySway: 3.0,
  /** Blink interval range in seconds [min, max] */
  blinkInterval: [3, 7] as [number, number],
  /** Blink duration in ms */
  blinkDuration: 180,
  /** Entry animation duration in seconds */
  entryDuration: 2.0,
} as const;

// ─── Idle Motion ────────────────────────────────────────────────────────────
export const IDLE_CONFIG = {
  /** Amplitude of idle horizontal drift in viewport-percent */
  driftAmplitudeX: 4,
  /** Amplitude of idle vertical bob in viewport-percent */
  driftAmplitudeY: 2.5,
  /** Period of one full idle figure-8 cycle in seconds */
  driftPeriod: 6.0,
  /** Scroll velocity threshold below which idle kicks in (0-1 per frame) */
  idleThreshold: 0.0005,
  /** Squash/stretch factor at max velocity */
  maxStretch: 1.12,
} as const;

// ─── Bubble Trail ───────────────────────────────────────────────────────────
export const BUBBLE_CONFIG = {
  /** Max concurrent bubble DOM nodes */
  poolSize: 20,
  /** Bubbles spawned per second (base rate — increases with speed) */
  spawnRate: 2.0,
  /** Maximum spawn rate when fish swims fast */
  maxSpawnRate: 6.0,
  /** Size range in px [min, max] */
  sizeRange: [2, 8] as [number, number],
  /** Opacity range [min, max] */
  opacityRange: [0.06, 0.35] as [number, number],
  /** Float-up duration in seconds [min, max] */
  durationRange: [1.5, 3.5] as [number, number],
  /** Horizontal drift range in px */
  driftX: 16,
  /** Mouth bubble cluster interval in seconds */
  mouthBubbleInterval: 4.0,
  /** Mouth bubble count per cluster */
  mouthBubbleCount: 3,
} as const;

// ─── Cursor Interaction ─────────────────────────────────────────────────────
export const CURSOR_CONFIG = {
  /** Maximum head rotation in degrees toward cursor */
  maxTilt: 12,
  /** Smoothing factor for cursor tracking (0-1, lower = smoother) */
  smoothing: 0.06,
  /** Only track cursor on screens wider than this */
  minScreenWidth: 768,
} as const;

// ─── Glow Effect ────────────────────────────────────────────────────────────
export const GLOW_CONFIG = {
  /** Glow radius in px */
  radius: 55,
  /** Glow color — warm gold */
  color: "rgba(255, 180, 60, 0.15)",
  /** Pulse cycle in seconds */
  pulseDuration: 3.5,
} as const;

// ─── Scroll Path (Zig-Zag) ─────────────────────────────────────────────────
// Each waypoint: [scrollProgress (0-1), xPercent (0-100), yPercent (0-100)]
// The fish position is interpolated between waypoints using smooth easing.
// Positions are viewport-relative percentages.
// Enhanced zig-zag pattern with tighter cross-screen sweeps.
export const SCROLL_PATH: [number, number, number][] = [
  //  progress,  x%,    y%
  [0.00,          20,   38],   // enters hero area (left)
  [0.06,          55,   30],   // sweeps to center
  [0.12,          85,   42],   // zig right, dip down
  [0.18,          65,   28],   // zag back left-center, up
  [0.24,          30,   50],   // zig left, lower
  [0.30,          15,   35],   // far left, rises
  [0.36,          50,   55],   // sweeps center, descends
  [0.42,          82,   38],   // zig right, rises
  [0.48,          60,   48],   // zag back center
  [0.54,          25,   35],   // zig far left
  [0.60,          70,   55],   // zag right, dips
  [0.66,          88,   40],   // far right peak
  [0.72,          55,   50],   // sweeps back center
  [0.78,          20,   58],   // zig far left, low
  [0.84,          45,   42],   // zag center, rises
  [0.90,          75,   60],   // zig right, descends
  [0.95,          55,   80],   // diving down toward exit
  [1.00,          50,   115],  // exits below viewport
];

// ─── Feature Toggle ─────────────────────────────────────────────────────────
export const FISH_ENABLED = true;

// ─── Performance ────────────────────────────────────────────────────────────
export const PERFORMANCE = {
  /** Reduce particle count on mobile */
  mobileBubbleMultiplier: 0.5,
  /** Skip cursor tracking below this FPS */
  minFpsForCursor: 30,
} as const;
