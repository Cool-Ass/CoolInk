import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { CLIENT_STATUS } from "@/lib/projectWorkflow";
import ClientProjectCards from "@/components/client/ClientProjectCards";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");

  const projects = await prisma.tattooProject.findMany({
    where: { clientId: current.id },
    include: { appointments: { orderBy: { startsAt: "asc" } }, images: true },
    orderBy: { updatedAt: "desc" },
  });

  return <ClientProjectCards projects={projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    next: CLIENT_STATUS[project.status as keyof typeof CLIENT_STATUS]?.next ?? "Studio wróci z kolejnym krokiem.",
    estimatedPrice: project.estimatedPrice,
    finalPrice: project.finalPrice,
    depositStatus: project.depositStatus,
    depositAmount: project.depositAmount,
    appointments: project.appointments.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), status: item.status, price: item.price })),
    images: project.images.map((image) => ({ id: image.id, url: `/api/client/images/${image.id}`, caption: image.caption })),
    messages: [],
  }))} />;
}
