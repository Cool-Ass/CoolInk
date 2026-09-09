"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, RefreshCw, Settings2, Unplug } from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatCoolinkDateTime } from "@/lib/dateTime";

type Selection = { calendarId: string; summary: string | null; role: string; enabled: boolean };
type Calendar = { id: string; summary: string; primary: boolean; accessRole: string };
type Status = { connection: null | { accountEmail: string | null; primaryCalendarId: string | null; lastSyncedAt: string | null; active: boolean; selections: Selection[] } };
type Feedback = { text: string; tone: "success" | "error" | "info" };

export default function GoogleCalendarIntegration() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeAction, setActiveAction] = useState<"sync" | "calendars" | "save" | "disconnect" | null>(null);
  const [disconnect, setDisconnect] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[] | null>(null);
  const [primaryCalendarId, setPrimaryCalendarId] = useState("");
  const [busyCalendarIds, setBusyCalendarIds] = useState<string[]>([]);

  async function load() {
    try {
      const response = await fetch("/api/admin/google-calendar/status");
      if (!response.ok) throw new Error();
      setStatus(await response.json());
    } catch {
      setFeedback({ text: "Nie udało się odczytać stanu integracji.", tone: "error" });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/google-calendar/status", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<Status>;
      })
      .then(setStatus)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus({ connection: null });
        setFeedback({ text: "Nie udało się odczytać stanu integracji.", tone: "error" });
      });
    return () => controller.abort();
  }, []);
  const connection = status?.connection;

  function reconnect() {
    window.location.assign(new URL("/api/admin/google-calendar/connect", window.location.origin).toString());
  }

  async function sync() {
    setFeedback(null);
    setActiveAction("sync");
    try {
      const response = await fetch("/api/admin/google-calendar/sync", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Synchronizacja nie powiodła się.");
      const recovered = data.result?.recovered ?? 0;
      setFeedback({
        tone: "success",
        text: `Synchronizacja zakończona: ${data.result?.imported ?? 0} import, ${data.result?.exported ?? 0} eksport${recovered ? `, ${recovered} odtworzono` : ""}.`,
      });
      await load();
      router.refresh();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Synchronizacja nie powiodła się.", tone: "error" });
    } finally {
      setActiveAction(null);
    }
  }

  async function remove() {
    setActiveAction("disconnect");
    try {
      const response = await fetch("/api/admin/google-calendar/disconnect", { method: "POST" });
      if (!response.ok) throw new Error();
      setDisconnect(false);
      setCalendars(null);
      setFeedback({ text: "Google Calendar został rozłączony. Wizyty CoolInk pozostają bez zmian.", tone: "info" });
      await load();
    } catch {
      setFeedback({ text: "Nie udało się rozłączyć kalendarza.", tone: "error" });
    } finally {
      setActiveAction(null);
    }
  }

  async function openCalendarSelection() {
    setFeedback(null);
    setActiveAction("calendars");
    try {
      const response = await fetch("/api/admin/google-calendar/calendars");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Nie udało się pobrać kalendarzy.");
      setPrimaryCalendarId(connection?.primaryCalendarId || data.calendars.find((calendar: Calendar) => calendar.primary)?.id || data.calendars[0]?.id || "");
      setBusyCalendarIds(connection?.selections.filter((selection) => selection.role === "busy" && selection.enabled).map((selection) => selection.calendarId) || []);
      setCalendars(data.calendars);
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Nie udało się pobrać kalendarzy.", tone: "error" });
    } finally {
      setActiveAction(null);
    }
  }

  function toggleBusy(calendarId: string) {
    setBusyCalendarIds((current) => current.includes(calendarId) ? current.filter((id) => id !== calendarId) : [...current, calendarId]);
  }

  async function saveCalendarSelection() {
    setActiveAction("save");
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/google-calendar/calendars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryCalendarId, busyCalendarIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Nie udało się zapisać wyboru kalendarzy.");
      setCalendars(null);
      const recovered = data.sync?.recovered ?? 0;
      setFeedback({
        tone: "success",
        text: `Kalendarze zapisane. Import: ${data.sync?.imported ?? 0}, eksport: ${data.sync?.exported ?? 0}${recovered ? `, odtworzono: ${recovered}` : ""}.`,
      });
      await load();
      router.refresh();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Nie udało się zapisać wyboru kalendarzy.", tone: "error" });
    } finally {
      setActiveAction(null);
    }
  }

  const primarySelection = connection?.selections.find((selection) => selection.role === "primary");
  const busyCount = connection?.selections.filter((selection) => selection.role === "busy" && selection.enabled).length ?? 0;
  const feedbackStyle = feedback?.tone === "error"
    ? "border-red-400/35 bg-red-500/10 text-red-200"
    : feedback?.tone === "success"
      ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
      : "border-ink-white/15 bg-ink-white/5 text-ink-grey";

  return (
    <section className="overflow-hidden border border-ink-white/10 bg-ink-charcoal/30">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-white/10 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink-gold/35 bg-ink-gold/5 text-ink-gold"><CalendarDays className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[10px] tracking-[.16em] text-ink-gold">INTEGRACJA</p>
            <h2 className="truncate text-sm font-medium text-ink-white">Google Calendar</h2>
          </div>
        </div>
        {status !== null && <span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] tracking-[.08em] ${connection?.active ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300" : "border-ink-white/15 text-ink-grey"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connection?.active ? "bg-emerald-300" : "bg-ink-grey"}`} />
          {connection?.active ? "POŁĄCZONO" : "NIEPOŁĄCZONO"}
        </span>}
      </header>

      <div className="p-4 sm:p-5">
        {status === null ? <p className="text-sm text-ink-grey">Wczytywanie stanu integracji…</p> : !connection?.active ? (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-relaxed text-ink-grey">Połączenie synchronizuje terminy studia i prywatne blokady zajętości. Dane klientów pozostają wyłącznie w CoolInk.</p>
            <AppButton className="inline-flex shrink-0 items-center gap-2" onClick={reconnect}><CalendarDays className="h-4 w-4" /> POŁĄCZ</AppButton>
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-2 sm:grid-cols-3">
              <div className="border border-ink-white/10 bg-ink-black/25 px-3 py-2.5">
                <dt className="text-[9px] tracking-[.12em] text-ink-grey">KONTO GOOGLE</dt>
                <dd className="mt-1 truncate text-xs text-ink-white" title={connection.accountEmail || undefined}>{connection.accountEmail || "Połączone konto"}</dd>
              </div>
              <div className="border border-ink-white/10 bg-ink-black/25 px-3 py-2.5">
                <dt className="text-[9px] tracking-[.12em] text-ink-grey">KALENDARZ GŁÓWNY</dt>
                <dd className="mt-1 truncate text-xs text-ink-white" title={primarySelection?.summary || connection.primaryCalendarId || undefined}>{primarySelection?.summary || connection.primaryCalendarId || "Nie wybrano"}</dd>
              </div>
              <div className="border border-ink-white/10 bg-ink-black/25 px-3 py-2.5">
                <dt className="text-[9px] tracking-[.12em] text-ink-grey">OSTATNIA SYNCHRONIZACJA</dt>
                <dd className="mt-1 text-xs text-ink-white">{connection.lastSyncedAt ? formatCoolinkDateTime(connection.lastSyncedAt, { dateStyle: "short", timeStyle: "medium" }) : "Jeszcze nie wykonano"}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <AppButton variant="primary" className="inline-flex items-center gap-2" disabled={activeAction !== null} onClick={sync}><RefreshCw className={`h-3.5 w-3.5 ${activeAction === "sync" ? "animate-spin" : ""}`} /> {activeAction === "sync" ? "SYNCHRONIZUJĘ…" : "SYNCHRONIZUJ"}</AppButton>
              <AppButton className="inline-flex items-center gap-2" disabled={activeAction !== null} onClick={openCalendarSelection}><Settings2 className="h-3.5 w-3.5" /> KALENDARZE{busyCount ? ` · ${busyCount + 1}` : ""}</AppButton>
              <AppButton variant="ghost" disabled={activeAction !== null} onClick={reconnect}>ODŚWIEŻ DOSTĘP</AppButton>
              <AppButton variant="destructive" className="ml-auto inline-flex items-center gap-2" disabled={activeAction !== null} onClick={() => setDisconnect(true)}><Unplug className="h-3.5 w-3.5" /> ROZŁĄCZ</AppButton>
            </div>
          </div>
        )}

        {calendars && <div className="mt-4 grid gap-4 border border-ink-gold/25 bg-ink-gold/[.035] p-4 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <label className="text-[10px] tracking-[.1em] text-ink-grey">KALENDARZ GŁÓWNY
            <select value={primaryCalendarId} onChange={(event) => setPrimaryCalendarId(event.target.value)} className="mt-2 block min-h-10 w-full border border-ink-white/15 bg-ink-black px-3 text-sm normal-case tracking-normal text-ink-white">
              {calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.summary}{calendar.primary ? " · główny Google" : ""}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="text-[10px] tracking-[.1em] text-ink-grey">DODATKOWE KALENDARZE BLOKUJĄCE TERMIN</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {calendars.filter((calendar) => calendar.id !== primaryCalendarId).map((calendar) => <label key={calendar.id} className={`flex min-h-10 cursor-pointer items-center gap-2 border px-3 text-xs ${busyCalendarIds.includes(calendar.id) ? "border-ink-gold/50 bg-ink-gold/10 text-ink-white" : "border-ink-white/10 text-ink-grey"}`}><input type="checkbox" checked={busyCalendarIds.includes(calendar.id)} onChange={() => toggleBusy(calendar.id)} className="accent-[#c99a4a]" />{calendar.summary}</label>)}
              {calendars.filter((calendar) => calendar.id !== primaryCalendarId).length === 0 && <span className="text-xs text-ink-grey">Brak dodatkowych kalendarzy.</span>}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <AppButton variant="primary" disabled={activeAction !== null || !primaryCalendarId} onClick={saveCalendarSelection}>{activeAction === "save" ? "ZAPISUJĘ…" : "ZAPISZ I SYNCHRONIZUJ"}</AppButton>
            <AppButton variant="ghost" disabled={activeAction !== null} onClick={() => setCalendars(null)}>ANULUJ</AppButton>
          </div>
        </div>}

        {feedback && <div role={feedback.tone === "error" ? "alert" : "status"} className={`mt-4 flex items-start gap-2 border px-3 py-2.5 text-sm ${feedbackStyle}`}>
          {feedback.tone === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>}
      </div>

      {disconnect && <ConfirmModal message="Rozłączyć Google Calendar? Wizyty CoolInk pozostaną w historii, a zewnętrzne wydarzenia przestaną wpływać na kolejną synchronizację." onCancel={() => setDisconnect(false)} onConfirm={remove} />}
    </section>
  );
}
