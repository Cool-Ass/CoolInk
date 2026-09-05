import { NextResponse } from "next/server";
import { rateLimit, isSameOrigin, tooManyRequests, setRateLimitHeaders } from "@/lib/requestSecurity";
import { supabaseAuth } from "@/lib/clientAuth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = await rateLimit(request, "client-password-reset", 5, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null); const accessToken = String(body?.accessToken ?? ""); const password = String(body?.password ?? "");
  if (!accessToken || accessToken.length > 4096 || password.length < 12 || password.length > 128) return NextResponse.json({ error: "Link jest nieprawidłowy albo hasło nie ma 12 znaków." }, { status: 400 });
  const result = await supabaseAuth("/user", { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ password }) });
  if (!result.ok) return NextResponse.json({ error: "Link wygasł lub został już użyty. Poproś o nowy." }, { status: 400 });
  await supabaseAuth("/logout", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null);
  return setRateLimitHeaders(NextResponse.json({ ok: true }), limit);
}
