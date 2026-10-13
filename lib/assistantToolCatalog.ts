import type { AdminPermission } from "@/lib/adminPermissions";
export const ASSISTANT_TOOLS = [
  { name: "free_dates", label: "Wolne terminy", permission: "operations.manage" },
  { name: "projects", label: "Wyszukaj projekty", permission: "operations.manage" },
  { name: "occupancy", label: "Obłożenie kalendarza", permission: "operations.manage" },
  { name: "unsettled", label: "Nierozliczone wizyty", permission: "finance.manage" },
  { name: "message_draft", label: "Szkic wiadomości", permission: "operations.manage" },
  { name: "promotion_draft", label: "Propozycja promocji", permission: "content.manage" },
] as const satisfies readonly { name: string; label: string; permission: AdminPermission }[];
