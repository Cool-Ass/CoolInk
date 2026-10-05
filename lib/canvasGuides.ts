export type CanvasGuide = { id: number; x: number; y: number; angle: number };
export type GuideBounds = { width: number; height: number };
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
export function constrainGuide(guide: CanvasGuide, bounds: GuideBounds): CanvasGuide {
  return { ...guide, x: Math.min(Math.max(0, finite(bounds.width)), Math.max(0, finite(guide.x))), y: Math.min(Math.max(0, finite(bounds.height)), Math.max(0, finite(guide.y))), angle: ((finite(guide.angle) % 360) + 360) % 360 };
}
export function guideLine(guide: CanvasGuide, bounds: GuideBounds) {
  const radians = guide.angle * Math.PI / 180;
  const length = Math.hypot(bounds.width, bounds.height);
  const dx = Math.cos(radians) * length, dy = Math.sin(radians) * length;
  return { x1: guide.x - dx, y1: guide.y - dy, x2: guide.x + dx, y2: guide.y + dy };
}
export function duplicateGuide(guide: CanvasGuide, id: number, bounds: GuideBounds) {
  return constrainGuide({ ...guide, id, x: guide.x + (guide.x + 16 <= bounds.width ? 16 : -16), y: guide.y + (guide.y + 16 <= bounds.height ? 16 : -16) }, bounds);
}
