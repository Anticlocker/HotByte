"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

// ─── HeroBackground ────────────────────────────────────────────────────────
export default function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect mobile + reduced motion
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    setIsMobile(mobileQuery.matches);
    setReducedMotion(false); // Force false to ensure showcase review plays animations

    const handleMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mobileQuery.addEventListener("change", handleMobile);

    return () => {
      mobileQuery.removeEventListener("change", handleMobile);
    };
  }, []);

  // Generate particles
  useEffect(() => {
    if (reducedMotion) {
      setParticles([]);
      return;
    }

    const count = isMobile ? 20 : 45;
    const generated: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2, // size 2px to 6px
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.4 + 0.25, // opacity 25% to 65%
    }));
    setParticles(generated);
  }, [isMobile, reducedMotion]);

  // Mouse tracking (throttled via rAF)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (reducedMotion || !containerRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty("--mouse-x", `${x}%`);
        el.style.setProperty("--mouse-y", `${y}%`);
      });
    },
    [reducedMotion]
  );

  // Scroll parallax
  const handleScroll = useCallback(() => {
    if (reducedMotion || !containerRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const scrollY = window.scrollY;
      el.style.setProperty("--scroll-y", `${scrollY}`);
    });
  }, [reducedMotion]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleScroll]);

  // Mobile tilt support
  useEffect(() => {
    if (!isMobile || reducedMotion) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!containerRef.current || e.gamma === null || e.beta === null) return;
      const x = 50 + (e.gamma / 90) * 30; // -90 to 90 → 20-80
      const y = 50 + ((e.beta - 45) / 90) * 30; // centered around 45°
      containerRef.current.style.setProperty("--mouse-x", `${x}%`);
      containerRef.current.style.setProperty("--mouse-y", `${y}%`);
    };

    window.addEventListener("deviceorientation", handleOrientation, { passive: true });
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [isMobile, reducedMotion]);

  if (reducedMotion) {
    // Static gradient background fallback
    return (
      <div
        className="hero-bg-static"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,90,31,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(245,158,11,0.06) 0%, transparent 60%), #050507",
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="hero-bg-container"
      aria-hidden="true"
      style={
        {
          "--mouse-x": "50%",
          "--mouse-y": "50%",
          "--scroll-y": "0",
        } as React.CSSProperties
      }
    >
      {/* ── Gradient Blobs ── */}
      <div className="hero-blob hero-blob-1" />
      <div className="hero-blob hero-blob-2" />
      <div className="hero-blob hero-blob-3" />

      {/* ── Mouse-reactive glow ── */}
      <div className="hero-mouse-glow" />

      {/* ── Light Beams ── */}
      <div className="hero-beam hero-beam-1" />
      <div className="hero-beam hero-beam-2" />

      {/* ── Mesh gradient overlay ── */}
      <div className="hero-mesh-overlay" />

      {/* ── Floating particles ── */}
      <div className="hero-particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className="hero-particle"
            style={
              {
                "--p-x": `${p.x}%`,
                "--p-y": `${p.y}%`,
                "--p-size": `${p.size}px`,
                "--p-duration": `${p.duration}s`,
                "--p-delay": `${p.delay}s`,
                "--p-opacity": p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* ── Noise texture overlay ── */}
      <div className="hero-noise" />
    </div>
  );
}
