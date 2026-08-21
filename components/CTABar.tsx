import MagneticButton from "@/components/MagneticButton";
import CalligraphyBackground from "@/components/CalligraphyBackground";

interface CTABarProps {
  titleLines: [string, string];
  message: string;
  buttonLabel?: string;
  href?: string;
}

export default function CTABar({
  titleLines,
  message,
  buttonLabel = "UMÓW WIZYTĘ",
  href = "#contact",
}: CTABarProps) {
  return (
    <div className="relative mx-auto max-w-[1536px] overflow-hidden px-6 md:px-10 lg:px-16">
      <CalligraphyBackground opacity={0.05} position="70% 50%" />
      <div className="reveal-up relative flex flex-col gap-6 border border-ink-gold/70 bg-ink-black/40 px-6 py-7 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-8 md:px-10">
        <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-ink-white/40 text-ink-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 2 4 5v6c0 5.2 3.4 9.7 8 11 4.6-1.3 8-5.8 8-11V5l-8-3Zm0 2.2 6 2.25V11c0 4.2-2.7 7.9-6 8.9-3.3-1-6-4.7-6-8.9V6.45l6-2.25Z" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-medium leading-snug text-ink-white">
              {titleLines[0]}
              <br />
              {titleLines[1]}
            </p>
          </div>
          <span className="hidden h-10 w-px bg-ink-white/20 sm:block" />
          <p className="max-w-sm text-[14px] leading-relaxed text-ink-grey">
            {message}
          </p>
        </div>

        <MagneticButton
          href={href}
          className="inline-flex shrink-0 items-center justify-center gap-3 border border-ink-gold px-6 py-3.5 text-[13px] font-medium tracking-[0.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black"
        >
          {buttonLabel}
          <span aria-hidden>→</span>
        </MagneticButton>
      </div>
    </div>
  );
}
