export default function SectionRail({ number }: { number: string }) {
  return (
    <div className="mr-8 hidden w-4 flex-col items-center pt-2 lg:flex">
      <span className="font-display text-lg text-ink-gold">{number}</span>
      <span className="mt-3 h-24 w-px bg-ink-grey/40" />
      <span
        className="mt-3 text-[11px] tracking-[0.3em] text-ink-grey"
        style={{ writingMode: "vertical-rl" }}
      >
        PRZEWIŃ
      </span>
    </div>
  );
}
