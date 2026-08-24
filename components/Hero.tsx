"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import MagneticButton from "@/components/MagneticButton";
import PlayButton from "@/components/PlayButton";
import Parallax from "@/components/Parallax";
import SocialRail from "@/components/SocialRail";
import StudioStamp from "@/components/StudioStamp";
import MultilineText from "@/components/MultilineText";
import { defaultModuleData, type HeroModuleData } from "@/lib/modules";

export default function Hero({
  content = defaultModuleData("hero") as unknown as HeroModuleData,
  socials,
}: {
  content?: HeroModuleData;
  socials?: { instagramUrl: string; facebookUrl: string };
}) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || !scopeRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.set(".hero-reveal", { clipPath: "inset(0 0 100% 0)" })
        .set(".hero-fade", { opacity: 0, y: 24 })
        .set(".hero-portrait", { opacity: 0, scale: 1.06, x: 30 })
        .to(".hero-line-1", { clipPath: "inset(0 0 0% 0)", duration: 0.9 }, 0.15)
        .to(".hero-line-2", { clipPath: "inset(0 0 0% 0)", duration: 0.9 }, 0.32)
        .to(
          ".hero-portrait",
          { opacity: 1, scale: 1, x: 0, duration: 1.3, ease: "power2.out" },
          0.05
        )
        .to(
          ".hero-fade",
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 },
          0.55
        );
    }, scopeRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="home"
      ref={scopeRef}
      className="relative min-h-[860px] w-full overflow-hidden bg-ink-black lg:h-screen"
    >
      {/* Background texture */}
      <div className="absolute inset-0 overflow-hidden">
        <Parallax speed={0.08} className="absolute inset-x-0 -top-[8%] h-[116%]">
          <Image
            src={content.backgroundImage}
            alt=""
            fill
            priority
            className="object-cover opacity-40"
            sizes="100vw"
          />
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-r from-ink-black via-ink-black/70 to-ink-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-black via-transparent to-ink-black/40" />
      </div>

      {/* Portrait */}
      <div className="hero-portrait absolute right-0 top-0 h-full w-full overflow-hidden lg:w-[58%]">
        <div className="portrait-fade relative h-full w-full">
          <Parallax speed={0.12} className="absolute inset-x-0 -top-[10%] h-[120%]">
            <Image
              src={content.portraitImage}
              alt="Portret artysty tatuażu CoolInk"
              fill
              priority
              className="object-cover object-[65%_20%]"
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </Parallax>
        </div>
      </div>

      <SocialRail instagramUrl={socials?.instagramUrl} facebookUrl={socials?.facebookUrl} />
      <StudioStamp />

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1536px] px-6 pt-[168px] md:px-10 lg:px-16">
        {/* Section index rail */}
        <div className="hero-fade mr-8 hidden flex-col items-center pt-2 lg:flex">
          <span className="font-display text-lg text-ink-gold">01</span>
          <span className="mt-3 h-24 w-px bg-ink-grey/40" />
          <span
            className="mt-3 text-[11px] tracking-[0.3em] text-ink-grey"
            style={{ writingMode: "vertical-rl" }}
          >
            PRZEWIŃ
          </span>
        </div>

        <div className="flex max-w-2xl flex-col justify-center pb-16 pt-6">
          <p className="hero-fade mb-4 text-[13px] font-medium tracking-[0.35em] text-ink-gold">
            {content.eyebrow}
          </p>

          <h1 className="headline-texture -ml-1 text-[15vw] leading-[0.86] tracking-tight sm:text-[9vw] md:text-[6.2vw] lg:text-[5.4vw]">
            <span className="hero-reveal hero-line-1 block overflow-hidden">
              {content.heading1}
            </span>
            <span className="hero-reveal hero-line-2 block overflow-hidden">
              {content.heading2}
            </span>
          </h1>

          <div
            className="gold-underline hero-fade mt-5 h-3 w-64 md:w-80"
            aria-hidden
          />

          <p className="hero-fade mt-8 max-w-md text-[15px] leading-relaxed text-ink-grey">
            <MultilineText text={content.body} />
          </p>

          <div className="hero-fade mt-10 flex flex-wrap items-center gap-8">
            <MagneticButton
              href="#contact"
              className="inline-flex items-center gap-3 border border-ink-white/70 px-7 py-4 text-[13px] font-medium tracking-[0.08em] text-ink-white hover:border-ink-gold hover:text-ink-gold"
            >
              {content.primaryBtnLabel}
              <span aria-hidden>→</span>
            </MagneticButton>

            <PlayButton>{content.secondaryBtnLabel}</PlayButton>
          </div>
        </div>
      </div>

      {/* Scroll to discover */}
      <div className="hero-fade absolute bottom-8 left-6 z-10 flex items-center gap-3 text-[11px] tracking-[0.25em] text-ink-grey md:left-10 lg:left-16">
        <span>PRZEWIŃ, ABY ODKRYĆ</span>
        <span className="animate-bounce text-ink-gold" aria-hidden>
          ↓
        </span>
      </div>
    </section>
  );
}
