/**
 * HotByte Hero Fish — Central Configuration
 *
 * All animation settings, sizes, paths, and tunables live here.
 * Adjust any value to tweak the fish behavior without touching component code.
 */

// ─── Fish Sizing ────────────────────────────────────────────────────────────
export const FISH_SIZE = {
  desktop: 100,
  tablet: 90,
  mobile: 70,
} as const;

// ─── Animation Speeds ───────────────────────────────────────────────────────
export const FISH_SPEED = {
  /** Tail wag cycle duration in seconds */
  tailWag: 1.2,
  /** Fin flutter cycle in seconds */
  finFlutter: 2.0,
  /** Body sway (breathing) cycle in seconds */
  bodySway: 3.5,
  /** Blink interval range in seconds [min, max] */
  blinkInterval: [3, 7] as [number, number],
  /** Blink duration in ms */
  blinkDuration: 180,
  /** Entry animation duration in seconds */
  entryDuration: 2.0,
} as const;

// ─── Bubble Trail ───────────────────────────────────────────────────────────
export const BUBBLE_CONFIG = {
  /** Max concurrent bubble DOM nodes */
  poolSize: 12,
  /** Bubbles spawned per second */
  spawnRate: 2.5,
  /** Size range in px [min, max] */
  sizeRange: [2, 6] as [number, number],
  /** Opacity range [min, max] */
  opacityRange: [0.08, 0.3] as [number, number],
  /** Float-up duration in seconds [min, max] */
  durationRange: [1.5, 3.0] as [number, number],
  /** Horizontal drift range in px */
  driftX: 12,
} as const;

// ─── Cursor Interaction ─────────────────────────────────────────────────────
export const CURSOR_CONFIG = {
  /** Maximum head rotation in degrees toward cursor */
  maxTilt: 10,
  /** Smoothing factor for cursor tracking (0-1, lower = smoother) */
  smoothing: 0.06,
  /** Only track cursor on screens wider than this */
  minScreenWidth: 768,
} as const;

// ─── Glow Effect ────────────────────────────────────────────────────────────
export const GLOW_CONFIG = {
  /** Glow radius in px */
  radius: 40,
  /** Glow color */
  color: "rgba(255, 140, 50, 0.12)",
  /** Pulse cycle in seconds */
  pulseDuration: 4.0,
} as const;

// ─── Scroll Path ────────────────────────────────────────────────────────────
// Each waypoint: [scrollProgress (0-1), xPercent (0-100), yPercent (0-100)]
// The fish position is interpolated between waypoints using smooth easing.
// Positions are viewport-relative percentages.
export const SCROLL_PATH: [number, number, number][] = [
  //  progress,  x%,    y%
  [0.00,          25,   35],   // enters hero
  [0.15,          72,   28],   // hero center-right
  [0.25,          85,   50],   // dips down toward demo
  [0.35,          60,   38],   // curves back left
  [0.45,          30,   55],   // features area
  [0.55,          70,   45],   // how-it-works
  [0.65,          82,   35],   // pauses near pricing
  [0.75,          45,   50],   // FAQ section
  [0.85,          25,   60],   // CTA block
  [0.92,          50,   75],   // diving down
  [1.00,          55,   110],  // exits below viewport
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
