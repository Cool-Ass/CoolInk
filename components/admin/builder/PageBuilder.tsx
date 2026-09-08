"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import ModuleRenderer, { type ModuleRendererGlobals } from "@/components/ModuleRenderer";
import BuilderTopBar, { type DeviceMode } from "@/components/admin/builder/BuilderTopBar";
import AddModulePicker from "@/components/admin/builder/AddModulePicker";
import ModuleSettingsSidebar from "@/components/admin/builder/ModuleSettingsSidebar";
import PageSettingsModal, {
  type PageSettingsValues,
} from "@/components/admin/builder/PageSettingsModal";
import { useToast } from "@/components/admin/ToastProvider";
import { createModule, isColumnWidgetType, withDefaults, type ColumnWidget, type Module, type ModuleStyle, type ModuleType } from "@/lib/modules";
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
  const [modules, setModules] = useState<Module[]>(initialPage.modules ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const isSystemPage = isSystemPageSlug(page.slug);

  const lastSavedRef = useRef(JSON.stringify(initialPage.modules ?? []));

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

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;
  const selectedWidget = selectedModule?.type === "columns" && selectedWidgetId
    ? withDefaults("columns", selectedModule.data).columns.flat().find((widget) => widget.id === selectedWidgetId) ?? null
    : null;
  const activeEditorModule = selectedWidget ? ({ ...selectedWidget, hidden: false } as Module) : selectedModule;

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
      const clone: Module = {
        ...prev[index],
        id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  }

  function deleteModule(id: string) {
    if (isSystemPage && modules.length === 1) { showToast("Chronionego elementu systemowego nie można usunąć.", "error"); return; }
    if (!window.confirm("Usunąć ten moduł? Tej operacji nie można cofnąć po zapisaniu.")) return;
    setModules((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) { setSelectedId(null); setSelectedWidgetId(null); }
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
  }

  function dropOnCanvas(event: DragEvent<HTMLDivElement>) {
    const type = event.dataTransfer.getData(PALETTE_WIDGET_MIME) as ModuleType;
    if (!type) return;
    event.preventDefault();
    const { module: newModule, widgetId } = createBuilderEntry(type);
    setModules((current) => [...current, newModule]);
    setSelectedId(newModule.id);
    setSelectedWidgetId(widgetId);
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
              onChange={(data) => selectedWidget ? updateSelectedWidget({ data }) : updateModule(activeEditorModule.id, data)}
              onStyleChange={(style) => selectedWidget ? updateSelectedWidget({ style }) : updateModuleStyle(activeEditorModule.id, style)}
              onClose={() => { setSelectedId(null); setSelectedWidgetId(null); }}
              portfolioItems={portfolioItems}
              globalContact={globals.contact}
            />
          ) : <AddModulePicker onAdd={addModule} />}
        </aside>

        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto bg-[#101113] px-4 py-6 md:px-7"
          onClick={() => { setSelectedId(null); setSelectedWidgetId(null); }}
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
              onSelect={(id) => { setSelectedId(id); setSelectedWidgetId(null); }}
              onMove={moveModule}
              onDuplicate={isSystemPage ? undefined : duplicateModule}
              onDelete={deleteModule}
              onToggleHidden={isSystemPage ? undefined : toggleHidden}
              onReorder={reorderModules}
              selectedWidgetId={selectedWidgetId}
              onSelectWidget={(moduleId, widgetId) => { setSelectedId(moduleId); setSelectedWidgetId(widgetId); }}
              onDeleteWidget={(moduleId, widgetId) => {
                const target = modules.find((module) => module.id === moduleId);
                if (!target || target.type !== "columns") return;
                const data = withDefaults("columns", target.data);
                updateColumns(moduleId, data.columns.map((column) => column.filter((widget) => widget.id !== widgetId)));
                if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
              }}
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
