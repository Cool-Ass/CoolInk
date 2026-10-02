/** Serial refreshes for visible, online screens; suspends work in background tabs. */
export function startVisiblePolling(refresh: (signal: AbortSignal) => Promise<void>) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: AbortController | undefined;
  let delay = 10_000;
  let wakeRequested = false;
  const available = () => !stopped && document.visibilityState !== "hidden" && navigator.onLine;

  async function run() {
    if (!available() || active) return;
    wakeRequested = false;
    const controller = new AbortController();
    active = controller;
    const deadline = setTimeout(() => controller.abort(), 20_000);
    try {
      await refresh(controller.signal);
      delay = 10_000;
    } catch {
      delay = Math.min(delay * 2, 60_000);
    } finally {
      clearTimeout(deadline);
      active = undefined;
      if (available()) timer = setTimeout(run, wakeRequested ? 0 : delay);
    }
  }

  function resume() {
    clearTimeout(timer);
    if (!available()) { active?.abort(); return; }
    delay = 10_000;
    wakeRequested = true;
    void run();
  }
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  window.addEventListener("offline", resume);
  void run();
  return () => {
    stopped = true;
    clearTimeout(timer);
    active?.abort();
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("offline", resume);
  };
}
