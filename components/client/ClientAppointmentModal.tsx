"use client";

import Link from "next/link";
import BlikDeposit from "@/components/client/BlikDeposit";
import type { DepositInstructions } from "@/lib/depositInstructions";
import { depositStatusLabel } from "@/lib/workflowStatus";
import { useState } from "react";
import AppModal from "@/components/ui/AppModal";
import StatusBadge from "@/components/ui/StatusBadge";
import AddToCalendar from "@/components/client/AddToCalendar";
import AppointmentResponse from "@/components/client/AppointmentResponse";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AppButton from "@/components/ui/AppButton";
import { useRouter } from "next/navigation";
import { formatCoolinkDate, formatCoolinkTime } from "@/lib/dateTime";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  serviceType?: string | null;
  price: number | null;
  depositStatus: string;
  depositAmount: number | null;
  voucherAmountCents?: number;
  voucherAppliedCents?: number;
  voucherRequested?: boolean;
  settlement?: { paidCents: number; discountCents: number; voucherCents: number } | null;
  confirmationRequestedAt?: string | null;
  clientConfirmedAt?: string | null;
};

export default function ClientAppointmentModal({
  appointment,
  projectTitle,
  projectKind,
  projectStatus,
  depositInstructions,
  onClose,
  onCancelled,
  returnLabel,
}: {
  appointment: Appointment;
  projectTitle: string;
  projectKind: string;
  projectStatus: string;
  depositInstructions: DepositInstructions;
  onClose: () => void;
  returnLabel?: string;
  onCancelled: (appointmentId: string, projectStatus: string) => void;
}) {
  const router = useRouter();
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [confirmingAttendance, setConfirmingAttendance] = useState(false);
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(Boolean(appointment.clientConfirmedAt));
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);
  const now = new Date();
  const tattooSession = projectKind === "tattoo" && (!appointment.serviceType || appointment.serviceType === "tattoo");
  const waitingForStudio = appointment.status === "requested";
  const canCancel =
    ["requested", "proposed", "confirmed"].includes(appointment.status) && start > new Date();
  const canReschedule = ["requested", "proposed", "confirmed"].includes(appointment.status) && start.getTime() - now.getTime() >= 48 * 60 * 60 * 1000;

  async function cancelAppointment() {
    setCancelling(true);
    setError("");
    try {
      const response = await fetch(`/api/client/appointments/${appointment.id}/cancel`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się anulować wizyty.");
      setConfirmCancellation(false);
      onCancelled(appointment.id, data.projectStatus);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Nie udało się anulować wizyty."
      );
    } finally {
      setCancelling(false);
    }
  }

  async function confirmAttendance() {
    setConfirmingAttendance(true); setError("");
    try {
      const response = await fetch(`/api/client/appointments/${appointment.id}/attendance`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Nie udało się potwierdzić obecności.");
      setAttendanceConfirmed(true); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się potwierdzić obecności."); }
    finally { setConfirmingAttendance(false); }
  }

  return (
    <>
      <AppModal presentation="drawer" title="Szczegóły wizyty" subtitle={projectTitle} headerAction={returnLabel ? <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm text-ink-gold">← {returnLabel}</button> : undefined} onClose={onClose} size="md">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-ink-white/10 p-4">
            <p className="text-[10px] tracking-widest text-ink-gold">TERMIN</p>
            <p className="mt-2 text-sm">{formatCoolinkDate(start)}</p>
            <p className="mt-1 text-sm text-ink-grey">
              {formatCoolinkTime(start)}–{formatCoolinkTime(end)} ·{" "}
              {Math.round((end.getTime() - start.getTime()) / 60000)} min
            </p>
          </div>
          <div className="border border-ink-white/10 p-4">
            <p className="text-[10px] tracking-widest text-ink-gold">STATUS</p>
            <div className="mt-2"><StatusBadge status={appointment.status} /></div>
            {appointment.price !== null && (
              <p className="mt-3 text-sm text-ink-grey">Cena: {appointment.price} PLN</p>
            )}
          </div>
        </div>
        {!["cancelled", "no_show"].includes(appointment.status) && Boolean(appointment.voucherAmountCents) && <p className="mt-4 rounded-lg border border-emerald-400/30 p-4 text-sm text-emerald-200">Voucher: do {(appointment.voucherAmountCents! / 100).toLocaleString("pl-PL")} zł. {appointment.settlement ? `Odjęto ${(appointment.settlement.voucherCents / 100).toLocaleString("pl-PL")} zł.` : "Zostanie odjęty automatycznie przy rozliczeniu."}</p>}
        {!["cancelled", "no_show"].includes(appointment.status) && appointment.voucherRequested && !appointment.voucherAmountCents && <p className="mt-4 text-sm text-amber-200">Studio potwierdzi voucher papierowy przed rozliczeniem.</p>}
        {appointment.settlement && <section className="studio-panel mt-4"><h2 className="font-semibold">Rozliczenie</h2><p className="mt-2 text-sm">Opłacono: {appointment.settlement.paidCents / 100} zł{appointment.settlement.discountCents > 0 ? ` · rabat: ${appointment.settlement.discountCents / 100} zł` : ""}</p></section>}
        {tattooSession && appointment.depositStatus !== "not_required" && <section className="mt-4 space-y-3"><p className="text-sm text-ink-grey">Zadatek: {depositStatusLabel(appointment.depositStatus)}{appointment.depositAmount !== null ? ` · ${appointment.depositAmount} zł` : ""}</p><BlikDeposit visit={{ ...appointment, projectKind, projectStatus }} instructions={depositInstructions} /></section>}
        <p className="mt-5 text-sm leading-relaxed text-ink-grey">
          {waitingForStudio
            ? "Studio sprawdzi szczegóły i potwierdzi termin albo zaproponuje inny."
            : appointment.status === "proposed"
              ? "Studio zaproponowało nowy termin. Wybierz odpowiedź poniżej."
              : "CoolInk Tattoo Studio · szczegóły organizacyjne otrzymasz przed wizytą."}
        </p>
        {appointment.status === "proposed" && (
          <AppointmentResponse appointmentId={appointment.id} />
        )}
        {appointment.status === "confirmed" && (
          <><AddToCalendar
            id={appointment.id}
            startsAt={appointment.startsAt}
            endsAt={appointment.endsAt}
          />{appointment.confirmationRequestedAt && <div className="mt-4 border border-emerald-400/30 bg-emerald-400/5 p-4"><p className="text-sm text-ink-white">{attendanceConfirmed ? "Obecność potwierdzona." : "Potwierdź, że termin jest aktualny."}</p>{!attendanceConfirmed && <AppButton className="mt-3" type="button" disabled={confirmingAttendance} onClick={() => void confirmAttendance()}>{confirmingAttendance ? "POTWIERDZANIE…" : "POTWIERDZAM OBECNOŚĆ"}</AppButton>}</div>}</>
        )}
        {appointment.status === "confirmed" && tattooSession && <Link className="studio-primary-link mt-4" href={`/app/portal/documents?appointment=${appointment.id}`}>Dokumenty i przygotowanie do sesji</Link>}
        {appointment.status === "completed" && tattooSession && <Link className="studio-primary-link mt-4" href={`/app/portal/aftercare?appointment=${appointment.id}`}>Pielęgnacja po tej sesji</Link>}
        {canCancel && (
          <div className="mt-6 border-t border-ink-white/10 pt-5">
            <div className="flex flex-wrap gap-3">{canReschedule && <AppButton type="button" variant="secondary" onClick={() => { onClose(); router.push(`/app/portal/calendar?reschedule=${encodeURIComponent(appointment.id)}`); }}>PRZEŁÓŻ WIZYTĘ</AppButton>}<AppButton
              type="button"
              variant="destructive"
              onClick={() => setConfirmCancellation(true)}
            >
              ANULUJ TĘ WIZYTĘ
            </AppButton></div>
            <p className="mt-2 text-xs leading-relaxed text-ink-grey">
              {canReschedule ? "Możesz wybrać nowy wolny termin albo anulować wizytę." : "Na mniej niż 48 godzin przed wizytą możesz ją anulować, ale przełożenie wymaga kontaktu ze studiem."}
            </p>
          </div>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      </AppModal>
      {confirmCancellation && (
        <ConfirmModal
          message="Na pewno anulować tę wizytę? Termin zostanie zwolniony, a studio otrzyma informację."
          onConfirm={() => void cancelAppointment()}
          onCancel={() => { if (!cancelling) setConfirmCancellation(false); }}
          pending={cancelling}
          pendingLabel="ANULOWANIE…"
        />
      )}
    </>
  );
}
