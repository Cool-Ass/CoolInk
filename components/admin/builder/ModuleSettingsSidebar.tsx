"use client";

import { useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BackgroundControls from "@/components/admin/builder/BackgroundControls";
import IconPicker from "@/components/admin/builder/IconPicker";
import GalleryEditor from "@/components/admin/builder/GalleryEditor";
import { TextField, TextareaField, SelectField, FieldGroup } from "@/components/admin/builder/fields";
import { defaultModuleData, withDefaults, MODULE_LABELS, type ColumnWidget, type ColumnWidgetType, type Module, type ModuleStyle } from "@/lib/modules";
import type { PortfolioWork } from "@/lib/portfolio";
import { imageSource } from "@/lib/imageSource";

interface Props {
  module: Module;
  onChange: (data: Record<string, unknown>) => void;
  onStyleChange: (style: ModuleStyle) => void;
  onClose: () => void;
  portfolioItems: PortfolioWork[];
}

export default function ModuleSettingsSidebar({ module, onChange, onStyleChange, onClose, portfolioItems }: Props) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 border-b border-ink-white/10 pb-4">
        <p className="text-[14px] text-ink-white">{MODULE_LABELS[module.type]}</p>
        <button
          onClick={onClose}
          className="text-[12px] text-ink-grey transition-colors hover:text-ink-white"
        >
          Zamknij ✕
        </button>
      </div>

      <div className="grid grid-cols-3 border border-ink-white/15 p-1 text-[10px] tracking-[0.08em]">{(["content", "style", "advanced"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`px-2 py-2 transition-colors ${tab === item ? "bg-ink-gold/15 text-ink-gold" : "text-ink-grey hover:text-ink-white"}`}>{item === "content" ? "TREŚĆ" : item === "style" ? "STYL" : "ZAAWANS."}</button>)}</div>
      {tab === "content" && renderFields(module, onChange, portfolioItems)}
      {tab === "style" && <BackgroundControls value={module.style} onChange={onStyleChange} />}
      {tab === "advanced" && <div className="flex flex-col gap-4"><TextField label="Anchor ID (opcjonalnie)" value={module.style?.anchorId ?? ""} onChange={(anchorId) => onStyleChange({ ...module.style, anchorId })} placeholder="np. kontakt" /><TextField label="Klasa CSS (opcjonalnie)" value={module.style?.cssClass ?? ""} onChange={(cssClass) => onStyleChange({ ...module.style, cssClass })} placeholder="np. moja-sekcja" /><p className="border-l-2 border-ink-gold/70 bg-ink-gold/5 px-3 py-2 text-[12px] text-ink-grey">Te pola są opcjonalne. Nie dodajemy tu surowego CSS, aby strona pozostała bezpieczna.</p></div>}
    </div>
  );
}

