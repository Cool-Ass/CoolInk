import Image from "next/image";
import MagneticButton from "@/components/MagneticButton";
import Parallax from "@/components/Parallax";
import MultilineText from "@/components/MultilineText";
import type { ImageTextModuleData } from "@/lib/modules";
import { imageSource } from "@/lib/imageSource";

export default function ImageText({ data }: { data: ImageTextModuleData }) {
  const reversed = data.imagePosition === "right";
  const source = imageSource(data.image);

  return (
    <section className="relative overflow-hidden bg-ink-black py-20 md:py-28">
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
      <div className="relative mx-auto max-w-[1536px] px-6 md:px-10 lg:px-16">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div className={`reveal-up max-w-xl ${reversed ? "lg:order-2" : ""}`}>
            <h2 className="headline-texture text-[11vw] leading-[0.9] tracking-tight sm:text-[7vw] md:text-[4.5vw] lg:text-[3.2vw]">
              <span className="block">{data.heading1}</span>
              {data.heading2 && <span className="block">{data.heading2}</span>}
            </h2>
            <div className="gold-underline mt-5 h-3 w-56" aria-hidden />
            {data.body && (
              <p className="mt-8 text-[15px] leading-relaxed text-ink-grey">
                <MultilineText text={data.body} />
              </p>
            )}
            {data.buttonLabel && data.buttonUrl && (
              <div className="mt-9">
                <MagneticButton
                  href={data.buttonUrl}
                  className="inline-flex items-center gap-3 border border-ink-white/70 px-7 py-4 text-[13px] font-medium tracking-[0.08em] text-ink-white hover:border-ink-gold hover:text-ink-gold"
                >
                  {data.buttonLabel}
                  <span aria-hidden>→</span>
                </MagneticButton>
              </div>
            )}
          </div>

          <div
            className={`reveal-up relative h-[300px] w-full overflow-hidden bg-ink-charcoal md:h-[440px] ${
              reversed ? "lg:order-1" : ""
            }`}
          >
            {source ? (
              <Parallax speed={0.14} className="absolute inset-x-0 -top-[10%] h-[120%]">
                <Image
                  src={source}
                  alt={data.heading1 || ""}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                />
              </Parallax>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-ink-grey">
                Brak wybranego obrazu
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
