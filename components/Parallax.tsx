"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface ParallaxProps {
  children: ReactNode;
  /** Travel distance as a fraction of element height. 0.15 = gentle, 0.4 = dramatic. */
  speed?: number;
  className?: string;
  /** Also scales the element slightly as it enters/leaves for extra depth. */
  scale?: boolean;
}

export default function Parallax({
  children,
  speed = 0.18,
  className = "",
  scale = false,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const trigger = el?.parentElement;
    if (!el || !trigger) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -speed * 100, scale: scale ? 1.12 : 1 },
        {
          yPercent: speed * 100,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [speed, scale]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
