"use client";

import type { ReactNode } from "react";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-[13px] text-ink-white outline-none transition-colors focus:border-ink-gold"
      />
    </label>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="resize-y border border-ink-white/20 bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-ink-white outline-none transition-colors focus:border-ink-gold"
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-[13px] text-ink-white outline-none transition-colors focus:border-ink-gold"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] tracking-[0.15em] text-ink-gold">{title}</p>
      {children}
    </div>
  );
}
