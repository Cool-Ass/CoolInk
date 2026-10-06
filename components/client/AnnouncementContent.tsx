import Image from "next/image";
import type { Announcement } from "@/lib/announcementRules";
import { announcementInline } from "@/lib/announcementFormatting";

function inline(text: string) {
  return announcementInline(text).map((part, i) => {
    if (part.style === "bold") return <strong key={i}>{part.text}</strong>;
    if (part.style === "italic") return <em key={i}>{part.text}</em>;
    if (part.style === "underline") return <u key={i}>{part.text}</u>;
    if (part.style === "strike") return <s key={i}>{part.text}</s>;
    if (part.style === "code") return <code key={i} className="rounded bg-ink-white/10 px-1">{part.text}</code>;
    if (part.style === "highlight") return <mark key={i} className="rounded bg-ink-gold/20 px-1 text-ink-white">{part.text}</mark>;
    return part.text;
  });
}

export default function AnnouncementContent({ announcement: a }: { announcement: Pick<Announcement, "body" | "bodyFormat" | "images"> }) {
  const lines = a.body.split("\n");
  return <div className="min-w-0 space-y-2 break-words text-sm leading-relaxed text-ink-grey">
    {a.bodyFormat !== "markdown" ? <p className="whitespace-pre-wrap">{a.body}</p> : lines.map((line, i) => {
      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) return heading[1].length === 1 ? <h3 key={i} className="text-lg font-semibold text-ink-white">{inline(heading[2])}</h3> : <h4 key={i} className="font-semibold text-ink-white">{inline(heading[2])}</h4>;
      if (/^\s*[-*]\s+/.test(line)) {
        if (i > 0 && /^\s*[-*]\s+/.test(lines[i - 1])) return null;
        const group = lines.slice(i).findIndex(value => !/^\s*[-*]\s+/.test(value));
        return <ul key={i} className="list-disc space-y-1 pl-5">{lines.slice(i, group < 0 ? undefined : i + group).map((value, j) => <li key={j}>{inline(value.replace(/^\s*[-*]\s+/, ""))}</li>)}</ul>;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        if (i > 0 && /^\s*\d+\.\s+/.test(lines[i - 1])) return null;
        const group = lines.slice(i).findIndex(value => !/^\s*\d+\.\s+/.test(value));
        return <ol key={i} className="list-decimal space-y-1 pl-5">{lines.slice(i, group < 0 ? undefined : i + group).map((value, j) => <li key={j}>{inline(value.replace(/^\s*\d+\.\s+/, ""))}</li>)}</ol>;
      }
      if (/^>\s+/.test(line)) return <blockquote key={i} className="border-l-2 border-ink-gold/50 pl-3">{inline(line.replace(/^>\s+/, ""))}</blockquote>;
      return line ? <p key={i}>{inline(line)}</p> : <div key={i} aria-hidden className="h-2" />;
    })}
    {!!a.images?.length && <div className={`grid gap-2 ${a.images.length > 1 ? "sm:grid-cols-2" : ""}`}>{a.images.map(image => <div key={image.url} className="relative aspect-[16/9] overflow-hidden rounded-md bg-ink-black/30"><Image src={image.url} alt={image.alt} fill sizes="(max-width: 640px) 90vw, 600px" className="object-contain" /></div>)}</div>}
  </div>;
}
