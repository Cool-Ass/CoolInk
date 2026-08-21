import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import { prisma } from "./prisma";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/**
 * Server-side helper (Server Components, Route Handlers, Server Actions) to
 * read the currently authenticated admin, if any. Does not throw — callers
 * decide what to do when it returns null (middleware is what actually
 * enforces access control on /admin routes).
 */
export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true },
  });
  return admin;
}
