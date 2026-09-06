import { DEFAULT_CONTENT, type SiteContent } from "@/lib/content";
import { siteThemeStyle } from "@/lib/siteTheme";

export default function MaintenanceScreen({ content = DEFAULT_CONTENT.maintenance, theme = DEFAULT_CONTENT.theme }: { content?: SiteContent["maintenance"]; theme?: SiteContent["theme"] }) {
  return (
    <main style={siteThemeStyle(theme)} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink-black px-6 py-12 text-ink-white">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_18%,rgba(201,154,74,0.16),transparent_27%),radial-gradient(circle_at_84%_78%,rgba(201,154,74,0.1),transparent_30%),linear-gradient(135deg,#0a0908_20%,#15110c_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full border border-ink-gold/20" />
      <div className="pointer-events-none absolute -right-32 top-16 h-96 w-96 rounded-full border border-ink-gold/10" />

      <section className="relative w-full max-w-3xl text-center" aria-labelledby="maintenance-heading">
        {content.brandLabel && <p className="mb-10 text-xs font-semibold tracking-[0.35em] text-ink-gold sm:text-sm">{content.brandLabel}</p>}
        {content.statusLabel && <p className="mb-4 text-xs font-semibold tracking-[0.28em] text-ink-gold">{content.statusLabel}</p>}
        <h1 id="maintenance-heading" className="headline-texture text-6xl leading-[0.88] sm:text-8xl md:text-9xl">
          {content.headingLine1}
          <br />
          {content.headingLine2}
        </h1>
        <div className="gold-underline mx-auto my-8 h-2 w-28" aria-hidden />
        {content.message && <p className="mx-auto max-w-md text-base leading-relaxed text-ink-grey sm:text-lg">{content.message}</p>}
        {content.mark && <div className="mx-auto mt-12 flex h-14 w-14 items-center justify-center rounded-full border border-ink-gold/60 text-2xl text-ink-gold shadow-[0_0_45px_rgba(201,154,74,0.16)]" aria-hidden>{content.mark}</div>}
      </section>
    </main>
  );
}
