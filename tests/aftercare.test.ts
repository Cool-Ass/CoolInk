import { beforeEach, describe, expect, it, vi } from "vitest";
import { aftercarePlans, defaultAftercare, validateAftercare } from "@/lib/aftercare";
import { PRIVACY_LOCKED_STATUSES } from "@/lib/privacyExecutionPlan";
const m = vi.hoisted(() => ({ setting: vi.fn(), visits: vi.fn(), privacy: vi.fn(), current: vi.fn(), receipt: vi.fn(), create: vi.fn(), notify: vi.fn(), lock: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { siteSetting: { findUnique: m.setting }, appointment: { findMany: m.visits }, $transaction: (work: (tx: unknown) => unknown) => work({ $executeRaw: m.lock, accountDeletionRequest: { findUnique: m.privacy }, appointment: { findUnique: m.current }, reminderDelivery: { findUnique: m.receipt, create: m.create }, clientNotification: { create: m.notify } }) } }));
import { processAftercare } from "@/lib/aftercareAutomation";
describe("aftercare configuration", () => {
  it("is opt-in and reuses in-app notifications", () => { expect(defaultAftercare.enabled).toBe(false); expect(aftercarePlans(defaultAftercare)).toHaveLength(3); });
  it.each([{ checkInDay: 0 }, { photoDay: 2 }, { reviewDay: 400 }, { enabled: "yes" }, { reviewUrl: "javascript:alert(1)" }, { reviewUrl: "https://google.com.evil.test/" }, { reviewUrl: "https://x:secret@google.com/" }])("rejects unsafe configuration %j", patch => { expect(() => validateAftercare({ ...defaultAftercare, ...patch })).toThrow(); });
  it("adds an optional Google review stage", () => { expect(aftercarePlans(validateAftercare({ ...defaultAftercare, reviewUrl: "https://g.page/studio/review" })).at(-1)?.type).toBe("review"); });
});
describe("aftercare scheduling", () => {
  const started = new Date("2026-10-01T10:00:00Z"), now = new Date("2026-10-25T10:00:00Z");
  beforeEach(() => { vi.resetAllMocks(); m.setting.mockResolvedValue({ value: JSON.stringify({ ...defaultAftercare, enabled: true }) }); m.visits.mockResolvedValue([{ id: "visit", aftercareStartedAt: started, project: { id: "project", clientId: "client" } }]); m.current.mockResolvedValue({ status: "completed", aftercareStartedAt: started }); m.privacy.mockResolvedValue(null); m.receipt.mockResolvedValue(null); });
  it("does not scan or notify while disabled", async () => { m.setting.mockResolvedValue(null); expect(await processAftercare(now)).toBe(0); expect(m.visits).not.toHaveBeenCalled(); });
  it("sends only the current stage, without a burst of overdue messages", async () => { expect(await processAftercare(now)).toBe(1); expect(m.notify).toHaveBeenCalledTimes(1); expect(m.notify).toHaveBeenCalledWith({ data: expect.objectContaining({ clientId: "client", type: "AFTERCARE_photo", appointmentId: "visit" }) }); expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ channel: "aftercare:photo", offsetHours: 0 }) }); });
  it("is idempotent and retains receipt identity when settings change days", async () => { m.receipt.mockResolvedValue({ id: "sent" }); expect(await processAftercare(now)).toBe(0); expect(m.notify).not.toHaveBeenCalled(); });
  it("rechecks cancelled visits after acquiring the privacy lock", async () => { m.current.mockResolvedValue({ status: "cancelled", aftercareStartedAt: started }); expect(await processAftercare(now)).toBe(0); expect(m.notify).not.toHaveBeenCalled(); });
  it("skips an erasure-locked profile", async () => { m.privacy.mockResolvedValue({ status: PRIVACY_LOCKED_STATUSES[0] }); expect(await processAftercare(now)).toBe(0); expect(m.lock).toHaveBeenCalled(); expect(m.notify).not.toHaveBeenCalled(); });
  it("queries only undelivered current stages, preventing batch starvation", async () => { await processAftercare(now); expect(m.visits).toHaveBeenCalledWith(expect.objectContaining({ take: 200, orderBy: { aftercareStartedAt: "asc" }, where: expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ reminderDeliveries: { none: { channel: "aftercare:photo", offsetHours: 0 } } })]) }) })); });
});
