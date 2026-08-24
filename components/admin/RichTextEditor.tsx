"use client";

import { useEffect, useRef } from "react";

type Command = "bold" | "italic" | "underline" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList" | "formatBlock" | "createLink" | "removeFormat";

function textToHtml(value: string) {
  if (!value.trim() || /<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`).join("");
}

export default function RichTextEditor({ value, onChange, label = "TREŚĆ" }: { value: string; onChange: (value: string) => void; label?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== textToHtml(value)) editorRef.current.innerHTML = textToHtml(value);
  }, [value]);

  function run(command: Command, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function addLink() {
    const url = window.prompt("Wklej adres linku:");
    if (url) run("createLink", url);
  }

  return <div className="border border-ink-white/20 bg-ink-black/20 focus-within:border-ink-gold">
    <div className="flex flex-wrap gap-1 border-b border-ink-white/15 bg-ink-charcoal/60 p-2" aria-label="Formatowanie tekstu">
      <ToolbarButton label="B" title="Pogrubienie" onClick={() => run("bold")} strong />
      <ToolbarButton label="I" title="Kursywa" onClick={() => run("italic")} italic />
      <ToolbarButton label="U" title="Podkreślenie" onClick={() => run("underline")} underline />
      <ToolbarButton label="S" title="Przekreślenie" onClick={() => run("strikeThrough")} />
      <span className="mx-1 h-7 w-px bg-ink-white/15" />
      <ToolbarButton label="H2" title="Nagłówek" onClick={() => run("formatBlock", "h2")} />
      <ToolbarButton label="¶" title="Akapit" onClick={() => run("formatBlock", "p")} />
      <ToolbarButton label="• Lista" title="Lista punktowana" onClick={() => run("insertUnorderedList")} />
      <ToolbarButton label="1. Lista" title="Lista numerowana" onClick={() => run("insertOrderedList")} />
      <ToolbarButton label="Link" title="Dodaj link" onClick={addLink} />
      <ToolbarButton label="Wyczyść" title="Usuń formatowanie zaznaczenia" onClick={() => run("removeFormat")} />
    </div>
    <p className="px-3 pt-3 text-[10px] tracking-[0.12em] text-ink-grey">{label} · zaznacz fragment tekstu, aby go sformatować</p>
    <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} onInput={() => onChange(editorRef.current?.innerHTML ?? "")} className="min-h-56 px-4 pb-4 pt-3 text-sm leading-relaxed text-ink-white outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-ink-grey" data-placeholder="Wpisz treść dokumentu…" />
  </div>;
}

function ToolbarButton({ label, title, onClick, strong, italic, underline }: { label: string; title: string; onClick: () => void; strong?: boolean; italic?: boolean; underline?: boolean }) {
  return <button type="button" title={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={`border border-ink-white/15 px-2 py-1 text-[11px] text-ink-grey hover:border-ink-gold hover:text-ink-gold ${strong ? "font-bold" : ""} ${italic ? "italic" : ""} ${underline ? "underline" : ""}`}>{label}</button>;
}
