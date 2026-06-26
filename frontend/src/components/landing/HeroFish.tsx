"use client";

import React from "react";

interface HeroFishProps {
  size: number;
}

/**
 * HeroFish — Realistic goldfish SVG with metallic scales,
 * flowing split fantail, translucent fins, and organic detail.
 * All idle animations (tail, fins, body sway, breathing, blink, shimmer)
 * are pure CSS @keyframes — zero JS per-frame cost.
 */
const HeroFish: React.FC<HeroFishProps> = React.memo(
  ({ size }) => {
    return (
      <div
        className="hero-fish"
        style={{
          width: size,
          height: size * 0.6,
          transform: `scaleX(var(--fish-direction, 1)) scaleX(var(--fish-stretch, 1)) scaleY(var(--fish-squash, 1))`,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          filter: "drop-shadow(0 0 24px rgba(255, 180, 50, 0.2))",
          willChange: "transform",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `rotate(var(--fish-tilt-y, 0deg))`,
            willChange: "transform",
          }}
        >
          <svg
            viewBox="0 0 240 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            aria-hidden="true"
          >
            <defs>
              {/* ── Metallic Gold Body Gradient ── */}
              <linearGradient id="goldBodyGrad" x1="0" y1="0.2" x2="1" y2="0.8">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="20%" stopColor="#FFC233" />
                <stop offset="45%" stopColor="#FF9F1A" />
                <stop offset="70%" stopColor="#E8820E" />
                <stop offset="100%" stopColor="#CC6A05" />
              </linearGradient>

              {/* ── Belly Light Gradient ── */}
              <linearGradient id="goldBellyGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#FFE8A0" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#FFCC66" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#FF9F1A" stopOpacity="0" />
              </linearGradient>

              {/* ── Shimmer Sweep (animated via CSS) ── */}
              <linearGradient id="shimmerSweep" x1="0" y1="0" x2="1" y2="0.3">
                <stop offset="0%" stopColor="#FFFDE8" stopOpacity="0" />
                <stop offset="40%" stopColor="#FFFDE8" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFF5CC" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#FFFDE8" stopOpacity="0" />
                <stop offset="100%" stopColor="#FFFDE8" stopOpacity="0" />
              </linearGradient>

              {/* ── Tail Gradient ── */}
              <linearGradient id="goldTailGrad" x1="1" y1="0.3" x2="0" y2="0.7">
                <stop offset="0%" stopColor="#FFB84D" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#FF8C1A" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#E06600" stopOpacity="0.3" />
              </linearGradient>

              {/* ── Fin Gradient ── */}
              <linearGradient id="goldFinGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFD066" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#E8820E" stopOpacity="0.15" />
              </linearGradient>

              {/* ── Dorsal Fin Gradient ── */}
              <linearGradient id="dorsalFinGrad" x1="0.5" y1="1" x2="0.5" y2="0">
                <stop offset="0%" stopColor="#FF9F1A" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#FFD066" stopOpacity="0.2" />
              </linearGradient>

              {/* ── Eye Iris Radial ── */}
              <radialGradient id="goldIris" cx="0.45" cy="0.45" r="0.55">
                <stop offset="0%" stopColor="#3D2B00" />
                <stop offset="50%" stopColor="#6B4A00" />
                <stop offset="100%" stopColor="#1A0F00" />
              </radialGradient>

              {/* ── Scale Pattern ── */}
              <pattern id="scalePattern" x="0" y="0" width="14" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-5)">
                <path
                  d="M0 10 Q7 3 14 10"
                  fill="none"
                  stroke="#CC8820"
                  strokeWidth="0.4"
                  opacity="0.2"
                />
              </pattern>
            </defs>

            {/* ═══ FLOWING SPLIT FANTAIL ═══ */}
            <g className="hero-fish-tail">
              {/* Upper tail lobe */}
              <path
                d="M18 52 Q-2 25 8 8 Q15 20 22 30 Q18 38 22 45Z"
                fill="url(#goldTailGrad)"
                opacity="0.85"
              />
              {/* Central tail bridge */}
              <path
                d="M20 48 Q8 52 20 60 Q12 55 20 48Z"
                fill="url(#goldTailGrad)"
                opacity="0.65"
              />
              {/* Lower tail lobe */}
              <path
                d="M18 58 Q-2 85 8 102 Q15 90 22 78 Q18 70 22 63Z"
                fill="url(#goldTailGrad)"
                opacity="0.85"
              />
              {/* Tail vein lines */}
              <path d="M10 20 Q16 35 20 45" stroke="#CC6A05" strokeWidth="0.3" fill="none" opacity="0.3" />
              <path d="M10 90 Q16 75 20 63" stroke="#CC6A05" strokeWidth="0.3" fill="none" opacity="0.3" />
              <path d="M5 52 Q12 52 20 54" stroke="#CC6A05" strokeWidth="0.25" fill="none" opacity="0.25" />
            </g>

            {/* ═══ ANAL FIN (bottom rear) ═══ */}
            <g className="hero-fish-anal">
              <path
                d="M55 92 Q50 108 40 105 Q48 96 55 92Z"
                fill="url(#goldFinGrad)"
                opacity="0.55"
              />
            </g>

            {/* ═══ MAIN BODY ═══ */}
            <g className="hero-fish-body">
              {/* Body shape — slightly plumper for goldfish */}
              <ellipse
                cx="115"
                cy="60"
                rx="82"
                ry="42"
                fill="url(#goldBodyGrad)"
              />

              {/* Belly highlight */}
              <ellipse
                cx="120"
                cy="72"
                rx="60"
                ry="22"
                fill="url(#goldBellyGrad)"
              />

              {/* Scale texture overlay */}
              <ellipse
                cx="115"
                cy="60"
                rx="78"
                ry="39"
                fill="url(#scalePattern)"
                opacity="0.6"
              />

              {/* Shimmer sweep (animated via CSS) */}
              <ellipse
                className="hero-fish-shimmer"
                cx="115"
                cy="55"
                rx="75"
                ry="36"
                fill="url(#shimmerSweep)"
              />

              {/* Lateral line */}
              <path
                d="M42 58 Q90 54 180 58"
                stroke="#CC6A05"
                strokeWidth="0.7"
                fill="none"
                opacity="0.18"
                strokeDasharray="3 5"
              />

              {/* Scale detail arcs */}
              <path d="M60 45 Q72 40 84 45" stroke="#DDAA44" strokeWidth="0.4" fill="none" opacity="0.15" />
              <path d="M78 50 Q90 46 102 50" stroke="#DDAA44" strokeWidth="0.4" fill="none" opacity="0.12" />
              <path d="M96 45 Q108 41 120 45" stroke="#DDAA44" strokeWidth="0.4" fill="none" opacity="0.15" />
              <path d="M68 55 Q80 51 92 55" stroke="#DDAA44" strokeWidth="0.4" fill="none" opacity="0.1" />
              <path d="M86 60 Q98 56 110 60" stroke="#DDAA44" strokeWidth="0.4" fill="none" opacity="0.12" />
              <path d="M110 50 Q122 46 134 50" stroke="#DDAA44" strokeWidth="0.4" fill="none" opacity="0.1" />
              <path d="M128 45 Q140 41 152 45" stroke="#DDAA44" strokeWidth="0.4" fill="none" opacity="0.08" />
              <path d="M100 65 Q112 61 124 65" stroke="#DDAA44" strokeWidth="0.35" fill="none" opacity="0.08" />
            </g>

            {/* ═══ DORSAL FIN (long, flowing) ═══ */}
            <g className="hero-fish-dorsal">
              <path
                d="M80 19 Q95 2 120 5 Q135 3 145 12 Q130 18 115 17 Q100 19 88 18Z"
                fill="url(#dorsalFinGrad)"
              />
              {/* Fin ray lines */}
              <path d="M92 18 Q100 8 108 10" stroke="#CC8820" strokeWidth="0.3" fill="none" opacity="0.2" />
              <path d="M108 17 Q116 5 125 7" stroke="#CC8820" strokeWidth="0.3" fill="none" opacity="0.2" />
              <path d="M124 16 Q132 6 140 12" stroke="#CC8820" strokeWidth="0.3" fill="none" opacity="0.15" />
            </g>

            {/* ═══ PECTORAL FIN (side, longer) ═══ */}
            <g className="hero-fish-pectoral">
              <path
                d="M105 78 Q115 100 95 105 Q100 92 98 82 Q102 76 105 78Z"
                fill="url(#goldFinGrad)"
                opacity="0.6"
              />
              {/* Fin ray */}
              <path d="M103 80 Q108 95 97 100" stroke="#CC8820" strokeWidth="0.25" fill="none" opacity="0.2" />
            </g>

            {/* ═══ PELVIC FIN (small, belly) ═══ */}
            <path
              d="M130 92 Q134 102 125 100 Q128 94 130 92Z"
              fill="url(#goldFinGrad)"
              opacity="0.4"
            />

            {/* ═══ GILL PLATE ═══ */}
            <g className="hero-fish-gill">
              <path
                d="M155 42 Q152 58 155 75"
                stroke="#CC6A05"
                strokeWidth="1"
                fill="none"
                opacity="0.15"
                strokeLinecap="round"
              />
              {/* Gill breathing flare */}
              <ellipse
                className="hero-fish-gill-flare"
                cx="153"
                cy="62"
                rx="3"
                ry="8"
                fill="#E8820E"
                opacity="0.08"
              />
            </g>

            {/* ═══ EYE (detailed) ═══ */}
            <g className="hero-fish-head" style={{ transform: `rotate(calc(var(--fish-tilt-x, 0deg) * 0.3))`, transformOrigin: '175px 50px' }}>
              {/* Eye socket shadow */}
              <circle cx="175" cy="50" r="11" fill="#1a0e06" opacity="0.1" />
              {/* Outer eye (white/pale gold) */}
              <circle cx="175" cy="50" r="9" fill="#FFF8E8" />
              {/* Iris (golden-brown) */}
              <circle cx="175" cy="50" r="6.5" fill="url(#goldIris)" />
              {/* Pupil */}
              <circle cx="176.5" cy="49" r="3.5" fill="#000" />
              {/* Primary highlight */}
              <circle cx="178.5" cy="47" r="2" fill="#fff" opacity="0.95" />
              {/* Secondary highlight */}
              <circle cx="173" cy="52" r="1" fill="#fff" opacity="0.4" />
              {/* Golden iris ring */}
              <circle cx="175" cy="50" r="6.5" fill="none" stroke="#B8860B" strokeWidth="0.5" opacity="0.3" />

              {/* Eyelid (blink animation via CSS) */}
              <ellipse
                className="hero-fish-eyelid"
                cx="175"
                cy="50"
                rx="10"
                ry="0"
                fill="#E8980E"
              />
            </g>

            {/* ═══ MOUTH ═══ */}
            <g className="hero-fish-mouth">
              <path
                d="M195 63 Q200 60 198 66"
                stroke="#CC6A05"
                strokeWidth="1.3"
                fill="none"
                strokeLinecap="round"
                opacity="0.4"
              />
              {/* Upper lip contour */}
              <path
                d="M190 58 Q196 57 200 60"
                stroke="#CC6A05"
                strokeWidth="0.5"
                fill="none"
                opacity="0.15"
              />
            </g>

            {/* ═══ NOSTRIL ═══ */}
            <circle cx="188" cy="52" r="1" fill="#CC6A05" opacity="0.12" />

          </svg>
        </div>
      </div>
    );
  }
);

HeroFish.displayName = "HeroFish";

export default HeroFish;
