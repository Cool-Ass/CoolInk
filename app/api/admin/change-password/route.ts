import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword as string | undefined;
  const newPassword = body?.newPassword as string | undefined;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Obecne i nowe hasło są wymagane." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
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
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
