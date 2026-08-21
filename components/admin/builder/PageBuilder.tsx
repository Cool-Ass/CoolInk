"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModuleRenderer from "@/components/ModuleRenderer";
import BuilderTopBar, { type DeviceMode } from "@/components/admin/builder/BuilderTopBar";
import AddModulePicker from "@/components/admin/builder/AddModulePicker";
import ModuleSettingsSidebar from "@/components/admin/builder/ModuleSettingsSidebar";
import PageSettingsModal, {
  type PageSettingsValues,
} from "@/components/admin/builder/PageSettingsModal";
import { useToast } from "@/components/admin/ToastProvider";
import { createModule, type Module, type ModuleType } from "@/lib/modules";
import type { PortfolioWork } from "@/lib/portfolio";

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

export default function PageBuilder({
  page: initialPage,
  portfolioItems,
  globals,
}: {
  page: BuilderPage;
  portfolioItems: PortfolioWork[];
  globals: { instagramUrl: string; facebookUrl: string };
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [page, setPage] = useState(initialPage);
  const [modules, setModules] = useState<Module[]>(initialPage.modules ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

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

  function updateModule(id: string, data: Record<string, unknown>) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, data } : m)));
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
    if (!window.confirm("Usunąć ten moduł? Tej operacji nie można cofnąć po zapisaniu.")) return;
    setModules((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function toggleHidden(id: string) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m)));
  }

  function addModule(type: ModuleType) {
    const newModule = createModule(type);
    setModules((prev) => {
      const index = prev.findIndex((m) => m.id === selectedId);
      if (index === -1) return [...prev, newModule];
      const next = [...prev];
      next.splice(index + 1, 0, newModule);
      return next;
    });
    setSelectedId(newModule.id);
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
        slug={page.slug}
      />

      <div className="flex flex-1 overflow-hidden">
        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto bg-ink-charcoal/20 py-8"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="builder-canvas relative mx-auto border border-ink-white/10 bg-ink-black transition-[width] duration-300"
            style={{ width: DEVICE_WIDTHS[device], maxWidth: "100%" }}
          >
            <div className="border-b border-ink-white/10 bg-ink-charcoal/60 px-4 py-2 text-center text-[11px] leading-relaxed text-ink-grey">
              Kliknij sekcję, aby ją edytować. Najedź na nią, aby zobaczyć opcje kolejności, duplikowania i ukrywania.
            </div>
            <ModuleRenderer
              modules={modules}
              portfolioWorks={portfolioItems}
              globals={globals}
              editable
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveModule}
              onDuplicate={duplicateModule}
              onDelete={deleteModule}
              onToggleHidden={toggleHidden}
              onReorder={reorderModules}
            />
          </div>
        </div>

        <aside
          data-lenis-prevent
          className="w-[380px] shrink-0 overflow-y-auto border-l border-ink-white/10 bg-ink-charcoal/40 p-6"
        >
          {selectedModule ? (
            <div className="flex flex-col gap-8">
              <ModuleSettingsSidebar
                module={selectedModule}
                onChange={(data) => updateModule(selectedModule.id, data)}
                onClose={() => setSelectedId(null)}
                portfolioItems={portfolioItems}
              />
              <div className="border-t border-ink-white/10 pt-6">
                <AddModulePicker onAdd={addModule} insertAfterSelection />
              </div>
            </div>
          ) : (
            <AddModulePicker onAdd={addModule} />
          )}
        </aside>
      </div>

      {settingsOpen && (
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
