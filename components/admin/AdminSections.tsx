"use client";
import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, EyeOff, GripVertical } from "lucide-react";
import { emptySectionLayout, moveSection, orderedSections, type SectionLayout } from "@/lib/adminSectionLayout";

type Section = { id: string; title: string; content: ReactNode };
export default function AdminSections({ sections, initial, scope }: { sections: Section[]; initial: SectionLayout; scope: string }) {
  const [layout, setLayout] = useState(initial);
  const [dragged, setDragged] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const order = orderedSections(sections.map((section) => section.id), layout.order);
  const visible = order.filter((id) => !layout.hidden.includes(id));
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
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><details><summary className="cursor-pointer text-ink-grey">Dostosuj sekcje · {layout.hidden.filter((id) => order.includes(id)).length} ukrytych</summary><div className="mt-2 flex flex-wrap gap-3 rounded border border-ink-white/10 p-3">{sections.map((section) => <label key={section.id} className="flex items-center gap-2"><input type="checkbox" checked={!layout.hidden.includes(section.id)} onChange={(event) => save({ ...layout, hidden: event.target.checked ? layout.hidden.filter((id) => id !== section.id) : [...layout.hidden, section.id] })} />{section.title}</label>)}<button type="button" onClick={() => save(emptySectionLayout)} className="text-ink-gold">Przywróć układ</button></div></details><span role="status">{message}</span>{message.startsWith("Nie udało") && <button type="button" onClick={() => save(layout)}>Ponów zapis</button>}</div>
    <div className="grid min-w-0 gap-3 lg:grid-cols-2">{visible.map((id, index) => {
      const section = sections.find((item) => item.id === id)!;
      const collapsed = layout.collapsed.includes(id);
      return <section key={id} onDragOver={(event) => { if (dragged) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragged) move(dragged, id); }} className={`min-w-0 self-start rounded-xl border bg-ink-charcoal ${dragged === id ? "border-ink-gold opacity-60" : "border-ink-white/10"}`}>
        <header className="flex min-w-0 items-center gap-1 px-2 py-1"><button type="button" draggable onDragStart={(event) => { setDragged(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); }} onDragEnd={() => setDragged(null)} onKeyDown={(event) => { if (event.key === "ArrowUp" && index > 0) { event.preventDefault(); move(id, visible[index - 1]); } if (event.key === "ArrowDown" && index < visible.length - 1) { event.preventDefault(); move(id, visible[index + 1]); } }} aria-label={`Przenieś: ${section.title}. Użyj strzałek góra i dół.`} className={`${control} cursor-grab`}><GripVertical size={15} /></button><span className="min-w-0 flex-1 text-xs font-medium">{section.title}</span><button className={control} disabled={index === 0} onClick={() => move(id, visible[index - 1])} aria-label={`Przesuń wyżej: ${section.title}`}><ArrowUp size={14} /></button><button className={control} disabled={index === visible.length - 1} onClick={() => move(id, visible[index + 1])} aria-label={`Przesuń niżej: ${section.title}`}><ArrowDown size={14} /></button><button className={control} aria-expanded={!collapsed} aria-controls={`${scope}-${id}`} aria-label={`${collapsed ? "Rozwiń" : "Zwiń"}: ${section.title}`} onClick={() => save({ ...layout, collapsed: collapsed ? layout.collapsed.filter((item) => item !== id) : [...layout.collapsed, id] })}>{collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button><button className={control} aria-label={`Ukryj: ${section.title}`} onClick={() => save({ ...layout, hidden: [...layout.hidden, id] })}><EyeOff size={14} /></button></header>
        <div id={`${scope}-${id}`} hidden={collapsed} className="min-w-0 [&>section]:border-0 [&>section]:bg-transparent [&>section]:p-3">{section.content}</div>
      </section>;
    })}</div>
    {!visible.length && <p className="text-sm text-ink-grey">Wszystkie sekcje są ukryte. Przywróć je w „Dostosuj sekcje”.</p>}
  </div>;
}
