import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientCookieOptions, CLIENT_ACCESS_COOKIE, CLIENT_REFRESH_COOKIE, getSupabaseConfig, supabaseAuth } from "@/lib/clientAuth";
const COOKIE = "coolink_oauth_verifier";
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get("code"), verifier = request.cookies.get(COOKIE)?.value;
  if (!code || !verifier) return NextResponse.redirect(new URL("/app?error=oauth", request.url));
  const { url, key } = getSupabaseConfig(); const exchange = await fetch(`${url}/auth/v1/token?grant_type=pkce`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ auth_code: code, code_verifier: verifier }), cache: "no-store" }); const session = await exchange.json();
  if (!exchange.ok || !session.access_token) return NextResponse.redirect(new URL("/app?error=oauth", request.url));
  const profile = await supabaseAuth("/user", { headers: { Authorization: `Bearer ${session.access_token}` } }); const user = await profile.json();
  if (!profile.ok || !user.email) return NextResponse.redirect(new URL("/app?error=oauth", request.url));
  const email = user.email.toLowerCase(), meta = user.user_metadata || {};
  await prisma.client.upsert({ where: { email }, update: { supabaseUserId: user.id }, create: { email, supabaseUserId: user.id, firstName: String(meta.first_name || ""), lastName: String(meta.last_name || "") } });
  const response = NextResponse.redirect(new URL("/app/complete-profile", request.url)); response.cookies.set(CLIENT_ACCESS_COOKIE, session.access_token, clientCookieOptions); response.cookies.set(CLIENT_REFRESH_COOKIE, session.refresh_token, clientCookieOptions); response.cookies.set(COOKIE, "", { path: "/app/auth", maxAge: 0 }); return response;
}
