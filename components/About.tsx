import Image from "next/image";
import Parallax from "@/components/Parallax";
import MultilineText from "@/components/MultilineText";
import CalligraphyBackground from "@/components/CalligraphyBackground";
import { defaultModuleData, type AboutModuleData } from "@/lib/modules";
import { imageSource } from "@/lib/imageSource";

export default function About({
  content = defaultModuleData("about") as unknown as AboutModuleData,
}: {
  content?: AboutModuleData;
}) {
  const mainImage = imageSource(content.mainImage);
  const detailImage1 = imageSource(content.detailImage1);
  const detailImage2 = imageSource(content.detailImage2);
  const detailImage3 = imageSource(content.detailImage3);
  const hasImages = [mainImage, detailImage1, detailImage2, detailImage3].some(Boolean);
  return (
    <section
      id="artists"
      className="relative overflow-hidden bg-ink-black py-16 sm:py-20 md:py-32"
    >
      <CalligraphyBackground opacity={0.05} position="80% 30%" />

      {/* ambient gold splatter */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 420px 260px at 62% 78%, rgba(201,154,74,0.16), transparent 65%), radial-gradient(ellipse 300px 200px at 78% 55%, rgba(201,154,74,0.10), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1536px] px-4 sm:px-6 md:px-10 lg:px-16">
        <div className={`grid min-w-0 w-full items-center gap-10 sm:gap-14 lg:gap-10 ${hasImages ? "lg:grid-cols-2" : ""}`}>
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

            <div className="mt-9">
              <p className="font-signature text-4xl leading-none text-ink-gold">
                {content.signatureName}
              </p>
              <p className="mt-2 text-[12px] tracking-[0.2em] text-ink-grey">
                {content.signatureRole}
              </p>
            </div>
          </div>

          {/* Image collage */}
          {hasImages && <div className="reveal-up relative mx-auto h-[420px] w-full max-w-md sm:h-[520px] lg:h-[620px] lg:max-w-none">

            {mainImage && <div className="absolute left-0 top-0 h-[85%] w-[62%] -rotate-2 border-[6px] border-ink-white/95 bg-ink-white shadow-2xl shadow-black/60">
              <div className="relative h-full w-full overflow-hidden">
                <Parallax speed={0.1} className="absolute inset-x-0 -top-[12%] h-[124%]">
                <Image
                  src={mainImage}
                  alt={content.mainImageAlt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 30vw, 60vw"
                />
                </Parallax>
              </div>
            </div>}

            {detailImage1 && <div className="absolute right-0 top-0 h-[34%] w-[42%] rotate-2 border-[5px] border-ink-white/95 bg-ink-white shadow-xl shadow-black/50">
              <div className="relative h-full w-full overflow-hidden">
                <Parallax speed={0.22} className="absolute inset-x-0 -top-[12%] h-[124%]">
                <Image
                  src={detailImage1}
                  alt={content.detailImage1Alt}
                  fill
                  className="object-cover"
                  sizes="220px"
                />
                </Parallax>
              </div>
            </div>}

            {detailImage2 && <div className="absolute right-0 top-[38%] h-[34%] w-[42%] -rotate-1 border-[5px] border-ink-white/95 bg-ink-white shadow-xl shadow-black/50">
              <div className="relative h-full w-full overflow-hidden">
                <Parallax speed={0.16} className="absolute inset-x-0 -top-[12%] h-[124%]">
                <Image
                  src={detailImage2}
                  alt={content.detailImage2Alt}
                  fill
                  className="object-cover"
                  sizes="220px"
                />
                </Parallax>
              </div>
            </div>}

            {detailImage3 && <div className="absolute bottom-0 right-[6%] h-[30%] w-[46%] rotate-2 border-[5px] border-ink-white/95 bg-ink-white shadow-xl shadow-black/50">
              <div className="relative h-full w-full overflow-hidden">
                <Parallax speed={0.26} className="absolute inset-x-0 -top-[12%] h-[124%]">
                <Image
                  src={detailImage3}
                  alt={content.detailImage3Alt}
                  fill
                  className="object-cover"
                  sizes="220px"
                />
                </Parallax>
              </div>
            </div>}
          </div>}
        </div>
      </div>
    </section>
  );
}
