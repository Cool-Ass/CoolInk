import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Next's static public-file inventory excludes uploads created after startup.
// Serve only registered, re-encoded public CMS uploads, never private media.
export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/.test(filename)) return new Response(null, { status: 404 });
  const media = await prisma.media.findFirst({ where: { url: `/uploads/${filename}`, mimeType: "image/webp" }, select: { id: true } });
  if (!media) return new Response(null, { status: 404 });
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public", "uploads", filename));
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}
