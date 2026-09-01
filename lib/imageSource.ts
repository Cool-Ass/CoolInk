/**
 * Normalizes an optional image URL before it reaches an <img> or next/image.
 * Browsers and Next treat an empty src as the current page URL, so whitespace
 * must be rejected as well as nullish values.
 */
export function imageSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const source = value.trim();
  return source.length > 0 ? source : null;
}
