import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { googleExportRetry } from "../lib/googleExportOutbox";

describe("Google export retry metadata", () => {
  it("increases retries exponentially with a one-hour cap", () => {
    const now = Date.parse("2026-10-02T00:00:00Z");
    expect(googleExportRetry(0, "EXPORT_FAILED", now)).toEqual({ attempts: 1, nextAttemptAt: "2026-10-02T00:01:00.000Z", lastError: "EXPORT_FAILED" });
    expect(googleExportRetry(1, "EXPORT_FAILED", now).nextAttemptAt).toBe("2026-10-02T00:02:00.000Z");
    expect(googleExportRetry(100, "EXPORT_FAILED", now).nextAttemptAt).toBe("2026-10-02T01:00:00.000Z");
  });
  it("avoids rapid retries for configuration and remote conflicts", () => {
    for (const reason of ["CONFIGURATION_REQUIRED", "REMOTE_CONFLICT"] as const) {
      expect(googleExportRetry(0, reason, 0).nextAttemptAt).toBe("1970-01-01T01:00:00.000Z");
    }
  });
  it("bounds malformed and excessive attempt counters", () => {
    expect(googleExportRetry(NaN, "EXPORT_FAILED", 0).attempts).toBe(1);
    expect(googleExportRetry(-5, "EXPORT_FAILED", 0).attempts).toBe(1);
    expect(googleExportRetry(9999, "EXPORT_FAILED", 0).attempts).toBe(1000);
  });
});
