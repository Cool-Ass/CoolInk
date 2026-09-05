import { NextResponse } from "next/server";
import { rateLimit, isSameOrigin, tooManyRequests, setRateLimitHeaders } from "@/lib/requestSecurity";
import { supabaseAuth } from "@/lib/clientAuth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null); const email = String(body?.email ?? "").trim().toLowerCase();
  const limit = await rateLimit(request, "client-password-recovery", 3, 60 * 60 * 1000, email);
  if (!limit.allowed) return tooManyRequests(limit);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const redirectTo = process.env.NODE_ENV === "production" ? "https://www.coolinktattoo.pl/app/reset-password" : `${new URL(request.url).origin}/app/reset-password`;
    await supabaseAuth(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method: "POST", body: JSON.stringify({ email }) }).catch(() => null);
  }
  return setRateLimitHeaders(NextResponse.json({ ok: true, message: "Jeśli konto istnieje, wysłaliśmy wiadomość z bezpiecznym linkiem." }), limit);
}
