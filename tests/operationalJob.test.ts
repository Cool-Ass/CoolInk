import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const push = vi.hoisted(() => vi.fn());
const audit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: push }));
vi.mock("@/lib/prisma", () => ({ prisma: { adminAuditLog: { create: audit } } }));
import { operationalJob } from "../lib/operationalJob";
afterEach(() => vi.restoreAllMocks());
beforeEach(() => { vi.resetAllMocks(); audit.mockResolvedValue({}); });

describe("operational job reporting", () => {
  it("preserves successful responses", async () => {
    const response = new Response("done");
    expect(await operationalJob(async () => response)).toBe(response);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "operational.reminders.success" }) }));
  });
  it("does not resolve an alarm for a non-success response", async () => {
    const response = new Response("failed", { status: 503 });
    expect(await operationalJob(async () => response)).toBe(response);
    expect(audit).not.toHaveBeenCalled();
  });
  it("does not fail completed work when recording success is unavailable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    audit.mockRejectedValue(new Error("private database details"));
    const response = new Response("done");
    expect(await operationalJob(async () => response)).toBe(response);
    expect(log).toHaveBeenCalledWith("operational_success_not_persisted", { job: "reminders" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private database");
  });
  it("delivers a correlatable alert without leaking the exception", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    push.mockResolvedValue({ configured: true, sent: 1 });
    const response = await operationalJob(async () => { throw new Error("private token and client data"); });
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.alertDelivered).toBe(true);
    expect(body.alertPersisted).toBe(true);
    expect(push.mock.calls.at(-1)?.[0].body).toContain(body.eventId);
    expect(JSON.stringify([body, push.mock.calls, log.mock.calls])).not.toContain("private token");
  });
  it.each(["missing-config", "delivery-error"])("does not claim alert delivery after %s", async (mode) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    if (mode === "missing-config") push.mockResolvedValue({ configured: false, sent: 0 });
    else push.mockRejectedValue(new Error("private push credentials"));
    const response = await operationalJob(async () => { throw new Error("failure"); });
    expect((await response.json()).alertDelivered).toBe(false);
    expect(log).toHaveBeenCalledWith("operational_alert_not_delivered", expect.objectContaining({ job: "reminders" }));
  });
});
