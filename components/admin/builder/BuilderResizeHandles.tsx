"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { ModuleStyle } from "@/lib/modules";

type Direction = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const HANDLES: { direction: Direction; className: string; cursor: string }[] = [
  { direction: "n", className: "left-3 right-3 top-0 h-2 -translate-y-1/2", cursor: "ns-resize" },
  { direction: "ne", className: "right-0 top-0 h-3 w-3 -translate-y-1/2 translate-x-1/2", cursor: "nesw-resize" },
  { direction: "e", className: "bottom-3 right-0 top-3 w-2 translate-x-1/2", cursor: "ew-resize" },
  { direction: "se", className: "bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
  { direction: "s", className: "bottom-0 left-3 right-3 h-2 translate-y-1/2", cursor: "ns-resize" },
  { direction: "sw", className: "bottom-0 left-0 h-3 w-3 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
  { direction: "w", className: "bottom-3 left-0 top-3 w-2 -translate-x-1/2", cursor: "ew-resize" },
  { direction: "nw", className: "left-0 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
];

export default function BuilderResizeHandles({ style = {}, onResize, label = "element" }: { style?: ModuleStyle; onResize: (style: ModuleStyle) => void; label?: string }) {
  function begin(event: ReactPointerEvent<HTMLButtonElement>, direction: Direction) {
    event.preventDefault(); event.stopPropagation();
    const frame = event.currentTarget.parentElement?.parentElement as HTMLElement | null;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const startX = event.clientX; const startY = event.clientY;
    const startTranslateX = style.translateX ?? 0; const startTranslateY = style.translateY ?? 0;
    const originalTransform = frame.style.transform;
    let nextWidth = rect.width; let nextHeight = rect.height; let shiftX = 0; let shiftY = 0;
    const horizontal = direction.includes("e") || direction.includes("w");
    const vertical = direction.includes("n") || direction.includes("s");
    const move = (pointer: PointerEvent) => {
      const dx = pointer.clientX - startX; const dy = pointer.clientY - startY;
      nextWidth = horizontal ? Math.max(40, direction.includes("w") ? rect.width - dx : rect.width + dx) : rect.width;
      nextHeight = vertical ? Math.max(32, direction.includes("n") ? rect.height - dy : rect.height + dy) : rect.height;
      shiftX = direction.includes("w") ? Math.min(dx, rect.width - 40) : 0;
      shiftY = direction.includes("n") ? Math.min(dy, rect.height - 32) : 0;
      if (horizontal) frame.style.width = `${Math.round(nextWidth)}px`;
      if (vertical) frame.style.height = `${Math.round(nextHeight)}px`;
      if (shiftX || shiftY) frame.style.transform = `${originalTransform} translate(${Math.round(shiftX)}px, ${Math.round(shiftY)}px)`;
    };
    const finish = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      onResize({ ...style, ...(horizontal ? { width: Math.round(nextWidth) } : {}), ...(vertical ? { height: Math.round(nextHeight) } : {}), ...(direction.includes("w") ? { translateX: Math.round(startTranslateX + shiftX) } : {}), ...(direction.includes("n") ? { translateY: Math.round(startTranslateY + shiftY) } : {}) });
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
  }

  return <div className="builder-editor-chrome pointer-events-none absolute inset-0 z-[45]">
    {HANDLES.map(({ direction, className, cursor }) => <button key={direction} type="button" title={`Zmień rozmiar: ${label}`} aria-label={`Zmień rozmiar ${label} od strony ${direction}`} onPointerDown={(event) => begin(event, direction)} className={`pointer-events-auto absolute touch-none ${className} border border-ink-black bg-ink-gold shadow-[0_0_0_1px_rgba(255,255,255,.35)]`} style={{ cursor }} />)}
  </div>;
}
