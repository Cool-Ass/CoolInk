export const PALETTE_WIDGET_MIME = "application/x-coolink-widget";
export const COLUMN_WIDGET_MIME = "application/x-coolink-column-widget";
export const NAVIGATOR_WIDGET_MIME = "application/x-coolink-navigator-widget";
export const NAVIGATOR_SECTION_MIME = "application/x-coolink-navigator-section";

export interface ColumnDragPayload {
  moduleId: string;
  widgetId: string;
  columnIndex: number;
}

export function readColumnDragPayload(value: string): ColumnDragPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<ColumnDragPayload>;
    if (
      typeof parsed.moduleId !== "string" ||
      typeof parsed.widgetId !== "string" ||
      typeof parsed.columnIndex !== "number"
    ) return null;
    return parsed as ColumnDragPayload;
  } catch {
    return null;
  }
}
