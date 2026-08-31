import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientCookieOptions, CLIENT_ACCESS_COOKIE, CLIENT_REFRESH_COOKIE, getSupabaseConfig, supabaseAuth } from "@/lib/clientAuth";
import { isClientProfileComplete, safeClientReturnTo } from "@/lib/clientProfile";
const COOKIE = "coolink_oauth_verifier";
const RETURN_TO_COOKIE = "coolink_oauth_return_to";

function returnToLogin(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/app?error=${error}`, request.url));
}

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get("code"), verifier = request.cookies.get(COOKIE)?.value;
  const returnTo = safeClientReturnTo(request.cookies.get(RETURN_TO_COOKIE)?.value);
  if (!code || !verifier) return returnToLogin(request, "oauth_session");

  let session: { access_token?: string; refresh_token?: string };
  try {
    const { url, key } = getSupabaseConfig();
    const exchange = await fetch(`${url}/auth/v1/token?grant_type=pkce`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ auth_code: code, code_verifier: verifier }), cache: "no-store" });
    session = await exchange.json();
    if (!exchange.ok || !session.access_token || !session.refresh_token) return returnToLogin(request, "oauth_exchange");
  } catch (error) {
    console.error("Google OAuth token exchange failed", error);
    return returnToLogin(request, "oauth_exchange");
  }

  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
  try {
    const profile = await supabaseAuth("/user", { headers: { Authorization: `Bearer ${session.access_token}` } });
    user = await profile.json();
    if (!profile.ok || !user.email) return returnToLogin(request, "oauth_profile");
  } catch (error) {
    console.error("Google OAuth profile lookup failed", error);
    return returnToLogin(request, "oauth_profile");
  }

  const email = user.email.toLowerCase(), meta = user.user_metadata || {};
  try {
    const fullName = String(meta.full_name || meta.name || "").trim().split(/\s+/);
    const client = await prisma.client.upsert({ where: { email }, update: { supabaseUserId: user.id }, create: { email, supabaseUserId: user.id, firstName: String(meta.first_name || fullName[0] || ""), lastName: String(meta.last_name || fullName.slice(1).join(" ") || ""), avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null } });
    const target = isClientProfileComplete(client) ? returnTo : `/app/complete-profile?returnTo=${encodeURIComponent(returnTo)}`;
    const response = NextResponse.redirect(new URL(target, request.url));
    response.cookies.set(CLIENT_ACCESS_COOKIE, session.access_token, clientCookieOptions);
    response.cookies.set(CLIENT_REFRESH_COOKIE, session.refresh_token, clientCookieOptions);
    response.cookies.set(COOKIE, "", { path: "/app/auth", maxAge: 0 });
    response.cookies.set(RETURN_TO_COOKIE, "", { path: "/app/auth", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Google OAuth client upsert failed", error);
    return returnToLogin(request, "oauth_database");
  }

}
