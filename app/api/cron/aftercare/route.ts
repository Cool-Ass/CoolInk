import { NextResponse } from "next/server";
import { processAftercare } from "@/lib/aftercareAutomation";
import { recordOperationalHealth } from "@/lib/operationalHealth";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const delivered = await processAftercare(); await recordOperationalHealth("aftercare_worker", null, "cron"); return NextResponse.json({ ok: true, delivered }); }
  catch { await recordOperationalHealth("aftercare_worker", "AFTERCARE_WORKER_FAILED", "cron"); return NextResponse.json({ ok: false, error: "AFTERCARE_WORKER_FAILED" }, { status: 503 }); }
}
