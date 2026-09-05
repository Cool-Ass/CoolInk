import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hashPassword, verifyPassword } from "@/lib/auth";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  const limit = await rateLimit(request, "admin-password-change", 5, 60 * 60 * 1000, admin.id);
  if (!limit.allowed) return tooManyRequests(limit);

  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword as string | undefined;
  const newPassword = body?.newPassword as string | undefined;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Obecne i nowe hasło są wymagane." },
      { status: 400 }
    );
  }
  if (newPassword.length < 12 || newPassword.length > 128) {
    return NextResponse.json(
      { error: "Nowe hasło musi mieć od 12 do 128 znaków." },
      { status: 400 }
    );
  }

  const full = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  if (!full) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  const valid = await verifyPassword(currentPassword, full.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Obecne hasło jest nieprawidłowe." }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });

  const response = NextResponse.json({ ok: true, signedOut: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
