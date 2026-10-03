import { describe, expect, it, vi } from "vitest";
import { recoveryAuthGateway, recoveryAuthTarget } from "../scripts/recoveryAuthGateway";
describe("offline restored Auth routing", () => {
  it("only routes the exact password and identity operations", () => {
    expect(recoveryAuthTarget("POST", "/auth/v1/token?grant_type=password")).toBe("/token?grant_type=password");
    expect(recoveryAuthTarget("GET", "/auth/v1/user")).toBe("/user");
    for (const path of ["https://example.invalid/auth/v1/user", "//example.invalid/auth/v1/user", "/auth/v1/user?redirect=external", "/auth/v1/admin/users", "/auth/v1/token?grant_type=refresh_token", "/auth/v1/../admin/users", undefined]) expect(recoveryAuthTarget("GET", path)).toBeNull();
    expect(recoveryAuthTarget("DELETE", "/auth/v1/user")).toBeNull();
    expect(recoveryAuthTarget("GET", "/auth/v1/token?grant_type=password")).toBeNull();
  });
  it("refuses starting any service outside a disposable Actions runner", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "false");
    try { await expect(recoveryAuthGateway()).rejects.toThrow("Disposable runner required"); } finally { vi.unstubAllEnvs(); }
  });
});
