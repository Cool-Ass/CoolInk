export type SessionEstimate = { estimatedSessionsMin: number | null; estimatedSessionsMax: number | null; sessionPriceCents: number | null };
export function sessionEstimateLabel(project: SessionEstimate) {
  const { estimatedSessionsMin: min, estimatedSessionsMax: max, sessionPriceCents: price } = project;
  if (min == null && max == null) return null;
  return `${min != null && max != null ? min === max ? min : `${min}–${max}` : min != null ? `od ${min}` : `do ${max}`} sesji${price ? ` · ${(price / 100).toLocaleString("pl-PL")} zł / sesję` : ""}`;
}
export function parseSessionEstimate(body: Record<string, unknown>, current: SessionEstimate): SessionEstimate {
  const result: SessionEstimate = { estimatedSessionsMin: current.estimatedSessionsMin, estimatedSessionsMax: current.estimatedSessionsMax, sessionPriceCents: current.sessionPriceCents };
  for (const key of ["estimatedSessionsMin", "estimatedSessionsMax", "sessionPriceCents"] as const) {
    if (!(key in body)) continue;
    const raw = body[key];
    const value = raw === "" || raw === null ? null : typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
    if (value !== null && (!Number.isSafeInteger(value) || value < 1 || value > (key === "sessionPriceCents" ? 100_000_000 : 100))) throw new Error("Podaj 1–100 sesji i poprawną stawkę za sesję.");
    result[key] = value;
  }
  if (result.estimatedSessionsMin !== null && result.estimatedSessionsMax !== null && result.estimatedSessionsMin > result.estimatedSessionsMax) throw new Error("Dolna liczba sesji nie może przekraczać górnej.");
  return result;
}
