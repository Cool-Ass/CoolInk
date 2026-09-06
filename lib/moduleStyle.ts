import type { CSSProperties } from "react";

const FORBIDDEN_VALUE = /(?:javascript:|expression\s*\(|url\s*\(|@import|<|>)/i;

/**
 * Converts a deliberately limited list of CSS declarations into React inline
 * styles. It gives advanced editors precise control without allowing imports,
 * remote tracking URLs or markup to escape into the public document.
 */
export function parseSafeCssDeclarations(value: unknown): CSSProperties {
  const declarations: Record<string, string> = {};
  if (typeof value !== "string" || !value) return declarations;

  for (const raw of value.slice(0, 8_000).split(";")) {
    const separator = raw.indexOf(":");
    if (separator < 1) continue;
    const property = raw.slice(0, separator).trim().toLowerCase();
    const propertyValue = raw.slice(separator + 1).trim();
    if (!/^(?:--[a-z0-9_-]+|[a-z][a-z0-9-]*)$/i.test(property)) continue;
    if (!propertyValue || FORBIDDEN_VALUE.test(propertyValue)) continue;
    if (property === "position" && /^(?:fixed|sticky)$/i.test(propertyValue)) continue;
    const reactProperty = property.startsWith("--")
      ? property
      : property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    declarations[reactProperty] = propertyValue;
  }

  return declarations as CSSProperties;
}
