export const CHAT_PAGE_SIZE = 50;
export const chatOrder = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export function chatCursor(message: { id: string; createdAt: string | Date }) {
  return JSON.stringify({ id: message.id, createdAt: new Date(message.createdAt).toISOString() });
}

export function chatBefore(request: Request) {
  const value = new URL(request.url).searchParams.get("before");
  if (!value) return {};
  if (value.length > 512) throw new Error("Invalid cursor");
  const cursor = JSON.parse(value);
  if (typeof cursor.id !== "string" || !cursor.id || cursor.id.length > 128 ||
      typeof cursor.createdAt !== "string" || !Number.isFinite(Date.parse(cursor.createdAt))) {
    throw new Error("Invalid cursor");
  }
  const createdAt = new Date(cursor.createdAt);
  return { OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: cursor.id } }] };
}

export function chatPage<T>(rows: T[]) {
  return { messages: rows.slice(0, CHAT_PAGE_SIZE).reverse(), hasMore: rows.length > CHAT_PAGE_SIZE };
}

export function mergeChat<T extends { id: string; createdAt: string }>(older: T[], newer: T[]) {
  const unique = new Map([...older, ...newer].map(message => [message.id, message]));
  return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