function renderFields(
  module: Module,
  onChange: (data: Record<string, unknown>) => void,
  portfolioItems: PortfolioWork[]
) {
  switch (module.type) {
    case "hero": {
      const d = withDefaults("hero", module.data);
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={4} />
          <TextField label="Etykieta głównego przycisku" value={d.primaryBtnLabel} onChange={(v) => onChange({ ...d, primaryBtnLabel: v })} />
          <TextField label="Etykieta przycisku wideo" value={d.secondaryBtnLabel} onChange={(v) => onChange({ ...d, secondaryBtnLabel: v })} />
          <FieldGroup title="ZDJĘCIA HERO">
            <ImageUploadField label="Tekstura / zdjęcie tła" value={d.backgroundImage} onChange={(v) => onChange({ ...d, backgroundImage: v })} />
            <ImageUploadField label="Portret po prawej" value={d.portraitImage} onChange={(v) => onChange({ ...d, portraitImage: v })} />
          </FieldGroup>
        </>
      );
    }
    case "about": {
      const d = withDefaults("about", module.data);
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Tekst / historia" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={6} />
          <TextField label="Podpis — imię" value={d.signatureName} onChange={(v) => onChange({ ...d, signatureName: v })} />
          <TextField label="Podpis — rola" value={d.signatureRole} onChange={(v) => onChange({ ...d, signatureRole: v })} />
          <FieldGroup title="KOLAŻ ZDJĘĆ">
            <ImageUploadField label="Duże zdjęcie" value={d.mainImage} onChange={(v) => onChange({ ...d, mainImage: v })} />
            <ImageUploadField label="Małe zdjęcie 1" value={d.detailImage1} onChange={(v) => onChange({ ...d, detailImage1: v })} />
            <ImageUploadField label="Małe zdjęcie 2" value={d.detailImage2} onChange={(v) => onChange({ ...d, detailImage2: v })} />
            <ImageUploadField label="Małe zdjęcie 3" value={d.detailImage3} onChange={(v) => onChange({ ...d, detailImage3: v })} />
          </FieldGroup>
        </>
      );
    }
    case "stats": {
      const d = withDefaults("stats", module.data);
      const items = Array.from({ length: 4 }, (_, index) => d.items[index] || { value: "", label: "" });
      return <><p className="text-[12px] leading-relaxed text-ink-grey">Wpisz własne liczby i opisy. Układ oraz ikony zachowają styl strony.</p><FieldGroup title="STATYSTYKI">{items.map((item, index) => <div key={index} className="grid grid-cols-3 gap-2"><TextField label={`Liczba ${index + 1}`} value={item.value} onChange={(v) => onChange({ ...d, items: items.map((current, i) => i === index ? { ...current, value: v } : current) })} /><div className="col-span-2"><TextField label={`Opis ${index + 1}`} value={item.label} onChange={(v) => onChange({ ...d, items: items.map((current, i) => i === index ? { ...current, label: v } : current) })} /></div></div>)}</FieldGroup></>;
    }
    case "ctaBar": {
      const d = withDefaults("ctaBar", module.data);
      return (
        <>
          <TextField label="Tytuł — linia 1" value={d.title1} onChange={(v) => onChange({ ...d, title1: v })} />
          <TextField label="Tytuł — linia 2" value={d.title2} onChange={(v) => onChange({ ...d, title2: v })} />
          <TextareaField label="Wiadomość" value={d.message} onChange={(v) => onChange({ ...d, message: v })} rows={2} />
          <TextField label="Etykieta przycisku" value={d.buttonLabel} onChange={(v) => onChange({ ...d, buttonLabel: v })} />
          <TextField label="Link przycisku" value={d.href} onChange={(v) => onChange({ ...d, href: v })} placeholder="#contact lub /kontakt" />
        </>
      );
    }
    case "portfolio": {
      const d = withDefaults("portfolio", module.data);
      const selectedIds: string[] = Array.isArray(d.selectedIds) ? d.selectedIds : [];
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={3} />
          <TextField label="Etykieta głównego przycisku" value={d.primaryBtnLabel} onChange={(v) => onChange({ ...d, primaryBtnLabel: v })} />
          <TextField label="Etykieta przycisku wideo" value={d.secondaryBtnLabel} onChange={(v) => onChange({ ...d, secondaryBtnLabel: v })} />
          <SelectField
            label="Wybór zdjęć"
            value={d.selectionMode}
            onChange={(v) => onChange({ ...d, selectionMode: v })}
            options={[
              { value: "all", label: "Wszystkie opublikowane" },
              { value: "selected", label: "Wybrane ręcznie" },
            ]}
          />
          {d.selectionMode === "selected" && (
            <FieldGroup title="WYBIERZ ZDJĘCIA">
              {portfolioItems.length === 0 ? (
                <p className="text-[12px] text-ink-grey">
                  Brak zdjęć w portfolio — dodaj je w /admin/portfolio.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {portfolioItems.map((item) => {
                    const active = selectedIds.includes(item.id);
                    const source = imageSource(item.src);
                    if (!source) return null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? selectedIds.filter((id) => id !== item.id)
                            : [...selectedIds, item.id];
                          onChange({ ...d, selectedIds: next });
                        }}
                        className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                          active ? "border-ink-gold" : "border-transparent hover:border-ink-white/30"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={source} alt={item.alt} className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </FieldGroup>
          )}
        </>
      );
    }
    case "studio": {
      const d = withDefaults("studio", module.data);
      return (
        <>
          <ImageUploadField label="Zdjęcie studia" value={d.image} onChange={(v) => onChange({ ...d, image: v })} />
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={4} />
          <TextField label="Etykieta głównego przycisku" value={d.primaryBtnLabel} onChange={(v) => onChange({ ...d, primaryBtnLabel: v })} />
          <TextField label="Etykieta przycisku wideo" value={d.secondaryBtnLabel} onChange={(v) => onChange({ ...d, secondaryBtnLabel: v })} />
          <FieldGroup title="BANER CTA (na dole sekcji)">
            <TextField label="Tytuł — linia 1" value={d.ctaTitle1} onChange={(v) => onChange({ ...d, ctaTitle1: v })} />
            <TextField label="Tytuł — linia 2" value={d.ctaTitle2} onChange={(v) => onChange({ ...d, ctaTitle2: v })} />
            <TextareaField label="Wiadomość" value={d.ctaMessage} onChange={(v) => onChange({ ...d, ctaMessage: v })} rows={2} />
          </FieldGroup>
        </>
      );
    }
    case "contact": {
      const d = withDefaults("contact", module.data);
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Opis" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={3} />
          <TextField label="Adres" value={d.address} onChange={(v) => onChange({ ...d, address: v })} />
          <TextField label="Telefon" value={d.phone} onChange={(v) => onChange({ ...d, phone: v })} />
          <TextField label="Email" value={d.email} onChange={(v) => onChange({ ...d, email: v })} />
          <TextField label="Godziny otwarcia" value={d.hours} onChange={(v) => onChange({ ...d, hours: v })} />
        </>
      );
    }
    case "textSection": {
      const d = withDefaults("textSection", module.data);
      return (
        <>
          <TextField label="Nadpis (eyebrow)" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Treść" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={6} />
          <SelectField
            label="Wyrównanie"
            value={d.alignment}
            onChange={(v) => onChange({ ...d, alignment: v })}
            options={[
              { value: "left", label: "Do lewej" },
              { value: "center", label: "Wyśrodkowane" },
            ]}
          />
        </>
      );
    }
    case "imageText": {
      const d = withDefaults("imageText", module.data);
      return (
        <>
          <ImageUploadField label="Obraz" value={d.image} onChange={(v) => onChange({ ...d, image: v })} />
          <TextField label="Nagłówek — linia 1" value={d.heading1} onChange={(v) => onChange({ ...d, heading1: v })} />
          <TextField label="Nagłówek — linia 2" value={d.heading2} onChange={(v) => onChange({ ...d, heading2: v })} />
          <TextareaField label="Treść" value={d.body} onChange={(v) => onChange({ ...d, body: v })} rows={5} />
          <TextField label="Etykieta przycisku (opcjonalnie)" value={d.buttonLabel} onChange={(v) => onChange({ ...d, buttonLabel: v })} />
          <TextField label="Link przycisku" value={d.buttonUrl} onChange={(v) => onChange({ ...d, buttonUrl: v })} placeholder="/kontakt" />
          <SelectField
            label="Pozycja obrazu"
            value={d.imagePosition}
            onChange={(v) => onChange({ ...d, imagePosition: v })}
            options={[
              { value: "left", label: "Po lewej" },
              { value: "right", label: "Po prawej" },
            ]}
          />
        </>
      );
    }
    case "spacer": {
      const d = withDefaults("spacer", module.data);
      return (
        <SelectField
          label="Rozmiar odstępu"
          value={d.size}
          onChange={(v) => onChange({ ...d, size: v })}
          options={[
            { value: "sm", label: "Mały" },
            { value: "md", label: "Średni" },
            { value: "lg", label: "Duży" },
          ]}
        />
      );
    }
    case "heading": {
      const d = withDefaults("heading", module.data);
      return <>
        <TextField label="Treść nagłówka" value={d.text} onChange={(v) => onChange({ ...d, text: v })} />
        <IconPicker label="IKONA NAD NAGŁÓWKIEM" value={d.icon || ""} onChange={(v) => onChange({ ...d, icon: v })} />
        <SelectField label="Rozmiar / poziom" value={d.level} onChange={(v) => onChange({ ...d, level: v })} options={[{ value: "h1", label: "Duży (H1)" }, { value: "h2", label: "Średni (H2)" }, { value: "h3", label: "Mały (H3)" }]} />
        <SelectField label="Wyrównanie" value={d.alignment} onChange={(v) => onChange({ ...d, alignment: v })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Wyśrodkowane" }]} />
      </>;
    }
    case "text": {
      const d = withDefaults("text", module.data);
      return <>
        <TextareaField label="Treść" value={d.text} onChange={(v) => onChange({ ...d, text: v })} rows={8} />
        <SelectField label="Wyrównanie" value={d.alignment} onChange={(v) => onChange({ ...d, alignment: v })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Wyśrodkowane" }]} />
      </>;
    }
    case "image": {
      const d = withDefaults("image", module.data);
      return <>
        <ImageUploadField label="Zdjęcie" value={d.image} onChange={(v) => onChange({ ...d, image: v })} />
        <TextField label="Opis alternatywny (dla dostępności i Google)" value={d.alt} onChange={(v) => onChange({ ...d, alt: v })} placeholder="Np. tatuaż realistyczny na przedramieniu" />
        <TextField label="Podpis pod zdjęciem (opcjonalnie)" value={d.caption} onChange={(v) => onChange({ ...d, caption: v })} />
      </>;
    }
    case "button": {
      const d = withDefaults("button", module.data);
      return <>
        <TextField label="Tekst przycisku" value={d.label} onChange={(v) => onChange({ ...d, label: v })} />
        <TextField label="Dokąd prowadzi" value={d.href} onChange={(v) => onChange({ ...d, href: v })} placeholder="/kontakt lub #kontakt" />
        <IconPicker label="IKONA PRZYCISKU" value={d.icon} onChange={(icon) => onChange({ ...d, icon })} />
        <SelectField label="Pozycja ikony" value={d.iconPosition ?? "left"} onChange={(iconPosition) => onChange({ ...d, iconPosition })} options={[{ value: "left", label: "Po lewej" }, { value: "right", label: "Po prawej" }]} />
        <SelectField label="Styl" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "primary", label: "Złote wypełnienie" }, { value: "outline", label: "Złoty obrys" }]} />
        <SelectField label="Wyrównanie" value={d.alignment} onChange={(v) => onChange({ ...d, alignment: v })} options={[{ value: "left", label: "Do lewej" }, { value: "center", label: "Wyśrodkowane" }, { value: "right", label: "Do prawej" }]} />
        <SelectField label="Szerokość" value={d.width ?? "auto"} onChange={(width) => onChange({ ...d, width })} options={[{ value: "auto", label: "Dopasowana" }, { value: "full", label: "Pełna szerokość" }]} />
      </>;
    }
    case "divider": {
      const d = withDefaults("divider", module.data);
      return <><SelectField label="Rodzaj separatora" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "line", label: "Delikatna linia" }, { value: "gold", label: "Złota linia" }, { value: "space", label: "Sam odstęp" }]} /><ImageUploadField label="Ikona separatora (SVG / PNG, opcjonalnie)" value={d.icon || ""} onChange={(v) => onChange({ ...d, icon: v })} /></>;
    }
    case "gallery": {
      const d = withDefaults("gallery", module.data);
      return <GalleryEditor value={d} onChange={onChange} />;
    }
    case "columns": {
      const d = withDefaults("columns", module.data);
      const expectedColumns = d.layout === "three" ? 3 : 2;
      const columns = Array.from({ length: expectedColumns }, (_, i) => d.columns[i] ?? []);
      const updateColumns = (next: ColumnWidget[][]) => onChange({ ...d, columns: next });
      return <>
        <p className="border-l-2 border-ink-gold/70 bg-ink-gold/5 px-3 py-2 text-[12px] leading-relaxed text-ink-grey">Na komputerze zobaczysz kolumny obok siebie; na telefonie automatycznie układają się pionowo.</p>
        <SelectField label="Liczba kolumn" value={d.layout} onChange={(v) => {
          const nextCount = v === "three" ? 3 : 2;
          const next = Array.from({ length: nextCount }, (_, i) => d.columns[i] ?? []);
          onChange({ ...d, layout: v, columns: next });
        }} options={[{ value: "two", label: "2 kolumny" }, { value: "three", label: "3 kolumny" }]} />
        <SelectField label="Tło całego układu" value={d.background} onChange={(v) => onChange({ ...d, background: v })} options={[{ value: "transparent", label: "Bez tła" }, { value: "charcoal", label: "Ciemne" }, { value: "gold", label: "Złote" }]} />
        <SelectField label="Odstęp góra / dół" value={d.padding} onChange={(v) => onChange({ ...d, padding: v })} options={[{ value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} />
        <FieldGroup title="ZAWARTOŚĆ KOLUMN">
          <div className="flex flex-col gap-6">
            {columns.map((widgets, columnIndex) => <ColumnEditor key={columnIndex} label={`Kolumna ${columnIndex + 1}`} widgets={widgets} onChange={(nextWidgets) => { const next = columns.map((col, i) => i === columnIndex ? nextWidgets : col); updateColumns(next); }} />)}
          </div>
        </FieldGroup>
      </>;
    }
    case "faq": {
      const d = withDefaults("faq", module.data);
      const updateItem = (index: number, key: "question" | "answer", value: string) => onChange({ ...d, items: d.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });
      return <><TextField label="Nagłówek sekcji" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><FieldGroup title="PYTANIA I ODPOWIEDZI"><div className="flex flex-col gap-4">{d.items.map((item, index) => <div key={index} className="border border-ink-white/10 p-3"><div className="mb-2 flex justify-between"><span className="text-[11px] text-ink-gold">Pytanie {index + 1}</span><button type="button" onClick={() => onChange({ ...d, items: d.items.filter((_, i) => i !== index) })} className="text-[11px] text-red-400">Usuń</button></div><TextField label="Pytanie" value={item.question} onChange={(v) => updateItem(index, "question", v)} /><div className="mt-3"><TextareaField label="Odpowiedź" value={item.answer} rows={3} onChange={(v) => updateItem(index, "answer", v)} /></div></div>)}</div><button type="button" onClick={() => onChange({ ...d, items: [...d.items, { question: "Nowe pytanie", answer: "Wpisz odpowiedź." }] })} className="mt-3 border border-ink-white/20 px-3 py-2 text-[11px] text-ink-grey hover:border-ink-gold hover:text-ink-gold">+ DODAJ PYTANIE</button></FieldGroup></>;
    }
    case "video": { const d = withDefaults("video", module.data); return <><TextField label="Tytuł" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextField label="Link YouTube lub Vimeo" value={d.url} onChange={(v) => onChange({ ...d, url: v })} placeholder="https://www.youtube.com/watch?v=…" /><TextField label="Podpis (opcjonalnie)" value={d.caption} onChange={(v) => onChange({ ...d, caption: v })} /></>; }
    case "map": { const d = withDefaults("map", module.data); return <><TextField label="Nagłówek" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextField label="Adres wyświetlany nad mapą" value={d.address} onChange={(v) => onChange({ ...d, address: v })} /><TextareaField label="Link osadzania mapy (src)" value={d.embedUrl} rows={3} onChange={(v) => onChange({ ...d, embedUrl: v })} placeholder="W Google Maps: Udostępnij → Umieść mapę → skopiuj adres z src" /><SelectField label="Wysokość mapy" value={d.height} onChange={(v) => onChange({ ...d, height: v })} options={[{ value: "sm", label: "Mała" }, { value: "md", label: "Średnia" }, { value: "lg", label: "Duża" }]} /></>; }
    case "quote": { const d = withDefaults("quote", module.data); return <><TextareaField label="Cytat / opinia" value={d.quote} rows={5} onChange={(v) => onChange({ ...d, quote: v })} /><TextField label="Autor" value={d.author} onChange={(v) => onChange({ ...d, author: v })} /><TextField label="Rola / dopisek" value={d.role} onChange={(v) => onChange({ ...d, role: v })} /></>; }
    case "iconList": { const d = withDefaults("iconList", module.data); return <><TextField label="Nagłówek" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextareaField label="Punkty listy — jeden w każdej linii" value={d.items.join("\n")} rows={6} onChange={(v) => onChange({ ...d, items: v.split("\n") })} /><SelectField label="Ikona punktu" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "check", label: "✓ Zaznaczenie" }, { value: "dot", label: "• Kropka" }, { value: "arrow", label: "→ Strzałka" }]} /></>; }
    case "callout": { const d = withDefaults("callout", module.data); return <><TextField label="Mały nadpis" value={d.eyebrow} onChange={(v) => onChange({ ...d, eyebrow: v })} /><TextField label="Tytuł" value={d.title} onChange={(v) => onChange({ ...d, title: v })} /><TextareaField label="Treść" value={d.body} rows={4} onChange={(v) => onChange({ ...d, body: v })} /><TextField label="Tekst przycisku (opcjonalnie)" value={d.buttonLabel} onChange={(v) => onChange({ ...d, buttonLabel: v })} /><TextField label="Link przycisku" value={d.href} onChange={(v) => onChange({ ...d, href: v })} /><SelectField label="Wygląd" value={d.style} onChange={(v) => onChange({ ...d, style: v })} options={[{ value: "charcoal", label: "Ciemny blok" }, { value: "gold", label: "Złoty blok" }, { value: "outline", label: "Obrys" }]} /></>; }
    default:
      return null;
  }
}

