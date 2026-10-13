import { prisma } from "@/lib/prisma";
import { aftercarePlans, defaultAftercare, validateAftercare } from "@/lib/aftercare";
import { PRIVACY_LOCKED_STATUSES } from "@/lib/privacyExecutionPlan";
export async function getAftercareSettings() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "aftercare_settings" }, select: { value: true } });
  if (!setting) return defaultAftercare;
  try { return validateAftercare(JSON.parse(setting.value)); } catch { return defaultAftercare; }
}
export async function processAftercare(now = new Date()) {
  const settings = await getAftercareSettings();
  if (!settings.enabled) return 0;
  const plans = aftercarePlans(settings);
  const visits = await prisma.appointment.findMany({ where: { status: "completed", AND: [{ OR: [{ serviceType: null }, { serviceType: "tattoo" }] }], project: { kind: "tattoo", client: { deletionRequest: { is: null } } }, OR: plans.map((plan, index) => ({ aftercareStartedAt: { lte: new Date(now.getTime() - plan.day * 86400000), ...(plans[index + 1] ? { gt: new Date(now.getTime() - plans[index + 1].day * 86400000) } : {}) }, reminderDeliveries: { none: { channel: `aftercare:${plan.type}`, offsetHours: 0 } } })) }, orderBy: { aftercareStartedAt: "asc" }, take: 200, select: { id: true, aftercareStartedAt: true, project: { select: { id: true, clientId: true } } } });
  let count = 0;
  for (const visit of visits) {
    // One current-stage message per visit; missed old stages never produce a burst.
    const plan = aftercarePlans(settings).filter(item => visit.aftercareStartedAt!.getTime() + item.day * 86400000 <= now.getTime()).at(-1);
    if (!plan) continue;
    count += await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"privacy:" + visit.project.clientId}, 0))`;
      const locked = await tx.accountDeletionRequest.findUnique({ where: { clientId: visit.project.clientId }, select: { status: true } });
      if (locked && PRIVACY_LOCKED_STATUSES.includes(locked.status)) return 0;
      const current = await tx.appointment.findUnique({ where: { id: visit.id }, select: { status: true, aftercareStartedAt: true } });
      if (current?.status !== "completed" || current.aftercareStartedAt?.getTime() !== visit.aftercareStartedAt?.getTime()) return 0;
      const key = { appointmentId: visit.id, channel: `aftercare:${plan.type}`, offsetHours: 0 };
      if (await tx.reminderDelivery.findUnique({ where: { appointmentId_channel_offsetHours: key } })) return 0;
      await tx.reminderDelivery.create({ data: { ...key, sentAt: now } });
      await tx.clientNotification.create({ data: { clientId: visit.project.clientId, projectId: visit.project.id, appointmentId: visit.id, type: `AFTERCARE_${plan.type}`, title: plan.title, body: plan.body, href: `/app/portal/aftercare?appointment=${visit.id}` } });
      return 1;
    }, { maxWait: 10000, timeout: 15000 });
  }
  return count;
}
