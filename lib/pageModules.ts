import type { Module } from "./modules";

export function parseModules(value: string | null | undefined): Module[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Module[]) : [];
  } catch {
    return [];
  }
}

export function serializeModules(modules: Module[]) {
  return JSON.stringify(modules);
}
