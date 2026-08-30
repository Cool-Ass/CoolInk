"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type ModalSize = "sm" | "md" | "lg";
const widths: Record<ModalSize, string> = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" };

/** Shared dialog foundation for the admin tools and client portal. */
export default function AppModal({ title, subtitle, size = "md", onClose, children, footer, closeOnBackdrop = true }: { title: string; subtitle?: string; size?: ModalSize; onClose: () => void; children: ReactNode; footer?: ReactNode; closeOnBackdrop?: boolean }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const dialog = closeRef.current?.closest<HTMLElement>("[role=dialog]");
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")) : [];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); previouslyFocused?.focus(); };
  }, [onClose]);

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={() => closeOnBackdrop && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()} className={`max-h-[92vh] w-full ${widths[size]} overflow-y-auto border border-ink-white/15 bg-ink-charcoal shadow-2xl sm:max-h-[86vh] sm:rounded-sm`}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-ink-white/10 bg-ink-charcoal/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-[10px] tracking-[0.16em] text-ink-gold">COOLINK</p><h2 id={titleId} className="mt-1 font-display text-2xl text-ink-white sm:text-3xl">{title}</h2>{subtitle && <p className="mt-2 text-sm text-ink-grey">{subtitle}</p>}</div><button ref={closeRef} type="button" onClick={onClose} aria-label="Zamknij" className="flex h-10 w-10 items-center justify-center border border-ink-white/15 text-xl text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold">×</button></header>
      <div className="p-5 sm:p-7">{children}</div>
      {footer && <footer className="sticky bottom-0 border-t border-ink-white/10 bg-ink-charcoal/95 px-5 py-4 backdrop-blur sm:px-7">{footer}</footer>}
    </section>
  </div>;
}
