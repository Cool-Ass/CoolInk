import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { verifyPrivateImageToken } from "@/lib/privateMedia";
import { streamChatImage } from "@/lib/chatImage";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await getCurrentClient();
  if (!client) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!verifyPrivateImageToken(request, id, "client", client.id)) return new Response(null, { status: 403 });
  const message = await prisma.directMessage.findFirst({ where: { id, clientId: client.id }, select: { imageUrl: true } });
  if (!message?.imageUrl) return new Response(null, { status: 404 });
  return streamChatImage(message.imageUrl);
}
