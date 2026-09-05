import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { requireAdminApi } from "@/lib/adminApi";

export async function POST() {
  const access = await requireAdminApi(); if (!access.ok) return access.response;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
