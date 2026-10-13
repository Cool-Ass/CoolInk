"use client";
import { useEffect, useRef } from "react";
import type { SignaturePoint, SignatureStrokes } from "@/lib/sessionSignature";
export default function SignaturePad({ value, onChange, disabled }: { value: SignatureStrokes; onChange: (value: SignatureStrokes) => void; disabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), draft = useRef<SignaturePoint[] | null>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d"); if (!context) return;
    context.clearRect(0, 0, 600, 200); context.strokeStyle = "#ffffff"; context.lineWidth = 2; context.lineCap = "round";
    for (const stroke of value) { context.beginPath(); stroke.forEach(([x, y], index) => index ? context.lineTo(x * 600, y * 200) : context.moveTo(x * 600, y * 200)); context.stroke(); }
  }, [value]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>): SignaturePoint => { const rect = event.currentTarget.getBoundingClientRect(); return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))]; };
  return <div className="mt-5 space-y-2"><p className="text-sm">Podpis odręczny</p><canvas ref={canvas} width={600} height={200} aria-label="Pole podpisu odręcznego" className="w-full touch-none rounded-lg border border-ink-white/30 bg-ink-black" onPointerDown={event => { if (disabled || value.length >= 64) return; event.currentTarget.setPointerCapture(event.pointerId); draft.current = [point(event)]; }} onPointerMove={event => { if (!draft.current || disabled || value.flat().length + draft.current.length >= 2000) return; const next = point(event), previous = draft.current.at(-1)!; draft.current.push(next); const ctx = event.currentTarget.getContext("2d"); if (ctx) { ctx.beginPath(); ctx.moveTo(previous[0] * 600, previous[1] * 200); ctx.lineTo(next[0] * 600, next[1] * 200); ctx.stroke(); } }} onPointerUp={() => { const stroke = draft.current; draft.current = null; if (stroke && stroke.length > 1) onChange([...value, stroke]); }} onPointerCancel={() => { draft.current = null; onChange([...value]); }} /><button type="button" disabled={disabled} className="text-xs text-ink-gold" onClick={() => { draft.current = null; onChange([]); }}>Wyczyść podpis</button><p className="text-xs text-ink-grey">Podpisz palcem lub myszką. Ten podpis nie jest podpisem kwalifikowanym.</p></div>;
}
