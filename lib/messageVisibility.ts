import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function messageRecipient(role: "admin" | "client", id: string) {
  if (!id) throw new Error("Message visibility requires an authenticated recipient");
  return `${role}:${id}`;
}

export function visibleMessages(recipient: string) {
  return { NOT: { hiddenFor: { has: recipient } } };
}

// PostgreSQL locks each updated row and rechecks the predicate, making
// retries/concurrent hides idempotent without replacing another recipient's state.
export function hideProjectMessages(where: Prisma.ProjectMessageWhereInput, recipient: string) {
  return prisma.projectMessage.updateMany({
    where: { AND: [where, visibleMessages(recipient)] },
    data: { hiddenFor: { push: recipient } },
  });
}

export function hideDirectMessages(where: Prisma.DirectMessageWhereInput, recipient: string) {
  return prisma.directMessage.updateMany({
    where: { AND: [where, visibleMessages(recipient)] },
    data: { hiddenFor: { push: recipient } },
  });
}
