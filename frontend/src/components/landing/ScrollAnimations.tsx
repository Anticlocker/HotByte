"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";

// ─── Animation Variant Presets ─────────────────────────────────────────────
const variantMap: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
};

// ─── AnimateOnScroll ────────────────────────────────────────────────────────
// A wrapper that animates its children when they enter the viewport.
// Uses Framer Motion's useInView (IntersectionObserver under the hood).
// ────────────────────────────────────────────────────────────────────────────

interface AnimateOnScrollProps {
  children: React.ReactNode;
  variant?: keyof typeof variantMap;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  amount?: number;
  as?: keyof HTMLElementTagNameMap;
}

export function AnimateOnScroll({
  children,
  variant = "fadeUp",
  delay = 0,
  duration = 0.6,
  className = "",
  once = true,
  amount = 0.3,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });
  const shouldReduceMotion = false; // Force false for showcase review

  const variants = variantMap[variant] || variantMap.fadeUp;

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // expo out
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer ──────────────────────────────────────────────────────
// A parent container that staggers the entrance of its direct children.
// Children should be wrapped in <StaggerItem> for orchestration.
// ────────────────────────────────────────────────────────────────────────────

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
  amount?: number;
}

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.08,
  once = true,
  amount = 0.2,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });
  const shouldReduceMotion = false; // Force false for showcase review

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerItem ───────────────────────────────────────────────────────────
// Individual child item for StaggerContainer. Automatically picks up
// stagger timing from parent.
// ────────────────────────────────────────────────────────────────────────────

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variantMap;
  duration?: number;
}

export function StaggerItem({
  children,
  className = "",
  variant = "fadeUp",
  duration = 0.5,
}: StaggerItemProps) {
  const shouldReduceMotion = false; // Force false for showcase review
  const variants = variantMap[variant] || variantMap.fadeUp;

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      transition={{
        duration,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── ParallaxScroll ────────────────────────────────────────────────────────
// Applies a subtle parallax effect to children based on scroll position.
// ────────────────────────────────────────────────────────────────────────────

interface ParallaxScrollProps {
  children: React.ReactNode;
  className?: string;
  speed?: number; // positive = slower, negative = faster
}

export function ParallaxScroll({
  children,
  className = "",
  speed = 0.15,
}: ParallaxScrollProps) {
  const shouldReduceMotion = false; // Force false for showcase review

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      style={{ willChange: "transform" }}
      initial={{ y: 0 }}
      whileInView={{ y: 0 }}
      viewport={{ once: false, amount: 0 }}
      transition={{ type: "tween" }}
    >
      {children}
    </motion.div>
  );
}
