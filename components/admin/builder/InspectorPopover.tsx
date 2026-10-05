"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { inspectorLayout } from "@/lib/inspectorLayout";

const Owners = createContext<string[]>([]);
export const InspectorTheme = createContext<CSSProperties>({});

/** Non-modal, viewport-bounded inspector; nested portals remain inside their parent interaction scope. */
export default function InspectorPopover({ title, children, icon, summary }: { title: string; children: ReactNode; icon?: ReactNode; summary?: string }) {
  const id = useId();
  const owners = useContext(Owners);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState({ left: 12, top: 12, width: 280, maxHeight: 360 });
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    function measure() {
      if (!trigger.current || !popup.current) return;
      const next = inspectorLayout(trigger.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, popup.current.scrollHeight);
      setLayout((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    }
    function outside(event: Event) {
      const target = event.target;
      if (!(target instanceof Element) || trigger.current?.contains(target) || popup.current?.contains(target)) return;
      if (target.closest<HTMLElement>("[data-builder-popover-owners]")?.dataset.builderPopoverOwners?.split(" ").includes(id)) return;
      setOpen(false);
    }
    const frame = requestAnimationFrame(() => { measure(); popup.current?.focus(); });
    const observer = new ResizeObserver(measure);
    if (popup.current) observer.observe(popup.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", outside); };
  }, [open, id]);
  return <><button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={`Ustawienia: ${title}`} title={summary ? `${title}: ${summary}` : title} onClick={() => setOpen((value) => !value)} className="flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded border border-white/15 bg-white/[.04] px-1.5 text-white/75 aria-expanded:border-ink-gold aria-expanded:text-ink-gold hover:border-ink-gold hover:text-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold">{icon ?? <Pencil aria-hidden className="h-3.5 w-3.5" />}</button>{open && createPortal(<Owners.Provider value={[...owners, id]}><div ref={popup} id={id} role="dialog" aria-label={title} tabIndex={-1} data-builder-popover-owners={[...owners, id].join(" ")} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }} style={layout} className="fixed z-[350] min-w-0 overflow-y-auto overscroll-contain rounded-lg border border-white/15 bg-[#25282c] p-3 text-white shadow-2xl outline-none [scrollbar-gutter:stable]"><header className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-2"><span className="text-xs font-semibold">{title}</span><button type="button" aria-label={`Zamknij: ${title}`} onClick={close} className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold"><X aria-hidden className="h-3.5 w-3.5" /></button></header><div className="flex min-w-0 flex-col gap-2">{children}</div></div></Owners.Provider>, document.body)}</>;
}
