"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import HeroFish from "./HeroFish";
import BubbleTrail, { BubbleTrailHandle } from "./BubbleTrail";
import { useFishScroll } from "@/hooks/useFishScroll";
import {
  FISH_SIZE,
  FISH_SPEED,
  SCROLL_PATH,
  FISH_ENABLED,
  GLOW_CONFIG,
  IDLE_CONFIG,
  BUBBLE_CONFIG,
  CURSOR_CONFIG,
} from "@/lib/heroFishConfig";

// ─── Path Interpolation ─────────────────────────────────────────────────────

/** Smooth hermite interpolation between path waypoints */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Interpolate fish position along the scroll path */
function interpolatePath(
  progress: number,
  path: [number, number, number][]
): { x: number; y: number } {
  const p = Math.max(0, Math.min(1, progress));

  let i = 0;
  for (let j = 0; j < path.length - 1; j++) {
    if (p >= path[j][0] && p <= path[j + 1][0]) {
      i = j;
      break;
    }
    if (j === path.length - 2) i = j;
  }

  const [p0, x0, y0] = path[i];
  const [p1, x1, y1] = path[i + 1];

  const segLen = p1 - p0;
  const t = segLen > 0 ? smoothstep((p - p0) / segLen) : 0;

  return {
    x: x0 + (x1 - x0) * t,
    y: y0 + (y1 - y0) * t,
  };
}

// ─── FishController ─────────────────────────────────────────────────────────

