"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import BuilderStyleLayers from "@/components/builder/BuilderStyleLayers";
import type { ModuleStyle } from "@/lib/modules";

interface Props {
  id?: string;
  className: string;
  visualStyle?: CSSProperties;
  builderStyle?: ModuleStyle;
  children: ReactNode;
}

export default function BuilderPublicFrame({ id, className, visualStyle, builderStyle, children }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(builderStyle?.animationTrigger !== "view");
  const [open, setOpen] = useState(false);
  const [scheduledVisible, setScheduledVisible] = useState(() => {
    const now = Date.now();
    const from = builderStyle?.visibleFrom ? new Date(builderStyle.visibleFrom).getTime() : Number.NEGATIVE_INFINITY;
    const until = builderStyle?.visibleUntil ? new Date(builderStyle.visibleUntil).getTime() : Number.POSITIVE_INFINITY;
    return (Number.isNaN(from) || now >= from) && (Number.isNaN(until) || now <= until);
  });

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const from = builderStyle?.visibleFrom ? new Date(builderStyle.visibleFrom).getTime() : Number.NEGATIVE_INFINITY;
      const until = builderStyle?.visibleUntil ? new Date(builderStyle.visibleUntil).getTime() : Number.POSITIVE_INFINITY;
      const next = (Number.isNaN(from) || now >= from) && (Number.isNaN(until) || now <= until);
      setScheduledVisible(next);
      if (!next) setOpen(false);
    };
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [builderStyle?.visibleFrom, builderStyle?.visibleUntil]);

  useEffect(() => {
    if (builderStyle?.animationTrigger !== "view" || !frameRef.current) return;
    const node = frameRef.current;
    if (typeof window.IntersectionObserver !== "function") {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [builderStyle?.animationTrigger, scheduledVisible]);

  useEffect(() => {
    if (!builderStyle?.scrollProgress || !frameRef.current) return;
    const node = frameRef.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const range = window.innerHeight + rect.height;
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / Math.max(1, range)));
      node.style.setProperty("--builder-scroll-progress", String(progress));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, [builderStyle?.scrollProgress]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) { event.preventDefault(); dialogRef.current.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); trigger?.focus(); };
  }, [open]);

  if (!scheduledVisible) return null;

  const content = <><BuilderStyleLayers style={builderStyle} />{builderStyle?.scrollProgress && <span aria-hidden className="builder-scroll-progress pointer-events-none absolute inset-x-0 top-0 z-[8] h-1 bg-ink-gold" />}<div className="relative z-[3]">{children}</div></>;
  const mode = builderStyle?.interactionMode ?? "normal";

  if (mode === "normal") return <div ref={frameRef} id={id} data-animation-visible={visible ? "true" : "false"} className={className} style={visualStyle}>{content}</div>;

  return <div ref={frameRef} id={id} data-animation-visible={visible ? "true" : "false"} className="relative">
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="min-h-11 border border-ink-gold px-5 py-3 text-xs tracking-[.12em] text-ink-gold transition hover:bg-ink-gold hover:text-ink-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold">
      {builderStyle?.interactionLabel?.trim() || "OTWÓRZ"}
    </button>
    {open && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} className={`fixed inset-0 z-[250] flex bg-black/80 p-3 backdrop-blur-sm ${mode === "drawer" ? "items-stretch justify-end" : "items-center justify-center"}`}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={builderStyle?.interactionLabel || "Treść"} className={`${className} relative max-h-[calc(100vh-1.5rem)] overflow-y-auto bg-ink-black ${mode === "drawer" ? "h-full w-full max-w-xl" : "w-full max-w-5xl"}`} style={visualStyle}>
        <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Zamknij" className="builder-editor-chrome sticky left-full top-3 z-[260] mr-3 flex h-11 w-11 items-center justify-center border border-white/25 bg-black/90 text-white focus-visible:outline-2 focus-visible:outline-ink-gold"><X className="h-4 w-4" /></button>
        {content}
      </div>
    </div>}
  </div>;
}
