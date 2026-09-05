import { NextResponse } from "next/server";
import { clientCookieOptions, CLIENT_ACCESS_COOKIE, CLIENT_REFRESH_COOKIE, linkAuthenticatedClient, supabaseAuth } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, setRateLimitHeaders, tooManyRequests } from "@/lib/requestSecurity";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacyPolicy";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = await rateLimit(request, "client-register", 4, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null); const firstName = String(body?.firstName ?? "").trim(); const lastName = String(body?.lastName ?? "").trim(); const email = String(body?.email ?? "").trim().toLowerCase(); const password = String(body?.password ?? ""); const privacyAcknowledged = body?.privacyAcknowledged === "on" || body?.privacyAcknowledged === true;
  if (String(body?.website ?? "").trim()) return NextResponse.json({ needsEmailConfirmation: true });
  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128 || !privacyAcknowledged) return NextResponse.json({ error: "Podaj imię, nazwisko, poprawny e-mail, hasło min. 12 znaków i potwierdź zapoznanie się z polityką prywatności." }, { status: 400 });
  const result = await supabaseAuth("/signup", { method: "POST", body: JSON.stringify({ email, password, data: { first_name: firstName, last_name: lastName, privacy_policy_version: PRIVACY_POLICY_VERSION } }) }); const data = await result.json();
  if (!result.ok) return NextResponse.json({ error: "Nie udało się utworzyć konta. Jeśli ten adres był już użyty, spróbuj się zalogować lub odzyskać hasło." }, { status: 400 });
  if (data.session?.access_token) { const profile = await supabaseAuth("/user", { headers: { Authorization: `Bearer ${data.session.access_token}` } }); const user = await profile.json(); if (!profile.ok || !(await linkAuthenticatedClient(user))) return NextResponse.json({ error: "Nie udało się bezpiecznie utworzyć profilu klienta." }, { status: 409 }); }
  const response = NextResponse.json({ needsEmailConfirmation: !data.session });
  if (data.session?.access_token) { response.cookies.set(CLIENT_ACCESS_COOKIE, data.session.access_token, clientCookieOptions); response.cookies.set(CLIENT_REFRESH_COOKIE, data.session.refresh_token, clientCookieOptions); }
  return setRateLimitHeaders(response, limit);
}
