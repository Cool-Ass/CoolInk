import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-use deployment bridge. This route is removed immediately after a
// successful production response. Every statement is additive/idempotent.
export async function GET() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "DirectMessage" ("id" TEXT NOT NULL, "clientId" TEXT NOT NULL, "author" TEXT NOT NULL, "body" TEXT NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id"))`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DirectMessage_clientId_createdAt_idx" ON "DirectMessage"("clientId", "createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DirectMessage_clientId_author_readAt_idx" ON "DirectMessage"("clientId", "author", "readAt")`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  return NextResponse.json({ ok: true, migration: "direct-messages" });
}
