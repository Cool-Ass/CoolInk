import type { SpacerModuleData } from "@/lib/modules";

const SIZES: Record<SpacerModuleData["size"], string> = {
  sm: "h-8 md:h-12",
  md: "h-16 md:h-24",
  lg: "h-24 md:h-40",
};

export default function Spacer({ data }: { data: SpacerModuleData }) {
  return <div aria-hidden className={`bg-ink-black ${SIZES[data.size] ?? SIZES.md}`} />;
}
