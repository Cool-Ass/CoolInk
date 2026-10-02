import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireBodyScrollLock } from "@/lib/bodyScrollLock";

afterEach(() => vi.unstubAllGlobals());
describe("shared dialog scroll lock", () => {
  it("keeps the page locked when overlapping dialogs close out of order", () => {
    const style = { overflow: "auto", paddingRight: "4px" };
    vi.stubGlobal("document", { body: { style }, documentElement: { clientWidth: 980 } });
    vi.stubGlobal("window", { innerWidth: 1000 });
    vi.stubGlobal("getComputedStyle", () => ({ paddingRight: "4px" }));
    const outer = acquireBodyScrollLock();
    const inner = acquireBodyScrollLock();
    outer(); outer();
    expect(style).toEqual({ overflow: "hidden", paddingRight: "24px" });
    inner();
    expect(style).toEqual({ overflow: "auto", paddingRight: "4px" });
  });
  it("supports remount cleanup without inventing scrollbar padding", () => {
    const style = { overflow: "", paddingRight: "" };
    vi.stubGlobal("document", { body: { style }, documentElement: { clientWidth: 400 } });
    vi.stubGlobal("window", { innerWidth: 400 });
    acquireBodyScrollLock()();
    const release = acquireBodyScrollLock();
    expect(style.paddingRight).toBe("");
    release();
    expect(style.overflow).toBe("");
  });
});
