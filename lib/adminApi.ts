import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export async function requireAdminApi() {
  const admin = await getCurrentAdmin();
  return admin
    ? { ok: true as const, admin }
    : { ok: false as const, response: NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 }) };
}
