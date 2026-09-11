import {
  withDefaults,
  type ColumnWidget,
  type ColumnsModuleData,
  type Module,
} from "./modules";

export interface BuilderColumnTarget {
  moduleId: string;
  ownerId: string;
  columnIndex: number;
  beforeIndex?: number;
}

export interface BuilderWidgetLocation {
  moduleId: string;
  ownerId: string;
  columnIndex: number;
  widgetIndex: number;
  widget: ColumnWidget;
}

function findInColumns(
  columns: ColumnWidget[][],
  moduleId: string,
  ownerId: string,
  widgetId: string,
): BuilderWidgetLocation | null {
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex];
    for (let widgetIndex = 0; widgetIndex < column.length; widgetIndex += 1) {
      const widget = column[widgetIndex];
      if (widget.id === widgetId) {
        return { moduleId, ownerId, columnIndex, widgetIndex, widget };
      }
      if (widget.type === "innerSection") {
        const nested = findInColumns(
          withDefaults("innerSection", widget.data).columns,
          moduleId,
          widget.id,
          widgetId,
        );
        if (nested) return nested;
      }
    }
  }
  return null;
}

export function findBuilderWidgetLocation(
  modules: Module[],
  widgetId: string,
): BuilderWidgetLocation | null {
  for (const pageModule of modules) {
    if (pageModule.type !== "columns") continue;
    const location = findInColumns(
      withDefaults("columns", pageModule.data).columns,
      pageModule.id,
      pageModule.id,
      widgetId,
    );
    if (location) return location;
  }
  return null;
}

function containsContainer(widget: ColumnWidget, ownerId: string): boolean {
  if (widget.type !== "innerSection") return false;
  if (widget.id === ownerId) return true;
  return withDefaults("innerSection", widget.data).columns.some((column) =>
    column.some((nested) => containsContainer(nested, ownerId)),
  );
}

interface RemoveResult {
  columns: ColumnWidget[][];
  widget: ColumnWidget | null;
}

function removeFromColumns(
  columns: ColumnWidget[][],
  widgetId: string,
): RemoveResult {
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const widgetIndex = columns[columnIndex].findIndex(
      (widget) => widget.id === widgetId,
    );
    if (widgetIndex >= 0) {
      const next = columns.map((column) => [...column]);
      const [widget] = next[columnIndex].splice(widgetIndex, 1);
      return { columns: next, widget };
    }

    for (let nestedIndex = 0; nestedIndex < columns[columnIndex].length; nestedIndex += 1) {
      const widget = columns[columnIndex][nestedIndex];
      if (widget.type !== "innerSection") continue;
      const data = withDefaults("innerSection", widget.data);
      const nested = removeFromColumns(data.columns, widgetId);
      if (!nested.widget) continue;

      const next = columns.map((column) => [...column]);
      next[columnIndex][nestedIndex] = {
        ...widget,
        data: { ...data, columns: nested.columns },
      };
      return { columns: next, widget: nested.widget };
    }
  }
  return { columns, widget: null };
}

interface InsertResult {
  data: ColumnsModuleData;
  inserted: boolean;
}

function insertIntoContainer(
  data: ColumnsModuleData,
  rootOwnerId: string,
  target: BuilderColumnTarget,
  widget: ColumnWidget,
): InsertResult {
  if (target.ownerId === rootOwnerId) {
    if (target.columnIndex < 0 || target.columnIndex >= data.columns.length) {
      return { data, inserted: false };
    }
    const columns = data.columns.map((column) => [...column]);
    const beforeIndex = Math.min(
      columns[target.columnIndex].length,
      Math.max(0, target.beforeIndex ?? columns[target.columnIndex].length),
    );
    columns[target.columnIndex].splice(beforeIndex, 0, widget);
    return { data: { ...data, columns }, inserted: true };
  }

  for (let columnIndex = 0; columnIndex < data.columns.length; columnIndex += 1) {
    for (let widgetIndex = 0; widgetIndex < data.columns[columnIndex].length; widgetIndex += 1) {
      const current = data.columns[columnIndex][widgetIndex];
      if (current.type !== "innerSection") continue;
      const nestedData = withDefaults("innerSection", current.data);
      const nested = insertIntoContainer(nestedData, current.id, target, widget);
      if (!nested.inserted) continue;

      const columns = data.columns.map((column) => [...column]);
      columns[columnIndex][widgetIndex] = {
        ...current,
        data: nested.data,
      };
      return { data: { ...data, columns }, inserted: true };
    }
  }

  return { data, inserted: false };
}

/** Moves one widget between any root or nested builder columns. */
export function moveBuilderWidget(
  modules: Module[],
  widgetId: string,
  target: BuilderColumnTarget,
): Module[] {
  const source = findBuilderWidgetLocation(modules, widgetId);
  if (!source) return modules;

  const destinationModule = modules.find(
    (pageModule) => pageModule.id === target.moduleId && pageModule.type === "columns",
  );
  if (!destinationModule) return modules;

  if (containsContainer(source.widget, target.ownerId)) return modules;

  let beforeIndex = target.beforeIndex;
  if (
    source.moduleId === target.moduleId &&
    source.ownerId === target.ownerId &&
    source.columnIndex === target.columnIndex &&
    beforeIndex !== undefined &&
    source.widgetIndex < beforeIndex
  ) {
    beforeIndex -= 1;
  }

  if (
    source.moduleId === target.moduleId &&
    source.ownerId === target.ownerId &&
    source.columnIndex === target.columnIndex &&
    beforeIndex === source.widgetIndex
  ) {
    return modules;
  }

  let movedWidget: ColumnWidget | null = null;
  const withoutSource = modules.map((pageModule) => {
    if (pageModule.id !== source.moduleId || pageModule.type !== "columns") return pageModule;
    const data = withDefaults("columns", pageModule.data);
    const removed = removeFromColumns(data.columns, widgetId);
    movedWidget = removed.widget;
    return removed.widget
      ? { ...pageModule, data: { ...data, columns: removed.columns } }
      : pageModule;
  });

  if (!movedWidget) return modules;

  let inserted = false;
  const moved = withoutSource.map((pageModule) => {
    if (pageModule.id !== target.moduleId || pageModule.type !== "columns") return pageModule;
    const data = withDefaults("columns", pageModule.data);
    const result = insertIntoContainer(
      data,
      pageModule.id,
      { ...target, beforeIndex },
      movedWidget as ColumnWidget,
    );
    inserted = result.inserted;
    return result.inserted ? { ...pageModule, data: result.data } : pageModule;
  });

  return inserted ? moved : modules;
}
