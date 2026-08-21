"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SmoothScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      ScrollTrigger.config({ ignoreMobileResize: true });
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Keep ScrollTrigger in sync with Lenis' virtual scroll position.
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis from GSAP's own ticker so both stay on one rAF loop.
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    // Recalculate trigger positions once images/fonts finish loading and
    // shift section heights, so parallax ranges stay accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const refreshTimeout = setTimeout(refresh, 1200);

    return () => {
      gsap.ticker.remove(update);
      window.removeEventListener("load", refresh);
      clearTimeout(refreshTimeout);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
