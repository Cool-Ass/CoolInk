import Image from "next/image";

/**
 * Reuses the existing hero calligraphy/brush-stroke artwork as a subtle
 * atmospheric layer for other sections — different crop/position and a
 * low opacity per section, never the same full-strength treatment twice,
 * so it reads as one consistent visual identity rather than a repeated
 * background image. Purely decorative: aria-hidden, never affects layout.
 */
export default function CalligraphyBackground({
  opacity = 0.06,
  position = "center",
  className = "",
}: {
  opacity?: number;
  position?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <Image
        src="/images/texture-bg.jpg"
        alt=""
        fill
        className="object-cover"
        style={{ objectPosition: position, opacity }}
        sizes="100vw"
      />
    </div>
  );
}
