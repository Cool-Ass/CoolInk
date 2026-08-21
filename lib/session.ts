import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "coolink_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in .env (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface AdminSessionPayload {
  sub: string; // admin user id
  email: string;
  [key: string]: unknown;
}

/** Sign a new admin session JWT. */
export async function createSessionToken(payload: AdminSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Verify and decode an admin session JWT. Returns null if invalid/expired. */
export async function verifySessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
