"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AppointmentResponse({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState<"accept" | "reject" | null>(null);
  const [message, setMessage] = useState("");

  async function respond(response: "accept" | "reject") {
    setSaving(response); setMessage("");
    try {
      const result = await fetch(`/api/client/appointments/${appointmentId}/response`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      setMessage(response === "accept" ? "Termin został potwierdzony." : "Dzięki za informację. Wrócę z kolejną propozycją.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zapisać odpowiedzi."); }
    finally { setSaving(null); }
  }

  return <div className="mt-4"><p className="text-xs leading-relaxed text-ink-grey">Czy ten termin Ci pasuje?</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={!!saving} onClick={() => respond("accept")} className="border border-ink-gold bg-ink-gold px-4 py-2.5 text-xs tracking-[0.08em] text-ink-black disabled:opacity-50">{saving === "accept" ? "ZAPIS…" : "AKCEPTUJĘ TERMIN"}</button><button disabled={!!saving} onClick={() => respond("reject")} className="border border-ink-white/25 px-4 py-2.5 text-xs tracking-[0.08em] text-ink-grey hover:text-ink-white disabled:opacity-50">TERMIN MI NIE PASUJE</button></div>{message && <p role="status" className="mt-3 text-xs text-ink-gold">{message}</p>}</div>;
}
