export type MessageReceipt = { state: "delivered" | "read"; ids?: string[] };
export async function parseMessageReceipt(request: Request): Promise<MessageReceipt> {
  const raw = await request.text();
  if (!raw) return { state: "read" }; // Existing clients during rolling deployment.
  if (raw.length > 24000) throw Error("Nieprawidłowe potwierdzenie.");
  const data = JSON.parse(raw);
  if (!["delivered", "read"].includes(data?.state) || !Array.isArray(data.ids) || !data.ids.length || data.ids.length > 200 || data.ids.some((id: unknown) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) throw Error("Nieprawidłowe potwierdzenie.");
  return { state: data.state, ids: [...new Set<string>(data.ids)] };
}
export function messageReceiptStatus(message: { readAt?: string | null; deliveredAt?: string | null }) {
  return message.readAt ? "read" : message.deliveredAt ? "delivered" : "sent";
}
