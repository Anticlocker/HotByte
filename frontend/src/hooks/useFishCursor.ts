"use client";

import { useEffect, useRef, useCallback } from "react";
import { CURSOR_CONFIG } from "@/lib/heroFishConfig";

interface CursorState {
  /** Smoothed angle offset in degrees (-maxTilt to +maxTilt) */
  tiltX: number;
  tiltY: number;
}

/**
 * useFishCursor — Tracks mouse position and returns a smoothed
 * tilt angle for the fish head. Desktop-only (no-op on touch).
 */
export function useFishCursor(
  fishX: number,
  fishY: number
): CursorState {
  const state = useRef<CursorState>({ tiltX: 0, tiltY: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const activeRef = useRef(false);

  const tick = useCallback(() => {
    if (!activeRef.current) return;

    const dx = mouseRef.current.x - fishX;
    const dy = mouseRef.current.y - fishY;

    // Calculate target tilt (clamped to maxTilt)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const targetTiltX = Math.max(
      -CURSOR_CONFIG.maxTilt,
      Math.min(CURSOR_CONFIG.maxTilt, angle * 0.15)
    );
    const targetTiltY = Math.max(
      -CURSOR_CONFIG.maxTilt * 0.5,
      Math.min(CURSOR_CONFIG.maxTilt * 0.5, dy * 0.02)
    );

    // Smooth interpolation
    state.current.tiltX +=
      (targetTiltX - state.current.tiltX) * CURSOR_CONFIG.smoothing;
    state.current.tiltY +=
      (targetTiltY - state.current.tiltY) * CURSOR_CONFIG.smoothing;

    rafRef.current = requestAnimationFrame(tick);
  }, [fishX, fishY]);

  useEffect(() => {
    // Only activate on desktop
    if (window.innerWidth < CURSOR_CONFIG.minScreenWidth) return;

    activeRef.current = true;

    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      activeRef.current = false;
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return state.current;
}
