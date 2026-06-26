"use client";

import React from "react";

interface HeroFishProps {
  size: number;
  /** 1 = facing right, -1 = facing left */
  direction: number;
  /** Extra head tilt from cursor in degrees */
  cursorTiltX: number;
  cursorTiltY: number;
}

/**
 * HeroFish — Premium semi-realistic orange fish SVG.
 * All idle animations (tail, fins, body sway, breathing, blink) are
 * pure CSS @keyframes — zero JS per-frame cost.
 */
const HeroFish: React.FC<HeroFishProps> = React.memo(
  ({ size, direction, cursorTiltX, cursorTiltY }) => {
    return (
      <div
        className="hero-fish"
        style={{
          width: size,
          height: size * 0.55,
          transform: `scaleX(${direction})`,
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", // Smooth spring-like flip transition
          filter: "drop-shadow(0 0 18px rgba(255, 140, 50, 0.15))",
          willChange: "transform",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `rotate(${cursorTiltY}deg)`,
            willChange: "transform",
          }}
        >
          <svg
          viewBox="0 0 200 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            {/* Body gradient */}
            <linearGradient id="fishBodyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF8C32" />
              <stop offset="35%" stopColor="#FF6B1A" />
              <stop offset="70%" stopColor="#E85A10" />
              <stop offset="100%" stopColor="#CC4A08" />
            </linearGradient>

            {/* Belly highlight */}
            <linearGradient id="fishBellyGrad" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#FFB366" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FF8C32" stopOpacity="0" />
            </linearGradient>

            {/* Scale pattern shimmer */}
            <radialGradient id="fishShimmer" cx="0.4" cy="0.3" r="0.6">
              <stop offset="0%" stopColor="#FFD4A8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF8C32" stopOpacity="0" />
            </radialGradient>

            {/* Fin gradient */}
            <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF9E4A" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#E85A10" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* ─── Tail (animated via CSS) ─── */}
          <g className="hero-fish-tail">
            <path
              d="M8 55 Q-5 30 2 15 Q10 35 18 40 Q10 45 18 60 Q10 65 2 95 Q-5 80 8 55Z"
              fill="url(#fishBodyGrad)"
              opacity="0.85"
            />
          </g>

          {/* ─── Body ─── */}
          <g className="hero-fish-body">
            {/* Main body shape */}
            <ellipse
              cx="100"
              cy="55"
              rx="75"
              ry="38"
              fill="url(#fishBodyGrad)"
            />

            {/* Belly highlight */}
            <ellipse
              cx="105"
              cy="65"
              rx="55"
              ry="20"
              fill="url(#fishBellyGrad)"
            />

            {/* Scale shimmer */}
            <ellipse
              cx="90"
              cy="45"
              rx="40"
              ry="22"
              fill="url(#fishShimmer)"
            />

            {/* Subtle scale lines */}
            <path
              d="M65 42 Q75 38 85 42"
              stroke="#FFB366"
              strokeWidth="0.5"
              fill="none"
              opacity="0.2"
            />
            <path
              d="M80 48 Q90 44 100 48"
              stroke="#FFB366"
              strokeWidth="0.5"
              fill="none"
              opacity="0.15"
            />
            <path
              d="M95 42 Q105 38 115 42"
              stroke="#FFB366"
              strokeWidth="0.5"
              fill="none"
              opacity="0.18"
            />

            {/* Lateral line */}
            <path
              d="M35 55 Q80 52 155 55"
              stroke="#CC4A08"
              strokeWidth="0.8"
              fill="none"
              opacity="0.2"
            />
          </g>

          {/* ─── Dorsal fin (top, animated) ─── */}
          <g className="hero-fish-dorsal">
            <path
              d="M75 18 Q90 2 115 10 Q105 20 95 18Z"
              fill="url(#finGrad)"
            />
          </g>

          {/* ─── Pectoral fin (side, animated) ─── */}
          <g className="hero-fish-pectoral">
            <path
              d="M90 70 Q100 88 80 92 Q85 80 90 70Z"
              fill="url(#finGrad)"
              opacity="0.7"
            />
          </g>

          {/* ─── Ventral fin (bottom) ─── */}
          <path
            d="M110 85 Q115 95 105 93 Q108 87 110 85Z"
            fill="url(#finGrad)"
            opacity="0.5"
          />

          {/* ─── Eye ─── */}
          <g className="hero-fish-head" style={{ transform: `rotate(${cursorTiltX * 0.3}deg)`, transformOrigin: '155px 48px' }}>
            {/* Eye socket */}
            <circle cx="155" cy="48" r="9" fill="#1a0e06" opacity="0.15" />
            {/* Outer eye */}
            <circle cx="155" cy="48" r="7" fill="#0d0805" />
            {/* Iris */}
            <circle cx="155" cy="48" r="5.5" fill="#1a1008" />
            {/* Pupil */}
            <circle cx="156.5" cy="47" r="3" fill="#000" />
            {/* Eye highlight */}
            <circle cx="158" cy="45.5" r="1.5" fill="#fff" opacity="0.9" />
            <circle cx="153" cy="49" r="0.8" fill="#fff" opacity="0.4" />

            {/* Eyelid (blink animation via CSS) */}
            <ellipse
              className="hero-fish-eyelid"
              cx="155"
              cy="48"
              rx="8"
              ry="0"
              fill="#E85A10"
            />
          </g>

          {/* ─── Mouth ─── */}
          <path
            d="M172 58 Q176 56 174 60"
            stroke="#CC4A08"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* ─── Gill mark ─── */}
          <path
            d="M140 42 Q138 55 140 65"
            stroke="#CC4A08"
            strokeWidth="0.8"
            fill="none"
            opacity="0.2"
            strokeLinecap="round"
          />
        </svg>
        </div>
      </div>
    );
  }
);

HeroFish.displayName = "HeroFish";

export default HeroFish;
