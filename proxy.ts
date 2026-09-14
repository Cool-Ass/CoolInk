import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Paths that must stay reachable without a session (the login page itself,
// and the API route that issues one).
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login"];
const CLIENT_ACCESS_COOKIE = "coolink_client_access";
const CLIENT_REFRESH_COOKIE = "coolink_client_refresh";

function requestOrigin(request: NextRequest) {
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}

function sameOriginMutation(request: NextRequest) {
  const expected = requestOrigin(request);
  const origin = request.headers.get("origin");
  if (origin) return origin === expected;
  const referer = request.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin === expected; } catch { return false; }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

function contentSecurityPolicy(nonce: string) {
  const development = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "connect-src 'self' https://*.supabase.co https://*.blob.vercel-storage.com",
    "font-src 'self' data:",
    "frame-src 'self' https://accounts.google.com https://www.google.com https://maps.google.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "worker-src 'self' blob:",
    "report-uri /api/security/csp-report",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function secureResponse(response: NextResponse, nonce: string, htmlRequest: boolean) {
  if (htmlRequest) {
    const header = process.env.CSP_MODE === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
    response.headers.set(header, contentSecurityPolicy(nonce));
  }
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  if (process.env.NODE_ENV === "production") response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  return response;
}

function securedRequestHeaders(request: NextRequest, nonce: string) {
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  // Next.js reads the nonce from this request header and applies it to its own
  // scripts. The browser only receives the separately configured response
  // header, so report-only mode remains report-only.
  headers.set("content-security-policy", contentSecurityPolicy(nonce));
  return headers;
}

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

async function refreshClientSession(request: NextRequest, nonce: string) {
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
    const requestHeaders = securedRequestHeaders(request, nonce);
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
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const htmlRequest = !pathname.startsWith("/api/") && (request.headers.get("accept")?.includes("text/html") ?? true);

  if (pathname.startsWith("/api/") && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const signedWebhook = pathname.startsWith("/api/webhooks/");
    const browserSecurityReport = pathname === "/api/security/csp-report";
    if (!signedWebhook && !browserSecurityReport && !sameOriginMutation(request)) return secureResponse(NextResponse.json({ error: "Forbidden" }, { status: 403 }), nonce, false);
    const length = Number(request.headers.get("content-length") ?? "0");
    const uploadRequest = /\/api\/(admin\/(?:media|images|portfolio|projects\/[^/]+\/images)|client\/(?:images|projects\/[^/]+\/images))(?:\/|$)/.test(pathname);
    const configuredUploadLimit = Number(process.env.MAX_UPLOAD_MB ?? "8");
    const uploadLimit = (Number.isFinite(configuredUploadLimit) ? Math.min(Math.max(configuredUploadLimit, 1), 20) : 8) * 1024 * 1024 + 128 * 1024;
    const requestLimit = uploadRequest ? uploadLimit : 1_500_000;
    if (Number.isFinite(length) && length > requestLimit) return secureResponse(NextResponse.json({ error: "Żądanie jest zbyt duże." }, { status: 413 }), nonce, false);
  }

  const refreshedClientResponse = await refreshClientSession(request, nonce);
  if (refreshedClientResponse) return secureResponse(refreshedClientResponse, nonce, htmlRequest);

  const isAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminArea) {
    const headers = securedRequestHeaders(request, nonce);
    return secureResponse(NextResponse.next({ request: { headers } }), nonce, htmlRequest);
  }

  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    const headers = securedRequestHeaders(request, nonce);
    return secureResponse(NextResponse.next({ request: { headers } }), nonce, htmlRequest);
  }

  if (["POST", "PATCH", "DELETE"].includes(request.method)) {
    if (!sameOriginMutation(request)) {
      return secureResponse(NextResponse.json({ error: "Forbidden" }, { status: 403 }), nonce, false);
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/admin")) {
      return secureResponse(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), nonce, false);
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return secureResponse(NextResponse.redirect(loginUrl), nonce, htmlRequest);
  }

  const headers = securedRequestHeaders(request, nonce);
  return secureResponse(NextResponse.next({ request: { headers } }), nonce, htmlRequest);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|admin.webmanifest|sw.js|icon-192.png|icon-512.png).*)"],
};
