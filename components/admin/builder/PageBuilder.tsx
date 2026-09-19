"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Blocks, ChevronLeft, ChevronRight, GripVertical, Grid3X3, Plus, Ruler, Save, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import ModuleRenderer, { type ModuleRendererGlobals } from "@/components/ModuleRenderer";
import BuilderTopBar, { type DeviceMode } from "@/components/admin/builder/BuilderTopBar";
import BuilderNavigator from "@/components/admin/builder/BuilderNavigator";
import PageVersionsPanel from "@/components/admin/builder/PageVersionsPanel";
import AddModulePicker from "@/components/admin/builder/AddModulePicker";
import ModuleSettingsSidebar from "@/components/admin/builder/ModuleSettingsSidebar";
import PageSettingsModal, {
  type PageSettingsValues,
} from "@/components/admin/builder/PageSettingsModal";
import { useToast } from "@/components/admin/ToastProvider";
import { cloneBuilderModule, cloneColumnWidget, createModule, isColumnWidgetType, MODULE_LABELS, withDefaults, type ColumnsModuleData, type ColumnWidget, type Module, type ModuleStyle, type ModuleType } from "@/lib/modules";
import { PALETTE_WIDGET_MIME } from "@/lib/builderDnd";
import { moveBuilderWidget, type BuilderColumnTarget } from "@/lib/builderTree";
import type { PortfolioWork } from "@/lib/portfolio";
import { siteThemeStyle } from "@/lib/siteTheme";
import { isSystemPageSlug } from "@/lib/systemPages";
import { auditBuilderPage } from "@/lib/builderAudit";

const COLUMN_LAYOUTS = ["one", "two", "three", "four", "five", "six", "seven", "eight"] as const;

function findWidget(columns: ColumnWidget[][], widgetId: string): ColumnWidget | null {
  for (const column of columns) for (const widget of column) {
    if (widget.id === widgetId) return widget;
    if (widget.type === "innerSection") {
      const match = findWidget(withDefaults("innerSection", widget.data).columns, widgetId);
      if (match) return match;
    }
  }
  return null;
}

function updateWidgetTree(columns: ColumnWidget[][], widgetId: string, update: (widget: ColumnWidget) => ColumnWidget): ColumnWidget[][] {
  return columns.map((column) => column.map((widget) => {
    if (widget.id === widgetId) return update(widget);
    if (widget.type !== "innerSection") return widget;
    const data = withDefaults("innerSection", widget.data);
    return { ...widget, data: { ...data, columns: updateWidgetTree(data.columns, widgetId, update) } };
  }));
}

function removeWidgetTree(columns: ColumnWidget[][], widgetId: string): ColumnWidget[][] {
  return columns.map((column) => column.filter((widget) => widget.id !== widgetId).map((widget) => {
    if (widget.type !== "innerSection") return widget;
    const data = withDefaults("innerSection", widget.data);
    return { ...widget, data: { ...data, columns: removeWidgetTree(data.columns, widgetId) } };
  }));
}

function duplicateWidgetTree(columns: ColumnWidget[][], widgetId: string): { columns: ColumnWidget[][]; clone: ColumnWidget | null } {
  let clone: ColumnWidget | null = null;
  const next = columns.map((column) => {
    const result: ColumnWidget[] = [];
    for (const widget of column) {
      result.push(widget);
      if (widget.id === widgetId) { clone = cloneColumnWidget(widget); result.push(clone); continue; }
      if (widget.type === "innerSection") {
        const data = withDefaults("innerSection", widget.data);
        const nested = duplicateWidgetTree(data.columns, widgetId);
        if (nested.clone) { clone = nested.clone; result[result.length - 1] = { ...widget, data: { ...data, columns: nested.columns } }; }
      }
    }
    return result;
  });
  return { columns: next, clone };
}

function getContainerData(root: ColumnsModuleData, rootId: string, ownerId: string | null): ColumnsModuleData | null {
  if (!ownerId || ownerId === rootId) return root;
  const owner = findWidget(root.columns, ownerId);
  return owner?.type === "innerSection" ? withDefaults("innerSection", owner.data) : null;
}

function updateContainerData(root: ColumnsModuleData, rootId: string, ownerId: string, update: (data: ColumnsModuleData) => ColumnsModuleData): ColumnsModuleData {
  if (ownerId === rootId) return update(root);
  return { ...root, columns: updateWidgetTree(root.columns, ownerId, (widget) => widget.type === "innerSection" ? { ...widget, data: update(withDefaults("innerSection", widget.data)) } : widget) };
}

export interface BuilderPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  modules: Module[];
  status: string;
  isHomepage: boolean;
  showInNav: boolean;
  navOrder: number;
}

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

interface CanvasGuide { id: number; axis: "x" | "y"; position: number }

interface ReusableBlock { id: string; name: string; module: Module }
const REUSABLE_BLOCKS_KEY = "coolink-builder-reusable-blocks-v1";
const SIDEBAR_PREFS_KEY = "coolink-builder-sidebar-v1";

function createBuilderEntry(type: ModuleType) {
  if (!isColumnWidgetType(type)) return { module: createModule(type), widgetId: null as string | null };
  const widget = createModule(type);
  const section = createModule("columns");
  section.data = { ...withDefaults("columns", section.data), columns: [[{ id: widget.id, type, data: widget.data }]] };
  return { module: section, widgetId: widget.id };
}

