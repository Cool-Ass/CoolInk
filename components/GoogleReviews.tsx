"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import type { GoogleReviewsModuleData } from "@/lib/modules";
import type { GoogleReviewsPayload } from "@/lib/googleReviews";

export default function GoogleReviews({ content, showEmpty = false }: { content: GoogleReviewsModuleData; showEmpty?: boolean }) {
  const [data, setData] = useState<GoogleReviewsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/google-reviews", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setData(result);
      })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);

  if (failed && !showEmpty) return null;
  if (data && !data.configured && !showEmpty) return null;
  const reviews = data?.reviews.slice(0, Math.min(5, Math.max(1, Number(content.limit) || 3))) ?? [];
  const cards = content.layout === "list" ? "grid gap-3" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3";

  return <section className="px-4 py-10 sm:px-6 sm:py-12 md:px-12">
    <div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-3xl"><p className="text-[11px] tracking-[.18em] text-ink-gold">{content.eyebrow}</p><h2 className="mt-2 font-display text-3xl text-ink-white md:text-5xl">{content.heading}</h2>{content.body && <p className="mt-3 text-sm leading-relaxed text-ink-grey md:text-base">{content.body}</p>}</div>{data?.configured && <div className="border-l-2 border-ink-gold pl-4"><p className="font-display text-4xl text-ink-white">{data.rating?.toFixed(1) ?? "—"}</p><div className="mt-1 flex gap-0.5 text-ink-gold" aria-label={`Ocena ${data.rating ?? 0} na 5`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.round(data.rating ?? 0) ? "fill-current" : "opacity-25"}`} />)}</div><p className="mt-1 text-[10px] text-ink-grey">{data.userRatingCount ?? 0} opinii · Google Maps</p></div>}</div>
    {!data && !failed ? <div className="mt-7 grid gap-3 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-44 animate-pulse border border-ink-white/10 bg-ink-white/[.03]" />)}</div> : !data?.configured || failed ? <div className="mt-7 border border-dashed border-ink-gold/35 bg-ink-gold/5 p-5 text-sm text-ink-grey"><p className="text-ink-white">Widget opinii Google jest gotowy.</p><p className="mt-2">Uzupełnij Place ID w Treściach globalnych i klucz GOOGLE_PLACES_API_KEY w środowisku wdrożenia.</p></div> : <>
      <div className={`mt-7 ${cards}`}>{reviews.map((review, index) => <article key={`${review.author.displayName}-${index}`} className="border border-ink-white/12 bg-ink-charcoal/45 p-4 sm:p-5"><div className="flex items-center gap-3">{review.author.photoUri ? <img src={review.author.photoUri} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-gold/15 font-display text-lg text-ink-gold">{review.author.displayName.slice(0, 1)}</span>}<div className="min-w-0"><a href={review.author.uri} target="_blank" rel="noreferrer" className="truncate text-sm text-ink-white hover:text-ink-gold">{review.author.displayName}</a><div className="mt-0.5 flex items-center gap-2"><span className="flex text-ink-gold" aria-label={`${review.rating} na 5`}>{Array.from({ length: 5 }, (_, star) => <Star key={star} className={`h-3 w-3 ${star < Math.round(review.rating) ? "fill-current" : "opacity-25"}`} />)}</span><span className="text-[9px] text-ink-grey">{review.relativePublishTimeDescription}</span></div></div></div><p className="mt-4 text-sm leading-relaxed text-ink-grey">{review.text}</p><a href={review.googleMapsUri} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[10px] tracking-[.08em] text-ink-gold">ŹRÓDŁO W GOOGLE MAPS <ExternalLink className="h-3 w-3" /></a></article>)}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[10px] leading-relaxed text-ink-grey"><p>Opinie są wyświetlane według trafności ustalonej przez Google Maps. Google sprawdza i usuwa wykryte fałszywe treści, ale nie weryfikuje każdej opinii.</p><div className="flex gap-4"><a href="https://support.google.com/contributionpolicy/answer/7400114" target="_blank" rel="noreferrer" className="hover:text-ink-gold">Zasady opinii Google</a>{data.googleMapsUri && <a href={data.googleMapsUri} target="_blank" rel="noreferrer" className="text-ink-gold">{content.buttonLabel} →</a>}</div></div>
    </>}
  </section>;
}
