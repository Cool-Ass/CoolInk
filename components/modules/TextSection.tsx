import MultilineText from "@/components/MultilineText";
import type { TextSectionModuleData } from "@/lib/modules";

export default function TextSection({ data }: { data: TextSectionModuleData }) {
  const centered = data.alignment === "center";

  return (
    <section className="relative overflow-hidden bg-ink-black py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 500px 300px at 50% 0%, rgba(201,154,74,0.08), transparent 70%)",
        }}
      />
      <div
        className={`reveal-up relative mx-auto max-w-3xl px-6 md:px-10 ${
          centered ? "text-center" : ""
        }`}
      >
        {data.eyebrow && (
          <p className="mb-4 text-[13px] font-medium tracking-[0.35em] text-ink-gold">
            {data.eyebrow}
          </p>
        )}
        <h2 className="headline-texture text-[11vw] leading-[0.9] tracking-tight sm:text-[7vw] md:text-[4.5vw] lg:text-[3.2vw]">
          <span className="block">{data.heading1}</span>
          {data.heading2 && <span className="block">{data.heading2}</span>}
        </h2>
        <div
          className={`gold-underline mt-5 h-3 w-56 ${centered ? "mx-auto" : ""}`}
          aria-hidden
        />
        {data.body && (
          <p className="mt-8 text-[15px] leading-relaxed text-ink-grey">
            <MultilineText text={data.body} />
          </p>
        )}
      </div>
    </section>
  );
}
