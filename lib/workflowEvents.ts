import { prisma } from "@/lib/prisma";

type EventInput = { projectId: string; type: string; activity?: string; visibility?: "admin" | "client"; notification?: { title: string; body: string; href?: string; appointmentId?: string } };

/** Records one business event. New channels (push/e-mail) can later subscribe
 * here, leaving project and appointment routes free of channel-specific code. */
export async function recordWorkflowEvent(input: EventInput) {
  const project = await prisma.tattooProject.findUnique({ where: { id: input.projectId }, select: { clientId: true } });
  if (!project) return;
  await prisma.$transaction(async (tx) => {
    if (input.activity) await tx.projectActivity.create({ data: { projectId: input.projectId, type: input.type, message: input.activity, visibility: input.visibility ?? "admin" } });
    if (input.notification) await tx.clientNotification.create({ data: { clientId: project.clientId, projectId: input.projectId, appointmentId: input.notification.appointmentId, type: input.type, title: input.notification.title, body: input.notification.body, href: input.notification.href ?? `/app/portal#projekty` } });
  });
}
