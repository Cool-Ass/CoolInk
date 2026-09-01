"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Selection = { calendarId: string; summary: string | null; role: string; enabled: boolean };
type Calendar = { id: string; summary: string; primary: boolean; accessRole: string };
type Status = { connection: null | { accountEmail: string | null; primaryCalendarId: string | null; lastSyncedAt: string | null; active: boolean; selections: Selection[] } };

export default function GoogleCalendarIntegration() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  const [disconnect, setDisconnect] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[] | null>(null);
  const [primaryCalendarId, setPrimaryCalendarId] = useState("");
  const [busyCalendarIds, setBusyCalendarIds] = useState<string[]>([]);
  const load = () => fetch("/api/admin/google-calendar/status").then((r) => r.json()).then(setStatus).catch(() => setMessage("Nie udało się odczytać stanu integracji."));
  useEffect(() => { load(); }, []);
  const connection = status?.connection;

  async function sync() { setMessage(""); const response = await fetch("/api/admin/google-calendar/sync", { method: "POST" }); const data = await response.json(); setMessage(data.error || (response.ok ? `Synchronizacja zakończona: zaimportowano ${data.result?.imported ?? 0}, wyeksportowano ${data.result?.exported ?? 0}.` : "Synchronizacja nie powiodła się.")); if (response.ok) { load(); router.refresh(); } }
  async function remove() { const response = await fetch("/api/admin/google-calendar/disconnect", { method: "POST" }); if (response.ok) { setDisconnect(false); setCalendars(null); setMessage("Google Calendar został rozłączony. Wizyty CoolInk pozostają bez zmian."); load(); } }
  async function openCalendarSelection() {
    setMessage(""); const response = await fetch("/api/admin/google-calendar/calendars"); const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Nie udało się pobrać kalendarzy.");
    setPrimaryCalendarId(connection?.primaryCalendarId || data.calendars.find((calendar: Calendar) => calendar.primary)?.id || data.calendars[0]?.id || "");
    setBusyCalendarIds(connection?.selections.filter((selection) => selection.role === "busy" && selection.enabled).map((selection) => selection.calendarId) || []);
    setCalendars(data.calendars);
  }
  function toggleBusy(calendarId: string) { setBusyCalendarIds((current) => current.includes(calendarId) ? current.filter((id) => id !== calendarId) : [...current, calendarId]); }
  async function saveCalendarSelection() {
    const response = await fetch("/api/admin/google-calendar/calendars", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primaryCalendarId, busyCalendarIds }) }); const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Nie udało się zapisać wyboru kalendarzy.");
    setCalendars(null); setMessage(`Kalendarze zapisane. Import: ${data.sync?.imported ?? 0}, eksport: ${data.sync?.exported ?? 0}.`); load(); router.refresh();
  }

  return <section className="border border-ink-white/10 bg-ink-charcoal/30 p-6"><p className="text-[12px] tracking-[.15em] text-ink-gold">INTEGRACJE · GOOGLE CALENDAR</p>
    {status === null ? <p className="mt-4 text-sm text-ink-grey">Wczytywanie stanu integracji…</p> : !connection?.active ? <div className="mt-4"><p className="text-sm text-ink-grey">NIEPOŁĄCZONO. Połączenie daje wyłącznie administratorowi dostęp do kalendarza studia — nie zmienia logowania klientów.</p><AppButton className="mt-5" onClick={() => window.location.assign("/api/admin/google-calendar/connect")}>POŁĄCZ GOOGLE CALENDAR</AppButton></div> : <div className="mt-4 space-y-4">
      <p className="text-sm text-ink-white">POŁĄCZONO{connection.accountEmail ? ` · ${connection.accountEmail}` : ""}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-ink-grey">PRIMARY SYNC CALENDAR</dt><dd className="mt-1">{connection.selections.find((selection) => selection.role === "primary")?.summary || connection.primaryCalendarId || "Nie wybrano"}</dd></div><div><dt className="text-xs text-ink-grey">OSTATNIA SYNCHRONIZACJA</dt><dd className="mt-1">{connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString("pl-PL") : "Jeszcze nie wykonano."}</dd></div></dl>
      {calendars && <div className="border border-ink-white/10 p-4"><label className="block text-xs text-ink-grey">PRIMARY SYNC CALENDAR<select value={primaryCalendarId} onChange={(event) => setPrimaryCalendarId(event.target.value)} className="mt-2 block w-full bg-ink-black p-2 text-sm text-ink-white">{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.summary}{calendar.primary ? " (primary Google)" : ""}</option>)}</select></label><fieldset className="mt-4"><legend className="text-xs text-ink-grey">ADDITIONAL BUSY CALENDARS</legend>{calendars.filter((calendar) => calendar.id !== primaryCalendarId).map((calendar) => <label key={calendar.id} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={busyCalendarIds.includes(calendar.id)} onChange={() => toggleBusy(calendar.id)} />{calendar.summary}</label>)}</fieldset><div className="mt-4 flex gap-2"><AppButton onClick={saveCalendarSelection}>ZAPISZ KALENDARZE</AppButton><AppButton variant="secondary" onClick={() => setCalendars(null)}>ANULUJ</AppButton></div></div>}
      <div className="flex flex-wrap gap-2"><AppButton onClick={sync}>SYNCHRONIZUJ TERAZ</AppButton><AppButton variant="secondary" onClick={openCalendarSelection}>ZMIEN KALENDARZE</AppButton><AppButton variant="ghost" onClick={() => window.location.assign("/api/admin/google-calendar/connect")}>POŁĄCZ PONOWNIE</AppButton><AppButton variant="destructive" onClick={() => setDisconnect(true)}>ROZŁĄCZ</AppButton></div>
    </div>}
    {message && <p className="mt-4 text-sm text-ink-grey">{message}</p>}
    {disconnect && <ConfirmModal message="Rozłączyć Google Calendar? Wizyty CoolInk pozostaną w historii, a zewnętrzne wydarzenia przestaną wpływać na kolejną synchronizację." onCancel={() => setDisconnect(false)} onConfirm={remove} />}
  </section>;
}
