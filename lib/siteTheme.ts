import type { CSSProperties } from "react";
import { DEFAULT_CONTENT, type SiteContent } from "@/lib/content";

type ThemeVariables = CSSProperties & Record<`--color-ink-${string}`, string>;

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}

export function siteThemeStyle(theme: SiteContent["theme"]): ThemeVariables {
  return {
    "--color-ink-black": safeColor(theme.background, DEFAULT_CONTENT.theme.background),
    "--color-ink-charcoal": safeColor(theme.surface, DEFAULT_CONTENT.theme.surface),
    "--color-ink-gold": safeColor(theme.accent, DEFAULT_CONTENT.theme.accent),
    "--color-ink-gold-bright": safeColor(theme.accentBright, DEFAULT_CONTENT.theme.accentBright),
    "--color-ink-white": safeColor(theme.text, DEFAULT_CONTENT.theme.text),
    "--color-ink-grey": safeColor(theme.muted, DEFAULT_CONTENT.theme.muted),
  };
}

