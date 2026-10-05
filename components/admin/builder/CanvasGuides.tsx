"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { constrainGuide, duplicateGuide, guideLine, type CanvasGuide } from "@/lib/canvasGuides";
import InspectorPopover from "./InspectorPopover";

/** Editor-only pixel guides. Pointer movement never rewrites page content. */
export default function CanvasGuides({ visible, initialGuides = [], onChange }: { visible: boolean; initialGuides?: CanvasGuide[]; onChange?: (guides: CanvasGuide[]) => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const nextId = useRef(Math.max(0, ...initialGuides.map((item) => item.id)));
  const drag = useRef<{ id: number; pointer: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState<CanvasGuide[]>(initialGuides);
  const latestGuides = useRef(guides);
  useEffect(() => { latestGuides.current = guides; }, [guides]);
  useEffect(() => () => { onChange?.(latestGuides.current); }, [onChange]);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const parent = layer.current?.parentElement;
    if (!parent) return;
    const measure = () => { const next = { width: parent.clientWidth, height: parent.clientHeight }; setBounds(next); setGuides((items) => items.map((item) => constrainGuide(item, next))); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  const update = (id: number, patch: Partial<CanvasGuide>) => setGuides((items) => items.map((item) => item.id === id ? constrainGuide({ ...item, ...patch }, bounds) : item));
  const add = (angle: number) => { if (guides.length >= 32) return; const id = ++nextId.current; setGuides((items) => [...items, { id, angle, x: Math.round(bounds.width / 2), y: Math.min(200, Math.round(bounds.height / 2)) }]); setSelected(id); };
  const remove = (id: number) => { setGuides((items) => items.filter((item) => item.id !== id)); setSelected(null); };
  const active = guides.find((item) => item.id === selected);
  return <div ref={layer} hidden={!visible} className="pointer-events-none absolute inset-0 z-[35]" onClick={(event) => event.stopPropagation()}>
    <div className="pointer-events-auto sticky top-12 z-10 ml-2 mt-2 w-fit max-w-[calc(100%-1rem)] rounded-md border border-cyan-300/25 bg-[#17181a]/95 px-2 py-1 text-[10px] text-cyan-100 shadow-lg" onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1"><span className="mr-1">Prowadnice</span><button type="button" disabled={guides.length >= 32} onClick={() => add(90)} aria-label="Dodaj pionową prowadnicę" className="flex min-h-8 items-center gap-1 rounded px-1 hover:bg-white/10 disabled:opacity-40"><Plus className="h-3 w-3" />Pion</button><button type="button" disabled={guides.length >= 32} onClick={() => add(0)} aria-label="Dodaj poziomą prowadnicę" className="flex min-h-8 items-center gap-1 rounded px-1 hover:bg-white/10 disabled:opacity-40"><Plus className="h-3 w-3" />Poziom</button>
      <InspectorPopover title="Prowadnice — pozycja i kąt"><p className="text-xs text-white/65">Przeciągnij linię. X i Y to odległość jej punktu obrotu od lewej i górnej krawędzi canvasu. 0° = poziom, 90° = pion. Strzałki: 1 px, Shift: 10 px.</p>{guides.map((guide) => <button type="button" key={guide.id} aria-pressed={selected === guide.id} onClick={() => setSelected(guide.id)} className={`min-h-8 rounded px-2 text-left text-xs ${selected === guide.id ? "bg-cyan-300/10 text-cyan-200" : "hover:bg-white/5"}`}>Prowadnica {guide.id} · {Math.round(guide.x)} / {Math.round(guide.y)} px · {guide.angle}°</button>)}{active && <><div className="grid grid-cols-3 gap-2">{(["x", "y", "angle"] as const).map((key) => <label key={key} className="text-xs">{key === "angle" ? "Kąt °" : `${key.toUpperCase()} px`}<input aria-label={`Prowadnica ${active.id} — ${key}`} type="number" min={key === "angle" ? -360 : 0} max={key === "x" ? bounds.width : key === "y" ? bounds.height : 360} value={Math.round(active[key])} onChange={(event) => update(active.id, { [key]: Number(event.target.value) })} className="mt-1 h-8 w-full rounded border border-white/20 bg-black/30 px-1" /></label>)}</div><div className="flex gap-2"><button type="button" disabled={guides.length >= 32} onClick={() => { const copy = duplicateGuide(active, ++nextId.current, bounds); setGuides((items) => [...items, copy]); setSelected(copy.id); }} className="flex min-h-8 items-center gap-1 text-xs disabled:opacity-40"><Copy className="h-3 w-3" />Duplikuj</button><button type="button" onClick={() => remove(active.id)} className="flex min-h-8 items-center gap-1 text-xs text-red-300"><Trash2 className="h-3 w-3" />Usuń</button></div></>}</InspectorPopover></div>
      {active && <p aria-live="polite" className="pb-1">X {Math.round(active.x)} px · Y {Math.round(active.y)} px · {active.angle}°</p>}
    </div>
    <svg width="100%" height="100%" className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Interaktywne prowadnice">
      {guides.map((guide) => <g key={guide.id}><line {...guideLine(guide, bounds)} stroke={selected === guide.id ? "#67e8f9" : "#67e8f980"} strokeWidth="1" strokeDasharray="5 3" /><line {...guideLine(guide, bounds)} role="button" tabIndex={0} aria-label={`Prowadnica ${guide.id}: X ${Math.round(guide.x)} px, Y ${Math.round(guide.y)} px, kąt ${guide.angle} stopni`} className="pointer-events-auto cursor-move outline-none focus:stroke-cyan-300/30" stroke="transparent" strokeWidth="12" onFocus={() => setSelected(guide.id)} onKeyDown={(event) => {
        if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); event.stopPropagation(); remove(guide.id); return; }
        const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const step = steps[event.key]; if (!step) return; event.preventDefault(); event.stopPropagation(); const scale = event.shiftKey ? 10 : 1; update(guide.id, { x: guide.x + step[0] * scale, y: guide.y + step[1] * scale });
      }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); setSelected(guide.id); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: guide.id, pointer: event.pointerId, x: event.clientX, y: event.clientY, originX: guide.x, originY: guide.y }; }} onPointerMove={(event) => { const current = drag.current; const rect = layer.current?.getBoundingClientRect(); if (!current || current.pointer !== event.pointerId || current.id !== guide.id || !rect?.width || !rect.height) return; event.stopPropagation(); update(guide.id, { x: current.originX + (event.clientX - current.x) * bounds.width / rect.width, y: current.originY + (event.clientY - current.y) * bounds.height / rect.height }); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} style={{ touchAction: "none" }} />{selected === guide.id && <circle cx={guide.x} cy={guide.y} r="3" fill="#67e8f9" />}</g>)}
    </svg>
  </div>;
}
