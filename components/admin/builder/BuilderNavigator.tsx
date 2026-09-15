"use client";

import { useState, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  Columns3,
  GripVertical,
  Layers3,
  X,
} from "lucide-react";
import {
  MODULE_LABELS,
  withDefaults,
  type ColumnWidget,
  type ColumnsModuleData,
  type Module,
} from "@/lib/modules";
import type { BuilderColumnTarget } from "@/lib/builderTree";
import {
  NAVIGATOR_SECTION_MIME,
  NAVIGATOR_WIDGET_MIME,
} from "@/lib/builderDnd";

interface BuilderNavigatorProps {
  modules: Module[];
  selectedId: string | null;
  selectedWidgetId: string | null;
  selectedColumnIndex: number | null;
  selectedColumnOwnerId: string | null;
  onSelectSection: (moduleId: string) => void;
  onSelectWidget: (moduleId: string, widgetId: string) => void;
  onSelectColumn: (moduleId: string, columnIndex: number, ownerId: string) => void;
  onReorderSections: (fromId: string, toId: string) => void;
  onMoveWidget: (widgetId: string, target: BuilderColumnTarget) => void;
  onClose: () => void;
}

function textDetail(widget: ColumnWidget) {
  const candidates = [
    widget.data.text,
    widget.data.title,
    widget.data.label,
    widget.data.heading,
    widget.data.alt,
    widget.data.quote,
  ];
  const value = candidates.find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0,
  );
  if (!value) return "";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 32 ? `${compact.slice(0, 31)}…` : compact;
}

