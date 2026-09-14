import { NextResponse } from "next/server";
import { CLIENT_ACCESS_COOKIE, CLIENT_REFRESH_COOKIE } from "@/lib/clientAuth";
import { isSameOrigin } from "@/lib/requestSecurity";
export async function POST(request: Request) { if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); const response = NextResponse.json({ ok: true }); response.cookies.set(CLIENT_ACCESS_COOKIE, "", { path: "/", maxAge: 0 }); response.cookies.set(CLIENT_REFRESH_COOKIE, "", { path: "/", maxAge: 0 }); return response; }
