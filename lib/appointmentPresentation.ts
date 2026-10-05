/** Newest sessions first, stable ties; never mutates server-provided arrays. */
export function newestSessionsFirst<T extends { id: string; startsAt: Date | string }>(sessions: readonly T[]): T[] {
  return [...sessions].sort((a, b) => {
    const delta = new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
    return Number.isFinite(delta) && delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
}
export const OPEN_VISIT_SETTLEMENT = "coolink:open-visit-settlement";