export default function BuilderNavigator({
  modules,
  selectedId,
  selectedWidgetId,
  selectedColumnIndex,
  selectedColumnOwnerId,
  onSelectSection,
  onSelectWidget,
  onSelectColumn,
  onReorderSections,
  onMoveWidget,
  onClose,
}: BuilderNavigatorProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  function toggle(key: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function widgetDragOver(event: DragEvent<HTMLElement>, key: string) {
    if (!event.dataTransfer.types.includes(NAVIGATOR_WIDGET_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(key);
  }

  function dropWidget(event: DragEvent<HTMLElement>, target: BuilderColumnTarget) {
    const widgetId = event.dataTransfer.getData(NAVIGATOR_WIDGET_MIME);
    if (!widgetId) return;
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);
    onMoveWidget(widgetId, target);
  }

  function renderContainer(
    moduleId: string,
    ownerId: string,
    data: ColumnsModuleData,
    depth: number,
  ) {
    return data.columns.map((widgets, columnIndex) => {
      const columnKey = `column:${ownerId}:${columnIndex}`;
      const columnSelected =
        selectedId === moduleId &&
        selectedColumnOwnerId === ownerId &&
        selectedColumnIndex === columnIndex &&
        !selectedWidgetId;
      return (
        <div key={columnKey}>
          <div
            onDragOver={(event) => widgetDragOver(event, columnKey)}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
            }}
            onDrop={(event) =>
              dropWidget(event, { moduleId, ownerId, columnIndex })
            }
            className={`flex items-center border-l-2 transition-colors ${
              dropTarget === columnKey
                ? "border-ink-gold bg-ink-gold/15"
                : columnSelected
                  ? "border-ink-gold bg-ink-gold/10"
                  : "border-transparent hover:bg-white/[0.035]"
            }`}
            style={{ paddingLeft: `${Math.min(10 + depth * 14, 66)}px` }}
          >
            <button
              type="button"
              onClick={() => toggle(columnKey)}
              aria-label={collapsed.has(columnKey) ? `Rozwiń kolumnę ${columnIndex + 1}` : `Zwiń kolumnę ${columnIndex + 1}`}
              className="flex h-8 w-7 shrink-0 items-center justify-center text-ink-grey hover:text-ink-gold"
            >
              {collapsed.has(columnKey) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onSelectColumn(moduleId, columnIndex, ownerId)}
              className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-[12px] text-ink-grey hover:text-ink-white"
            >
              <Columns3 className="h-3.5 w-3.5 shrink-0 text-ink-gold/70" />
              <span className="truncate">Kolumna {columnIndex + 1}</span>
              <span className="ml-auto shrink-0 text-[10px] text-ink-grey/60">{widgets.length}</span>
            </button>
          </div>

          {!collapsed.has(columnKey) && widgets.map((widget, widgetIndex) => {
            const widgetKey = `widget:${widget.id}`;
            const widgetSelected = selectedId === moduleId && selectedWidgetId === widget.id;
            const isInner = widget.type === "innerSection";
            const nested = isInner ? withDefaults("innerSection", widget.data) : null;
            return (
              <div key={widget.id}>
                <div
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.setData(NAVIGATOR_WIDGET_MIME, widget.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDropTarget(null)}
                  onDragOver={(event) => widgetDragOver(event, widgetKey)}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
                  }}
                  onDrop={(event) =>
                    dropWidget(event, { moduleId, ownerId, columnIndex, beforeIndex: widgetIndex })
                  }
                  className={`flex items-center border-l-2 transition-colors ${
                    dropTarget === widgetKey
                      ? "border-ink-gold bg-ink-gold/15"
                      : widgetSelected
                        ? "border-ink-gold bg-ink-gold/10 text-ink-gold"
                        : "border-transparent text-ink-grey hover:bg-white/[0.035] hover:text-ink-white"
                  }`}
                  style={{ paddingLeft: `${Math.min(24 + depth * 14, 80)}px` }}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink-grey/50" />
                  {isInner ? (
                    <button
                      type="button"
                      onClick={() => toggle(widgetKey)}
                      aria-label={collapsed.has(widgetKey) ? "Rozwiń sekcję wewnętrzną" : "Zwiń sekcję wewnętrzną"}
                      className="flex h-8 w-7 shrink-0 items-center justify-center hover:text-ink-gold"
                    >
                      {collapsed.has(widgetKey) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  ) : <span className="w-2 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => onSelectWidget(moduleId, widget.id)}
                    className="min-w-0 flex-1 py-2 pr-2 text-left"
                  >
                    <span className="block truncate text-[12px]">{MODULE_LABELS[widget.type]}</span>
                    {textDetail(widget) && <span className="block truncate text-[10px] text-ink-grey/60">{textDetail(widget)}</span>}
                  </button>
                </div>
                {nested && !collapsed.has(widgetKey) && renderContainer(moduleId, widget.id, nested, depth + 1)}
              </div>
            );
          })}
        </div>
      );
    });
  }

  return (
    <aside
      data-lenis-prevent
      aria-label="Nawigator struktury strony"
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
      className="builder-floating-panel fixed bottom-2 right-2 top-44 z-[140] flex min-h-0 w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden border border-white/20 bg-[#151618]/[0.98] shadow-2xl shadow-black/70 backdrop-blur-xl sm:bottom-4 sm:right-4 sm:top-36 sm:w-[min(22rem,calc(100vw-2rem))] lg:top-28 2xl:top-20"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ink-white">
            <Layers3 className="h-4 w-4 text-ink-gold" />
            NAWIGATOR
          </div>
          <p className="mt-1 text-[11px] text-ink-grey">Sekcje, kolumny i widgety</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Zamknij nawigator" className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/20 text-white/60 hover:border-ink-gold hover:text-ink-gold">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-2 [scrollbar-gutter:stable]">
        {modules.map((module, index) => {
          const sectionKey = `section:${module.id}`;
          const sectionSelected = selectedId === module.id && !selectedWidgetId && selectedColumnIndex === null;
          const data = module.type === "columns" ? withDefaults("columns", module.data) : null;
          return (
            <div key={module.id}>
              <div
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(NAVIGATOR_SECTION_MIME, module.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(NAVIGATOR_SECTION_MIME)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(sectionKey);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
                }}
                onDrop={(event) => {
                  const fromId = event.dataTransfer.getData(NAVIGATOR_SECTION_MIME);
                  if (!fromId) return;
                  event.preventDefault();
                  setDropTarget(null);
                  if (fromId !== module.id) onReorderSections(fromId, module.id);
                }}
                onDragEnd={() => setDropTarget(null)}
                className={`flex items-center border-l-2 ${
                  dropTarget === sectionKey
                    ? "border-ink-gold bg-ink-gold/15"
                    : sectionSelected
                      ? "border-ink-gold bg-ink-gold/10"
                      : "border-transparent hover:bg-white/[0.045]"
                } ${module.hidden ? "opacity-50" : ""}`}
              >
                <GripVertical className="ml-2 h-4 w-4 shrink-0 cursor-grab text-ink-grey/50" />
                {data ? (
                  <button type="button" onClick={() => toggle(sectionKey)} aria-label={collapsed.has(sectionKey) ? `Rozwiń sekcję ${index + 1}` : `Zwiń sekcję ${index + 1}`} className="flex h-10 w-8 shrink-0 items-center justify-center text-ink-grey hover:text-ink-gold">
                    {collapsed.has(sectionKey) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                ) : <span className="w-8 shrink-0" />}
                <button type="button" onClick={() => onSelectSection(module.id)} className="min-w-0 flex-1 py-3 pr-3 text-left">
                  <span className="block truncate text-[12px] font-medium text-ink-white">{index + 1}. {MODULE_LABELS[module.type]}</span>
                  <span className="block truncate text-[10px] text-ink-grey/60">{data ? `${data.columns.length} ${data.columns.length === 1 ? "kolumna" : "kolumn"}` : module.type}</span>
                </button>
              </div>
              {data && !collapsed.has(sectionKey) && renderContainer(module.id, module.id, data, 0)}
            </div>
          );
        })}
        {modules.length === 0 && <p className="px-4 py-8 text-center text-[12px] text-ink-grey">Strona nie zawiera jeszcze sekcji.</p>}
      </div>

      <p className="border-t border-ink-white/10 px-4 py-3 text-[11px] leading-relaxed text-ink-grey">
        Przeciągnij widget na inną kolumnę lub sekcję. Kliknij element, aby go edytować.
      </p>
    </aside>
  );
}
