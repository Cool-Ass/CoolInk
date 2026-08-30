import type { ReactNode } from "react";

export default function EmptyState({ title, description, action, icon = "◇" }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="border border-dashed border-ink-white/20 bg-ink-charcoal/20 px-6 py-10 text-center"><span className="text-2xl text-ink-gold">{icon}</span><h3 className="mt-3 font-display text-2xl text-ink-white">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-grey">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