export default function FishController() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fishSize, setFishSize] = useState<number>(FISH_SIZE.desktop);

  // Smooth position state (updated via rAF, not React state to avoid rerenders)
  const posRef = useRef({ x: 0, y: 0 });
  const prevPosRef = useRef({ x: 0, y: 0 });
  const fishElRef = useRef<HTMLDivElement>(null);
  const bubbleTrailRef = useRef<BubbleTrailHandle>(null);
  const rafRef = useRef(0);

  // Scroll progress
  const scrollProgress = useFishScroll();

  // Entry animation state
  const entryCompleteRef = useRef(false);
  const entryStartTime = useRef(0);

  // Idle motion tracking
  const lastScrollProgress = useRef(0);
  const idleTimeRef = useRef(0);
  const lastFrameTime = useRef(0);

  // Bubble rate accumulators
  const bubbleAccumulator = useRef(0);
  const mouthBubbleAccumulator = useRef(0);

  // Mouse tracking for dynamic cursor attraction and tilt
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseActiveRef = useRef(false);
  const tiltRef = useRef({ x: 0, y: 0 });
  const directionRef = useRef(1);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current.x = e.clientX;
      mousePosRef.current.y = e.clientY;
      isMouseActiveRef.current = true;
    };
    const handleMouseLeave = () => {
      isMouseActiveRef.current = false;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Detect reduced motion + screen size
  useEffect(() => {
    if (!FISH_ENABLED) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motionQuery.matches);

    const handleMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionQuery.addEventListener("change", handleMotion);

    // Responsive sizing
    const updateSize = () => {
      const w = window.innerWidth;
      if (w < 640) setFishSize(FISH_SIZE.mobile);
      else if (w < 1024) setFishSize(FISH_SIZE.tablet);
      else setFishSize(FISH_SIZE.desktop);
    };
    updateSize();
    window.addEventListener("resize", updateSize, { passive: true });

    // Tab visibility
    const handleVisibility = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);

    // Start entry animation after a brief delay (after splash)
    const entryTimer = setTimeout(() => {
      setIsVisible(true);
      entryStartTime.current = performance.now();
      lastFrameTime.current = performance.now();
    }, 3200);

    return () => {
      motionQuery.removeEventListener("change", handleMotion);
      window.removeEventListener("resize", updateSize);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(entryTimer);
    };
  }, []);

  // ─── Animation Loop ─────────────────────────────────────────────────────
  const animate = useCallback(() => {
    if (isPaused || !fishElRef.current) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const el = fishElRef.current;
    const now = performance.now();
    const deltaTime = Math.min(0.05, (now - (lastFrameTime.current || now)) / 1000);
    lastFrameTime.current = now;

    // Calculate target position from scroll
    const target = interpolatePath(scrollProgress, SCROLL_PATH);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let targetPx = {
      x: (target.x / 100) * vw,
      y: (target.y / 100) * vh,
    };

    // ─── Idle Motion (figure-8 drift when not scrolling) ─────────────
    const scrollDelta = Math.abs(scrollProgress - lastScrollProgress.current);
    lastScrollProgress.current = scrollProgress;

    if (scrollDelta < IDLE_CONFIG.idleThreshold) {
      idleTimeRef.current += deltaTime;
    } else {
      idleTimeRef.current = 0;
    }

    // Blend idle motion when user stops scrolling
    if (idleTimeRef.current > 0.5) {
      const idleBlend = Math.min(1, (idleTimeRef.current - 0.5) / 1.5);
      const t = idleTimeRef.current * (2 * Math.PI / IDLE_CONFIG.driftPeriod);

      // Figure-8 / lazy S-curve
      const idleOffsetX = Math.sin(t) * (IDLE_CONFIG.driftAmplitudeX / 100) * vw;
      const idleOffsetY = Math.sin(t * 2) * (IDLE_CONFIG.driftAmplitudeY / 100) * vh;

      targetPx.x += idleOffsetX * idleBlend;
      targetPx.y += idleOffsetY * idleBlend;
    }

    // Cursor attraction deviation
    if (isMouseActiveRef.current) {
      const dxMouse = mousePosRef.current.x - targetPx.x;
      const dyMouse = mousePosRef.current.y - targetPx.y;
      const distMouse = Math.hypot(dxMouse, dyMouse);

      if (distMouse < 400) {
        const pullStrength = (1 - distMouse / 400) * 90;
        const angleMouse = Math.atan2(dyMouse, dxMouse);
        targetPx.x += Math.cos(angleMouse) * pullStrength;
        targetPx.y += Math.sin(angleMouse) * pullStrength;
      }
    }

    // Entry animation override
    if (!entryCompleteRef.current) {
      const elapsed = performance.now() - entryStartTime.current;
      const entryProgress = Math.min(1, elapsed / (FISH_SPEED.entryDuration * 1000));

      if (entryProgress < 1) {
        const eased = smoothstep(entryProgress);
        const startX = -fishSize * 1.5;
        const startY = vh * 0.4;

        targetPx.x = startX + (targetPx.x - startX) * eased;
        targetPx.y = startY + (targetPx.y - startY) * eased;
      } else {
        entryCompleteRef.current = true;
      }
    }

    // Smooth interpolation of position
    const lerp = 0.07;
    posRef.current.x += (targetPx.x - posRef.current.x) * lerp;
    posRef.current.y += (targetPx.y - posRef.current.y) * lerp;

    // Calculate direction (which way is fish swimming)
    const dx = posRef.current.x - prevPosRef.current.x;
    const currentDirection = dx >= 0 ? 1 : -1;
    directionRef.current = currentDirection;

    // Calculate swim angle from movement
    const dy = posRef.current.y - prevPosRef.current.y;
    const moveAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.5;
    const clampedAngle = Math.max(-18, Math.min(18, moveAngle));

    // Calculate velocity (pixels traveled since last frame)
    const velocity = Math.hypot(dx, dy);

    // Speed-reactive tail wag and fin flutter
    const maxVelocity = 20;
    const tailWagDuration = Math.max(0.3, 1.0 - (velocity / maxVelocity) * 0.7);
    const finFlutterDuration = Math.max(0.5, 1.8 - (velocity / maxVelocity) * 1.3);

    // Speed-reactive squash/stretch
    const normalizedVelocity = Math.min(1, velocity / maxVelocity);
    const currentStretch = 1 + normalizedVelocity * (IDLE_CONFIG.maxStretch - 1);

    // Calculate cursor tilt (head follows cursor)
    let targetTiltX = 0;
    let targetTiltY = 0;
    if (isMouseActiveRef.current && window.innerWidth >= CURSOR_CONFIG.minScreenWidth) {
      const dxMouse = mousePosRef.current.x - posRef.current.x;
      const dyMouse = mousePosRef.current.y - posRef.current.y;
      const angleMouse = Math.atan2(dyMouse, dxMouse) * (180 / Math.PI);
      targetTiltX = Math.max(-CURSOR_CONFIG.maxTilt, Math.min(CURSOR_CONFIG.maxTilt, angleMouse * 0.15));
      targetTiltY = Math.max(-CURSOR_CONFIG.maxTilt * 0.5, Math.min(CURSOR_CONFIG.maxTilt * 0.5, dyMouse * 0.02));
    }
    tiltRef.current.x += (targetTiltX - tiltRef.current.x) * CURSOR_CONFIG.smoothing;
    tiltRef.current.y += (targetTiltY - tiltRef.current.y) * CURSOR_CONFIG.smoothing;

    // Apply styles directly to the DOM to avoid triggering any React rerenders!
    el.style.transform = `translate3d(${posRef.current.x - fishSize / 2}px, ${posRef.current.y - fishSize * 0.3}px, 0) rotate(${clampedAngle}deg)`;
    el.style.setProperty("--fish-direction", String(currentDirection));
    el.style.setProperty("--fish-stretch", String(currentStretch));
    el.style.setProperty("--fish-squash", String(2 - currentStretch));
    el.style.setProperty("--fish-tilt-x", `${tiltRef.current.x}deg`);
    el.style.setProperty("--fish-tilt-y", `${tiltRef.current.y}deg`);
    el.style.setProperty("--tail-wag-duration", `${tailWagDuration}s`);
    el.style.setProperty("--fin-flutter-duration", `${finFlutterDuration}s`);

    // Speed-reactive tail bubble spawning
    const currentRate = BUBBLE_CONFIG.spawnRate + normalizedVelocity * (BUBBLE_CONFIG.maxSpawnRate - BUBBLE_CONFIG.spawnRate);
    bubbleAccumulator.current += deltaTime * currentRate;
    while (bubbleAccumulator.current >= 1) {
      bubbleTrailRef.current?.spawnBubble(posRef.current.x, posRef.current.y, currentDirection, false);
      bubbleAccumulator.current -= 1;
    }

    // Periodic mouth bubble cluster spawning
    mouthBubbleAccumulator.current += deltaTime;
    if (mouthBubbleAccumulator.current >= BUBBLE_CONFIG.mouthBubbleInterval) {
      mouthBubbleAccumulator.current = 0;
      for (let i = 0; i < BUBBLE_CONFIG.mouthBubbleCount; i++) {
        setTimeout(() => {
          bubbleTrailRef.current?.spawnBubble(posRef.current.x, posRef.current.y, directionRef.current, true);
        }, i * 120);
      }
    }

    prevPosRef.current = { ...posRef.current };

    rafRef.current = requestAnimationFrame(animate);
  }, [scrollProgress, isPaused, fishSize]);

  useEffect(() => {
    if (!isVisible || reducedMotion) return;

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate, isVisible, reducedMotion]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!FISH_ENABLED || !isVisible) return null;

  return (
    <>
      {/* Fish container — fixed position, pointer-events none */}
      <div
        ref={fishElRef}
        className="hero-fish-container"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 5,
          pointerEvents: "none",
          willChange: "transform",
          transition: "none",
        }}
        aria-hidden="true"
      >
        {/* Ambient golden glow */}
        <div
          className="hero-fish-glow"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: GLOW_CONFIG.radius * 2,
            height: GLOW_CONFIG.radius * 2,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GLOW_CONFIG.color}, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <HeroFish size={fishSize} />
      </div>

      {/* Bubble trail */}
      <BubbleTrail ref={bubbleTrailRef} />
    </>
  );
}
