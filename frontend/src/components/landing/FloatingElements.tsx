"use client";

import { useEffect, useState } from "react";

// ─── Floating SVG Elements ─────────────────────────────────────────────────
// Each element uses a data-depth attribute for parallax and CSS custom properties
// for unique animation offsets. Hidden on screens < 768px.
// ────────────────────────────────────────────────────────────────────────────

interface FloatingItem {
  id: string;
  svg: React.ReactNode;
  x: number;
  y: number;
  depth: number; // 1 = near, 2 = mid, 3 = far
  size: number;
  duration: number;
  delay: number;
  rotation: number;
}

const floatingItems: FloatingItem[] = [
  {
    id: "qr-code",
    x: 8,
    y: 15,
    depth: 2,
    size: 48,
    duration: 22,
    delay: 0,
    rotation: -12,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <rect x="28" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <rect x="4" y="28" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="32" y="8" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="8" y="32" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="28" y="28" width="4" height="4" fill="currentColor" opacity="0.3" />
        <rect x="36" y="28" width="8" height="4" fill="currentColor" opacity="0.2" />
        <rect x="28" y="36" width="4" height="8" fill="currentColor" opacity="0.2" />
        <rect x="36" y="40" width="8" height="4" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "utensils",
    x: 88,
    y: 22,
    depth: 3,
    size: 36,
    duration: 26,
    delay: -5,
    rotation: 15,
    svg: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 4v10c0 2.2 1.8 4 4 4h0c2.2 0 4-1.8 4-4V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="18" x2="14" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="4" x2="14" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        <path d="M24 4c0 0 0 8 0 12s2 4 4 4h0V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="20" x2="28" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "order-card",
    x: 5,
    y: 65,
    depth: 1,
    size: 56,
    duration: 20,
    delay: -8,
    rotation: 8,
    svg: (
      <svg viewBox="0 0 56 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="52" height="68" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="10" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="8" y="18" width="40" height="2" rx="1" fill="currentColor" opacity="0.15" />
        <rect x="8" y="24" width="36" height="2" rx="1" fill="currentColor" opacity="0.15" />
        <rect x="8" y="30" width="40" height="2" rx="1" fill="currentColor" opacity="0.15" />
        <line x1="8" y1="40" x2="48" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
        <rect x="8" y="46" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
        <rect x="34" y="46" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
        <rect x="8" y="56" width="40" height="8" rx="4" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "analytics-widget",
    x: 92,
    y: 60,
    depth: 2,
    size: 52,
    duration: 24,
    delay: -12,
    rotation: -6,
    svg: (
      <svg viewBox="0 0 52 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="22" width="6" height="10" rx="1" fill="currentColor" opacity="0.2" />
        <rect x="18" y="16" width="6" height="16" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="28" y="10" width="6" height="22" rx="1" fill="currentColor" opacity="0.25" />
        <rect x="38" y="14" width="6" height="18" rx="1" fill="currentColor" opacity="0.2" />
        <path d="M8 18 L18 12 L28 8 L38 11 L44 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "menu-card",
    x: 82,
    y: 78,
    depth: 3,
    size: 44,
    duration: 28,
    delay: -3,
    rotation: 10,
    svg: (
      <svg viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <rect x="6" y="6" width="32" height="16" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="22" cy="14" r="4" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
        <rect x="8" y="28" width="20" height="2" rx="1" fill="currentColor" opacity="0.25" />
        <rect x="8" y="34" width="28" height="1.5" rx="0.75" fill="currentColor" opacity="0.15" />
        <rect x="8" y="39" width="24" height="1.5" rx="0.75" fill="currentColor" opacity="0.15" />
        <rect x="28" y="46" width="10" height="4" rx="2" fill="currentColor" opacity="0.25" />
      </svg>
    ),
  },
  {
    id: "dashboard-preview",
    x: 15,
    y: 82,
    depth: 1,
    size: 50,
    duration: 18,
    delay: -15,
    rotation: -4,
    svg: (
      <svg viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="56" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="10" x2="58" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        <circle cx="7" cy="6" r="1.5" fill="currentColor" opacity="0.3" />
        <circle cx="12" cy="6" r="1.5" fill="currentColor" opacity="0.2" />
        <circle cx="17" cy="6" r="1.5" fill="currentColor" opacity="0.15" />
        <rect x="6" y="14" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
        <rect x="30" y="14" width="24" height="10" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
        <rect x="6" y="28" width="48" height="6" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
      </svg>
    ),
  },
];

export default function FloatingElements() {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 768px)");

    setVisible(!mobileQuery.matches);
    setReducedMotion(false); // Force false for showcase review

    const handleMobile = (e: MediaQueryListEvent) => setVisible(!e.matches);
    mobileQuery.addEventListener("change", handleMobile);

    return () => {
      mobileQuery.removeEventListener("change", handleMobile);
    };
  }, []);

  if (!visible || reducedMotion) return null;

  return (
    <div className="floating-elements-container" aria-hidden="true">
      {floatingItems.map((item) => (
        <div
          key={item.id}
          className="floating-element"
          style={
            {
              "--fe-x": `${item.x}%`,
              "--fe-y": `${item.y}%`,
              "--fe-size": `${item.size}px`,
              "--fe-duration": `${item.duration}s`,
              "--fe-delay": `${item.delay}s`,
              "--fe-rotation": `${item.rotation}deg`,
            } as React.CSSProperties
          }
        >
          <div className={`floating-depth-${item.depth} w-full h-full`}>
            {item.svg}
          </div>
        </div>
      ))}
    </div>
  );
}
