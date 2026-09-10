"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import ModuleRenderer, { type ModuleRendererGlobals } from "@/components/ModuleRenderer";
import BuilderTopBar, { type DeviceMode } from "@/components/admin/builder/BuilderTopBar";
import AddModulePicker from "@/components/admin/builder/AddModulePicker";
import ModuleSettingsSidebar from "@/components/admin/builder/ModuleSettingsSidebar";
import PageSettingsModal, {
  type PageSettingsValues,
} from "@/components/admin/builder/PageSettingsModal";
import { useToast } from "@/components/admin/ToastProvider";
import { cloneBuilderModule, cloneColumnWidget, createModule, isColumnWidgetType, withDefaults, type ColumnWidget, type Module, type ModuleStyle, type ModuleType } from "@/lib/modules";
import { PALETTE_WIDGET_MIME } from "@/lib/builderDnd";
import type { PortfolioWork } from "@/lib/portfolio";
import { siteThemeStyle } from "@/lib/siteTheme";
import { isSystemPageSlug } from "@/lib/systemPages";

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
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const isSystemPage = isSystemPageSlug(page.slug);

  const lastSavedRef = useRef(JSON.stringify(initialPage.modules ?? []));

  function setModules(update: Module[] | ((current: Module[]) => Module[])) {
    const next = typeof update === "function" ? update(modules) : update;
    if (next === modules || JSON.stringify(next) === JSON.stringify(modules)) return;
    setUndoHistory((current) => [...current.slice(-49), modules]);
    setRedoHistory([]);
    setModulesState(next);
  }

  const handleUndo = useCallback(() => {
    const previous = undoHistory.at(-1);
    if (!previous) return;
    setUndoHistory((current) => current.slice(0, -1));
    setRedoHistory((current) => [...current.slice(-49), modules]);
    setModulesState(previous);
  }, [modules, undoHistory]);

  const handleRedo = useCallback(() => {
    const next = redoHistory.at(-1);
    if (!next) return;
    setRedoHistory((current) => current.slice(0, -1));
    setUndoHistory((current) => [...current.slice(-49), modules]);
    setModulesState(next);
  }, [modules, redoHistory]);

  useEffect(() => {
    setDirty(JSON.stringify(modules) !== lastSavedRef.current);
  }, [modules]);

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
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) handleRedo();
      else handleUndo();
    }
    window.addEventListener("keydown", keyboardHistory);
    return () => window.removeEventListener("keydown", keyboardHistory);
  }, [handleRedo, handleUndo]);

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;
  const selectedWidget = selectedModule?.type === "columns" && selectedWidgetId
    ? withDefaults("columns", selectedModule.data).columns.flat().find((widget) => widget.id === selectedWidgetId) ?? null
    : null;
  const selectedColumnData = selectedModule?.type === "columns" && selectedColumnIndex !== null
    ? withDefaults("columns", selectedModule.data)
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
    updateColumns(selectedModule.id, data.columns.map((column) => column.map((widget) => widget.id === selectedWidgetId ? { ...widget, ...patch } : widget)));
  }

  function updateSelectedColumnStyle(style: ModuleStyle) {
    if (!selectedModule || selectedModule.type !== "columns" || selectedColumnIndex === null) return;
    const data = withDefaults("columns", selectedModule.data);
    const columnStyles = Array.from({ length: data.columns.length }, (_, index) => index === selectedColumnIndex ? style : data.columnStyles?.[index] ?? {});
    setModules((current) => current.map((module) => module.id === selectedModule.id ? { ...module, data: { ...data, columnStyles } } : module));
  }

  function updateSelectedColumnWidth(width: number) {
    if (!selectedModule || selectedModule.type !== "columns" || selectedColumnIndex === null) return;
    const data = withDefaults("columns", selectedModule.data);
    const fallback = 100 / Math.max(1, data.columns.length);
    const columnWidths = Array.from({ length: data.columns.length }, (_, index) => index === selectedColumnIndex ? Math.min(100, Math.max(5, width)) : data.columnWidths?.[index] ?? fallback);
    setModules((current) => current.map((module) => module.id === selectedModule.id ? { ...module, data: { ...data, columnWidths } } : module));
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
    if (selectedId === id) { setSelectedId(null); setSelectedWidgetId(null); setSelectedColumnIndex(null); }
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
  }

  function duplicateWidget(moduleId: string, widgetId: string, columnIndex: number) {
    const target = modules.find((module) => module.id === moduleId);
    if (!target || target.type !== "columns") return;
    const data = withDefaults("columns", target.data);
    const next = data.columns.map((column) => [...column]);
    const widgetIndex = next[columnIndex]?.findIndex((widget) => widget.id === widgetId) ?? -1;
    if (widgetIndex < 0) return;
    const clone = cloneColumnWidget(next[columnIndex][widgetIndex]);
    next[columnIndex].splice(widgetIndex + 1, 0, clone);
    updateColumns(moduleId, next);
    setSelectedId(moduleId);
    setSelectedWidgetId(clone.id);
    setSelectedColumnIndex(null);
  }

  function duplicateColumn(moduleId: string, columnIndex: number) {
    const target = modules.find((module) => module.id === moduleId);
    if (!target || target.type !== "columns") return;
    const data = withDefaults("columns", target.data);
    if (data.columns.length >= 4) {
      showToast("Sekcja może mieć maksymalnie 4 kolumny.", "error");
      return;
    }
    const columns = data.columns.map((column) => [...column]);
    const clone = (columns[columnIndex] ?? []).map(cloneColumnWidget);
    columns.splice(columnIndex + 1, 0, clone);
    const columnStyles = Array.from({ length: data.columns.length }, (_, index) => ({ ...(data.columnStyles?.[index] ?? {}) }));
    columnStyles.splice(columnIndex + 1, 0, { ...(data.columnStyles?.[columnIndex] ?? {}) });
    const layout = (["one", "two", "three", "four"] as const)[columns.length - 1];
    const evenWidth = Math.round((100 / columns.length) * 100) / 100;
    setModules((current) => current.map((module) => module.id === moduleId ? {
      ...module,
      data: { ...data, layout, columns, columnWidths: Array(columns.length).fill(evenWidth), columnStyles },
    } : module));
    setSelectedId(moduleId);
    setSelectedWidgetId(null);
    setSelectedColumnIndex(columnIndex + 1);
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
  }

  async function patchPage(body: object) {
    const res = await fetch(`/api/admin/pages/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Coś poszło nie tak.");
    return data.page;
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const updated = await patchPage({ modules });
      setPage((p) => ({ ...p, status: updated.status }));
      lastSavedRef.current = JSON.stringify(modules);
      setDirty(false);
      showToast("Wersja robocza zapisana.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const updated = await patchPage({ modules, publish: true });
      setPage((p) => ({ ...p, status: updated.status }));
      lastSavedRef.current = JSON.stringify(modules);
      setDirty(false);
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

  return (
    <div className="flex h-screen flex-col bg-ink-black text-ink-white">
      <BuilderTopBar
        title={page.title}
        status={page.status}
        dirty={dirty}
        saving={saving}
        publishing={publishing}
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
        isHomepage={page.isHomepage}
        isSystemPage={isSystemPage}
        slug={page.slug}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside
          data-lenis-prevent
          className="w-[344px] max-w-[40vw] shrink-0 overflow-y-auto border-r border-white/10 bg-[#1d1f22]"
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
              onClose={() => { setSelectedId(null); setSelectedWidgetId(null); setSelectedColumnIndex(null); }}
              portfolioItems={portfolioItems}
              globalContact={globals.contact}
            />
          ) : <AddModulePicker onAdd={addModule} />}
        </aside>

        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto bg-[#101113] px-4 py-6 md:px-7"
          onClick={() => { setSelectedId(null); setSelectedWidgetId(null); setSelectedColumnIndex(null); }}
          onDragOver={(event) => { if (event.dataTransfer.types.includes(PALETTE_WIDGET_MIME)) event.preventDefault(); }}
          onDrop={dropOnCanvas}
        >
          <div
            className="builder-canvas relative mx-auto border border-ink-white/10 bg-ink-black transition-[width] duration-300"
            style={{ width: DEVICE_WIDTHS[device], maxWidth: "100%", ...(globals.theme ? siteThemeStyle(globals.theme) : {}) }}
          >
            <div className="border-b border-ink-white/10 bg-ink-charcoal/60 px-4 py-2 text-center text-[10px] leading-relaxed text-ink-grey">
              Przeciągnij element z lewego panelu. Widget możesz upuścić bezpośrednio w kolumnie sekcji.
            </div>
            <ModuleRenderer
              modules={modules}
              portfolioWorks={portfolioItems}
              globals={globals}
              editable
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setSelectedWidgetId(null); setSelectedColumnIndex(null); }}
              onMove={moveModule}
              onDuplicate={duplicateModule}
              onDelete={deleteModule}
              onToggleHidden={toggleHidden}
              onReorder={reorderModules}
              selectedWidgetId={selectedWidgetId}
              selectedColumnIndex={selectedColumnIndex}
              onSelectWidget={(moduleId, widgetId) => { setSelectedId(moduleId); setSelectedWidgetId(widgetId); setSelectedColumnIndex(null); }}
              onSelectColumn={(moduleId, columnIndex) => { setSelectedId(moduleId); setSelectedWidgetId(null); setSelectedColumnIndex(columnIndex); }}
              onDeleteWidget={(moduleId, widgetId) => {
                const target = modules.find((module) => module.id === moduleId);
                if (!target || target.type !== "columns") return;
                const data = withDefaults("columns", target.data);
                updateColumns(moduleId, data.columns.map((column) => column.filter((widget) => widget.id !== widgetId)));
                if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
              }}
              onDuplicateWidget={duplicateWidget}
              onDuplicateColumn={duplicateColumn}
              onColumnsChange={updateColumns}
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
