import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const CLIENT_ACCESS_COOKIE = "coolink_client_access";
export const CLIENT_REFRESH_COOKIE = "coolink_client_refresh";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url, key };
}

export function getSupabaseConfig() { return config(); }

export async function getClientAccessToken() {
  return (await cookies()).get(CLIENT_ACCESS_COOKIE)?.value ?? null;
}

export async function supabaseAuth(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  return fetch(`${url}/auth/v1${path}`, { ...init, headers: { apikey: key, "Content-Type": "application/json", ...(init.headers ?? {}) }, cache: "no-store" });
}

export async function getCurrentClient() {
  const token = await getClientAccessToken();
  if (!token) return null;
  let res: Response;
  try { res = await supabaseAuth("/user", { headers: { Authorization: `Bearer ${token}` } }); }
  catch { return null; }
  if (!res.ok) return null;
  const user = await res.json() as { id: string; email?: string };
  const linked = await prisma.client.findUnique({ where: { supabaseUserId: user.id } });
  if (linked || !user.email) return linked;
  const existing = await prisma.client.findUnique({ where: { email: user.email.toLowerCase() } });
  // A client may have first sent a public project brief before creating a
  // password. Link that existing CRM profile to the verified Supabase user.
  return existing ? prisma.client.update({ where: { id: existing.id }, data: { supabaseUserId: user.id } }) : null;
}

export const clientCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 14 };
