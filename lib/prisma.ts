import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton so hot-reloading doesn't spawn a new
// PrismaClient (and a new SQLite connection) on every file change.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase's TLS chain is handled normally in production. On some Windows
// development machines Prisma's native engine cannot access the certificate
// store (os error -2146893042), so only local development relaxes verification.
const localDatabaseUrl = process.env.NODE_ENV === "production"
  ? process.env.DATABASE_URL
  : process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=require&sslaccept=accept_invalid_certs");

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: localDatabaseUrl ? { db: { url: localDatabaseUrl } } : undefined,
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
