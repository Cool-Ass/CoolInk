import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Paths that must stay reachable without a session (the login page itself,
// and the API route that issues one).
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A switchable, public-facing construction screen. The admin and API
  // remain available so content and the studio workflow can keep moving
  // while visitors see a focused, intentional holding page.
  const isBuildMode = process.env.SITE_BUILD_MODE === "true";
  const isInternalRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/budujemy");

  if (isBuildMode && !isInternalRoute) {
    return NextResponse.rewrite(new URL("/budujemy", request.url));
  }

  const isAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminArea) return NextResponse.next();

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
