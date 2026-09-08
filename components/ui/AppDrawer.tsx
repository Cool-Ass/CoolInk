"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function AppDrawer({
  title,
  subtitle,
  actions,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Zamknij panel" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-ink-white/15 bg-[#111214] text-ink-white shadow-[-24px_0_70px_rgba(0,0,0,.55)]">
        <header className="shrink-0 border-b border-ink-white/10 bg-[#111214]/95 px-4 py-4 backdrop-blur sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-none">{title}</h2>
              {subtitle && <p className="mt-2 text-xs leading-relaxed text-ink-grey">{subtitle}</p>}
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Zamknij" className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink-white/15 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold">
              <X className="h-4 w-4" />
            </button>
          </div>
          {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-white/10 pt-3">{actions}</div>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4" data-lenis-prevent>
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
