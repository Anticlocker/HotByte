"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { BUBBLE_CONFIG } from "@/lib/heroFishConfig";

interface BubbleTrailProps {
  /** Fish position x in viewport pixels */
  fishX: number;
  /** Fish position y in viewport pixels */
  fishY: number;
  /** Whether the fish is facing right (1) or left (-1) */
  direction: number;
  /** Whether animation is paused */
  paused: boolean;
}

interface Bubble {
  el: HTMLDivElement;
  active: boolean;
}

/**
 * BubbleTrail — Lightweight CSS-animated bubble system.
 * Uses a fixed pool of recycled DOM nodes. Each bubble is positioned
 * at the fish's tail, then animates upward via CSS @keyframes.
 */
const BubbleTrail: React.FC<BubbleTrailProps> = React.memo(
  ({ fishX, fishY, direction, paused }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const poolRef = useRef<Bubble[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    // Initialize bubble pool
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Create pool
      const pool: Bubble[] = [];
      for (let i = 0; i < BUBBLE_CONFIG.poolSize; i++) {
        const el = document.createElement("div");
        el.className = "hero-fish-bubble";
        el.style.display = "none";
        container.appendChild(el);
        pool.push({ el, active: false });
      }
      poolRef.current = pool;

      return () => {
        pool.forEach((b) => b.el.remove());
        poolRef.current = [];
      };
    }, []);

    const spawnBubble = useCallback(() => {
      if (paused) return;

      // Find an inactive bubble
      const bubble = poolRef.current.find((b) => !b.active);
      if (!bubble) return;

      const { sizeRange, opacityRange, durationRange, driftX } = BUBBLE_CONFIG;
      const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      const opacity =
        opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]);
      const duration =
        durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]);
      const drift = (Math.random() - 0.5) * driftX;

      // Position at fish tail area
      const tailOffsetX = direction > 0 ? -20 : 20;
      const x = fishX + tailOffsetX + (Math.random() - 0.5) * 10;
      const y = fishY + (Math.random() - 0.5) * 8;

      const el = bubble.el;
      el.style.cssText = `
        display: block;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        opacity: ${opacity};
        --bubble-drift: ${drift}px;
        --bubble-duration: ${duration}s;
      `;
      el.classList.remove("hero-fish-bubble-animate");
      // Force reflow for animation restart
      void el.offsetWidth;
      el.classList.add("hero-fish-bubble-animate");

      bubble.active = true;

      // Recycle after animation ends
      setTimeout(() => {
        el.style.display = "none";
        el.classList.remove("hero-fish-bubble-animate");
        bubble.active = false;
      }, duration * 1000);
    }, [fishX, fishY, direction, paused]);

    // Spawn interval
    useEffect(() => {
      if (paused) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const ms = 1000 / BUBBLE_CONFIG.spawnRate;
      intervalRef.current = setInterval(spawnBubble, ms);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [spawnBubble, paused]);

    return (
      <div
        ref={containerRef}
        className="hero-fish-bubbles"
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 4 }}
      />
    );
  }
);

BubbleTrail.displayName = "BubbleTrail";

export default BubbleTrail;
