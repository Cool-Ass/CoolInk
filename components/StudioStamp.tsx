export default function StudioStamp({ ringText, leftText, centerText, rightText }: { ringText: string; leftText: string; centerText: string; rightText: string }) {
  if (![ringText, leftText, centerText, rightText].some(Boolean)) return null;
  return (
    <div className="absolute bottom-8 right-6 z-10 hidden h-36 w-36 md:right-10 lg:right-16 lg:flex">
      <div className="relative h-full w-full animate-[spin_22s_linear_infinite] text-ink-white">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <defs>
            <path
              id="stampCircle"
              d="M 100, 100 m -78, 0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
            />
          </defs>
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <text fontSize="11.5" letterSpacing="3" fill="currentColor">
            <textPath href="#stampCircle" startOffset="2%">
              {ringText}
            </textPath>
          </text>
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 font-display text-sm text-ink-white">
          <span className="text-ink-gold">{leftText}</span>
          <span className="text-2xl">{centerText}</span>
          <span className="text-ink-gold">{rightText}</span>
        </div>
      </div>
    </div>
  );
}
