import Image from "next/image";
import MagneticButton from "@/components/MagneticButton";
import Parallax from "@/components/Parallax";
import MultilineText from "@/components/MultilineText";
import type { ImageTextModuleData } from "@/lib/modules";
import { imageSource } from "@/lib/imageSource";

export default function ImageText({ data }: { data: ImageTextModuleData }) {
  const reversed = data.imagePosition === "right";
  const source = imageSource(data.image);
  const showImage = Boolean(source || data.emptyMessage);

  return (
    <section className="relative overflow-hidden bg-ink-black py-16 sm:py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-1/2 opacity-40"
        style={{
          [reversed ? "right" : "left"]: 0,
          background: `radial-gradient(ellipse 360px 300px at ${
            reversed ? "80%" : "20%"
          } 40%, rgba(201,154,74,0.10), transparent 65%)`,
        }}
      />
      <div className="relative mx-auto max-w-[1536px] px-4 sm:px-6 md:px-10 lg:px-16">
        <div className={`grid min-w-0 items-center gap-10 sm:gap-14 lg:gap-10 ${showImage ? "lg:grid-cols-2" : ""}`}>
          <div className={`reveal-up max-w-xl ${reversed ? "lg:order-2" : ""}`}>
            <h2 className="headline-texture break-words text-[clamp(2.5rem,11vw,4.25rem)] leading-[0.9] tracking-tight sm:text-[7vw] md:text-[4.5vw] lg:text-[3.2vw]">
              <span className="block">{data.heading1}</span>
              {data.heading2 && <span className="block">{data.heading2}</span>}
            </h2>
            <div className="gold-underline mt-5 h-3 w-40 sm:w-56" aria-hidden />
            {data.body && (
              <p className="mt-8 text-[15px] leading-relaxed text-ink-grey">
                <MultilineText text={data.body} />
              </p>
            )}
            {data.buttonLabel && data.buttonUrl && (
              <div className="mt-9">
                <MagneticButton
                  href={data.buttonUrl}
                  className="inline-flex min-h-11 items-center gap-3 border border-ink-white/70 px-6 py-3.5 text-[13px] font-medium tracking-[0.08em] text-ink-white hover:border-ink-gold hover:text-ink-gold sm:px-7 sm:py-4"
                >
                  {data.buttonLabel}
                  <span aria-hidden>→</span>
                </MagneticButton>
              </div>
            )}
          </div>

          {showImage && <div
            className={`reveal-up relative h-[300px] w-full overflow-hidden bg-ink-charcoal md:h-[440px] ${
              reversed ? "lg:order-1" : ""
            }`}
          >
            {source ? (
              <Parallax speed={0.14} className="absolute inset-x-0 -top-[10%] h-[120%]">
                <Image
                  src={source}
                  alt={data.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                />
              </Parallax>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-ink-grey">
                {data.emptyMessage}
              </div>
            )}
          </div>}
        </div>
      </div>
    </section>
  );
}
