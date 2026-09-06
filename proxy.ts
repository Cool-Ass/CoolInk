import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Paths that must stay reachable without a session (the login page itself,
// and the API route that issues one).
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login"];
const CLIENT_ACCESS_COOKIE = "coolink_client_access";
const CLIENT_REFRESH_COOKIE = "coolink_client_refresh";

function accessTokenExpiresSoon(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    return !payload.exp || payload.exp <= Math.floor(Date.now() / 1000) + 120;
  } catch {
    return true;
  }
}

function replaceCookie(header: string, name: string, value: string) {
  const parts = header.split(";").map((part) => part.trim()).filter(Boolean).filter((part) => !part.startsWith(`${name}=`));
  parts.push(`${name}=${value}`);
  return parts.join("; ");
}

async function refreshClientSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/app") && !pathname.startsWith("/api/client")) return null;
  const accessToken = request.cookies.get(CLIENT_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(CLIENT_REFRESH_COOKIE)?.value;
  if (!accessToken || !refreshToken || !accessTokenExpiresSoon(accessToken)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const refreshed = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    const data = await refreshed.json() as { access_token?: string; refresh_token?: string };
    if (!refreshed.ok || !data.access_token || !data.refresh_token) return null;
    const requestHeaders = new Headers(request.headers);
    let cookieHeader = requestHeaders.get("cookie") ?? "";
    cookieHeader = replaceCookie(cookieHeader, CLIENT_ACCESS_COOKIE, data.access_token);
    cookieHeader = replaceCookie(cookieHeader, CLIENT_REFRESH_COOKIE, data.refresh_token);
    requestHeaders.set("cookie", cookieHeader);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, priority: "high" as const, path: "/", maxAge: 60 * 60 * 24 * 14 };
    response.cookies.set(CLIENT_ACCESS_COOKIE, data.access_token, options);
    response.cookies.set(CLIENT_REFRESH_COOKIE, data.refresh_token, options);
    return response;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const length = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > 1_500_000) return NextResponse.json({ error: "Żądanie jest zbyt duże." }, { status: 413 });
  }

  const refreshedClientResponse = await refreshClientSession(request);
  if (refreshedClientResponse) return refreshedClientResponse;

  const isAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminArea) return NextResponse.next();

  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (["POST", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|admin.webmanifest|sw.js|icon-192.png|icon-512.png).*)"],
};
