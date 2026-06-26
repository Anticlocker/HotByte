"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useFishScroll — Returns normalized scroll progress (0 → 1)
 * across the entire document height. Uses rAF for throttled updates
 * with a passive scroll listener.
 */
export function useFishScroll(): number {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const lastProgress = useRef(0);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const p = docHeight > 0 ? Math.min(1, Math.max(0, scrollY / docHeight)) : 0;

      // Only update state if change is meaningful (avoids micro-rerenders)
      if (Math.abs(p - lastProgress.current) > 0.001) {
        lastProgress.current = p;
        setProgress(p);
      }
    });
  }, []);

  useEffect(() => {
    // Set initial progress
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return progress;
}
