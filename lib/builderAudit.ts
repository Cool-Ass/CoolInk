import { withDefaults, type ColumnWidget, type Module, type ModuleStyle } from "@/lib/modules";

export const BUILDER_PERFORMANCE_BUDGET = {
  maxImageBytes: 8 * 1024 * 1024,
  maxActiveAnimations: 6,
  maxInfiniteAnimations: 2,
  maxImagesPerPage: 24,
} as const;

export interface BuilderAuditIssue {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
  moduleId?: string;
}

interface AuditedNode { id: string; type: string; data: Record<string, unknown>; style?: ModuleStyle }

function flattenWidgets(widgets: ColumnWidget[], output: AuditedNode[]) {
  for (const widget of widgets) {
    output.push({ id: widget.id, type: widget.type, data: widget.data, style: widget.style });
    if (widget.type === "innerSection") for (const column of withDefaults("innerSection", widget.data).columns) flattenWidgets(column, output);
  }
}

function flatten(modules: Module[]) {
  const output: AuditedNode[] = [];
  for (const pageModule of modules) {
    output.push({ id: pageModule.id, type: pageModule.type, data: pageModule.data, style: pageModule.style });
    if (pageModule.type === "columns") for (const column of withDefaults("columns", pageModule.data).columns) flattenWidgets(column, output);
  }
  return output;
}

function parseHex(value?: string) {
  const match = value?.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((char) => char + char).join("") : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function luminance(rgb: number[]) {
  const values = rgb.map((channel) => { const normalized = channel / 255; return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4; });
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}

function contrastRatio(foreground?: string, background?: string) {
  const front = parseHex(foreground); const back = parseHex(background);
  if (!front || !back) return null;
  const a = luminance(front); const b = luminance(back);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

function mediaUrls(node: AuditedNode) {
  const data = node.data;
  const values: string[] = [];
  for (const key of ["image", "imageUrl", "logoUrl", "coverImage"]) if (typeof data[key] === "string" && data[key]) values.push(data[key] as string);
  if (Array.isArray(data.images)) for (const image of data.images) if (typeof image === "string" && image) values.push(image);
  if (node.style?.backgroundImage) values.push(node.style.backgroundImage);
  return values;
}

/** Fast local audit; it runs while editing and never downloads user media. */
export function auditBuilderPage(modules: Module[]): BuilderAuditIssue[] {
  const nodes = flatten(modules.filter((module) => !module.hidden));
  const issues: BuilderAuditIssue[] = [];
  const animated = nodes.filter((node) => node.style?.animation && node.style.animation !== "none");
  const infinite = animated.filter((node) => node.style?.animationIteration === "infinite");
  const images = nodes.flatMap(mediaUrls);

  if (animated.length > BUILDER_PERFORMANCE_BUDGET.maxActiveAnimations) issues.push({ id: "animation-budget", severity: "warning", message: `Aktywnych animacji: ${animated.length}. Budżet strony: ${BUILDER_PERFORMANCE_BUDGET.maxActiveAnimations}.` });
  if (infinite.length > BUILDER_PERFORMANCE_BUDGET.maxInfiniteAnimations) issues.push({ id: "infinite-animation-budget", severity: "warning", message: `Animacje w pętli: ${infinite.length}. Zalecane maksimum: ${BUILDER_PERFORMANCE_BUDGET.maxInfiniteAnimations}.` });
  if (images.length > BUILDER_PERFORMANCE_BUDGET.maxImagesPerPage) issues.push({ id: "image-count-budget", severity: "warning", message: `Obrazów na stronie: ${images.length}. Budżet: ${BUILDER_PERFORMANCE_BUDGET.maxImagesPerPage}.` });

  for (const node of nodes) {
    const visibleFrom = node.style?.visibleFrom ? Date.parse(node.style.visibleFrom) : Number.NEGATIVE_INFINITY;
    const visibleUntil = node.style?.visibleUntil ? Date.parse(node.style.visibleUntil) : Number.POSITIVE_INFINITY;
    if (Number.isNaN(visibleFrom) || Number.isNaN(visibleUntil) || visibleFrom >= visibleUntil) {
      issues.push({ id: `${node.id}-visibility-window`, moduleId: node.id, severity: "error", message: "Zakres widoczności ma nieprawidłowe daty lub data końcowa nie jest późniejsza od początkowej." });
    }
    const ratio = contrastRatio(node.style?.color, node.style?.backgroundColor);
    if (ratio !== null && ratio < 4.5) issues.push({ id: `${node.id}-contrast`, moduleId: node.id, severity: "error", message: `Za niski kontrast tekstu (${ratio.toFixed(1)}:1); wymagane 4.5:1.` });
    if (node.type === "image") {
      if (!(typeof node.data.alt === "string" && node.data.alt.trim())) issues.push({ id: `${node.id}-alt`, moduleId: node.id, severity: "error", message: "Obraz nie ma opisu alternatywnego." });
      if (!node.data.aspect && !node.style?.aspectRatio && !node.style?.responsiveHeight && !node.style?.height) issues.push({ id: `${node.id}-cls`, moduleId: node.id, severity: "warning", message: "Obraz nie rezerwuje proporcji lub wysokości — może powodować przesunięcia CLS." });
    }
    if (node.type === "button" && (!(typeof node.data.label === "string" && node.data.label.trim()) || !(typeof node.data.href === "string" && node.data.href.trim()))) issues.push({ id: `${node.id}-focus`, moduleId: node.id, severity: "error", message: "Przycisk potrzebuje czytelnej etykiety i poprawnego linku dla klawiatury." });
    if (node.type === "video" && node.data.autoplay === true && !node.style?.hiddenOn?.mobile) issues.push({ id: `${node.id}-autoplay`, moduleId: node.id, severity: "warning", message: "Autoplay jest aktywny na telefonie. Wyłącz go lub ukryj ten film na mobile." });
    for (const url of mediaUrls(node)) if (url.startsWith("data:") && Math.ceil(url.length * .75) > BUILDER_PERFORMANCE_BUDGET.maxImageBytes) issues.push({ id: `${node.id}-heavy-media`, moduleId: node.id, severity: "error", message: "Obraz przekracza budżet 8 MB. Skompresuj go przed publikacją." });
  }

  return issues;
}
