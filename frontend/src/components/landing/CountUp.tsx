"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";

// ─── CountUp ───────────────────────────────────────────────────────────────
// Animates a number from 0 to target when scrolled into view.
// Accepts a display string (e.g. "₹45L+") and extracts the numeric portion.
// ────────────────────────────────────────────────────────────────────────────

interface CountUpProps {
  value: string;       // Display value like "50+", "10K+", "₹45L+", "99.99%"
  className?: string;
  duration?: number;   // Animation duration in ms
}

export default function CountUp({ value, className = "", duration = 1800 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const shouldReduceMotion = false; // Force false for showcase review
  const prevValueRef = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (!isInView || shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    // Extract numeric portion
    const match = value.match(/([\d.]+)/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const target = parseFloat(match[1]);
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index || 0) + match[1].length);
    const isDecimal = match[1].includes(".");
    const decimalPlaces = isDecimal ? match[1].split(".")[1].length : 0;

    const startVal = prevValueRef.current !== null ? prevValueRef.current : 0;
    prevValueRef.current = target;

    // Instantly update if it is a small increment (like +1) to avoid flashing
    if (Math.abs(target - startVal) <= 1 && startVal !== 0) {
      if (isDecimal) {
        setDisplayValue(`${prefix}${target.toFixed(decimalPlaces)}${suffix}`);
      } else {
        setDisplayValue(`${prefix}${target}${suffix}`);
      }
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;

      if (isDecimal) {
        setDisplayValue(`${prefix}${current.toFixed(decimalPlaces)}${suffix}`);
      } else {
        setDisplayValue(`${prefix}${Math.floor(current)}${suffix}`);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration, shouldReduceMotion]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
}
