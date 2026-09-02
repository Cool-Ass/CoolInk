import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentClient,
  CLIENT_ACCESS_COOKIE,
  CLIENT_REFRESH_COOKIE,
} from "@/lib/clientAuth";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Podaj imię i nazwisko." }, { status: 400 });
  }

  return NextResponse.json({
    client: await prisma.client.update({
      where: { id: client.id },
      data: { firstName, lastName, phone: phone || null },
    }),
  });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });

  await prisma.client.delete({ where: { id: client.id } });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(CLIENT_REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
