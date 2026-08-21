import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, number[]>();

function clientKey(request: Request, email: string) {
  return `${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}:${email}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  attempts.set(key, recent);
  return recent.length >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const recent = attempts.get(key) ?? [];
  recent.push(Date.now());
  attempts.set(key, recent);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email i hasło są wymagane." },
      { status: 400 }
    );
  }

  const key = clientKey(request, email);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilkanaście minut." },
      { status: 429, headers: { "Retry-After": String(WINDOW_MS / 1000) } }
    );
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });

  // Always compare against something, even on a miss, to avoid a timing
  // side-channel that reveals whether an email exists.
  const validPassword = admin
    ? await verifyPassword(password, admin.passwordHash)
    : await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");

  if (!admin || !validPassword) {
    recordFailure(key);
    return NextResponse.json(
      { error: "Nieprawidłowy email lub hasło." },
      { status: 401 }
    );
  }

  attempts.delete(key);

  const token = await createSessionToken({ sub: admin.id, email: admin.email });

  const res = NextResponse.json({
    ok: true,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
