import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PRIVACY_POLICY_HTML, PRIVACY_POLICY_SLUG, PRIVACY_POLICY_VERSION } from "@/lib/privacyPolicy";

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

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export async function linkAuthenticatedClient(user: SupabaseUser) {
  const email = user.email?.trim().toLowerCase();
  if (!email || (!user.email_confirmed_at && !user.confirmed_at)) return null;
  const linked = await prisma.client.findUnique({ where: { supabaseUserId: user.id } });
  if (linked) return linked;
  const existing = await prisma.client.findUnique({ where: { email } });
  if (existing?.supabaseUserId && existing.supabaseUserId !== user.id) return null;
  const meta = user.user_metadata ?? {};
  const fullName = String(meta.full_name ?? meta.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = String(meta.first_name ?? fullName[0] ?? "").trim().slice(0, 80);
  const lastName = String(meta.last_name ?? fullName.slice(1).join(" ") ?? "").trim().slice(0, 80);
  const privacyAccepted = Number(meta.privacy_policy_version) === PRIVACY_POLICY_VERSION;
  return prisma.$transaction(async (tx) => {
    const client = existing
      ? await tx.client.update({ where: { id: existing.id }, data: { supabaseUserId: user.id, firstName: firstName || existing.firstName, lastName: lastName || existing.lastName } })
      : await tx.client.create({ data: { email, supabaseUserId: user.id, firstName, lastName } });
    if (privacyAccepted) {
      const document = await tx.studioDocument.upsert({
        where: { slug: PRIVACY_POLICY_SLUG },
        update: { title: "Polityka prywatności i informacja RODO", content: PRIVACY_POLICY_HTML, category: "policy", version: PRIVACY_POLICY_VERSION, published: true },
        create: { slug: PRIVACY_POLICY_SLUG, title: "Polityka prywatności i informacja RODO", content: PRIVACY_POLICY_HTML, category: "policy", version: PRIVACY_POLICY_VERSION, published: true },
      });
      await tx.documentAcceptance.upsert({ where: { clientId_documentId_version: { clientId: client.id, documentId: document.id, version: PRIVACY_POLICY_VERSION } }, create: { clientId: client.id, documentId: document.id, version: PRIVACY_POLICY_VERSION }, update: {} });
    }
    return client;
  });
}

export async function getCurrentClient() {
  const token = await getClientAccessToken();
  if (!token) return null;
  let res: Response;
  try { res = await supabaseAuth("/user", { headers: { Authorization: `Bearer ${token}` } }); }
  catch { return null; }
  if (!res.ok) return null;
  return linkAuthenticatedClient(await res.json() as SupabaseUser);
}

export const clientCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, priority: "high" as const, path: "/", maxAge: 60 * 60 * 24 * 14 };
