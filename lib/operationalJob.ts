import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { sendPushToAdmins } from "@/lib/webPush";
import { recordOperationalHealth } from "@/lib/operationalHealth";

/** Report fixed diagnostic codes only; exceptions may contain secrets or PII. */
export async function operationalJob(task: () => Promise<Response>) {
  try {
    const response = await task();
    if (response.ok) {
      await recordOperationalHealth("reminders_worker", null, "cron");
    }
    else await recordOperationalHealth("reminders_worker", "REMINDERS_WORKER_FAILED", "cron");
    return response;
  } catch {
    const eventId = randomUUID();
    const alertPersisted = await recordOperationalHealth("reminders_worker", "REMINDERS_WORKER_FAILED", "cron");
    console.error("operational_job_failed", { job: "reminders", eventId });
    let alertDelivered = false;
    try {
      const alert = await sendPushToAdmins({
        title: "Zadanie automatyczne wymaga sprawdzenia",
        body: `Worker przypomnień nie zakończył się poprawnie. Identyfikator: ${eventId}`,
        url: "/admin", tag: "operational-reminders-failure",
      });
      alertDelivered = alert.configured && alert.sent > 0;
    } catch { /* Failure to send an alert must not hide the original failure. */ }
    if (!alertDelivered) console.error("operational_alert_not_delivered", { job: "reminders", eventId });
    return NextResponse.json({ ok: false, error: "OPERATIONAL_JOB_FAILED", eventId, alertDelivered, alertPersisted }, { status: 503 });
  }
}
