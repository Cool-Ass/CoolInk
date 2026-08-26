import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientCookieOptions, CLIENT_ACCESS_COOKIE, CLIENT_REFRESH_COOKIE, supabaseAuth } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, setRateLimitHeaders, tooManyRequests } from "@/lib/requestSecurity";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = rateLimit(request, "client-register", 4, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null); const firstName = String(body?.firstName ?? "").trim(); const lastName = String(body?.lastName ?? "").trim(); const email = String(body?.email ?? "").trim().toLowerCase(); const password = String(body?.password ?? "");
  if (String(body?.website ?? "").trim()) return NextResponse.json({ needsEmailConfirmation: true });
  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128) return NextResponse.json({ error: "Podaj imię, nazwisko, poprawny e-mail i hasło o długości co najmniej 10 znaków." }, { status: 400 });
  const result = await supabaseAuth("/signup", { method: "POST", body: JSON.stringify({ email, password, data: { first_name: firstName, last_name: lastName } }) }); const data = await result.json();
  if (!result.ok) return NextResponse.json({ error: data.message ?? "Nie udało się utworzyć konta." }, { status: result.status });
  const userId = data.user?.id as string | undefined; if (userId) await prisma.client.upsert({ where: { email }, update: { firstName, lastName, supabaseUserId: userId }, create: { firstName, lastName, email, supabaseUserId: userId } });
  const response = NextResponse.json({ needsEmailConfirmation: !data.session });
  if (data.session?.access_token) { response.cookies.set(CLIENT_ACCESS_COOKIE, data.session.access_token, clientCookieOptions); response.cookies.set(CLIENT_REFRESH_COOKIE, data.session.refresh_token, clientCookieOptions); }
  return setRateLimitHeaders(response, limit);
}
