import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPrivateImageToken } from "@/lib/privateMedia";
import { streamChatImage } from "@/lib/chatImage";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!verifyPrivateImageToken(request, id, "admin", admin.id)) return new Response(null, { status: 403 });
  const message = await prisma.directMessage.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!message?.imageUrl) return new Response(null, { status: 404 });
  return streamChatImage(message.imageUrl);
}
