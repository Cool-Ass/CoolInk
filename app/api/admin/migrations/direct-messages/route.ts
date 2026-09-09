import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin.role, "settings.manage")) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "DirectMessage" ("id" TEXT NOT NULL, "clientId" TEXT NOT NULL, "author" TEXT NOT NULL, "body" TEXT NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id"))`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DirectMessage_clientId_createdAt_idx" ON "DirectMessage"("clientId", "createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DirectMessage_clientId_author_readAt_idx" ON "DirectMessage"("clientId", "author", "readAt")`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  return NextResponse.json({ ok: true, migration: "direct-messages" });
}
