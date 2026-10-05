/** Newest sessions first, stable ties; never mutates server-provided arrays. */
export function newestSessionsFirst<T extends { id: string; startsAt: Date | string }>(sessions: readonly T[]): T[] {
  return [...sessions].sort((a, b) => {
    const delta = new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
    return Number.isFinite(delta) && delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
}
export const OPEN_VISIT_SETTLEMENT = "coolink:open-visit-settlement";

/** Moving a visit keeps its existing duration; explicit end edits remain independent. */
export function shiftedSessionRange(startsAt: Date | string, endsAt: Date | string, nextStart: string) {
  const start = new Date(startsAt).getTime(), end = new Date(endsAt).getTime(), next = new Date(nextStart).getTime();
  if (![start, end, next].every(Number.isFinite) || end <= start) return null;
  return { startsAt: new Date(next).toISOString(), endsAt: new Date(next + end - start).toISOString() };
}
