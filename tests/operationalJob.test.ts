import { afterEach, describe, expect, it, vi } from "vitest";
const push = vi.hoisted(() => vi.fn());
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: push }));
import { operationalJob } from "../lib/operationalJob";
afterEach(() => vi.restoreAllMocks());

describe("operational job reporting", () => {
  it("preserves successful responses", async () => {
    const response = new Response("done");
    expect(await operationalJob(async () => response)).toBe(response);
  });
  it("delivers a correlatable alert without leaking the exception", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    push.mockResolvedValue({ configured: true, sent: 1 });
    const response = await operationalJob(async () => { throw new Error("private token and client data"); });
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.alertDelivered).toBe(true);
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
