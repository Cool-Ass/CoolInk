import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { availableVoucher, VoucherError } from "@/lib/vouchers";
import { VOUCHER_TERMS } from "@/lib/voucherRules";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient(); if (!client) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  const limit = await rateLimit(request, "voucher-preview", 20, 60000, client.id); if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  try {
    const voucher = await availableVoucher(prisma, body?.code, client.id, new Date(body?.startsAt));
    return NextResponse.json({ amountCents: voucher.amountCents, validUntil: voucher.validUntil.toISOString(), terms: VOUCHER_TERMS }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof VoucherError ? error.message : "Nie udało się sprawdzić vouchera." }, { status: 409 }); }
}
