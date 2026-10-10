"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, EyeOff, GripVertical } from "lucide-react";
import { emptySectionLayout, moveSection, orderedSections, type SectionLayout } from "@/lib/adminSectionLayout";

type Section = { id: string; title: string; content: ReactNode };
export default function AdminSections({ sections, initial, scope, masonry = false }: { sections: Section[]; initial: SectionLayout; scope: string; masonry?: boolean }) {
  const [layout, setLayout] = useState(initial);
  const [dragged, setDragged] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [measured, setMeasured] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const order = orderedSections(sections.map((section) => section.id), layout.order);
  const visible = order.filter((id) => !layout.hidden.includes(id));
  const visibleKey = visible.join(",");
  useEffect(() => {
    if (!masonry || !grid.current) return;
    const nodes = Array.from(grid.current.querySelectorAll<HTMLElement>("[data-section-measure]"));
    const measure = () => {
      for (const node of nodes) node.parentElement?.style.setProperty("--section-span", String(Math.ceil((node.getBoundingClientRect().height + 2 + 12) / 20)));
      setMeasured(true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [masonry, visibleKey]);
  function save(next: SectionLayout) {
    const currentRevision = ++revision.current;
    setLayout(next); setMessage("Zapisywanie układu…");
    queue.current = queue.current.catch(() => {}).then(async () => {
      const response = await fetch("/api/admin/section-layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, layout: next }) });
      if (!response.ok) throw new Error("Nie udało się zapisać układu. Użyj „Ponów zapis”.");
      if (revision.current === currentRevision) setMessage("Układ zapisany.");
    }).catch(() => {
      if (revision.current === currentRevision) setMessage("Nie udało się zapisać układu. Użyj „Ponów zapis”.");
    });
  }
  function move(source: string, target: string) { save({ ...layout, order: moveSection(order, source, target) }); setDragged(null); }
  const control = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink-grey hover:bg-ink-white/10 hover:text-ink-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold disabled:opacity-30";
  return <div className="w-full min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><button type="button" aria-expanded={customizing} onClick={() => setCustomizing(!customizing)} className="min-h-10 text-ink-grey hover:text-ink-gold">{customizing ? "Zakończ dostosowanie" : "Dostosuj sekcje"} · {layout.hidden.filter((id) => order.includes(id)).length} ukrytych</button><span role="status">{message}</span>{message.startsWith("Nie udało") && <button type="button" onClick={() => save(layout)}>Ponów zapis</button>}</div>
    {customizing && <div className="flex flex-wrap gap-3 rounded-lg border border-ink-white/10 p-3 text-xs">{sections.map(section => <label key={section.id} className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={!layout.hidden.includes(section.id)} onChange={event => save({ ...layout, hidden: event.target.checked ? layout.hidden.filter(id => id !== section.id) : [...layout.hidden, section.id] })} />{section.title}</label>)}<button type="button" onClick={() => save(emptySectionLayout)} className="text-ink-gold">Przywróć układ</button></div>}
    <div ref={grid} data-testid={masonry ? "dashboard-masonry" : undefined} className={`grid min-w-0 gap-3 lg:grid-cols-2 ${masonry && measured ? "lg:auto-rows-[8px] lg:[grid-auto-flow:row_dense]" : ""}`}>{visible.map((id, index) => {
      const section = sections.find((item) => item.id === id)!;
      const collapsed = layout.collapsed.includes(id);
      return <section key={id} data-section-id={id} onDragOver={(event) => { if (dragged && customizing) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragged && customizing) move(dragged, id); }} className={`min-w-0 self-start rounded-xl border bg-ink-charcoal ${masonry && measured ? "lg:[grid-row:span_var(--section-span)]" : ""} ${dragged === id ? "border-ink-gold opacity-60" : "border-ink-white/10"}`}><div data-section-measure>
        <header className="flex min-w-0 items-center gap-1 px-3 py-2">{customizing && <button type="button" draggable onDragStart={(event) => { setDragged(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); }} onDragEnd={() => setDragged(null)} onKeyDown={(event) => { if (event.key === "ArrowUp" && index > 0) { event.preventDefault(); move(id, visible[index - 1]); } if (event.key === "ArrowDown" && index < visible.length - 1) { event.preventDefault(); move(id, visible[index + 1]); } }} aria-label={`Przenieś: ${section.title}. Użyj strzałek góra i dół.`} className={`${control} cursor-grab`}><GripVertical size={15} /></button>}<h2 className="min-w-0 flex-1 text-sm font-semibold">{section.title}</h2>{customizing && <><button className={control} disabled={index === 0} onClick={() => move(id, visible[index - 1])} aria-label={`Przesuń wyżej: ${section.title}`}><ArrowUp size={14} /></button><button className={control} disabled={index === visible.length - 1} onClick={() => move(id, visible[index + 1])} aria-label={`Przesuń niżej: ${section.title}`}><ArrowDown size={14} /></button></>}<button className={control} aria-expanded={!collapsed} aria-controls={`${scope}-${id}`} aria-label={`${collapsed ? "Rozwiń" : "Zwiń"}: ${section.title}`} onClick={() => save({ ...layout, collapsed: collapsed ? layout.collapsed.filter((item) => item !== id) : [...layout.collapsed, id] })}>{collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>{customizing && <button className={control} aria-label={`Ukryj: ${section.title}`} onClick={() => save({ ...layout, hidden: [...layout.hidden, id] })}><EyeOff size={14} /></button>}</header>
        <div id={`${scope}-${id}`} hidden={collapsed} className="min-w-0 [&>section]:border-0 [&>section]:bg-transparent [&>section]:p-3">{section.content}</div>
      </div></section>;
    })}</div>
    {!visible.length && <p className="text-sm text-ink-grey">Wszystkie sekcje są ukryte. Przywróć je w „Dostosuj sekcje”.</p>}
  </div>;
}
