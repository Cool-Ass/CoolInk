import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wkrótce | CoolInk Tattoo Studio",
  description: "CoolInk Tattoo Studio — strona jest właśnie dopracowywana.",
};

export default function ConstructionPage() {
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink-black px-6 py-12 text-ink-white">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_18%,rgba(201,154,74,0.16),transparent_27%),radial-gradient(circle_at_84%_78%,rgba(201,154,74,0.1),transparent_30%),linear-gradient(135deg,#0a0908_20%,#15110c_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full border border-ink-gold/20" />
      <div className="pointer-events-none absolute -right-32 top-16 h-96 w-96 rounded-full border border-ink-gold/10" />

      <section className="relative w-full max-w-3xl text-center">
        <p className="mb-10 text-xs font-semibold tracking-[0.35em] text-ink-gold sm:text-sm">
          COOLINK · TATTOO STUDIO
        </p>

        <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-ink-gold/60 text-2xl text-ink-gold shadow-[0_0_45px_rgba(201,154,74,0.16)]">
          C
        </div>

        <p className="mb-4 text-xs font-semibold tracking-[0.28em] text-ink-gold">
          TRYB BUDOWY
        </p>
        <h1 className="headline-texture text-6xl leading-[0.88] sm:text-8xl md:text-9xl">
          ZAPRASZAM
          <br />
          WKRÓTCE.
        </h1>
        <div className="gold-underline mx-auto my-8 h-2 w-28" />
        <p className="mx-auto max-w-md text-base leading-relaxed text-ink-grey sm:text-lg">
          Dopracowuję nową przestrzeń CoolInk. Wróć za chwilę — będzie warto.
        </p>

        <div className="mt-12 flex items-center justify-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-ink-grey">
          <span className="h-px w-8 bg-ink-gold/60" />
          WKRÓTCE ODKRYJESZ WIĘCEJ
          <span className="h-px w-8 bg-ink-gold/60" />
        </div>
      </section>
    </main>
  );
}
