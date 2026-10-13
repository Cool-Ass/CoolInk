import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { lockBookingCalendar } from "@/lib/bookingRules";
import { voucherInput } from "@/lib/voucherRules";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("finance.manage"); if (!access.ok) return access.response;
  const limit = await rateLimit(request, "voucher-issue", 40, 3600000, access.admin.id); if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  let data;
  try { data = voucherInput(body); if (!/^[a-f0-9-]{36}$/i.test(body?.idempotencyKey || "")) throw Error("Odśwież formularz vouchera."); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sprawdź dane." }, { status: 400 }); }
  try {
    const voucher = await prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      const issueKey = access.admin.id + ":" + body.idempotencyKey;
      const existing = await tx.voucher.findUnique({ where: { issueKey } });
      if (existing) { if (existing.amountCents !== data.amountCents || existing.recipientName !== data.recipientName || existing.validUntil.getTime() !== data.validUntil.getTime()) throw Error("ISSUE_CHANGED"); return existing; }
      const created = await tx.voucher.create({ data: { ...data, issueKey, code: "CI-" + randomBytes(16).toString("hex").toUpperCase(), createdById: access.admin.id } });
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "voucher.issued", targetType: "Voucher", targetId: created.id, summary: `Utworzono voucher: ${data.amountCents / 100} zł.` } });
      return created;
    }, { maxWait: 10000, timeout: 15000 });
    return NextResponse.json({ code: voucher.code, href: `/voucher/${voucher.code}` }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Nie udało się utworzyć vouchera. Ponów bez zmiany danych lub odśwież formularz." }, { status: 409 }); }
}
