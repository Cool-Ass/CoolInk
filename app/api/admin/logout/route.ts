import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi(); if (!access.ok) return access.response;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
