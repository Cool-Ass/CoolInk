import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { verifyPassword } from "@/lib/auth";
import { createMfaSecret, createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, mfaOtpAuthUri, verifyMfaCode, verifyTotp } from "@/lib/adminMfa";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";

export async function GET() {
  const access = await requireAdminApi("settings.manage");
  if (!access.ok) return access.response;
  const admin = await prisma.adminUser.findUnique({ where: { id: access.admin.id }, select: { mfaEnabled: true, mfaSecretEncrypted: true, mfaRecoveryCodes: true, mfaVerifiedAt: true } });
  let recoveryCodesLeft = 0;
  try { recoveryCodesLeft = JSON.parse(admin?.mfaRecoveryCodes || "[]").length; } catch { recoveryCodesLeft = 0; }
  return NextResponse.json({ enabled: Boolean(admin?.mfaEnabled), setupPending: Boolean(admin?.mfaSecretEncrypted && !admin.mfaEnabled), recoveryCodesLeft, verifiedAt: admin?.mfaVerifiedAt });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("settings.manage");
  if (!access.ok) return access.response;
  const limit = await rateLimit(request, "admin-mfa", 10, 15 * 60_000, access.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const admin = await prisma.adminUser.findUnique({ where: { id: access.admin.id } });
  if (!admin) return NextResponse.json({ error: "Brak konta administratora." }, { status: 404 });

  if (action === "setup") {
    const secret = createMfaSecret();
    await prisma.adminUser.update({ where: { id: admin.id }, data: { mfaSecretEncrypted: encryptMfaSecret(secret), mfaEnabled: false, mfaRecoveryCodes: null, mfaVerifiedAt: null } });
    await prisma.adminAuditLog.create({ data: { adminUserId: admin.id, action: "mfa.setup", targetType: "AdminUser", targetId: admin.id, summary: "Rozpoczęto konfigurację uwierzytelniania dwuskładnikowego." } });
    return NextResponse.json({ secret, otpAuthUri: mfaOtpAuthUri(secret, admin.email) });
  }

  if (action === "enable") {
    const code = String(body?.code || "");
    if (!admin.mfaSecretEncrypted || !verifyTotp(decryptMfaSecret(admin.mfaSecretEncrypted), code)) return NextResponse.json({ error: "Nieprawidłowy kod z aplikacji uwierzytelniającej." }, { status: 400 });
    const recovery = createRecoveryCodes();
    await prisma.$transaction([
      prisma.adminUser.update({ where: { id: admin.id }, data: { mfaEnabled: true, mfaVerifiedAt: new Date(), mfaRecoveryCodes: recovery.stored, sessionVersion: { increment: 1 } } }),
      prisma.adminAuditLog.create({ data: { adminUserId: admin.id, action: "mfa.enable", targetType: "AdminUser", targetId: admin.id, summary: "Włączono uwierzytelnianie dwuskładnikowe." } }),
    ]);
    return NextResponse.json({ ok: true, recoveryCodes: recovery.plain, signedOut: true });
  }

  if (action === "regenerate") {
    const code = String(body?.code || "");
    if (!admin.mfaEnabled || !admin.mfaSecretEncrypted) return NextResponse.json({ error: "MFA nie jest włączone." }, { status: 409 });
    const verified = verifyMfaCode(decryptMfaSecret(admin.mfaSecretEncrypted), admin.mfaRecoveryCodes, code);
    if (!verified.ok) return NextResponse.json({ error: "Nieprawidłowy kod MFA." }, { status: 400 });
    const recovery = createRecoveryCodes();
    await prisma.adminUser.update({ where: { id: admin.id }, data: { mfaRecoveryCodes: recovery.stored } });
    await prisma.adminAuditLog.create({ data: { adminUserId: admin.id, action: "mfa.recovery.regenerate", targetType: "AdminUser", targetId: admin.id, summary: "Wygenerowano nowe kody awaryjne MFA." } });
    return NextResponse.json({ ok: true, recoveryCodes: recovery.plain });
  }

  if (action === "disable") {
    const password = String(body?.password || "");
    const code = String(body?.code || "");
    const passwordOk = await verifyPassword(password, admin.passwordHash);
    const codeOk = admin.mfaSecretEncrypted ? verifyMfaCode(decryptMfaSecret(admin.mfaSecretEncrypted), admin.mfaRecoveryCodes, code).ok : false;
    if (!passwordOk || !codeOk) return NextResponse.json({ error: "Nieprawidłowe hasło lub kod MFA." }, { status: 400 });
    await prisma.$transaction([
      prisma.adminUser.update({ where: { id: admin.id }, data: { mfaEnabled: false, mfaSecretEncrypted: null, mfaRecoveryCodes: null, mfaVerifiedAt: null, sessionVersion: { increment: 1 } } }),
      prisma.adminAuditLog.create({ data: { adminUserId: admin.id, action: "mfa.disable", targetType: "AdminUser", targetId: admin.id, summary: "Wyłączono uwierzytelnianie dwuskładnikowe." } }),
    ]);
    return NextResponse.json({ ok: true, signedOut: true });
  }

  return NextResponse.json({ error: "Nieznana operacja MFA." }, { status: 400 });
}
