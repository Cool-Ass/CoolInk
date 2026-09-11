"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl";
const widths: Record<ModalSize, string> = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-[min(94vw,1500px)]" };

/** Shared dialog foundation for the admin tools and client portal. */
export default function AppModal({ title, subtitle, size = "md", onClose, children, footer, closeOnBackdrop = true, priority = false, headerAction }: { title: string; subtitle?: string; size?: ModalSize; onClose: () => void; children: ReactNode; footer?: ReactNode; closeOnBackdrop?: boolean; priority?: boolean; headerAction?: ReactNode }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog']"));
      if (!dialog || dialogs.at(-1) !== dialog) return;
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = previousOverflow; document.body.style.paddingRight = previousPaddingRight; previouslyFocused?.focus(); };
  }, []);

  return <div className={`fixed inset-0 ${priority ? "z-[200]" : "z-[100]"} flex items-end justify-center bg-ink-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6`} onMouseDown={() => closeOnBackdrop && onClose()}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()} className={`flex h-[100dvh] w-full ${widths[size]} flex-col overflow-hidden border border-ink-white/15 bg-ink-charcoal shadow-2xl outline-none sm:h-auto sm:max-h-[92vh] sm:rounded-sm`}>
      <header className="z-10 flex shrink-0 items-start justify-between gap-3 border-b border-ink-white/10 bg-ink-charcoal/95 px-4 py-3 backdrop-blur sm:gap-5 sm:px-5"><div className="min-w-0"><p className="text-[9px] tracking-[0.16em] text-ink-gold">COOLINK</p><h2 id={titleId} className="mt-1 break-words font-display text-2xl text-ink-white">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-relaxed text-ink-grey">{subtitle}</p>}</div><div className="flex shrink-0 items-center gap-2">{headerAction}<button ref={closeRef} type="button" onClick={onClose} aria-label="Zamknij" className="flex h-10 w-10 items-center justify-center border border-ink-white/15 text-xl text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold">×</button></div></header>
      <div data-lenis-prevent className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-5">{children}</div>
      {footer && <footer className="shrink-0 border-t border-ink-white/10 bg-ink-charcoal/95 px-4 py-3 backdrop-blur sm:px-5">{footer}</footer>}
    </section>
  </div>;
}
