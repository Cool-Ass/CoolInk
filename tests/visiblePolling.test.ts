import { afterEach, expect, test, vi } from "vitest";
import { startVisiblePolling } from "../lib/visiblePolling";

let stop: (() => void) | undefined;
afterEach(() => { stop?.(); stop = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
function environment() {
  vi.useFakeTimers();
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const win = new EventTarget();
  const nav = { onLine: true };
  vi.stubGlobal("document", doc); vi.stubGlobal("window", win); vi.stubGlobal("navigator", nav);
  return { doc, win, nav };
}

test("slow responses never overlap and disposal aborts the current request", async () => {
  environment();
  let signal: AbortSignal | undefined;
  const refresh = vi.fn((current: AbortSignal) => { signal = current; return new Promise<void>(() => {}); });
  stop = startVisiblePolling(refresh);
  await vi.advanceTimersByTimeAsync(15_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  stop();
  expect(signal?.aborted).toBe(true);
});

test("hidden or offline screens make no requests and resume immediately", async () => {
  const { doc, win, nav } = environment();
  const refresh = vi.fn(async () => {});
  stop = startVisiblePolling(refresh);
  await vi.advanceTimersByTimeAsync(0);
  doc.visibilityState = "hidden"; doc.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(60_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  doc.visibilityState = "visible"; doc.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(0);
  expect(refresh).toHaveBeenCalledTimes(2);
  nav.onLine = false; win.dispatchEvent(new Event("offline"));
  await vi.advanceTimersByTimeAsync(60_000);
  expect(refresh).toHaveBeenCalledTimes(2);
  nav.onLine = true; win.dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(0);
  expect(refresh).toHaveBeenCalledTimes(3);
});

test("failures back off and successful requests restore the normal interval", async () => {
  environment();
  const refresh = vi.fn().mockRejectedValueOnce(new Error("Offline server")).mockResolvedValue(undefined);
  stop = startVisiblePolling(refresh);
  await vi.advanceTimersByTimeAsync(19_999);
  expect(refresh).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(refresh).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(refresh).toHaveBeenCalledTimes(3);
});
