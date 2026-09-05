import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { isSameOrigin, rateLimit, setRateLimitHeaders, tooManyRequests } from "@/lib/requestSecurity";

// A real bcrypt hash with cost 12. Comparing against it keeps unknown-account
// requests close to the same cost as a normal password check.
const DUMMY_PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxY9oY1M8jY3Q2c6oI9eR5qKfOu";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(body?.password ?? "");
  const limit = await rateLimit(request, "admin-login", 8, 15 * 60 * 1000, email);
  if (!limit.allowed) return tooManyRequests(limit);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 128) {
    return NextResponse.json({ error: "Nieprawidłowy e-mail lub hasło." }, { status: 401 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const validPassword = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!admin || !validPassword) {
    return setRateLimitHeaders(NextResponse.json({ error: "Nieprawidłowy e-mail lub hasło." }, { status: 401 }), limit);
  }

  const token = await createSessionToken({ sub: admin.id, email: admin.email, version: admin.sessionVersion });
  const response = NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return setRateLimitHeaders(response, limit);
}
