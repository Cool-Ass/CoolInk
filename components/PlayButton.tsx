"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function PlayButton({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.75 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.55,
          ease: "back.out(2)",
          delay: 0.1,
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <button ref={ref} className="group inline-flex items-center gap-3 text-[13px] font-medium tracking-[0.08em] text-ink-white">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-gold text-ink-gold transition-colors group-hover:bg-ink-gold group-hover:text-ink-black">
        ▶
      </span>
      {children}
    </button>
  );
}
