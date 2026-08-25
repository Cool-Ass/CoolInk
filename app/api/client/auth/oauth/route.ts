import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/clientAuth";

const COOKIE = "coolink_oauth_verifier";
export async function GET(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider");
  if (provider !== "google") return NextResponse.json({ error: "Nieobsługiwany dostawca." }, { status: 400 });
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const { url, key } = getSupabaseConfig(); const target = new URL(`${url}/auth/v1/authorize`);
  target.searchParams.set("provider", provider); target.searchParams.set("redirect_to", `${new URL(request.url).origin}/app/auth/callback`); target.searchParams.set("code_challenge", challenge); target.searchParams.set("code_challenge_method", "S256"); target.searchParams.set("apikey", key);
  const response = NextResponse.redirect(target);
  response.cookies.set(COOKIE, verifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/app/auth", maxAge: 600 });
  return response;
}
