"use client";

import Image from "next/image";
import { useState } from "react";
import { defaultModuleData, withDefaults, type ColumnWidget, type Module } from "@/lib/modules";

export default function BuilderWidgets({ module, showEmpty = false }: { module: Module; showEmpty?: boolean }) {
  switch (module.type) {
    case "heading": {
      const d = withDefaults("heading", module.data);
      const Tag = d.level;
      return <section className={`px-6 py-10 md:px-12 ${d.alignment === "center" ? "text-center" : "text-left"}`}><Tag className="font-display text-3xl text-ink-white md:text-5xl">{d.text}</Tag></section>;
    }
    case "text": {
      const d = withDefaults("text", module.data);
      return <section className={`px-6 py-7 md:px-12 ${d.alignment === "center" ? "text-center" : "text-left"}`}><p className="whitespace-pre-line text-base leading-relaxed text-ink-grey md:text-lg">{d.text}</p></section>;
    }
    case "image": {
      const d = withDefaults("image", module.data);
      if (!d.image && !showEmpty) return null;
      return <figure className="px-6 py-8 md:px-12">{d.image ? <div className="relative aspect-[16/9] overflow-hidden bg-ink-charcoal"><Image src={d.image} alt={d.alt} fill className="object-cover" sizes="100vw" /></div> : <div className="flex aspect-[16/9] items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-sm text-ink-grey">Wybierz zdjęcie w panelu po prawej</div>}{d.caption && <figcaption className="mt-2 text-sm text-ink-grey">{d.caption}</figcaption>}</figure>;
    }
    case "button": {
      const d = withDefaults("button", module.data);
      return <div className={`px-6 py-8 md:px-12 ${d.alignment === "center" ? "text-center" : "text-left"}`}><a href={d.href} className={`inline-flex border px-5 py-3 text-sm tracking-[0.08em] ${d.style === "primary" ? "border-ink-gold bg-ink-gold text-ink-black" : "border-ink-gold text-ink-gold"}`}>{d.label}</a></div>;
    }
    case "divider": {
      const d = withDefaults("divider", module.data);
      return d.style === "space" ? <div className="h-12" /> : <div className="px-6 py-8 md:px-12"><div className={`h-px ${d.style === "gold" ? "bg-ink-gold" : "bg-ink-white/20"}`} /></div>;
    }
    case "gallery": {
      const d = withDefaults("gallery", module.data);
      const images = [d.image1, d.image2, d.image3];
      const renderImages = showEmpty ? images : images.filter(Boolean);
      if (renderImages.length === 0 && !showEmpty) return null;
      return <div className="grid grid-cols-1 gap-3 px-6 py-8 sm:grid-cols-3 md:px-12">{renderImages.map((image, index) => image ? <div key={index} className="relative aspect-square overflow-hidden bg-ink-charcoal"><Image src={image} alt={`Zdjęcie galerii ${index + 1}`} fill className="object-cover" sizes="33vw" /></div> : <div key={index} className="flex aspect-square items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-center text-xs text-ink-grey">Zdjęcie {index + 1}</div>)}</div>;
    }
    case "columns": {
      const d = withDefaults("columns", module.data);
      const columnCount = d.layout === "three" ? 3 : 2;
      const columns = Array.from({ length: columnCount }, (_, index) => d.columns[index] ?? []);
      const background = d.background === "charcoal" ? "bg-ink-charcoal" : d.background === "gold" ? "bg-ink-gold text-ink-black" : "bg-transparent";
      const padding = d.padding === "sm" ? "py-8" : d.padding === "lg" ? "py-20" : "py-12";
      return <section className={`${background} px-6 md:px-12 ${padding}`}><div className={`grid grid-cols-1 gap-6 ${d.layout === "three" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>{columns.map((widgets, columnIndex) => <div key={columnIndex} className="min-w-0 border-l border-ink-white/10 pl-4 first:border-l-0 first:pl-0">{widgets.length ? widgets.map((widget) => <BuilderWidgets key={widget.id} module={{ ...widget, hidden: false } as Module} showEmpty={showEmpty} />) : showEmpty ? <div className="border border-dashed border-ink-white/25 p-6 text-center text-xs text-ink-grey">Dodaj widget do tej kolumny</div> : null}</div>)}</div></section>;
    }
    case "faq": {
      const d = withDefaults("faq", module.data);
      return <FaqWidget title={d.title} items={d.items} />;
    }
    case "video": {
      const d = withDefaults("video", module.data);
      const src = toEmbedUrl(d.url);
      if (!src && !showEmpty) return null;
      return <figure className="px-6 py-10 md:px-12"><h2 className="mb-4 font-display text-3xl text-ink-white">{d.title}</h2>{src ? <div className="aspect-video overflow-hidden bg-ink-charcoal"><iframe className="h-full w-full" src={src} title={d.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <div className="flex aspect-video items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-sm text-ink-grey">Wklej link do filmu YouTube lub Vimeo</div>}{d.caption && <figcaption className="mt-3 text-sm text-ink-grey">{d.caption}</figcaption>}</figure>;
    }
    case "map": {
      const d = withDefaults("map", module.data);
      if (!d.embedUrl && !showEmpty) return null;
      const height = d.height === "sm" ? "h-64" : d.height === "lg" ? "h-[32rem]" : "h-96";
      return <section className="px-6 py-10 md:px-12"><h2 className="font-display text-3xl text-ink-white">{d.title}</h2>{d.address && <p className="mt-2 text-sm text-ink-grey">{d.address}</p>}{d.embedUrl ? <iframe className={`mt-5 w-full border-0 ${height}`} src={d.embedUrl} title={d.title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className={`mt-5 flex ${height} items-center justify-center border border-dashed border-ink-white/25 bg-ink-charcoal text-sm text-ink-grey`}>Wklej link „src” z opcji Udostępnij → Umieść mapę</div>}</section>;
    }
    case "quote": {
      const d = withDefaults("quote", module.data);
      return <blockquote className="mx-6 my-10 border-l-2 border-ink-gold bg-ink-charcoal/50 px-6 py-7 md:mx-12"><p className="font-display text-2xl leading-relaxed text-ink-white">„{d.quote}”</p><footer className="mt-5 text-sm text-ink-gold">{d.author}{d.role && <span className="text-ink-grey"> · {d.role}</span>}</footer></blockquote>;
    }
    case "iconList": {
      const d = withDefaults("iconList", module.data);
      const icons = { check: "✓", dot: "•", arrow: "→" };
      return <section className="px-6 py-10 md:px-12"><h2 className="mb-5 font-display text-3xl text-ink-white">{d.title}</h2><ul className="space-y-3">{d.items.filter(Boolean).map((item, index) => <li key={index} className="flex gap-3 text-base text-ink-grey"><span className="text-ink-gold">{icons[d.style]}</span><span>{item}</span></li>)}</ul></section>;
    }
    case "callout": {
      const d = withDefaults("callout", module.data);
      const styles = { charcoal: "bg-ink-charcoal text-ink-white", gold: "bg-ink-gold text-ink-black", outline: "border border-ink-gold text-ink-white" };
      const muted = d.style === "gold" ? "text-ink-black/70" : "text-ink-grey";
      return <section className={`mx-6 my-10 px-6 py-10 md:mx-12 md:px-10 ${styles[d.style]}`}><p className={`text-[11px] tracking-[0.16em] ${d.style === "gold" ? "text-ink-black/70" : "text-ink-gold"}`}>{d.eyebrow}</p><h2 className="mt-3 font-display text-3xl">{d.title}</h2><p className={`mt-3 max-w-2xl whitespace-pre-line leading-relaxed ${muted}`}>{d.body}</p>{d.buttonLabel && <a href={d.href} className={`mt-6 inline-flex border px-5 py-3 text-sm tracking-[0.08em] ${d.style === "gold" ? "border-ink-black text-ink-black" : "border-ink-gold text-ink-gold"}`}>{d.buttonLabel}</a>}</section>;
    }
    default: return null;
  }
}

function FaqWidget({ title, items }: { title: string; items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return <section className="px-6 py-12 md:px-12"><h2 className="mb-6 font-display text-3xl text-ink-white">{title}</h2><div className="divide-y divide-ink-white/15 border-y border-ink-white/15">{items.map((item, index) => {
    const open = openIndex === index;
    const answerId = `faq-answer-${index}`;
    return <article key={`${item.question}-${index}`} className="py-1"><button type="button" aria-expanded={open} aria-controls={answerId} onClick={(event) => { event.stopPropagation(); setOpenIndex(open ? null : index); }} className="flex w-full items-center justify-between gap-4 py-4 text-left text-base text-ink-white"><span>{item.question}</span><span aria-hidden className={`shrink-0 text-2xl leading-none text-ink-gold transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span></button><div id={answerId} hidden={!open} className="pb-4 pr-8"><p className="whitespace-pre-line text-sm leading-relaxed text-ink-grey">{item.answer}</p></div></article>;
  })}</div></section>;
}

function toEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("youtube.com/embed/") || url.includes("player.vimeo.com/video/")) return url;
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^?&/]+)/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  return vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : url;
}
