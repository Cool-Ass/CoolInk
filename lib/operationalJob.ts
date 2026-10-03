import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { sendPushToAdmins } from "@/lib/webPush";
import { prisma } from "@/lib/prisma";

/** Report fixed diagnostic codes only; exceptions may contain secrets or PII. */
export async function operationalJob(task: () => Promise<Response>) {
  try {
    return await task();
  } catch {
    const eventId = randomUUID();
    console.error("operational_job_failed", { job: "reminders", eventId });
    let alertDelivered = false;
    let alertPersisted = false;
    try {
      await prisma.adminAuditLog.create({ data: { action: "operational.reminders", targetType: "OperationalJob", summary: "Zadanie przypomnień nie zakończyło się poprawnie.", metadata: JSON.stringify({ eventId }) } });
      alertPersisted = true;
    } catch { console.error("operational_alert_not_persisted", { job: "reminders", eventId }); }
    try {
      const alert = await sendPushToAdmins({
        title: "Zadanie automatyczne wymaga sprawdzenia",
        body: `Przypomnienia lub synchronizacja nie zakończyły się poprawnie. Identyfikator: ${eventId}`,
        url: "/admin", tag: "operational-reminders-failure",
      });
      alertDelivered = alert.configured && alert.sent > 0;
    } catch { /* Failure to send an alert must not hide the original failure. */ }
    if (!alertDelivered) console.error("operational_alert_not_delivered", { job: "reminders", eventId });
    return NextResponse.json({ ok: false, error: "OPERATIONAL_JOB_FAILED", eventId, alertDelivered, alertPersisted }, { status: 503 });
  }
}
