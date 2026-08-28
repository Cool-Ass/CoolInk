"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  title: string;
  summary?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Shared compact section used by admin screens. UI preference stays local. */
export default function CollapsibleAdminSection({ title, summary, icon, defaultOpen = false, storageKey, actions, children, className = "" }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [ready, setReady] = useState(!storageKey);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null) setOpen(saved === "true");
    } finally {
      setReady(true);
    }
  }, [storageKey]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (storageKey) window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  return <section className={`border border-ink-white/10 bg-ink-charcoal/35 ${className}`}>
    <div className="flex min-h-14 items-center gap-3 px-4 py-3">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:text-ink-gold">
        {icon && <span className="text-ink-gold">{icon}</span>}
        <span className="min-w-0"><span className="block text-[11px] tracking-[0.12em] text-ink-white">{title}</span>{summary && <span className="mt-1 block truncate text-xs text-ink-grey">{summary}</span>}</span>
        <span aria-hidden className={`ml-auto text-lg text-ink-grey transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {actions && <div className="shrink-0" onClick={(event) => event.stopPropagation()}>{actions}</div>}
    </div>
    {ready && open && <div className="border-t border-ink-white/10 p-4">{children}</div>}
  </section>;
}
