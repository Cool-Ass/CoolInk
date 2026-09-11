import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;
  const { id } = await params;
  const revisions = await prisma.pageRevision.findMany({
    where: { pageId: id },
    orderBy: { version: "desc" },
    take: 30,
    select: {
      id: true,
      version: true,
      title: true,
      slug: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ revisions });
}
