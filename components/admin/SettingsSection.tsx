"use client";

import { useState } from "react";
import { useToast } from "@/components/admin/ToastProvider";

interface Field {
  key: string;
  label: string;
  multiline?: boolean;
}

export default function SettingsSection({
  title,
  fields,
  initialValues,
}: {
  title: string;
  fields: Field[];
  initialValues: Record<string, string>;
}) {
  const { showToast } = useToast();
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się zapisać.");
      showToast(`Zapisano: ${title}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-ink-white/10 bg-ink-charcoal/30 p-6">
      <p className="mb-5 text-[13px] tracking-[0.15em] text-ink-gold">{title}</p>
      <div className="flex flex-col gap-5">
        {fields.map((field) => (
          <label
            key={field.key}
            className="flex flex-col gap-2 text-[12px] tracking-[0.1em] text-ink-grey"
          >
            {field.label}
            {field.multiline ? (
              <textarea
                rows={4}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="resize-y border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
              />
            ) : (
              <input
                type="text"
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
              />
            )}
          </label>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 inline-flex items-center gap-2 border border-ink-gold px-5 py-2.5 text-[12px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
      >
        {saving ? "ZAPISYWANIE…" : `ZAPISZ: ${title.toUpperCase()}`}
      </button>
    </div>
  );
}
