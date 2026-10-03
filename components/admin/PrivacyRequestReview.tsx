"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import CompactDisclosure from "@/components/ui/CompactDisclosure";
import AppButton from "@/components/ui/AppButton";
import { PRIVACY_SCOPES, PRIVACY_SCOPE_LABELS, type PrivacyReview } from "@/lib/privacyReview";

export default function PrivacyRequestReview({ id, revision, initial }: { id: string; revision: string; initial: PrivacyReview | null }) {
  const router = useRouter();
  const [values, setValues] = useState({ decision: initial?.decision || "review", reason: initial?.reason || "", response: initial?.response || "", retainedScopes: initial?.retainedScopes || [] as string[], retainUntil: initial?.retainUntil || "", identityConfirmed: initial?.identityConfirmed || false });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/privacy-requests/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, expectedRevision: revision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Ocena zapisana. Dane nie zostały usunięte."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zapisać oceny."); } finally { setBusy(false); }
  }
  return <CompactDisclosure title="OCENA I RETENCJA" summary="Zapis decyzji nie usuwa danych" className="rounded-lg">
    <form onSubmit={submit} className="space-y-3 text-xs">
      <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
        <div><label htmlFor={`privacy-decision-${id}`} className="block">Decyzja</label><select id={`privacy-decision-${id}`} value={values.decision} onChange={event => setValues({ ...values, decision: event.target.value as PrivacyReview["decision"] })} className="mt-1 w-full rounded-lg border border-ink-white/20 bg-ink-charcoal p-2"><option value="review">W trakcie oceny</option><option value="approve">Przygotuj do osobnego zatwierdzenia wykonania</option><option value="retain">Wymagane dalsze przechowywanie danych</option></select></div>
        <label className="block">Uzasadnienie i podstawa retencji — tylko dla właściciela<textarea required minLength={10} maxLength={2000} value={values.reason} onChange={event => setValues({ ...values, reason: event.target.value })} className="mt-1 min-h-20 w-full rounded-lg border border-ink-white/20 bg-transparent p-2" /></label>
        <fieldset><legend className="mb-1">Dane wymagające zachowania</legend><div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{PRIVACY_SCOPES.map(scope => <label key={scope} className="flex min-h-8 items-center gap-2"><input type="checkbox" checked={values.retainedScopes.includes(scope)} onChange={event => setValues({ ...values, retainedScopes: event.target.checked ? [...values.retainedScopes, scope] : values.retainedScopes.filter(value => value !== scope), retainUntil: !event.target.checked && values.retainedScopes.length === 1 ? "" : values.retainUntil })} />{PRIVACY_SCOPE_LABELS[scope]}</label>)}</div></fieldset>
        {values.retainedScopes.length > 0 && <label className="block">Przechowuj do<input type="date" required value={values.retainUntil} onChange={event => setValues({ ...values, retainUntil: event.target.value })} className="mt-1 block rounded-lg border border-ink-white/20 bg-transparent p-2" /></label>}
        <label className="flex min-h-8 items-center gap-2"><input type="checkbox" checked={values.identityConfirmed} onChange={event => setValues({ ...values, identityConfirmed: event.target.checked })} />Tożsamość i zakres wniosku zostały ocenione</label>
        <label className="block">Odpowiedź widoczna dla klienta<textarea maxLength={2000} required={values.decision !== "review"} value={values.response} onChange={event => setValues({ ...values, response: event.target.value })} className="mt-1 min-h-20 w-full rounded-lg border border-ink-white/20 bg-transparent p-2" /></label>
        <p className="text-ink-grey">Nie wpisuj kodów MFA, haseł ani kopii dokumentu tożsamości. Usuwanie wymaga osobnego zatwierdzenia konkretnego zakresu i kopii bezpieczeństwa.</p>
        <AppButton type="submit" disabled={busy}>{busy ? "ZAPISYWANIE…" : "ZAPISZ OCENĘ"}</AppButton>
      </fieldset>
      {message && <p role="status" aria-live="polite">{message}</p>}
    </form>
  </CompactDisclosure>;
}
