import Image from "next/image";
import MagneticButton from "@/components/MagneticButton";
import PlayButton from "@/components/PlayButton";
import CTABar from "@/components/CTABar";
import Parallax from "@/components/Parallax";
import MultilineText from "@/components/MultilineText";
import CalligraphyBackground from "@/components/CalligraphyBackground";
import { defaultModuleData, type StudioModuleData } from "@/lib/modules";
import { imageSource } from "@/lib/imageSource";

export default function Studio({
  content = defaultModuleData("studio") as unknown as StudioModuleData,
}: {
  content?: StudioModuleData;
}) {
  const studioImage = imageSource(content.image);
  return (
    <section id="studio" className="relative overflow-hidden bg-ink-black py-16 sm:py-20 md:py-32">
      <CalligraphyBackground opacity={0.045} position="15% 70%" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-2/5 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 340px 420px at 92% 30%, rgba(201,154,74,0.16), transparent 65%), radial-gradient(ellipse 260px 300px at 100% 85%, rgba(201,154,74,0.12), transparent 70%)",
        }}
      />

      <div className="relative mx-auto mb-12 flex max-w-[1536px] px-4 sm:mb-16 sm:px-6 md:px-10 lg:px-16">
        <div className={`grid min-w-0 w-full items-center gap-10 sm:gap-14 lg:gap-10 ${studioImage ? "lg:grid-cols-2" : ""}`}>
          {/* Text column */}
          <div className="reveal-up max-w-xl">
            <p className="mb-4 break-words text-xs font-medium tracking-[0.25em] text-ink-gold sm:text-[13px] sm:tracking-[0.35em]">
              {content.eyebrow}
            </p>

            <h2 className="headline-texture -ml-1 break-words text-[clamp(2.75rem,13vw,4.5rem)] leading-[0.88] tracking-tight sm:text-[7.5vw] md:text-[5vw] lg:text-[3.6vw]">
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

          {/* Studio photo */}
          {studioImage && <div className="reveal-up relative mx-auto h-[300px] w-full max-w-xl overflow-hidden shadow-2xl shadow-black/60 sm:h-[380px] lg:h-[560px]">
            <Parallax speed={0.14} className="absolute inset-x-0 -top-[10%] h-[120%]">
              <Image
                src={studioImage}
                alt={content.imageAlt}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 45vw, 90vw"
              />
            </Parallax>
            <div className="absolute inset-0 bg-gradient-to-t from-ink-black/30 via-transparent to-transparent" />
          </div>}
        </div>
      </div>

      <CTABar
        titleLines={[content.ctaTitle1, content.ctaTitle2]}
        message={content.ctaMessage}
        buttonLabel={content.ctaButtonLabel}
        href={content.ctaButtonHref}
      />
    </section>
  );
}
