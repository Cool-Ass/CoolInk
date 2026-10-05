export function inspectorLayout(anchor: { left: number; right: number; top: number; bottom: number }, viewport: { width: number; height: number }, height: number) {
  const margin = 12;
  const width = Math.max(0, Math.min(280, viewport.width - margin * 2));
  const below = viewport.height - anchor.bottom - margin - 6;
  const above = anchor.top - margin - 6;
  const down = below >= Math.min(height, 360) || below >= above;
  const maxHeight = Math.max(0, Math.min(viewport.height - margin * 2, down ? below : above));
  const top = down ? anchor.bottom + 6 : anchor.top - Math.min(height, maxHeight) - 6;
  return { width, maxHeight, left: Math.max(margin, Math.min(anchor.right - width, viewport.width - width - margin)), top: Math.max(margin, Math.min(top, viewport.height - margin - Math.min(height, maxHeight))) };
}
