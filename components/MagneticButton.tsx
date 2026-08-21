"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { type MouseEvent, type ReactNode, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface MagneticButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Set false for buttons in fixed/always-visible chrome (e.g. the sticky header), where a "scroll into view" entrance doesn't apply. */
  animateOnScroll?: boolean;
}

export default function MagneticButton({
  href,
  children,
  className = "",
  animateOnScroll = true,
}: MagneticButtonProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  // Scroll-triggered entrance pop, independent of the magnetic hover transform.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || !animateOnScroll) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 18, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "back.out(1.6)",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => ctx.revert();
  }, [animateOnScroll]);

  function handleMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    x.set(relX * 0.28);
    y.set(relY * 0.35);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <div ref={wrapRef} className="inline-block">
      <motion.a
        ref={anchorRef}
        href={href}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x: springX, y: springY }}
        className={`magnetic-btn ${className}`}
      >
        {children}
      </motion.a>
    </div>
  );
}
