"use client";

import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { BUBBLE_CONFIG } from "@/lib/heroFishConfig";

export interface BubbleTrailHandle {
  spawnBubble: (fishX: number, fishY: number, direction: number, fromMouth?: boolean) => void;
}

interface Bubble {
  el: HTMLDivElement;
  active: boolean;
}

/**
 * BubbleTrail — Direct DOM injection bubble trail system.
 * Avoids React state and prop rerender overhead. Exposes spawnBubble
 * imperatively to the parent controller.
 */
const BubbleTrail = forwardRef<BubbleTrailHandle, {}>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<Bubble[]>([]);

  // Initialize bubble pool
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

  const spawnBubble = useCallback((fishX: number, fishY: number, direction: number, fromMouth = false) => {
    const bubble = poolRef.current.find((b) => !b.active);
    if (!bubble) return;

    const { sizeRange, opacityRange, durationRange, driftX } = BUBBLE_CONFIG;

    let size: number;
    let opacity: number;
    let x: number;
    let y: number;

    if (fromMouth) {
      // Mouth bubbles — smaller, from the head area
      size = 1.5 + Math.random() * 3;
      opacity = 0.1 + Math.random() * 0.15;
      const mouthOffsetX = direction > 0 ? 35 : -35;
      x = fishX + mouthOffsetX + (Math.random() - 0.5) * 6;
      y = fishY + 5 + (Math.random() - 0.5) * 4;
    } else {
      // Tail bubbles — varied sizes, from behind the fish
      size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      opacity = opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]);
      const tailOffsetX = direction > 0 ? -25 : 25;
      x = fishX + tailOffsetX + (Math.random() - 0.5) * 14;
      y = fishY + (Math.random() - 0.5) * 10;
    }

    const duration = durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]);
    const drift = (Math.random() - 0.5) * driftX;
    const wobble = 2 + Math.random() * 4; // Wobble amplitude

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
      --bubble-wobble: ${wobble}px;
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
  }, []);

  useImperativeHandle(ref, () => ({
    spawnBubble
  }));

  return (
    <div
      ref={containerRef}
      className="hero-fish-bubbles"
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 4 }}
    />
  );
});

BubbleTrail.displayName = "BubbleTrail";

export default BubbleTrail;
