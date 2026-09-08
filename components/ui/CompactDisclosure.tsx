import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export default function CompactDisclosure({ title, summary, children, className = "", bodyClassName = "" }: { title: string; summary?: string; children: ReactNode; className?: string; bodyClassName?: string }) {
  return <details className={`group overflow-hidden border border-ink-white/10 bg-ink-charcoal/30 ${className}`}>
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden sm:px-5">
      <span className="min-w-0 flex-1"><span className="block text-[11px] tracking-[.12em] text-ink-white">{title}</span>{summary && <span className="mt-1 block truncate text-xs text-ink-grey">{summary}</span>}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-ink-grey transition-transform group-open:rotate-180" aria-hidden />
    </summary>
    <div className={`border-t border-ink-white/10 p-3 sm:p-4 ${bodyClassName}`}>{children}</div>
  </details>;
}
