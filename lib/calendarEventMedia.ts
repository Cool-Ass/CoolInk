const MAX_EVENT_IMAGES = 8;

function safeImageUrl(value: unknown) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;
  if (candidate.startsWith("/uploads/") || candidate.startsWith("/api/")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? candidate : null;
  } catch {
    return null;
  }
}

export function normalizeEventImageUrls(value: unknown): string[] {
  let input = value;
  if (typeof value === "string") {
    try { input = JSON.parse(value); } catch { input = []; }
  }
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(safeImageUrl).filter((url): url is string => Boolean(url)))].slice(0, MAX_EVENT_IMAGES);
}

export function serializeEventImageUrls(value: unknown) {
  return JSON.stringify(normalizeEventImageUrls(value));
}
