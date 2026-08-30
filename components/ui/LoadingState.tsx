export default function LoadingState({ label = "Ładowanie…" }: { label?: string }) {
  return <div role="status" className="flex items-center gap-3 text-sm text-ink-grey"><span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-white/20 border-t-ink-gold" /><span>{label}</span></div>;
}
