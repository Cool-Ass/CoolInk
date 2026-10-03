let leases = 0;
let previous: { overflow: string; paddingRight: string } | null = null;

/** Overlapping dialogs release only their own lease, including Strict Mode cleanup. */
export function acquireBodyScrollLock() {
  if (leases === 0) {
    previous = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight };
    const width = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = "hidden";
    if (width > 0) document.body.style.paddingRight = `${width + (parseFloat(getComputedStyle(document.body).paddingRight) || 0)}px`;
  }
  leases += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    leases -= 1;
    if (leases === 0 && previous) {
      document.body.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      previous = null;
    }
  };
}
