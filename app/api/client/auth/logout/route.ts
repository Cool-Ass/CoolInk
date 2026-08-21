import { NextResponse } from "next/server";
import { CLIENT_ACCESS_COOKIE, CLIENT_REFRESH_COOKIE } from "@/lib/clientAuth";
export async function POST() { const response = NextResponse.json({ ok: true }); response.cookies.set(CLIENT_ACCESS_COOKIE, "", { path: "/", maxAge: 0 }); response.cookies.set(CLIENT_REFRESH_COOKIE, "", { path: "/", maxAge: 0 }); return response; }
