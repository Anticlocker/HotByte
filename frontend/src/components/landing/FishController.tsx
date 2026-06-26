"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import HeroFish from "./HeroFish";
import BubbleTrail from "./BubbleTrail";
import { useFishScroll } from "@/hooks/useFishScroll";
import { useFishCursor } from "@/hooks/useFishCursor";
import {
  FISH_SIZE,
  FISH_SPEED,
  SCROLL_PATH,
  FISH_ENABLED,
  GLOW_CONFIG,
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
  // Clamp
  const p = Math.max(0, Math.min(1, progress));

  // Find the two surrounding waypoints
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

  // Normalize progress within this segment
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
  const [fishSize, setFishSize] = useState(FISH_SIZE.desktop);
  const [direction, setDirection] = useState(1);

  // Smooth position state (updated via rAF, not React state to avoid rerenders)
  const posRef = useRef({ x: 0, y: 0 });
  const prevPosRef = useRef({ x: 0, y: 0 });
  const fishElRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  // Scroll progress
  const scrollProgress = useFishScroll();

  // Cursor tracking
  const cursorState = useFishCursor(posRef.current.x, posRef.current.y);

  // Entry animation state
  const [entryComplete, setEntryComplete] = useState(false);
  const entryStartTime = useRef(0);

  // Mouse tracking for dynamic cursor attraction
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseActiveRef = useRef(false);

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
    }, 3200); // After splash screen fades

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

    // Calculate target position from scroll
    const target = interpolatePath(scrollProgress, SCROLL_PATH);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetPx = {
      x: (target.x / 100) * vw,
      y: (target.y / 100) * vh,
    };

    // Cursor attraction deviation (fish gently deviates towards cursor when nearby)
    if (isMouseActiveRef.current) {
      const dxMouse = mousePosRef.current.x - targetPx.x;
      const dyMouse = mousePosRef.current.y - targetPx.y;
      const distMouse = Math.hypot(dxMouse, dyMouse);
      
      if (distMouse < 350) {
        const pullStrength = (1 - distMouse / 350) * 75; // Pull up to 75px
        const angleMouse = Math.atan2(dyMouse, dxMouse);
        targetPx.x += Math.cos(angleMouse) * pullStrength;
        targetPx.y += Math.sin(angleMouse) * pullStrength;
      }
    }

    // Entry animation override
    if (!entryComplete) {
      const elapsed = performance.now() - entryStartTime.current;
      const entryProgress = Math.min(1, elapsed / (FISH_SPEED.entryDuration * 1000));

      if (entryProgress < 1) {
        const eased = smoothstep(entryProgress);
        const startX = -fishSize * 1.5;
        const startY = vh * 0.4;

        targetPx.x = startX + (targetPx.x - startX) * eased;
        targetPx.y = startY + (targetPx.y - startY) * eased;
      } else {
        setEntryComplete(true);
      }
    }

    // Smooth interpolation of position
    const lerp = 0.08;
    posRef.current.x += (targetPx.x - posRef.current.x) * lerp;
    posRef.current.y += (targetPx.y - posRef.current.y) * lerp;

    // Calculate direction (which way is fish swimming)
    const dx = posRef.current.x - prevPosRef.current.x;
    const currentDirection = dx >= 0 ? 1 : -1;

    // Calculate swim angle from movement
    const dy = posRef.current.y - prevPosRef.current.y;
    const moveAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.4;
    const clampedAngle = Math.max(-15, Math.min(15, moveAngle));

    // Calculate velocity (pixels traveled since last frame)
    const velocity = Math.hypot(dx, dy);

    // Map velocity to tail wag & fin flutter durations (faster movement = faster tail wag & fin flutter)
    const maxVelocity = 20; // Maximum expected velocity delta per frame
    const tailWagDuration = Math.max(0.35, 1.2 - (velocity / maxVelocity) * 0.85);
    const finFlutterDuration = Math.max(0.6, 2.0 - (velocity / maxVelocity) * 1.4);

    // Apply transform (GPU-accelerated)
    el.style.transform = `translate3d(${posRef.current.x - fishSize / 2}px, ${posRef.current.y - fishSize * 0.275}px, 0) rotate(${clampedAngle}deg)`;
    el.style.setProperty("--fish-direction", String(currentDirection));
    el.style.setProperty("--tail-wag-duration", `${tailWagDuration}s`);
    el.style.setProperty("--fin-flutter-duration", `${finFlutterDuration}s`);

    setDirection((prev) => (prev !== currentDirection ? currentDirection : prev));

    prevPosRef.current = { ...posRef.current };

    rafRef.current = requestAnimationFrame(animate);
  }, [scrollProgress, isPaused, entryComplete, fishSize]);

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
        {/* Ambient glow */}
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

        <HeroFish
          size={fishSize}
          direction={direction}
          cursorTiltX={cursorState.tiltX}
          cursorTiltY={cursorState.tiltY}
        />
      </div>

      {/* Bubble trail */}
      <BubbleTrail
        fishX={posRef.current.x}
        fishY={posRef.current.y}
        direction={direction}
        paused={isPaused}
      />
    </>
  );
}
