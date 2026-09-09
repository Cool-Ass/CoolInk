"use client";

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
  price: number | null;
};

export default function ClientAppointmentModal({
  appointment,
  projectTitle,
  onClose,
  onCancelled,
}: {
  appointment: Appointment;
  projectTitle: string;
  onClose: () => void;
  onCancelled: (appointmentId: string, projectStatus: string) => void;
}) {
  const router = useRouter();
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);
  const now = new Date();
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

  return (
    <>
      <AppModal title="Szczegóły wizyty" subtitle={projectTitle} onClose={onClose} size="md">
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
        <p className="mt-5 text-sm leading-relaxed text-ink-grey">
          {waitingForStudio
            ? "Studio sprawdzi szczegóły i potwierdzi termin."
            : appointment.status === "proposed"
              ? "Studio zaproponowało nowy termin. Wybierz odpowiedź poniżej."
              : "CoolInk Tattoo Studio · szczegóły organizacyjne otrzymasz przed wizytą."}
        </p>
        {appointment.status === "proposed" && (
          <AppointmentResponse appointmentId={appointment.id} />
        )}
        {appointment.status === "confirmed" && (
          <AddToCalendar
            id={appointment.id}
            startsAt={appointment.startsAt}
            endsAt={appointment.endsAt}
          />
        )}
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
