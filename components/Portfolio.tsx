"use client";

import Image from "next/image";
import { useState } from "react";
import MagneticButton from "@/components/MagneticButton";
import PlayButton from "@/components/PlayButton";
import Parallax from "@/components/Parallax";
import MultilineText from "@/components/MultilineText";
import CalligraphyBackground from "@/components/CalligraphyBackground";
import { defaultModuleData, type PortfolioModuleData } from "@/lib/modules";
import type { PortfolioWork } from "@/lib/portfolio";
import { imageSource } from "@/lib/imageSource";

const FALLBACK_WORKS: PortfolioWork[] = [
  { id: "1", src: "/images/crops/portfolio-1.jpg", alt: "Rzeźbiarski, realistyczny rękaw tatuażu" },
  { id: "2", src: "/images/crops/portfolio-2.jpg", alt: "Ryczący tygrys — tatuaż realistyczny" },
  { id: "3", src: "/images/crops/portfolio-3.jpg", alt: "Portret kobiety w masce — tatuaż" },
  { id: "4", src: "/images/crops/portfolio-4.jpg", alt: "Maska wojownika — tatuaż realistyczny" },
];

export default function Portfolio({
  content = defaultModuleData("portfolio") as unknown as PortfolioModuleData,
  works = FALLBACK_WORKS,
}: {
  content?: PortfolioModuleData;
  works?: PortfolioWork[];
}) {
  const [active, setActive] = useState(0);
  const validWorks = works.flatMap((work) => {
    const source = imageSource(work.src);
    return source ? [{ ...work, src: source }] : [];
  });
  const hasWorks = validWorks.length > 0;

  function prev() {
    setActive((i) => (i - 1 + validWorks.length) % validWorks.length);
  }
  function next() {
    setActive((i) => (i + 1) % validWorks.length);
  }

  return (
    <section id="portfolio" className="relative overflow-hidden bg-ink-black py-16 sm:py-20 md:py-32">
      <CalligraphyBackground opacity={0.045} position="30% 10%" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 380px 320px at 90% 20%, rgba(201,154,74,0.14), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1536px] px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="grid min-w-0 w-full items-center gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Text column */}
          <div className="reveal-up max-w-xl">
            <p className="mb-4 break-words text-xs font-medium tracking-[0.25em] text-ink-gold sm:text-[13px] sm:tracking-[0.35em]">
              {content.eyebrow}
            </p>

            <h2 className="headline-texture -ml-1 break-words text-[clamp(2.75rem,15vw,4.75rem)] leading-[0.88] tracking-tight sm:text-[8.5vw] md:text-[5.6vw] lg:text-[3.9vw]">
              <span className="block">{content.heading1}</span>
              <span className="block">{content.heading2}</span>
            </h2>

            <div className="gold-underline mt-5 h-3 w-40 sm:w-56 md:w-64" aria-hidden />

            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-grey">
              <MultilineText text={content.body} />
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4 sm:gap-8">
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

          {/* Image strip */}
          <div className="reveal-up flex flex-col gap-4">
            {hasWorks ? (
              <>
                <div className="flex h-[340px] gap-1 sm:h-[420px] sm:gap-1.5 md:h-[485px]">
                  {validWorks.map((work, i) => (
                    <button
                      key={work.id}
                      onClick={() => setActive(i)}
                      aria-label={`Zobacz pracę ${i + 1}`}
                      className="group relative flex-1 overflow-hidden transition-all duration-500 ease-out"
                      style={{ flexGrow: active === i ? 1.6 : 1 }}
                    >
                      <Parallax
                        speed={0.1 + i * 0.05}
                        className="absolute inset-x-0 -top-[10%] h-[120%]"
                      >
                        <Image
                          src={work.src}
                          alt={work.alt}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          sizes="(min-width: 768px) 20vw, 25vw"
                        />
                      </Parallax>
                      <div
                        className={`absolute inset-0 bg-ink-black transition-opacity duration-500 ${
                          active === i ? "opacity-0" : "opacity-30"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-4">
                  <button
                    onClick={prev}
                    aria-label="Poprzednia praca"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-gold text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black"
                  >
                    ←
                  </button>
                  <button
                    onClick={next}
                    aria-label="Następna praca"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-gold text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black"
                  >
                    →
                  </button>
                  <span className="ml-1 text-[13px] tracking-[0.15em] text-ink-white">
                    <span className="text-ink-gold">0{active + 1}</span> / 0{validWorks.length}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-[420px] items-center justify-center border border-dashed border-ink-white/15 text-center text-[14px] text-ink-grey md:h-[485px]">
                {content.emptyMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
