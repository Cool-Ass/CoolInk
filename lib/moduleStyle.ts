import type { CSSProperties } from "react";
import type { ModuleStyle, ResponsiveNumber } from "@/lib/modules";

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

type BuilderCssProperties = CSSProperties & Record<`--builder-${string}`, string | number | undefined>;

function px(value: number | undefined, min = -4_000, max = 4_000) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.min(max, Math.max(min, value))}px`
    : undefined;
}

function percent(value: number | undefined, fallback?: number) {
  const next = typeof value === "number" ? value : fallback;
  return typeof next === "number" ? `${Math.min(100, Math.max(0, next))}%` : undefined;
}

function responsiveVariables(name: string, value: ResponsiveNumber | undefined, fallback?: number) {
  const desktop = value?.desktop ?? fallback;
  const tablet = value?.tablet ?? desktop;
  const mobile = value?.mobile ?? tablet;
  return {
    [`--builder-${name}-desktop`]: typeof desktop === "number" ? `${Math.min(4_000, Math.max(0, desktop))}px` : undefined,
    [`--builder-${name}-tablet`]: typeof tablet === "number" ? `${Math.min(4_000, Math.max(0, tablet))}px` : undefined,
    [`--builder-${name}-mobile`]: typeof mobile === "number" ? `${Math.min(4_000, Math.max(0, mobile))}px` : undefined,
  } as BuilderCssProperties;
}

function easing(value: ModuleStyle["animationEasing"] | ModuleStyle["transitionEasing"]) {
  return value === "spring" ? "cubic-bezier(.2,.9,.2,1.2)" : value ?? "ease";
}

function transform(style: ModuleStyle, hover = false) {
  const x = hover ? style.hoverTranslateX ?? style.translateX ?? 0 : style.translateX ?? 0;
  const y = hover ? style.hoverTranslateY ?? style.translateY ?? 0 : style.translateY ?? 0;
  const scale = (hover ? style.hoverScale ?? style.scale : style.scale) ?? 1;
  const rotate = hover ? style.hoverRotate ?? style.rotate ?? 0 : style.rotate ?? 0;
  const skewX = style.skewX ?? 0;
  const skewY = style.skewY ?? 0;
  return `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) skew(${skewX}deg, ${skewY}deg) scale(${Math.min(5, Math.max(.05, scale))})`;
}

function filter(style: ModuleStyle, hover = false) {
  const blur = hover ? style.hoverBlur ?? style.blur ?? 0 : style.blur ?? 0;
  const brightness = hover ? style.hoverBrightness ?? style.brightness ?? 100 : style.brightness ?? 100;
  return `blur(${Math.max(0, blur)}px) brightness(${Math.max(0, brightness)}%) contrast(${Math.max(0, style.contrast ?? 100)}%) saturate(${Math.max(0, style.saturate ?? 100)}%) grayscale(${Math.min(100, Math.max(0, style.grayscale ?? 0))}%) hue-rotate(${style.hueRotate ?? 0}deg)`;
}

/** Converts the saved builder controls to a bounded inline style shared by sections, columns and widgets. */
export function buildVisualStyle(style?: ModuleStyle): CSSProperties | undefined {
  if (!style) return undefined;
  const box = (name: "margin" | "padding", value?: ModuleStyle["marginBox"]) => value ? {
    [`${name}Top`]: px(value.top),
    [`${name}Right`]: px(value.right),
    [`${name}Bottom`]: px(value.bottom),
    [`${name}Left`]: px(value.left),
  } : {};
  const gradient = style.gradientEnabled
    ? style.gradientType === "radial"
      ? `radial-gradient(circle at center, ${style.gradientColor1 || "#c99a4a"} ${percent(style.gradientStop1, 0)}, ${style.gradientColor2 || "#090807"} ${percent(style.gradientStop2, 100)})`
      : `linear-gradient(${Math.min(360, Math.max(0, style.gradientAngle ?? 135))}deg, ${style.gradientColor1 || "#c99a4a"} ${percent(style.gradientStop1, 0)}, ${style.gradientColor2 || "#090807"} ${percent(style.gradientStop2, 100)})`
    : "";
  const image = style.backgroundImage ? `url(${JSON.stringify(style.backgroundImage)})` : "";
  const backgroundImage = [gradient, image].filter(Boolean).join(", ") || undefined;
  const hasTransform = (style.translateX ?? 0) !== 0
    || (style.translateY ?? 0) !== 0
    || (style.scale ?? 1) !== 1
    || (style.rotate ?? 0) !== 0
    || (style.skewX ?? 0) !== 0
    || (style.skewY ?? 0) !== 0;
  const hasFilter = [style.blur, style.brightness, style.contrast, style.saturate, style.grayscale, style.hueRotate].some((value) => typeof value === "number");
  const customShadow = typeof style.boxShadowBlur === "number" || typeof style.boxShadowSpread === "number";
  const textShadow = typeof style.textShadowBlur === "number" || typeof style.textShadowX === "number" || typeof style.textShadowY === "number";

  return {
    backgroundColor: style.backgroundColor || undefined,
    backgroundImage,
    backgroundSize: style.backgroundSize || undefined,
    backgroundPosition: style.backgroundPosition || undefined,
    backgroundRepeat: style.backgroundRepeat || undefined,
    backgroundAttachment: style.backgroundAttachment || undefined,
    backgroundBlendMode: style.backgroundBlendMode || undefined,
    color: style.color || undefined,
    borderColor: style.borderColor || undefined,
    borderWidth: style.borderWidth ? px(style.borderWidth, 0, 40) : undefined,
    borderStyle: style.borderWidth ? style.borderStyle ?? "solid" : undefined,
    borderRadius: typeof style.borderRadius === "number" ? px(style.borderRadius, 0, 999) : undefined,
    minHeight: px(style.minHeight, 0, 4_000),
    height: px(style.height, 0, 4_000),
    maxHeight: px(style.maxHeight, 0, 4_000),
    width: px(style.width, 0, 4_000),
    minWidth: px(style.minWidth, 0, 4_000),
    maxWidth: px(style.maxWidth, 0, 4_000),
    aspectRatio: style.aspectRatio || undefined,
    opacity: typeof style.opacity === "number" ? Math.min(1, Math.max(0, style.opacity / 100)) : undefined,
    zIndex: style.zIndex,
    position: style.position || undefined,
    top: style.position && style.position !== "static" ? px(style.insetTop) : undefined,
    right: style.position && style.position !== "static" ? px(style.insetRight) : undefined,
    bottom: style.position && style.position !== "static" ? px(style.insetBottom) : undefined,
    left: style.position && style.position !== "static" ? px(style.insetLeft) : undefined,
    overflowX: style.overflowX || undefined,
    overflowY: style.overflowY || undefined,
    display: style.display || undefined,
    flexDirection: style.display === "flex" ? style.flexDirection : undefined,
    flexWrap: style.display === "flex" ? style.flexWrap : undefined,
    justifyContent: style.display === "flex" ? style.justifyContent : undefined,
    alignItems: style.display === "flex" ? style.alignItems : undefined,
    gap: style.display === "flex" || style.display === "grid" ? px(style.gap, 0, 300) : undefined,
    gridTemplateColumns: style.display === "grid" && style.gridColumns ? `repeat(${Math.min(12, Math.max(1, style.gridColumns))}, minmax(0, 1fr))` : undefined,
    transform: hasTransform ? transform(style) : undefined,
    transformOrigin: style.transformOrigin || undefined,
    filter: hasFilter ? filter(style) : undefined,
    backdropFilter: style.backdropBlur ? `blur(${Math.min(80, Math.max(0, style.backdropBlur))}px)` : undefined,
    mixBlendMode: style.mixBlendMode || undefined,
    boxShadow: customShadow ? `${style.boxShadowX ?? 0}px ${style.boxShadowY ?? 12}px ${Math.max(0, style.boxShadowBlur ?? 30)}px ${style.boxShadowSpread ?? 0}px ${style.boxShadowColor || "#00000080"}` : undefined,
    cursor: style.cursor || undefined,
    fontStyle: style.fontStyle || undefined,
    textDecoration: style.textDecoration || undefined,
    wordSpacing: px(style.wordSpacing, -30, 100),
    textShadow: textShadow ? `${style.textShadowX ?? 0}px ${style.textShadowY ?? 2}px ${Math.max(0, style.textShadowBlur ?? 8)}px ${style.textShadowColor || "#00000080"}` : undefined,
    WebkitTextStroke: style.textStrokeWidth ? `${Math.min(8, Math.max(0, style.textStrokeWidth))}px ${style.textStrokeColor || style.color || "currentColor"}` : undefined,
    transition: `${Math.max(0, style.transitionDuration ?? 350)}ms ${easing(style.transitionEasing)}`,
    "--builder-font-size": style.fontSize ? `${style.fontSize}px` : undefined,
    "--builder-line-height": style.lineHeight ? String(style.lineHeight) : undefined,
    "--builder-letter-spacing": typeof style.letterSpacing === "number" ? `${style.letterSpacing}px` : undefined,
    "--builder-font-weight": style.fontWeight,
    "--builder-font-family": style.fontFamily && style.fontFamily !== "inherit" ? style.fontFamily === "display" ? "var(--font-anton)" : "var(--font-jost)" : undefined,
    "--builder-text-align": style.textAlign,
    "--builder-text-transform": style.textTransform,
    "--builder-text-color": style.color,
    "--builder-hover-transform": transform(style, true),
    "--builder-base-transform": transform(style),
    "--builder-base-filter": filter(style),
    "--builder-hover-filter": filter(style, true),
    "--builder-hover-opacity": typeof style.hoverOpacity === "number" ? String(Math.min(1, Math.max(0, style.hoverOpacity / 100))) : undefined,
    "--builder-transition-duration": `${Math.max(0, style.transitionDuration ?? 350)}ms`,
    "--builder-transition-easing": easing(style.transitionEasing),
    "--builder-animation-duration": `${Math.max(50, style.animationDuration ?? 700)}ms`,
    "--builder-animation-delay": `${Math.max(0, style.animationDelay ?? 0)}ms`,
    "--builder-animation-easing": easing(style.animationEasing),
    "--builder-animation-iteration": style.animationIteration === "infinite" ? "infinite" : "1",
    "--builder-pattern-color": style.patternColor || style.color || "#c99a4a",
    "--builder-pattern-opacity": String(Math.min(1, Math.max(0, (style.patternOpacity ?? 18) / 100))),
    "--builder-pattern-size": `${Math.min(240, Math.max(4, style.patternSize ?? 28))}px`,
    "--builder-glow-color": style.glowColor || style.color || "#c99a4a",
    "--builder-glow-x": `${Math.min(100, Math.max(0, style.glowX ?? 50))}%`,
    "--builder-glow-y": `${Math.min(100, Math.max(0, style.glowY ?? 50))}%`,
    "--builder-glow-size": `${Math.min(1600, Math.max(20, style.glowSize ?? 420))}px`,
    "--builder-glow-opacity": String(Math.min(1, Math.max(0, (style.glowOpacity ?? 0) / 100))),
    "--builder-divider-color": style.shapeDividerColor || style.backgroundColor || "#c99a4a",
    "--builder-divider-height": `${Math.min(240, Math.max(4, style.shapeDividerHeight ?? 48))}px`,
    "--builder-icon-color": style.iconColor || style.color || "#c99a4a",
    "--builder-icon-bg": style.iconBackgroundColor || "transparent",
    "--builder-icon-padding": `${Math.min(80, Math.max(0, style.iconPadding ?? 0))}px`,
    "--builder-icon-radius": `${Math.min(999, Math.max(0, style.iconRadius ?? 0))}px`,
    "--builder-icon-rotate": `${style.iconRotation ?? 0}deg`,
    "--builder-icon-x": `${style.iconOffsetX ?? 0}px`,
    "--builder-icon-y": `${style.iconOffsetY ?? 0}px`,
    "--builder-icon-opacity": String(Math.min(1, Math.max(0, (style.iconOpacity ?? 100) / 100))),
    "--builder-icon-z": String(style.iconZIndex ?? 5),
    ...responsiveVariables("font-size", style.responsiveFontSize, style.fontSize),
    ...responsiveVariables("icon-size", style.iconSize, 24),
    ...box("margin", style.marginBox),
    ...box("padding", style.paddingBox),
    ...parseSafeCssDeclarations(style.customCss),
  } as BuilderCssProperties;
}

export function hasBuilderTypography(style?: ModuleStyle) {
  return Boolean(style?.fontSize || style?.responsiveFontSize || style?.lineHeight || typeof style?.letterSpacing === "number" || style?.wordSpacing || style?.fontWeight || style?.fontStyle || style?.textDecoration || style?.textStrokeWidth || style?.textShadowBlur || (style?.fontFamily && style.fontFamily !== "inherit") || style?.textAlign || style?.textTransform || style?.color);
}

export function builderEffectClasses(style?: ModuleStyle) {
  if (!style) return "";
  return [
    hasBuilderTypography(style) ? "builder-custom-typography" : "",
    style.fontSize || style.responsiveFontSize ? "builder-custom-font-size" : "",
    style.iconSize || style.iconColor || style.iconBackgroundColor || typeof style.iconPadding === "number" || typeof style.iconRadius === "number" || typeof style.iconRotation === "number" || typeof style.iconOffsetX === "number" || typeof style.iconOffsetY === "number" || typeof style.iconOpacity === "number" || typeof style.iconZIndex === "number" ? "builder-custom-icons" : "",
    style.decorativeIcon ? `builder-has-decorative-icon builder-icon-${style.iconPlacement ?? "top-right"}` : "",
    style.pattern && style.pattern !== "none" ? `builder-pattern builder-pattern-${style.pattern}` : "",
    (style.glowOpacity ?? 0) > 0 ? "builder-glow" : "",
    style.maskShape && style.maskShape !== "none" ? `builder-mask-${style.maskShape}` : "",
    style.shapeDividerTop && style.shapeDividerTop !== "none" ? `builder-divider-top builder-divider-top-${style.shapeDividerTop}` : "",
    style.shapeDividerBottom && style.shapeDividerBottom !== "none" ? `builder-divider-bottom builder-divider-bottom-${style.shapeDividerBottom}` : "",
    style.animation && style.animation !== "none" ? `builder-animate builder-animate-${style.animation}` : "",
    style.animationIteration === "infinite" ? "builder-animation-infinite" : "",
    style.parallax && style.parallax !== "none" ? `builder-parallax builder-parallax-${style.parallax}` : "",
    [style.hoverTranslateX, style.hoverTranslateY, style.hoverScale, style.hoverRotate, style.hoverOpacity, style.hoverBlur, style.hoverBrightness].some((value) => typeof value === "number") ? "builder-hover-effect" : "",
    style.backgroundAttachment === "fixed" ? "builder-fixed-background" : "",
  ].filter(Boolean).join(" ");
}
