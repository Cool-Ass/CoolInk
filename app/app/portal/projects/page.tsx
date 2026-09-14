import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { privateImageUrl } from "@/lib/privateMedia";
import { getCurrentClient } from "@/lib/clientAuth";
import { CLIENT_STATUS } from "@/lib/projectWorkflow";
import ClientProjectCards from "@/components/client/ClientProjectCards";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");

  const projects = await prisma.tattooProject.findMany({
    where: { clientId: current.id },
    include: { appointments: { orderBy: { startsAt: "asc" } }, images: { orderBy: { createdAt: "asc" } }, activities: { where: { visibility: { in: ["client", "both"] } }, orderBy: { createdAt: "asc" }, take: 100 }, messages: { include: { attachment: { select: { id: true, caption: true } } }, orderBy: { createdAt: "asc" }, take: 100 } },
    orderBy: { updatedAt: "desc" },
  });

  return <ClientProjectCards projects={projects.map((project) => ({
    id: project.id,
    kind: project.kind,
    title: project.title,
    description: project.description,
    status: project.status,
    next: CLIENT_STATUS[project.status as keyof typeof CLIENT_STATUS]?.next ?? "Studio wróci z kolejnym krokiem.",
    estimatedPrice: project.estimatedPrice,
    estimatedPriceMax: project.estimatedPriceMax,
    finalPrice: project.finalPrice,
    depositStatus: project.depositStatus,
    depositAmount: project.depositAmount,
    appointments: project.appointments.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), status: item.status, price: item.price, createdAt: item.createdAt.toISOString(), confirmationRequestedAt: item.confirmationRequestedAt?.toISOString() ?? null, clientConfirmedAt: item.clientConfirmedAt?.toISOString() ?? null })),
    images: project.images.map((image) => ({ id: image.id, url: privateImageUrl(image.id, "client", current.id), caption: image.caption, createdAt: image.createdAt.toISOString() })),
    messages: project.messages.map((message) => ({ id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: message.attachment ? { id: message.attachment.id, caption: message.attachment.caption, url: privateImageUrl(message.attachment.id, "client", current.id) } : null })),
    activities: project.activities.map((activity) => ({ id: activity.id, type: activity.type, message: activity.message, createdAt: activity.createdAt.toISOString() })),
  }))} />;
}
