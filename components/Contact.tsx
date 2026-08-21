"use client";

import SectionRail from "@/components/SectionRail";
import MultilineText from "@/components/MultilineText";
import CalligraphyBackground from "@/components/CalligraphyBackground";
import { defaultModuleData, type ContactModuleData } from "@/lib/modules";
import { useState, type FormEvent } from "react";

const ICON_PATHS = {
  address:
    "M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 4.5A2.5 2.5 0 1 0 12 11.5 2.5 2.5 0 0 0 12 6.5Z",
  phone:
    "M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z",
  email:
    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.2 2 6.8 5.4L18.8 7H5.2ZM19 8.4l-6.4 5.1a1 1 0 0 1-1.2 0L5 8.4V17h14V8.4Z",
  hours:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v5.6l4.2 2.5 1-1.6-3.4-2V7h-1.8Z",
};

export default function Contact({
  content = defaultModuleData("contact") as unknown as ContactModuleData,
}: {
  content?: ContactModuleData;
}) {
  const [sending, setSending] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const details = [
    { label: "ADRES", value: content.address, path: ICON_PATHS.address },
    { label: "TELEFON", value: content.phone, path: ICON_PATHS.phone },
    { label: "EMAIL", value: content.email, path: ICON_PATHS.email },
    { label: "GODZINY", value: content.hours, path: ICON_PATHS.hours },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setFormStatus(null);
    const form = event.currentTarget;
    const values = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(values)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się wysłać wiadomości.");
      form.reset();
      setFormStatus({ type: "success", text: "Dziękujemy — wiadomość została wysłana. Odpowiemy możliwie szybko." });
    } catch (error) {
      setFormStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Nie udało się wysłać wiadomości.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden bg-ink-black py-24 md:py-32">
      <CalligraphyBackground opacity={0.05} position="50% 90%" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/3 w-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 420px 300px at 40% 30%, rgba(201,154,74,0.13), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1536px] px-6 md:px-10 lg:px-16">
        <SectionRail number="05" />

        <div className="grid w-full gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Text column */}
          <div className="reveal-up max-w-xl">
            <p className="mb-4 text-[13px] font-medium tracking-[0.35em] text-ink-gold">
              {content.eyebrow}
            </p>

            <h2 className="headline-texture -ml-1 text-[13vw] leading-[0.86] tracking-tight sm:text-[7.5vw] md:text-[5vw] lg:text-[3.6vw]">
              <span className="block">{content.heading1}</span>
              <span className="block">{content.heading2}</span>
            </h2>

            <div className="gold-underline mt-5 h-3 w-56 md:w-64" aria-hidden />

            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-grey">
              <MultilineText text={content.body} />
            </p>

            <dl className="mt-10 flex flex-col gap-6">
              {details.map((detail) => (
                <div key={detail.label} className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-gold/60 text-ink-gold">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
                      <path d={detail.path} />
                    </svg>
                  </span>
                  <div>
                    <dt className="text-[10.5px] tracking-[0.2em] text-ink-grey">
                      {detail.label}
                    </dt>
                    <dd className="text-[14.5px] text-ink-white">{detail.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* Form column */}
          <div className="reveal-up border border-ink-white/15 bg-ink-charcoal/60 p-7 backdrop-blur-sm md:p-10">
            <p className="mb-1 text-[13px] font-medium tracking-[0.3em] text-ink-gold">
              NAPISZ WIADOMOŚĆ
            </p>
            <p className="mb-8 text-[14px] text-ink-grey">
              Odpowiadamy zwykle w ciągu 24 godzin.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <label className="sr-only" aria-hidden="true">
                Nie wypełniaj tego pola
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
                  IMIĘ I NAZWISKO
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
                    placeholder="Jan Kowalski"
                  />
                </label>
                <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
                  EMAIL
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
                    placeholder="jan@email.pl"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
                TEMAT
                <input
                  type="text"
                    name="subject"
                    maxLength={180}
                  className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
                  placeholder="Realizm, rękaw, cover-up..."
                />
              </label>

              <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
                WIADOMOŚĆ
                <textarea
                    name="message"
                    rows={4}
                    required
                    maxLength={5000}
                  className="resize-none border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
                  placeholder="Opisz swój pomysł na tatuaż..."
                />
              </label>

              {formStatus && (
                <p
                  role="status"
                  className={`text-[13px] leading-relaxed ${
                    formStatus.type === "success" ? "text-ink-gold" : "text-red-400"
                  }`}
                >
                  {formStatus.text}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="mt-2 inline-flex items-center justify-center gap-3 self-start border border-ink-gold px-7 py-4 text-[13px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "WYSYŁANIE…" : "WYŚLIJ WIADOMOŚĆ"}
                <span aria-hidden>→</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