export default function PageBuilder({
  page: initialPage,
  portfolioItems,
  globals,
}: {
  page: BuilderPage;
  portfolioItems: PortfolioWork[];
  globals: ModuleRendererGlobals;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [page, setPage] = useState(initialPage);
  const [modules, setModulesState] = useState<Module[]>(initialPage.modules ?? []);
  const [undoHistory, setUndoHistory] = useState<Module[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Module[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [selectedColumnOwnerId, setSelectedColumnOwnerId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewExitRef = useRef<HTMLButtonElement>(null);
  const [lastSavedSignature, setLastSavedSignature] = useState(() => JSON.stringify(initialPage.modules ?? []));
  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [autosaveError, setAutosaveError] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [snapSize, setSnapSize] = useState(8);
  const [guides, setGuides] = useState<CanvasGuide[]>([
    { id: 1, axis: "x", position: 50 },
    { id: 2, axis: "y", position: 50 },
  ]);
  const guideIdRef = useRef(2);
  const [reusableBlocks, setReusableBlocks] = useState<ReusableBlock[]>([]);
  const [selectedReusableBlock, setSelectedReusableBlock] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(304);
  const [sidebarPrefsLoaded, setSidebarPrefsLoaded] = useState(false);
  const isSystemPage = isSystemPageSlug(page.slug);
  const dirty = JSON.stringify(modules) !== lastSavedSignature;
  const auditIssues = useMemo(() => auditBuilderPage(modules), [modules]);

  const initialModulesRef = useRef(initialPage.modules ?? []);
  const modulesRef = useRef(modules);
  const lastSavedRef = useRef(JSON.stringify(initialPage.modules ?? []));
  const patchQueueRef = useRef<Promise<void>>(Promise.resolve());
  const recoveryCheckedRef = useRef(false);
  const skipDraftSyncRef = useRef(false);
  const localDraftKey = `coolink-builder-draft:${initialPage.id}`;

  useEffect(() => {
    let cancelled = false;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(REUSABLE_BLOCKS_KEY) ?? "[]");
      if (Array.isArray(parsed)) queueMicrotask(() => { if (!cancelled) setReusableBlocks(parsed.slice(0, 50)); });
    } catch { /* optional browser library */ }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stored: { open?: boolean; width?: number } | null = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(SIDEBAR_PREFS_KEY) ?? "null") as { open?: boolean; width?: number } | null;
    } catch { /* optional builder preference */ }
    queueMicrotask(() => {
      if (cancelled) return;
      if (typeof stored?.open === "boolean") setSidebarOpen(stored.open);
      if (typeof stored?.width === "number") setSidebarWidth(Math.min(460, Math.max(264, stored.width)));
      setSidebarPrefsLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sidebarPrefsLoaded) return;
    try { window.localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify({ open: sidebarOpen, width: sidebarWidth })); } catch { /* optional builder preference */ }
  }, [sidebarOpen, sidebarPrefsLoaded, sidebarWidth]);

  const saveLocalDraft = useCallback((current: Module[], base: string) => {
    try {
      window.localStorage.setItem(localDraftKey, JSON.stringify({ base, modules: current, savedAt: Date.now() }));
    } catch {
      // Server autosave remains the primary protection when browser storage is unavailable.
    }
  }, [localDraftKey]);

  const markSnapshotSaved = useCallback((snapshot: Module[]) => {
    const serialized = JSON.stringify(snapshot);
    lastSavedRef.current = serialized;
    const current = modulesRef.current;
    const currentSerialized = JSON.stringify(current);
    const hasNewerChanges = currentSerialized !== serialized;
    setLastSavedSignature(serialized);
    setLastSavedAt(new Date());
    setAutosaveError(false);
    try {
      if (hasNewerChanges) saveLocalDraft(current, serialized);
      else window.localStorage.removeItem(localDraftKey);
    } catch {
      // Saving to the server already succeeded.
    }
  }, [localDraftKey, saveLocalDraft]);

  function setModules(update: Module[] | ((current: Module[]) => Module[])) {
    const currentModules = modulesRef.current;
    const next = typeof update === "function" ? update(currentModules) : update;
    if (next === currentModules || JSON.stringify(next) === JSON.stringify(currentModules)) return;
    setUndoHistory((current) => [...current.slice(-49), currentModules]);
    setRedoHistory([]);
    modulesRef.current = next;
    setModulesState(next);
    setAutosaveError(false);
  }

  const handleUndo = useCallback(() => {
    const previous = undoHistory.at(-1);
    if (!previous) return;
    setUndoHistory((current) => current.slice(0, -1));
    setRedoHistory((current) => [...current.slice(-49), modules]);
    modulesRef.current = previous;
    setModulesState(previous);
    setAutosaveError(false);
  }, [modules, undoHistory]);

  const handleRedo = useCallback(() => {
    const next = redoHistory.at(-1);
    if (!next) return;
    setRedoHistory((current) => current.slice(0, -1));
    setUndoHistory((current) => [...current.slice(-49), modules]);
    modulesRef.current = next;
    setModulesState(next);
    setAutosaveError(false);
  }, [modules, redoHistory]);

  useEffect(() => {
    if (recoveryCheckedRef.current) return;
    recoveryCheckedRef.current = true;
    let recovered: Module[] | null = null;
    try {
      const raw = window.localStorage.getItem(localDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { base?: unknown; modules?: unknown };
      if (
        draft.base !== lastSavedRef.current ||
        !Array.isArray(draft.modules) ||
        JSON.stringify(draft.modules).length > 250_000
      ) {
        window.localStorage.removeItem(localDraftKey);
        return;
      }
      recovered = draft.modules as Module[];
      if (JSON.stringify(recovered) === lastSavedRef.current) {
        window.localStorage.removeItem(localDraftKey);
        return;
      }
    } catch {
      window.localStorage.removeItem(localDraftKey);
      return;
    }

    skipDraftSyncRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      modulesRef.current = recovered as Module[];
      setModulesState(recovered as Module[]);
      setUndoHistory([initialModulesRef.current]);
      setAutosaveError(false);
      showToast("Odzyskano niezapisane zmiany z tej przeglądarki.");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [localDraftKey, showToast]);

  useEffect(() => {
    modulesRef.current = modules;
    if (skipDraftSyncRef.current) {
      skipDraftSyncRef.current = false;
      return;
    }
    const serialized = JSON.stringify(modules);
    const hasChanges = serialized !== lastSavedRef.current;
    try {
      if (hasChanges) saveLocalDraft(modules, lastSavedRef.current);
      else window.localStorage.removeItem(localDraftKey);
    } catch {
      // Local recovery is optional; the server autosave still runs.
    }
  }, [localDraftKey, modules, saveLocalDraft]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    function keyboardHistory(event: KeyboardEvent) {
      if (previewOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) handleRedo();
      else handleUndo();
    }
    window.addEventListener("keydown", keyboardHistory);
    return () => window.removeEventListener("keydown", keyboardHistory);
  }, [handleRedo, handleUndo, previewOpen]);

  useEffect(() => {
    function keyboardSidebar(event: KeyboardEvent) {
      if (previewOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "p") return;
      event.preventDefault();
      setSidebarOpen((open) => !open);
    }
    window.addEventListener("keydown", keyboardSidebar);
    return () => window.removeEventListener("keydown", keyboardSidebar);
  }, [previewOpen]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    requestAnimationFrame(() => document.getElementById("builder-preview-button")?.focus());
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    previewExitRef.current?.focus();
    function exitOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) closePreview();
    }
    window.addEventListener("keydown", exitOnEscape);
    return () => window.removeEventListener("keydown", exitOnEscape);
  }, [previewOpen, closePreview]);

  function startSidebarResize(event: React.PointerEvent<HTMLDivElement>) {
    if (!sidebarOpen) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const resize = (moveEvent: PointerEvent) => {
      const max = Math.min(460, Math.max(304, window.innerWidth * 0.65));
      setSidebarWidth(Math.min(max, Math.max(264, startWidth + moveEvent.clientX - startX)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stop, { once: true });
  }

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;
  const selectedWidget = selectedModule?.type === "columns" && selectedWidgetId
    ? findWidget(withDefaults("columns", selectedModule.data).columns, selectedWidgetId)
    : null;
  const selectedColumnData = selectedModule?.type === "columns" && selectedColumnIndex !== null
    ? getContainerData(withDefaults("columns", selectedModule.data), selectedModule.id, selectedColumnOwnerId)
    : null;
  const selectedColumnStyle = selectedColumnData && selectedColumnIndex !== null ? selectedColumnData.columnStyles?.[selectedColumnIndex] ?? {} : null;
  const activeEditorModule = selectedWidget
    ? ({ ...selectedWidget, hidden: false } as Module)
    : selectedColumnData && selectedColumnIndex !== null
      ? ({ id: `${selectedModule?.id}:column:${selectedColumnIndex}`, type: "columns", hidden: false, data: {}, style: selectedColumnStyle ?? {} } as Module)
      : selectedModule;

  function updateModule(id: string, data: Record<string, unknown>) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, data } : m)));
  }

  function updateModuleStyle(id: string, style: ModuleStyle) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, style } : m)));
  }

  function updateColumns(moduleId: string, columns: ColumnWidget[][]) {
    setModules((prev) => prev.map((module) => module.id === moduleId ? { ...module, data: { ...withDefaults("columns", module.data), columns } } : module));
  }

  function updateSelectedWidget(patch: Partial<Pick<ColumnWidget, "data" | "style">>) {
    if (!selectedModule || selectedModule.type !== "columns" || !selectedWidgetId) return;
    const data = withDefaults("columns", selectedModule.data);
    updateColumns(selectedModule.id, updateWidgetTree(data.columns, selectedWidgetId, (widget) => ({ ...widget, ...patch })));
  }

  function updateSelectedColumnStyle(style: ModuleStyle) {
    if (!selectedModule || selectedModule.type !== "columns" || selectedColumnIndex === null) return;
    const root = withDefaults("columns", selectedModule.data); const ownerId = selectedColumnOwnerId ?? selectedModule.id;
    const data = updateContainerData(root, selectedModule.id, ownerId, (container) => ({ ...container, columnStyles: Array.from({ length: container.columns.length }, (_, index) => index === selectedColumnIndex ? style : container.columnStyles?.[index] ?? {}) }));
    setModules((current) => current.map((module) => module.id === selectedModule.id ? { ...module, data } : module));
  }

  function updateSelectedColumnWidth(width: number) {
    if (!selectedModule || selectedModule.type !== "columns" || selectedColumnIndex === null) return;
    const root = withDefaults("columns", selectedModule.data); const ownerId = selectedColumnOwnerId ?? selectedModule.id;
    const data = updateContainerData(root, selectedModule.id, ownerId, (container) => { const fallback = 100 / Math.max(1, container.columns.length); return { ...container, columnWidths: Array.from({ length: container.columns.length }, (_, index) => index === selectedColumnIndex ? Math.min(100, Math.max(5, width)) : container.columnWidths?.[index] ?? fallback) }; });
    setModules((current) => current.map((module) => module.id === selectedModule.id ? { ...module, data } : module));
  }

  function resizeWidget(moduleId: string, widgetId: string, style: ModuleStyle) {
    const target = modules.find((module) => module.id === moduleId);
    if (!target || target.type !== "columns") return;
    const data = withDefaults("columns", target.data);
    updateColumns(moduleId, updateWidgetTree(data.columns, widgetId, (widget) => ({ ...widget, style })));
  }

  function resizeColumn(moduleId: string, columnIndex: number, ownerId: string, style: ModuleStyle) {
    const target = modules.find((module) => module.id === moduleId);
    if (!target || target.type !== "columns") return;
    const root = withDefaults("columns", target.data);
    const data = updateContainerData(root, moduleId, ownerId, (container) => ({ ...container, columnStyles: Array.from({ length: container.columns.length }, (_, index) => index === columnIndex ? style : container.columnStyles?.[index] ?? {}) }));
    setModules((current) => current.map((module) => module.id === moduleId ? { ...module, data } : module));
  }

  function moveModule(id: string, direction: "up" | "down") {
    setModules((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  function reorderModules(fromId: string, toId: string) {
    setModules((prev) => {
      const fromIndex = prev.findIndex((m) => m.id === fromId);
      const toIndex = prev.findIndex((m) => m.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function duplicateModule(id: string) {
    setModules((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index === -1) return prev;
      const clone = cloneBuilderModule(prev[index]);
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  }

  function deleteModule(id: string) {
    if (isSystemPage && modules.length === 1) { showToast("Chronionego elementu systemowego nie można usunąć.", "error"); return; }
    if (!window.confirm("Usunąć ten moduł? Tej operacji nie można cofnąć po zapisaniu.")) return;
    setModules((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) { setSelectedId(null); setSelectedWidgetId(null); setSelectedColumnIndex(null); setSelectedColumnOwnerId(null); }
  }

  function toggleHidden(id: string) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m)));
  }

  function addModule(type: ModuleType) {
    const { module: newModule, widgetId } = createBuilderEntry(type);
    setModules((prev) => {
      const index = prev.findIndex((m) => m.id === selectedId);
      if (index === -1) return [...prev, newModule];
      const next = [...prev];
      next.splice(index + 1, 0, newModule);
      return next;
    });
    setSelectedId(newModule.id);
    setSelectedWidgetId(widgetId);
    setSelectedColumnIndex(null);
    setSelectedColumnOwnerId(null);
  }

  function persistReusableBlocks(next: ReusableBlock[]) {
    const bounded = next.slice(-50);
    setReusableBlocks(bounded);
    try { window.localStorage.setItem(REUSABLE_BLOCKS_KEY, JSON.stringify(bounded)); } catch { showToast("Nie udało się zapisać biblioteki w tej przeglądarce.", "error"); }
  }

  function saveReusableBlock() {
    if (!selectedModule) { showToast("Najpierw wybierz sekcję.", "error"); return; }
    const name = window.prompt("Nazwa bloku wielorazowego", MODULE_LABELS[selectedModule.type]);
    if (!name?.trim()) return;
    const block = { id: crypto.randomUUID(), name: name.trim().slice(0, 80), module: structuredClone(selectedModule) };
    persistReusableBlocks([...reusableBlocks, block]);
    setSelectedReusableBlock(block.id);
    showToast("Blok dodano do biblioteki.");
  }

  function insertReusableBlock() {
    const saved = reusableBlocks.find((block) => block.id === selectedReusableBlock);
    if (!saved) return;
    const clone = cloneBuilderModule(saved.module);
    setModules((current) => {
      const index = current.findIndex((module) => module.id === selectedId);
      const next = [...current];
      next.splice(index < 0 ? next.length : index + 1, 0, clone);
      return next;
    });
    setSelectedId(clone.id); setSelectedWidgetId(null); setSelectedColumnIndex(null); setSelectedColumnOwnerId(null);
  }

  function deleteReusableBlock() {
    if (!selectedReusableBlock) return;
    persistReusableBlocks(reusableBlocks.filter((block) => block.id !== selectedReusableBlock));
    setSelectedReusableBlock("");
  }

  function duplicateWidget(moduleId: string, widgetId: string, columnIndex: number) {
    const target = modules.find((module) => module.id === moduleId);
    if (!target || target.type !== "columns") return;
    const data = withDefaults("columns", target.data);
    const result = duplicateWidgetTree(data.columns, widgetId);
    if (!result.clone) return;
    updateColumns(moduleId, result.columns);
    setSelectedId(moduleId);
    setSelectedWidgetId(result.clone.id);
    setSelectedColumnIndex(null);
    setSelectedColumnOwnerId(null);
  }

  function duplicateColumn(moduleId: string, columnIndex: number, ownerId: string) {
    const target = modules.find((module) => module.id === moduleId);
    if (!target || target.type !== "columns") return;
    const root = withDefaults("columns", target.data);
    const container = getContainerData(root, moduleId, ownerId);
    if (!container) return;
    if (container.columns.length >= 8) {
      showToast("Sekcja może mieć maksymalnie 8 kolumn.", "error");
      return;
    }
    const columns = container.columns.map((column) => [...column]);
    const clone = (columns[columnIndex] ?? []).map(cloneColumnWidget);
    columns.splice(columnIndex + 1, 0, clone);
    const columnStyles = Array.from({ length: container.columns.length }, (_, index) => ({ ...(container.columnStyles?.[index] ?? {}) }));
    columnStyles.splice(columnIndex + 1, 0, { ...(container.columnStyles?.[columnIndex] ?? {}) });
    const layout = COLUMN_LAYOUTS[columns.length - 1];
    const evenWidth = Math.round((100 / columns.length) * 100) / 100;
    setModules((current) => current.map((module) => module.id === moduleId ? {
      ...module,
      data: updateContainerData(root, moduleId, ownerId, (data) => ({ ...data, layout, columns, columnWidths: Array(columns.length).fill(evenWidth), columnStyles })),
    } : module));
    setSelectedId(moduleId);
    setSelectedWidgetId(null);
    setSelectedColumnIndex(columnIndex + 1);
    setSelectedColumnOwnerId(ownerId);
  }

  function deleteColumn(moduleId: string, columnIndex: number, ownerId: string) {
    const target = modules.find((module) => module.id === moduleId);
    if (!target || target.type !== "columns") return;
    const root = withDefaults("columns", target.data); const container = getContainerData(root, moduleId, ownerId);
    if (!container || container.columns.length <= 1) { showToast("Sekcja musi zawierać co najmniej jedną kolumnę.", "error"); return; }
    const widgets = container.columns[columnIndex] ?? [];
    if (widgets.length && !window.confirm(`Usunąć kolumnę wraz z ${widgets.length} ${widgets.length === 1 ? "widgetem" : "widgetami"}?`)) return;
    const columns = container.columns.filter((_, index) => index !== columnIndex);
    const columnStyles = container.columnStyles?.filter((_, index) => index !== columnIndex) ?? [];
    const layout = COLUMN_LAYOUTS[columns.length - 1]; const evenWidth = Math.round((100 / columns.length) * 100) / 100;
    const data = updateContainerData(root, moduleId, ownerId, (current) => ({ ...current, layout, columns, columnStyles, columnWidths: Array(columns.length).fill(evenWidth) }));
    setModules((current) => current.map((module) => module.id === moduleId ? { ...module, data } : module));
    setSelectedWidgetId(null); setSelectedColumnIndex(Math.min(columnIndex, columns.length - 1)); setSelectedColumnOwnerId(ownerId);
  }

  function dropOnCanvas(event: DragEvent<HTMLDivElement>) {
    const type = event.dataTransfer.getData(PALETTE_WIDGET_MIME) as ModuleType;
    if (!type) return;
    event.preventDefault();
    const { module: newModule, widgetId } = createBuilderEntry(type);
    setModules((current) => [...current, newModule]);
    setSelectedId(newModule.id);
    setSelectedWidgetId(widgetId);
    setSelectedColumnIndex(null);
    setSelectedColumnOwnerId(null);
  }

  const patchPage = useCallback((body: object): Promise<BuilderPage> => {
    const request = patchQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const res = await fetch(`/api/admin/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Coś poszło nie tak.");
        return data.page as BuilderPage;
      });
    patchQueueRef.current = request.then(() => undefined, () => undefined);
    return request;
  }, [page.id]);

  useEffect(() => {
    if (!dirty || saving || publishing || autosaveError) return;
    const timer = window.setTimeout(async () => {
      const snapshot = modulesRef.current;
      setSaving(true);
      try {
        const updated = await patchPage({ modules: snapshot });
        setPage((current) => ({ ...current, status: updated.status }));
        markSnapshotSaved(snapshot);
      } catch {
        setAutosaveError(true);
      } finally {
        setSaving(false);
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [autosaveError, dirty, markSnapshotSaved, patchPage, publishing, saving]);

  async function handleSaveDraft() {
    const snapshot = modulesRef.current;
    setSaving(true);
    setAutosaveError(false);
    try {
      const updated = await patchPage({ modules: snapshot });
      setPage((p) => ({ ...p, status: updated.status }));
      markSnapshotSaved(snapshot);
      showToast("Wersja robocza zapisana.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    const snapshot = modulesRef.current;
    setPublishing(true);
    try {
      const updated = await patchPage({ modules: snapshot, publish: true });
      setPage((p) => ({ ...p, status: updated.status }));
      markSnapshotSaved(snapshot);
      showToast("Strona opublikowana.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się opublikować.", "error");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!window.confirm("Cofnąć publikację? Strona zniknie z witryny do czasu ponownej publikacji.")) return;
    try {
      const updated = await patchPage({ unpublish: true });
      setPage((p) => ({ ...p, status: updated.status }));
      showToast("Publikację cofnięto.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się cofnąć publikacji.", "error");
    }
  }

  async function handleSaveSettings(values: PageSettingsValues) {
    setSaving(true);
    try {
      const updated = await patchPage(values);
      setPage((p) => ({ ...p, ...updated }));
      showToast("Ustawienia strony zapisane.");
      setSettingsOpen(false);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się zapisać ustawień.", "error");
    } finally {
      setSaving(false);
    }
  }

  function scrollToCanvas(selector: string) {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(selector)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function selectSectionFromNavigator(moduleId: string) {
    setSelectedId(moduleId);
    setSelectedWidgetId(null);
    setSelectedColumnIndex(null);
    setSelectedColumnOwnerId(null);
    scrollToCanvas(`[data-builder-module-id="${CSS.escape(moduleId)}"]`);
  }

  function selectWidgetFromNavigator(moduleId: string, widgetId: string) {
    setSelectedId(moduleId);
    setSelectedWidgetId(widgetId);
    setSelectedColumnIndex(null);
    setSelectedColumnOwnerId(null);
    scrollToCanvas(`[data-builder-widget-id="${CSS.escape(widgetId)}"]`);
  }

  function selectColumnFromNavigator(moduleId: string, columnIndex: number, ownerId: string) {
    setSelectedId(moduleId);
    setSelectedWidgetId(null);
    setSelectedColumnIndex(columnIndex);
    setSelectedColumnOwnerId(ownerId);
    scrollToCanvas(`[data-builder-column-owner="${CSS.escape(ownerId)}"][data-builder-column-index="${columnIndex}"]`);
  }

  function moveWidgetFromNavigator(widgetId: string, target: BuilderColumnTarget) {
    const next = moveBuilderWidget(modulesRef.current, widgetId, target);
    if (next === modulesRef.current) {
      showToast("Nie można przenieść widgetu w to miejsce.", "error");
      return;
    }
    setModules(next);
    setSelectedId(target.moduleId);
    setSelectedWidgetId(widgetId);
    setSelectedColumnIndex(null);
    setSelectedColumnOwnerId(null);
  }

  function restorePublishedRevision(restored: Module[], version: number) {
    const previous = modulesRef.current;
    modulesRef.current = restored;
    setUndoHistory((current) => [...current.slice(-49), previous]);
    setRedoHistory([]);
    setModulesState(restored);
    const restoredSignature = JSON.stringify(restored);
    lastSavedRef.current = restoredSignature;
    setLastSavedSignature(restoredSignature);
    setLastSavedAt(new Date());
    setAutosaveError(false);
    setSelectedId(null);
    setSelectedWidgetId(null);
    setSelectedColumnIndex(null);
    setSelectedColumnOwnerId(null);
    try { window.localStorage.removeItem(localDraftKey); } catch { /* optional recovery cache */ }
    showToast(`Wersja ${version} została przywrócona jako szkic.`);
  }

  function addGuide(axis: CanvasGuide["axis"]) {
    guideIdRef.current += 1;
    const id = guideIdRef.current;
    setGuides((current) => [...current, { id, axis, position: 50 }]);
    setShowGuides(true);
  }

  function updateGuide(id: number, position: number) {
    const safePosition = Math.min(100, Math.max(0, position));
    setGuides((current) => current.map((guide) => guide.id === id ? { ...guide, position: safePosition } : guide));
  }

  if (previewOpen) return (
    <div data-lenis-prevent className="h-[100dvh] overflow-y-auto bg-ink-black">
      <button ref={previewExitRef} type="button" onClick={closePreview} aria-label="Wróć do edytora" title="Wróć do edytora (Esc)" className="fixed bottom-4 right-4 z-[300] rounded-full border border-white/20 bg-black/85 px-3 py-2 text-xs text-white shadow-lg backdrop-blur hover:border-ink-gold hover:text-ink-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold">← Edytor · Esc</button>
      <main className="public-site min-h-full" style={globals.theme ? siteThemeStyle(globals.theme) : undefined}>
        <ModuleRenderer modules={modules} portfolioWorks={portfolioItems} globals={globals} />
      </main>
    </div>
  );

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-ink-black text-ink-white">
      <BuilderTopBar
        title={page.title}
        status={page.status}
        dirty={dirty}
        saving={saving}
        publishing={publishing}
        autosaveError={autosaveError}
        lastSavedLabel={lastSavedAt?.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) ?? null}
        device={device}
        onDeviceChange={setDevice}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onOpenSettings={() => setSettingsOpen(true)}
        canUndo={undoHistory.length > 0}
        canRedo={redoHistory.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        navigatorOpen={navigatorOpen}
        onToggleNavigator={() => { setNavigatorOpen((open) => !open); setVersionsOpen(false); }}
        onPreview={() => setPreviewOpen(true)}
        versionsOpen={versionsOpen}
        onToggleVersions={() => { setVersionsOpen((open) => !open); setNavigatorOpen(false); }}
        isHomepage={page.isHomepage}
        isSystemPage={isSystemPage}
        slug={page.slug}
      />

      {navigatorOpen && (
        <BuilderNavigator
          modules={modules}
          selectedId={selectedId}
          selectedWidgetId={selectedWidgetId}
          selectedColumnIndex={selectedColumnIndex}
          selectedColumnOwnerId={selectedColumnOwnerId}
          onSelectSection={selectSectionFromNavigator}
          onSelectWidget={selectWidgetFromNavigator}
          onSelectColumn={selectColumnFromNavigator}
          onReorderSections={reorderModules}
          onMoveWidget={moveWidgetFromNavigator}
          onClose={() => setNavigatorOpen(false)}
        />
      )}
      {versionsOpen && (
        <PageVersionsPanel
          pageId={page.id}
          restoreBlocked={dirty || saving || publishing}
          onRestore={restorePublishedRevision}
          onClose={() => setVersionsOpen(false)}
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative z-[70] h-full min-h-0 shrink-0" style={{ width: sidebarOpen ? `min(${sidebarWidth}px, 85vw)` : 0 }}>
          <aside
            id="builder-sidebar-panel"
            data-lenis-prevent
            aria-label="Panel narzędzi buildera"
            hidden={!sidebarOpen}
            className="builder-sidebar h-full min-h-0 w-full overflow-hidden border-r border-white/10 bg-[#1d1f22]"
          >
            {activeEditorModule ? (
              <ModuleSettingsSidebar
                key={activeEditorModule.id}
                module={activeEditorModule}
                scope={selectedWidget ? "widget" : selectedColumnIndex !== null ? "column" : "section"}
                editorLabel={selectedColumnIndex !== null && !selectedWidget ? `Edytuj kolumnę ${selectedColumnIndex + 1}` : undefined}
                columnWidth={selectedColumnData && selectedColumnIndex !== null ? selectedColumnData.columnWidths?.[selectedColumnIndex] ?? 100 / Math.max(1, selectedColumnData.columns.length) : undefined}
                onColumnWidthChange={updateSelectedColumnWidth}
                onChange={(data) => selectedWidget ? updateSelectedWidget({ data }) : selectedColumnIndex !== null ? undefined : updateModule(activeEditorModule.id, data)}
                onStyleChange={(style) => selectedWidget ? updateSelectedWidget({ style }) : selectedColumnIndex !== null ? updateSelectedColumnStyle(style) : updateModuleStyle(activeEditorModule.id, style)}
                onClose={() => { setSelectedId(null); setSelectedWidgetId(null); setSelectedColumnIndex(null); setSelectedColumnOwnerId(null); }}
                portfolioItems={portfolioItems}
                globalContact={globals.contact}
              />
            ) : <AddModulePicker onAdd={addModule} />}
          </aside>
          {sidebarOpen && <div role="separator" aria-label="Zmień szerokość panelu" aria-orientation="vertical" aria-valuemin={264} aria-valuemax={460} aria-valuenow={Math.round(sidebarWidth)} tabIndex={0} title="Przeciągnij, aby zmienić szerokość panelu" onPointerDown={startSidebarResize} onKeyDown={(event) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); setSidebarWidth((width) => Math.min(460, Math.max(264, width + (event.key === "ArrowRight" ? 16 : -16)))); }} className="group absolute inset-y-0 right-[-4px] z-[71] w-2 cursor-col-resize touch-none outline-none focus-visible:bg-ink-gold/35"><span className="absolute inset-y-0 left-1/2 w-px bg-transparent transition-colors group-hover:bg-ink-gold/60 group-focus-visible:bg-ink-gold" /><GripVertical aria-hidden className="absolute left-1/2 top-[calc(50%+2.5rem)] h-5 w-3 -translate-x-1/2 text-transparent transition-colors group-hover:text-ink-gold group-focus-visible:text-ink-gold" /></div>}
          <button type="button" aria-controls="builder-sidebar-panel" aria-expanded={sidebarOpen} aria-label={sidebarOpen ? "Ukryj panel narzędzi" : "Pokaż panel narzędzi"} title={`${sidebarOpen ? "Ukryj" : "Pokaż"} panel (Ctrl+P)`} onClick={() => setSidebarOpen((open) => !open)} className="absolute left-full top-1/2 z-[72] flex h-11 w-6 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-white/15 bg-[#1d1f22] text-white/55 shadow-xl transition-colors hover:border-ink-gold/60 hover:text-ink-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-gold">{sidebarOpen ? <ChevronLeft aria-hidden className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden className="h-3.5 w-3.5" />}</button>
        </div>

        <div
          data-lenis-prevent
          className={`min-w-0 flex-1 overflow-auto bg-[#101113] ${device === "desktop" ? "p-0" : "px-3 py-3"}`}
          onClick={() => { setSelectedId(null); setSelectedWidgetId(null); setSelectedColumnIndex(null); setSelectedColumnOwnerId(null); }}
          onDragOver={(event) => { if (event.dataTransfer.types.includes(PALETTE_WIDGET_MIME)) event.preventDefault(); }}
          onDrop={dropOnCanvas}
        >
          <div
            data-builder-device={device}
            data-builder-snap={snapSize}
            className="builder-canvas relative mx-auto min-h-full shrink-0 border border-ink-white/10 bg-ink-black transition-[width] duration-300"
            style={{ width: DEVICE_WIDTHS[device], "--builder-grid-size": `${snapSize}px`, ...(globals.theme ? siteThemeStyle(globals.theme) : {}) } as CSSProperties}
          >
            <div className="builder-editor-chrome sticky top-0 z-[60] flex items-center gap-1 border-b border-white/10 bg-[#17181a]/90 p-1.5 backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
              <button type="button" title="Siatka" aria-label="Siatka" aria-pressed={showGrid} onClick={() => setShowGrid((value) => !value)} className={`flex h-8 w-8 items-center justify-center rounded-md border ${showGrid ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-white/10 text-white/45"}`}><Grid3X3 className="h-3.5 w-3.5" /></button>
              <button type="button" title="Prowadnice" aria-label="Prowadnice" aria-pressed={showGuides} onClick={() => setShowGuides((value) => !value)} className={`flex h-8 w-8 items-center justify-center rounded-md border ${showGuides ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-white/10 text-white/45"}`}><Ruler className="h-3.5 w-3.5" /></button>
              <details className="relative text-[9px] text-white/60">
                <summary title="Narzędzia: siatka, prowadnice i bloki" aria-label="Narzędzia: siatka, prowadnice i bloki" className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-white/10 text-white/45 marker:hidden hover:border-ink-gold/60 hover:text-ink-gold"><SlidersHorizontal className="h-3.5 w-3.5" /></summary>
                <div className="absolute left-0 top-full z-[80] mt-1 max-h-[calc(100dvh-8rem)] w-72 overflow-y-auto rounded-md border border-white/15 bg-[#17181a]/98 p-2.5 shadow-2xl backdrop-blur-xl">
                  <div className="grid grid-cols-[1fr_64px] items-end gap-2">
                    <label className="block text-[8px] tracking-[.1em] text-white/55"><span>SIATKA / SNAP</span><input aria-label="Rozmiar siatki przyciągania" type="range" min={2} max={100} value={snapSize} onChange={(event) => setSnapSize(Math.min(100, Math.max(2, Number(event.target.value) || 2)))} className="mt-1.5 h-7 w-full accent-[#c99a4a]" /></label>
                    <label className="text-[8px] tracking-[.1em] text-white/55">PX<input aria-label="Rozmiar siatki w pikselach" type="number" min={2} max={100} value={snapSize} onChange={(event) => setSnapSize(Math.min(100, Math.max(2, Number(event.target.value) || 2)))} className="mt-1 h-8 w-full rounded-md border border-white/15 bg-black/35 px-2 text-[10px] text-white outline-none focus:border-ink-gold" /></label>
                  </div>
                  <div className="my-2 h-px bg-white/10" />
                  <div className="mb-1.5 flex items-center justify-between"><span className="tracking-[.1em] text-white/45">PROWADNICE</span><span className="flex gap-1"><button type="button" onClick={() => addGuide("x")} className="h-8 rounded-md border border-white/12 px-2 text-[8px] hover:border-cyan-300/60 hover:text-cyan-200">+ PIONOWA</button><button type="button" onClick={() => addGuide("y")} className="h-8 rounded-md border border-white/12 px-2 text-[8px] hover:border-cyan-300/60 hover:text-cyan-200">+ POZIOMA</button></span></div>
                  <div className="max-h-32 space-y-1 overflow-y-auto pr-0.5">{guides.length ? guides.map((guide, index) => <div key={guide.id} className="grid grid-cols-[1fr_64px_32px] items-center gap-1 rounded-md bg-white/[0.035] px-1.5 py-1"><span>{guide.axis === "x" ? "Pionowa" : "Pozioma"} {index + 1}</span><label className="sr-only" htmlFor={`guide-${guide.id}`}>Pozycja prowadnicy {index + 1} w procentach</label><input id={`guide-${guide.id}`} type="number" min={0} max={100} value={guide.position} onChange={(event) => updateGuide(guide.id, Number(event.target.value))} className="h-7 rounded-md border border-white/12 bg-black/35 px-1.5 text-right text-[9px] text-white outline-none focus:border-ink-gold" /><button type="button" aria-label={`Usuń prowadnicę ${index + 1}`} title="Usuń prowadnicę" onClick={() => setGuides((current) => current.filter((item) => item.id !== guide.id))} className="flex h-7 w-7 items-center justify-center rounded-md text-red-300/70 hover:bg-red-400/10 hover:text-red-300"><Trash2 className="h-3 w-3" /></button></div>) : <p className="py-2 text-center text-white/35">Brak prowadnic</p>}</div>
                  <div className="my-2 h-px bg-white/10" />
                  <button type="button" onClick={saveReusableBlock} disabled={!selectedModule} className="flex min-h-8 w-full items-center gap-2 rounded-md border border-white/10 px-2 text-white/60 hover:border-ink-gold/60 hover:text-ink-gold disabled:opacity-30"><Save className="h-3.5 w-3.5" />ZAPISZ ZAZNACZENIE JAKO BLOK</button>
                  <p className="mb-1 mt-2 flex items-center gap-2 tracking-[.1em] text-white/45"><Blocks className="h-3.5 w-3.5" />BIBLIOTEKA BLOKÓW</p>
                  <div className="max-h-28 space-y-1 overflow-y-auto">{reusableBlocks.length ? reusableBlocks.map((block) => <button key={block.id} type="button" aria-pressed={selectedReusableBlock === block.id} onClick={() => setSelectedReusableBlock(block.id)} className={`min-h-8 w-full truncate rounded-md border px-2 text-left ${selectedReusableBlock === block.id ? "border-ink-gold text-ink-gold" : "border-white/10 text-white/55"}`}>{block.name}</button>) : <p className="rounded-md border border-dashed border-white/10 px-2 py-2 text-center text-white/35">Brak zapisanych bloków</p>}</div>
                  <div className="mt-1.5 grid grid-cols-[1fr_32px] gap-1"><button type="button" onClick={insertReusableBlock} disabled={!selectedReusableBlock} className="flex min-h-8 items-center justify-center gap-1 rounded-md border border-ink-gold/50 text-ink-gold disabled:opacity-30"><Plus className="h-3.5 w-3.5" />WSTAW</button><button type="button" title="Usuń blok" aria-label="Usuń blok z biblioteki" onClick={deleteReusableBlock} disabled={!selectedReusableBlock} className="flex min-h-8 items-center justify-center rounded-md border border-red-400/30 text-red-300 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></div>
                </div>
              </details>
              <details className="relative ml-auto text-[9px] text-white/60"><summary title="Audyt strony" aria-label={`Audyt strony: ${auditIssues.length || "bez problemów"}`} className={`flex h-8 cursor-pointer list-none items-center gap-1.5 border px-2 marker:hidden ${auditIssues.some((issue) => issue.severity === "error") ? "border-red-400/60 text-red-300" : auditIssues.length ? "border-amber-400/60 text-amber-300" : "border-emerald-400/40 text-emerald-300"}`}><ShieldCheck className="h-3.5 w-3.5" /><span>{auditIssues.length || "OK"}</span></summary>{auditIssues.length > 0 && <div className="absolute right-0 top-full z-[80] mt-1 max-h-64 w-[min(28rem,80vw)] overflow-y-auto border border-white/15 bg-black/95 p-2 shadow-2xl">{auditIssues.map((issue) => <p key={issue.id} className={`border-b border-white/10 px-1 py-2 leading-relaxed ${issue.severity === "error" ? "text-red-300" : "text-amber-200"}`}>{issue.message}</p>)}</div>}</details>
            </div>
            {showGrid && <div aria-hidden className="builder-grid-overlay pointer-events-none absolute inset-0 z-[34]" />}
            {showGuides && <div aria-hidden className="pointer-events-none absolute inset-0 z-[35]">{guides.map((guide) => <span key={guide.id} className={guide.axis === "x" ? "absolute inset-y-0 border-l border-dashed border-cyan-300/60" : "absolute inset-x-0 border-t border-dashed border-cyan-300/60"} style={guide.axis === "x" ? { left: `${guide.position}%` } : { top: `${guide.position}%` }} />)}</div>}
            <ModuleRenderer
              modules={modules}
              editorDevice={device}
              portfolioWorks={portfolioItems}
              globals={globals}
              editable
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setSelectedWidgetId(null); setSelectedColumnIndex(null); setSelectedColumnOwnerId(null); }}
              onMove={moveModule}
              onDuplicate={duplicateModule}
              onDelete={deleteModule}
              onToggleHidden={toggleHidden}
              onReorder={reorderModules}
              selectedWidgetId={selectedWidgetId}
              selectedColumnIndex={selectedColumnIndex}
              selectedColumnOwnerId={selectedColumnOwnerId}
              onSelectWidget={(moduleId, widgetId) => { setSelectedId(moduleId); setSelectedWidgetId(widgetId); setSelectedColumnIndex(null); setSelectedColumnOwnerId(null); }}
              onSelectColumn={(moduleId, columnIndex, ownerId) => { setSelectedId(moduleId); setSelectedWidgetId(null); setSelectedColumnIndex(columnIndex); setSelectedColumnOwnerId(ownerId); }}
              onDeleteWidget={(moduleId, widgetId) => {
                const target = modules.find((module) => module.id === moduleId);
                if (!target || target.type !== "columns") return;
                const data = withDefaults("columns", target.data);
                updateColumns(moduleId, removeWidgetTree(data.columns, widgetId));
                if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
              }}
              onDuplicateWidget={duplicateWidget}
              onDuplicateColumn={duplicateColumn}
              onDeleteColumn={deleteColumn}
              onColumnsChange={updateColumns}
              onResizeModule={updateModuleStyle}
              onResizeWidget={resizeWidget}
              onResizeColumn={resizeColumn}
            />
            <div className="m-3 flex min-h-16 items-center justify-center border border-dashed border-ink-gold/25 bg-ink-gold/[0.025] text-[10px] tracking-[.08em] text-ink-grey">
              UPUŚĆ TUTAJ, ABY DODAĆ NA KOŃCU STRONY
            </div>
          </div>
        </div>
      </div>

      {settingsOpen && !isSystemPage && (
        <PageSettingsModal
          initial={{
            title: page.title,
            slug: page.slug,
            excerpt: page.excerpt ?? "",
            coverImage: page.coverImage ?? "",
            showInNav: page.showInNav,
            navOrder: page.navOrder,
          }}
          isHomepage={page.isHomepage}
          saving={saving}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
