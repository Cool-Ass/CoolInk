import { defaultModuleData, type StatsModuleData } from "@/lib/modules";

const STATS = [
  {
    value: "5+",
    label: "LAT DOŚWIADCZENIA",
    path: "M14.5 2.5 21.5 9.5 12 19 5 20 6 13 14.5 2.5Z M13.2 3.8 20.2 10.8",
  },
  {
    value: "1000+",
    label: "ZADOWOLONYCH KLIENTÓW",
    path: "M12 2c-1.5 2-2.4 3.7-2.4 5.4C9.6 9.6 10.6 11 12 11s2.4-1.4 2.4-3.6C14.4 5.7 13.5 4 12 2ZM7 10c-1.7 2.1-2.4 3.5-2.4 5C4.6 17.2 5.7 18.5 7 18.5S9.4 17.2 9.4 15c0-1.5-.7-2.9-2.4-5Zm10 0c-1.7 2.1-2.4 3.5-2.4 5 0 2.2 1.1 3.5 2.4 3.5s2.4-1.3 2.4-3.5c0-1.5-.7-2.9-2.4-5ZM4 22l2-5h3l1 3-2 2H4Zm16 0-2-5h-3l-1 3 2 2h4ZM9 22l1-4h4l1 4H9Z",
  },
  {
    value: "100%",
    label: "ZAANGAŻOWANIA",
    path: "M12 2 4.5 5.5v5c0 5.2 3.2 9 7.5 10.5 4.3-1.5 7.5-5.3 7.5-10.5v-5L12 2Zm-1.4 12.2L7.4 11l1.3-1.3 1.9 1.9 4.7-4.7 1.3 1.3-6 6Z",
  },
  {
    value: "1/1",
    label: "INDYWIDUALNE PROJEKTY",
    path: "M4 20 5 15.5 15.5 5 19 8.5 8.5 19 4 20Zm12.5-16 3.5 3.5-2 2L14.5 6l2-2Z",
  },
];

export default function StatsBar({ content = defaultModuleData("stats") as unknown as StatsModuleData }: { content?: StatsModuleData }) {
  const stats = STATS.map((stat, index) => ({ ...stat, ...(content.items?.[index] || {}) }));
  return (
    <section className="relative border-y border-ink-white/10 bg-ink-black">
      <div className="mx-auto flex max-w-[1536px] items-stretch gap-6 px-6 py-8 md:px-10 lg:gap-14 lg:px-16">
        <div className="hidden shrink-0 flex-col items-center gap-3 border-r border-ink-white/10 pr-8 text-ink-grey lg:flex">
          <span className="text-ink-gold" aria-hidden>
            ↓
          </span>
          <span className="text-[11px] tracking-[0.25em]">PRZEWIŃ, ABY ODKRYĆ</span>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
          {stats.map((stat, index) => (
            <div key={`${stat.label}-${index}`} className="flex items-center gap-4">
              <svg
                viewBox="0 0 24 24"
                className="h-9 w-9 shrink-0 text-ink-gold"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              >
                <path d={stat.path} />
              </svg>
              <div>
                <p className="font-display text-2xl leading-none text-ink-white md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[10.5px] tracking-[0.12em] text-ink-grey">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