const COLUMN_WIDGETS: ColumnWidgetType[] = ["heading", "text", "image", "button", "divider", "spacer"];

function ColumnEditor({ label, widgets, onChange }: { label: string; widgets: ColumnWidget[]; onChange: (widgets: ColumnWidget[]) => void }) {
  function add(type: ColumnWidgetType) {
    const nextId = widgets.reduce((highest, widget) => {
      const match = widget.id.match(/^col_(\d+)$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
    onChange([...widgets, { id: `col_${nextId}`, type, data: defaultModuleData(type) }]);
  }
  return <div className="border border-ink-white/15 p-3">
    <p className="mb-3 text-[12px] text-ink-white">{label}</p>
    <div className="flex flex-col gap-3">
      {widgets.map((widget, index) => <div key={widget.id} className="border border-ink-white/10 bg-ink-black/20 p-3">
        <div className="mb-3 flex items-center justify-between gap-2"><span className="text-[11px] text-ink-gold">{MODULE_LABELS[widget.type]}</span><div className="flex gap-2 text-[11px]"><button type="button" disabled={index === 0} onClick={() => { const next = [...widgets]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }} className="text-ink-grey hover:text-ink-white disabled:opacity-30">↑</button><button type="button" disabled={index === widgets.length - 1} onClick={() => { const next = [...widgets]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(next); }} className="text-ink-grey hover:text-ink-white disabled:opacity-30">↓</button><button type="button" onClick={() => onChange(widgets.filter((item) => item.id !== widget.id))} className="text-red-400">Usuń</button></div></div>
        <ColumnWidgetFields widget={widget} onChange={(data) => onChange(widgets.map((item) => item.id === widget.id ? { ...item, data } : item))} />
      </div>)}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{COLUMN_WIDGETS.map((type) => <button key={type} type="button" onClick={() => add(type)} className="border border-ink-white/20 px-2 py-1 text-[10px] text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold">+ {MODULE_LABELS[type]}</button>)}</div>
  </div>;
}

function ColumnWidgetFields({ widget, onChange }: { widget: ColumnWidget; onChange: (data: Record<string, unknown>) => void }) {
  if (widget.type === "heading") { const d = withDefaults("heading", widget.data); return <TextField label="Treść" value={d.text} onChange={(v) => onChange({ ...d, text: v })} />; }
  if (widget.type === "text") { const d = withDefaults("text", widget.data); return <TextareaField label="Treść" value={d.text} rows={4} onChange={(v) => onChange({ ...d, text: v })} />; }
  if (widget.type === "image") { const d = withDefaults("image", widget.data); return <ImageUploadField label="Zdjęcie" value={d.image} onChange={(v) => onChange({ ...d, image: v })} />; }
  if (widget.type === "button") { const d = withDefaults("button", widget.data); return <><TextField label="Tekst" value={d.label} onChange={(v) => onChange({ ...d, label: v })} /><TextField label="Link" value={d.href} onChange={(v) => onChange({ ...d, href: v })} /></>; }
  if (widget.type === "spacer") { const d = withDefaults("spacer", widget.data); return <SelectField label="Rozmiar" value={d.size} onChange={(v) => onChange({ ...d, size: v })} options={[{ value: "sm", label: "Mały" }, { value: "md", label: "Średni" }, { value: "lg", label: "Duży" }]} />; }
  return <p className="text-[11px] text-ink-grey">Ten separator nie wymaga dodatkowych ustawień.</p>;
}
