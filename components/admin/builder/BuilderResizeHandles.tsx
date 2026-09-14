"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { ModuleStyle, ResponsiveNumber } from "@/lib/modules";

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

export default function BuilderResizeHandles({ style = {}, onResize, label = "element", device = "desktop" }: { style?: ModuleStyle; onResize: (style: ModuleStyle) => void; label?: string; device?: keyof ResponsiveNumber }) {
  const width = style.responsiveWidth?.[device] ?? style.width;
  const height = style.responsiveHeight?.[device] ?? style.height;
  function setDimension(key: "width" | "height", raw: string) {
    const responsiveKey = key === "width" ? "responsiveWidth" : "responsiveHeight";
    const current = style[responsiveKey] ?? {};
    const numeric = raw === "" ? undefined : Math.min(4_000, Math.max(0, Number(raw) || 0));
    const responsive = { ...current, [device]: numeric };
    onResize({ ...style, [responsiveKey]: responsive, ...(device === "desktop" ? { [key]: numeric } : {}) });
  }

  function begin(event: ReactPointerEvent<HTMLButtonElement>, direction: Direction) {
    event.preventDefault(); event.stopPropagation();
    const frame = event.currentTarget.parentElement?.parentElement as HTMLElement | null;
    if (!frame) return;
    const canvas = frame.closest<HTMLElement>("[data-builder-device]");
    const activeDevice = (canvas?.dataset.builderDevice ?? device) as keyof ResponsiveNumber;
    const rect = frame.getBoundingClientRect();
    const startX = event.clientX; const startY = event.clientY;
    const startTranslateX = style.responsiveTranslateX?.[activeDevice] ?? style.translateX ?? 0; const startTranslateY = style.responsiveTranslateY?.[activeDevice] ?? style.translateY ?? 0;
    const originalTransform = frame.style.transform;
    let nextWidth = rect.width; let nextHeight = rect.height; let shiftX = 0; let shiftY = 0;
    const requestedHorizontal = direction.includes("e") || direction.includes("w");
    const requestedVertical = direction.includes("n") || direction.includes("s");
    const horizontal = requestedHorizontal && style.resizeAxis !== "vertical";
    const vertical = requestedVertical && style.resizeAxis !== "horizontal";
    const snapSize = Math.max(1, style.resizeSnap || Number(canvas?.dataset.builderSnap) || 1);
    const snap = (value: number) => Math.round(value / snapSize) * snapSize;
    const ratio = rect.width / Math.max(1, rect.height);
    const move = (pointer: PointerEvent) => {
      const dx = pointer.clientX - startX; const dy = pointer.clientY - startY;
      nextWidth = horizontal ? Math.max(40, snap(direction.includes("w") ? rect.width - dx : rect.width + dx)) : rect.width;
      nextHeight = vertical ? Math.max(32, snap(direction.includes("n") ? rect.height - dy : rect.height + dy)) : rect.height;
      if ((style.lockAspectRatio || pointer.shiftKey) && horizontal && vertical) {
        if (Math.abs(nextWidth - rect.width) >= Math.abs(nextHeight - rect.height) * ratio) nextHeight = Math.max(32, snap(nextWidth / ratio));
        else nextWidth = Math.max(40, snap(nextHeight * ratio));
      }
      shiftX = direction.includes("w") && horizontal ? rect.width - nextWidth : 0;
      shiftY = direction.includes("n") && vertical ? rect.height - nextHeight : 0;
      if (horizontal) frame.style.width = `${Math.round(nextWidth)}px`;
      if (vertical) frame.style.height = `${Math.round(nextHeight)}px`;
      if (shiftX || shiftY) frame.style.transform = `${originalTransform} translate(${Math.round(shiftX)}px, ${Math.round(shiftY)}px)`;
    };
    const finish = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      const responsive = (current: ResponsiveNumber | undefined, fallback: number, next: number) => ({ desktop: current?.desktop ?? fallback, tablet: current?.tablet ?? current?.desktop ?? fallback, mobile: current?.mobile ?? current?.tablet ?? current?.desktop ?? fallback, [activeDevice]: Math.round(next) });
      const responsiveWidth = horizontal ? responsive(style.responsiveWidth, style.width ?? Math.round(rect.width), nextWidth) : style.responsiveWidth;
      const responsiveHeight = vertical ? responsive(style.responsiveHeight, style.height ?? Math.round(rect.height), nextHeight) : style.responsiveHeight;
      const nextTranslateX = direction.includes("w") && horizontal ? startTranslateX + shiftX : startTranslateX;
      const nextTranslateY = direction.includes("n") && vertical ? startTranslateY + shiftY : startTranslateY;
      const responsiveTranslateX = direction.includes("w") && horizontal ? { ...responsive(style.responsiveTranslateX, startTranslateX, nextTranslateX), [activeDevice]: Math.round(nextTranslateX) } : style.responsiveTranslateX;
      const responsiveTranslateY = direction.includes("n") && vertical ? { ...responsive(style.responsiveTranslateY, startTranslateY, nextTranslateY), [activeDevice]: Math.round(nextTranslateY) } : style.responsiveTranslateY;
      onResize({ ...style, ...(horizontal ? { width: responsiveWidth?.desktop, responsiveWidth } : {}), ...(vertical ? { height: responsiveHeight?.desktop, responsiveHeight } : {}), ...(responsiveTranslateX ? { translateX: responsiveTranslateX.desktop, responsiveTranslateX } : {}), ...(responsiveTranslateY ? { translateY: responsiveTranslateY.desktop, responsiveTranslateY } : {}) });
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
  }

  return <div className="builder-editor-chrome pointer-events-none absolute inset-0 z-[45]">
    <div className="pointer-events-auto absolute left-2 top-2 flex items-end gap-1 border border-white/20 bg-black/90 p-1 text-[8px] text-white shadow-lg" onClick={(event) => event.stopPropagation()}>
      <label>SZER.<input aria-label={`Szerokość: ${label}`} type="number" min={0} max={4000} value={width ?? ""} placeholder="AUTO" onChange={(event) => setDimension("width", event.target.value)} className="ml-1 h-7 w-16 border border-white/15 bg-black px-1 text-right text-[10px] text-white outline-none focus:border-ink-gold" /></label>
      <label>WYS.<input aria-label={`Wysokość: ${label}`} type="number" min={0} max={4000} value={height ?? ""} placeholder="AUTO" onChange={(event) => setDimension("height", event.target.value)} className="ml-1 h-7 w-16 border border-white/15 bg-black px-1 text-right text-[10px] text-white outline-none focus:border-ink-gold" /></label>
      <span className="px-1 pb-2 text-ink-gold">PX · {device === "desktop" ? "KOMPUTER" : device === "tablet" ? "TABLET" : "TELEFON"}</span>
    </div>
    {HANDLES.map(({ direction, className, cursor }) => <button key={direction} type="button" title={`Zmień rozmiar: ${label}`} aria-label={`Zmień rozmiar ${label} od strony ${direction}`} onPointerDown={(event) => begin(event, direction)} className={`pointer-events-auto absolute touch-none ${className} border border-ink-black bg-ink-gold shadow-[0_0_0_1px_rgba(255,255,255,.35)]`} style={{ cursor }} />)}
  </div>;
}
