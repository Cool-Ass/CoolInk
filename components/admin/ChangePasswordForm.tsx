"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/components/admin/ToastProvider";

export default function ChangePasswordForm() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Nowe hasła nie są identyczne.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się zmienić hasła.");
      showToast("Hasło zaktualizowane.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zmienić hasła.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-5">
      <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
        OBECNE HASŁO
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
        />
      </label>
      <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
        NOWE HASŁO
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
        />
      </label>
      <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
        POWTÓRZ NOWE HASŁO
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
        />
      </label>

      {error && (
        <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 self-start border border-ink-gold px-6 py-3 text-[13px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
      >
        {saving ? "ZAPISYWANIE…" : "ZMIEŃ HASŁO"}
      </button>
    </form>
  );
}
