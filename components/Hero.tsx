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
import { imageSource } from "@/lib/imageSource";

export default function Hero({
  content = defaultModuleData("hero") as unknown as HeroModuleData,
  socials,
}: {
  content?: HeroModuleData;
  socials?: { instagramUrl: string; facebookUrl: string };
}) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const backgroundImage = imageSource(content.backgroundImage);
  const portraitImage = imageSource(content.portraitImage);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || !scopeRef.current) return;

    const portraitOpacity = window.matchMedia("(min-width: 1024px)").matches
      ? 1
      : 0.55;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.set(".hero-reveal", { clipPath: "inset(0 0 100% 0)" })
        .set(".hero-fade", { opacity: 0, y: 24 })
        .set(".hero-portrait", { opacity: 0, scale: 1.06, x: 30 })
        .to(".hero-line-1", { clipPath: "inset(0 0 0% 0)", duration: 0.9 }, 0.15)
        .to(".hero-line-2", { clipPath: "inset(0 0 0% 0)", duration: 0.9 }, 0.32)
        .to(
          ".hero-portrait",
          { opacity: portraitOpacity, scale: 1, x: 0, duration: 1.3, ease: "power2.out" },
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
      className="relative min-h-[100svh] w-full overflow-hidden bg-ink-black sm:min-h-[760px] md:min-h-[860px] lg:h-screen"
    >
      {/* Background texture */}
      <div className="absolute inset-0 overflow-hidden">
        <Parallax speed={0.08} className="absolute inset-x-0 -top-[8%] h-[116%]">
          {backgroundImage && <Image
            src={backgroundImage}
            alt=""
            fill
            priority
            className="object-cover opacity-40"
            sizes="100vw"
          />}
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-r from-ink-black via-ink-black/80 to-ink-black/40 lg:via-ink-black/70 lg:to-ink-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-black via-transparent to-ink-black/40" />
      </div>

      {/* Portrait */}
      {portraitImage && <div className="hero-portrait absolute right-0 top-0 h-full w-full overflow-hidden opacity-55 lg:w-[58%] lg:opacity-100">
        <div className="portrait-fade relative h-full w-full">
          <Parallax speed={0.12} className="absolute inset-x-0 -top-[10%] h-[120%]">
            <Image
              src={portraitImage}
              alt={content.portraitAlt}
              fill
              priority
              className="object-cover object-[65%_20%]"
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </Parallax>
        </div>
      </div>}

      <SocialRail instagramUrl={socials?.instagramUrl} facebookUrl={socials?.facebookUrl} />
      <StudioStamp ringText={content.stampRingText} leftText={content.stampLeftText} centerText={content.stampCenterText} rightText={content.stampRightText} />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1536px] px-4 pt-28 sm:min-h-[760px] sm:px-6 sm:pt-36 md:min-h-[860px] md:px-10 md:pt-[168px] lg:h-full lg:min-h-0 lg:px-16">
        <div className="flex min-w-0 max-w-2xl flex-col justify-center pb-12 pt-5 sm:pb-16 sm:pt-6">
          <p className="hero-fade mb-4 break-words text-xs font-medium tracking-[0.25em] text-ink-gold sm:text-[13px] sm:tracking-[0.35em]">
            {content.eyebrow}
          </p>

          <h1 className="headline-texture -ml-1 break-words text-[clamp(3rem,15vw,5rem)] leading-[0.88] tracking-tight sm:text-[9vw] md:text-[6.2vw] lg:text-[5.4vw]">
            <span className="hero-reveal hero-line-1 block overflow-hidden">
              {content.heading1}
            </span>
            <span className="hero-reveal hero-line-2 block overflow-hidden">
              {content.heading2}
            </span>
          </h1>

          <div
            className="gold-underline hero-fade mt-5 h-3 w-40 sm:w-64 md:w-80"
            aria-hidden
          />

          <p className="hero-fade mt-8 max-w-md text-[15px] leading-relaxed text-ink-grey">
            <MultilineText text={content.body} />
          </p>

          <div className="hero-fade mt-8 flex flex-wrap items-center gap-4 sm:mt-10 sm:gap-8">
            {content.primaryBtnLabel && <MagneticButton
              href={content.primaryBtnHref}
              className="inline-flex min-h-11 items-center gap-3 border border-ink-white/70 px-6 py-3.5 text-[13px] font-medium tracking-[0.08em] text-ink-white hover:border-ink-gold hover:text-ink-gold sm:px-7 sm:py-4"
            >
              {content.primaryBtnLabel}
              <span aria-hidden>→</span>
            </MagneticButton>}

            {content.secondaryBtnLabel && <PlayButton href={content.secondaryBtnHref}>{content.secondaryBtnLabel}</PlayButton>}
          </div>
        </div>
      </div>
    </section>
  );
}
