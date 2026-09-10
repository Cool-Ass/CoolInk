import { IconPreview } from "@/components/admin/builder/IconPicker";
import type { ModuleStyle } from "@/lib/modules";

export default function BuilderStyleLayers({ style }: { style?: ModuleStyle }) {
  if (!style) return null;
  const overlay = style.overlayColor && (style.overlayOpacity ?? 0) > 0;
  const pattern = style.pattern && style.pattern !== "none";
  const glow = (style.glowOpacity ?? 0) > 0;
  const topDivider = style.shapeDividerTop && style.shapeDividerTop !== "none";
  const bottomDivider = style.shapeDividerBottom && style.shapeDividerBottom !== "none";

  return <>
    {overlay && <span aria-hidden className="builder-overlay-layer pointer-events-none absolute inset-0 z-0" style={{ backgroundColor: style.overlayColor, opacity: Math.min(1, Math.max(0, (style.overlayOpacity ?? 0) / 100)), mixBlendMode: style.overlayBlendMode ?? "normal" }} />}
    {pattern && <span aria-hidden className={`builder-pattern-layer builder-pattern-${style.pattern} pointer-events-none absolute inset-0 z-0`} />}
    {glow && <span aria-hidden className="builder-glow-layer pointer-events-none absolute inset-0 z-0" />}
    {topDivider && <span aria-hidden className={`builder-shape-divider builder-shape-divider-top builder-shape-${style.shapeDividerTop} pointer-events-none absolute inset-x-0 top-0 z-[2]`} />}
    {bottomDivider && <span aria-hidden className={`builder-shape-divider builder-shape-divider-bottom builder-shape-${style.shapeDividerBottom} pointer-events-none absolute inset-x-0 bottom-0 z-[2]`} />}
    {style.decorativeIcon && <IconPreview name={style.decorativeIcon} className="builder-decorative-icon pointer-events-none absolute" />}
  </>;
}
