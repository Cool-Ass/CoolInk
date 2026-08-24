import type { SiteContent } from "@/lib/content";

export type ModuleType =
  | "hero"
  | "about"
  | "stats"
  | "ctaBar"
  | "portfolio"
  | "studio"
  | "contact"
  | "textSection"
  | "imageText"
  | "spacer"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "gallery"
  | "columns"
  | "faq"
  | "video"
  | "map"
  | "quote"
  | "iconList"
  | "callout";

export interface ModuleBase {
  id: string;
  type: ModuleType;
  /** Hidden modules stay in the structure (so settings aren't lost) but don't render publicly. */
  hidden?: boolean;
}

export interface ModuleOf<T> extends ModuleBase {
  data: T;
}

export interface HeroModuleData {
  eyebrow: string;
  heading1: string;
  heading2: string;
  body: string;
  primaryBtnLabel: string;
  secondaryBtnLabel: string;
  backgroundImage: string;
  portraitImage: string;
}

export interface AboutModuleData {
  eyebrow: string;
  heading1: string;
  heading2: string;
  body: string;
  signatureName: string;
  signatureRole: string;
  mainImage: string;
  detailImage1: string;
  detailImage2: string;
  detailImage3: string;
}

export interface StatsModuleData {
  items: { value: string; label: string }[];
}

export interface CtaBarModuleData {
  title1: string;
  title2: string;
  message: string;
  buttonLabel: string;
  href: string;
}

export interface PortfolioModuleData {
  eyebrow: string;
  heading1: string;
  heading2: string;
  body: string;
  primaryBtnLabel: string;
  secondaryBtnLabel: string;
  selectionMode: "all" | "selected";
  selectedIds: string[];
}

export interface StudioModuleData {
  eyebrow: string;
  heading1: string;
  heading2: string;
  body: string;
  primaryBtnLabel: string;
  secondaryBtnLabel: string;
  image: string;
  ctaTitle1: string;
  ctaTitle2: string;
  ctaMessage: string;
}

export interface ContactModuleData {
  eyebrow: string;
  heading1: string;
  heading2: string;
  body: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
}

export interface TextSectionModuleData {
  eyebrow: string;
  heading1: string;
  heading2: string;
  body: string;
  alignment: "left" | "center";
}

export interface ImageTextModuleData {
  image: string;
  heading1: string;
  heading2: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  imagePosition: "left" | "right";
}

export interface SpacerModuleData {
  size: "sm" | "md" | "lg";
}

/** Neutral, reusable builder widgets. They do not carry any Coolink homepage copy. */
export interface HeadingModuleData { text: string; level: "h1" | "h2" | "h3"; alignment: "left" | "center"; }
export interface TextModuleData { text: string; alignment: "left" | "center"; }
export interface ImageModuleData { image: string; alt: string; caption: string; }
export interface ButtonModuleData { label: string; href: string; alignment: "left" | "center"; style: "primary" | "outline"; }
export interface DividerModuleData { style: "line" | "gold" | "space"; }
export interface GalleryModuleData { image1: string; image2: string; image3: string; }
export type ColumnWidgetType = "heading" | "text" | "image" | "button" | "divider" | "spacer";
export interface ColumnWidget { id: string; type: ColumnWidgetType; data: Record<string, unknown>; }
export interface ColumnsModuleData { layout: "two" | "three"; columns: ColumnWidget[][]; background: "transparent" | "charcoal" | "gold"; padding: "sm" | "md" | "lg"; }
export interface FaqModuleData { title: string; items: { question: string; answer: string }[]; }
export interface VideoModuleData { url: string; title: string; caption: string; }
export interface MapModuleData { embedUrl: string; title: string; address: string; height: "sm" | "md" | "lg"; }
export interface QuoteModuleData { quote: string; author: string; role: string; }
export interface IconListModuleData { title: string; items: string[]; style: "check" | "dot" | "arrow"; }
export interface CalloutModuleData { eyebrow: string; title: string; body: string; buttonLabel: string; href: string; style: "charcoal" | "gold" | "outline"; }

export type ModuleDataFor<T extends ModuleType> = T extends "hero"
  ? HeroModuleData
  : T extends "about"
  ? AboutModuleData
  : T extends "stats"
  ? StatsModuleData
  : T extends "ctaBar"
  ? CtaBarModuleData
  : T extends "portfolio"
  ? PortfolioModuleData
  : T extends "studio"
  ? StudioModuleData
  : T extends "contact"
  ? ContactModuleData
  : T extends "textSection"
  ? TextSectionModuleData
  : T extends "imageText"
  ? ImageTextModuleData
  : T extends "spacer"
  ? SpacerModuleData
  : T extends "heading"
  ? HeadingModuleData
  : T extends "text"
  ? TextModuleData
  : T extends "image"
  ? ImageModuleData
  : T extends "button"
  ? ButtonModuleData
  : T extends "divider"
  ? DividerModuleData
  : T extends "gallery"
  ? GalleryModuleData
  : T extends "columns"
  ? ColumnsModuleData
  : T extends "faq"
  ? FaqModuleData
  : T extends "video"
  ? VideoModuleData
  : T extends "map"
  ? MapModuleData
  : T extends "quote"
  ? QuoteModuleData
  : T extends "iconList"
  ? IconListModuleData
  : T extends "callout"
  ? CalloutModuleData
  : never;

/** A module as it lives inside Page.modules (JSON) — loosely typed data, validated on render. */
export interface Module {
  id: string;
  type: ModuleType;
  hidden?: boolean;
  data: Record<string, unknown>;
}

/** Polish display labels for every module type, used throughout the builder UI. */
export const MODULE_LABELS: Record<ModuleType, string> = {
  hero: "Hero",
  about: "O mnie / O artyście",
  stats: "Pasek statystyk",
  ctaBar: "Baner CTA",
  portfolio: "Portfolio / Galeria",
  studio: "Studio",
  contact: "Kontakt",
  textSection: "Sekcja tekstowa",
  imageText: "Obraz + tekst",
  spacer: "Odstęp",
  heading: "Nagłówek",
  text: "Tekst",
  image: "Obraz",
  button: "Przycisk",
  divider: "Separator",
  gallery: "Galeria zdjęć",
  columns: "Kolumny",
  faq: "FAQ / akordeon",
  video: "Wideo",
  map: "Mapa",
  quote: "Cytat / opinia",
  iconList: "Lista korzyści",
  callout: "Wyróżniony komunikat",
};

/** Short helper description shown in the "add module" picker. */
export const MODULE_DESCRIPTIONS: Record<ModuleType, string> = {
  hero: "Główna sekcja powitalna z nagłówkiem, opisem i przyciskami.",
  about: "Historia artysty, zdjęcia i podpis.",
  stats: "Liczby: doświadczenie, klienci, zaangażowanie, projekty.",
  ctaBar: "Wąski baner z wezwaniem do działania i przyciskiem.",
  portfolio: "Galeria prac — wszystkie lub wybrane ręcznie.",
  studio: "Zdjęcie i opis studia + baner CTA.",
  contact: "Dane kontaktowe i formularz wiadomości.",
  textSection: "Prosty blok tekstowy z nagłówkiem.",
  imageText: "Zdjęcie obok tekstu, z opcjonalnym przyciskiem.",
  spacer: "Pusty odstęp między sekcjami.",
  heading: "Samodzielny nagłówek z wyborem rozmiaru i wyrównania.",
  text: "Dowolny akapit lub krótki opis.",
  image: "Pojedyncze zdjęcie z opcjonalnym opisem.",
  button: "Link lub wezwanie do działania.",
  divider: "Delikatna linia albo oddech między elementami.",
  gallery: "Prosta galeria trzech własnych zdjęć.",
  columns: "Układ dwóch lub trzech kolumn; na telefonie ustawią się jedna pod drugą.",
  faq: "Rozwijane pytania i odpowiedzi.",
  video: "Film z YouTube lub Vimeo osadzony na stronie.",
  map: "Osadzona mapa Google Maps.",
  quote: "Opinia klienta, cytat lub wyróżniona rekomendacja.",
  iconList: "Lista zalet, informacji lub kolejnych kroków.",
  callout: "Wyróżniona treść z opcjonalnym przyciskiem.",
};

export const MODULE_CATEGORIES: Record<ModuleType, "widgets" | "templates"> = {
  heading: "widgets", text: "widgets", image: "widgets", button: "widgets", divider: "widgets", gallery: "widgets", columns: "widgets", spacer: "widgets", faq: "widgets", video: "widgets", map: "widgets", quote: "widgets", iconList: "widgets", callout: "widgets",
  hero: "templates", about: "templates", stats: "templates", ctaBar: "templates", portfolio: "templates", studio: "templates", contact: "templates", textSection: "templates", imageText: "templates",
};

export const MODULE_TYPE_ORDER: ModuleType[] = [
  "heading",
  "text",
  "image",
  "button",
  "gallery",
  "columns",
  "callout",
  "iconList",
  "faq",
  "quote",
  "video",
  "map",
  "divider",
  "spacer",
  "hero",
  "about",
  "stats",
  "ctaBar",
  "portfolio",
  "studio",
  "contact",
  "textSection",
  "imageText",
];

function generateModuleId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Default `data` for a freshly-added module of the given type. */
export function defaultModuleData(type: ModuleType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        eyebrow: "SZTUKA JEST WIECZNA.",
        heading1: "TWOJA HISTORIA.",
        heading2: "NASZE RZEMIOSŁO.",
        body: "Tworzymy unikalne tatuaże w najwyższej jakości.\nIndywidualne projekty. Realizm. Detal.\nSztuka, która zostaje na zawsze.",
        primaryBtnLabel: "UMÓW WIZYTĘ",
        secondaryBtnLabel: "OBEJRZYJ SHOWREEL",
        backgroundImage: "/images/texture-bg.jpg",
        portraitImage: "/images/portrait.jpg",
      } satisfies HeroModuleData;
    case "about":
      return {
        eyebrow: "O MNIE",
        heading1: "URODZONY GRZESZNIK.",
        heading2: "UKSZTAŁTOWANY ARTYSTA.",
        body: "Nazywam się Patryk i od 5 lat tworzę tatuaże,\nktóre zostają z ludźmi na zawsze.\nSpecjalizuję się w realizmie, szkicu i coverach.\nKażdy projekt to dla mnie nowe wyzwanie\ni okazja, żeby zamienić pomysł w coś wyjątkowego.",
        signatureName: "Patryk",
        signatureRole: "COOLINK TATTOO STUDIO",
        mainImage: "/images/crops/about-main.jpg",
        detailImage1: "/images/crops/about-gun.jpg",
        detailImage2: "/images/crops/about-back.jpg",
        detailImage3: "/images/crops/about-process.jpg",
      } satisfies AboutModuleData;
    case "stats":
      return { items: [{ value: "5+", label: "LAT DOŚWIADCZENIA" }, { value: "1000+", label: "ZADOWOLONYCH KLIENTÓW" }, { value: "100%", label: "ZAANGAŻOWANIA" }, { value: "1/1", label: "INDYWIDUALNE PROJEKTY" }] } satisfies StatsModuleData;
    case "ctaBar":
      return {
        title1: "SZUKASZ ARTYSTY,",
        title2: "KTÓRY ZROZUMIE TWÓJ POMYSŁ?",
        message: "Porozmawiajmy o Twoim tatuażu.",
        buttonLabel: "UMÓW WIZYTĘ",
        href: "#contact",
      } satisfies CtaBarModuleData;
    case "portfolio":
      return {
        eyebrow: "PORTFOLIO",
        heading1: "WYBRANE",
        heading2: "PRACE.",
        body: "Każdy projekt to historia.\nRealizm. Detal. Charakter.\nTatuaże, które mówią więcej niż słowa.",
        primaryBtnLabel: "ZOBACZ PORTFOLIO",
        secondaryBtnLabel: "OBEJRZYJ REEL",
        selectionMode: "all",
        selectedIds: [],
      } satisfies PortfolioModuleData;
    case "studio":
      return {
        eyebrow: "STUDIO",
        heading1: "COOLINK",
        heading2: "TATTOO STUDIO.",
        body: "Miejsce stworzone z pasji do tatuażu.\nProfesjonalizm, higiena i indywidualne podejście\nto dla nas standard.\nDbamy o każdy detal, abyś czuł się komfortowo\nod pierwszej konsultacji, aż po finalny efekt.",
        primaryBtnLabel: "ODWIEDŹ STUDIO",
        secondaryBtnLabel: "ZOBACZ WNĘTRZE",
        image: "/images/crops/studio-room.jpg",
        ctaTitle1: "MASZ POMYSŁ?",
        ctaTitle2: "ZRÓBMY TO NAPRAWDĘ.",
        ctaMessage: "Podziel się swoją wizją, a zaprojektujemy coś stworzonego specjalnie dla Ciebie.",
      } satisfies StudioModuleData;
    case "contact":
      return {
        eyebrow: "KONTAKT",
        heading1: "NAPISZ",
        heading2: "DO NAS.",
        body: "Masz pomysł na tatuaż, ale nie wiesz od czego zacząć?\nNapisz do nas, umówmy się na konsultację\ni porozmawiajmy o Twoim projekcie.",
        address: "ul. Artystyczna 12, 00-001 Warszawa",
        phone: "+48 500 100 200",
        email: "kontakt@coolink-tattoo.pl",
        hours: "Wt–Sob: 11:00 – 19:00",
      } satisfies ContactModuleData;
    case "textSection":
      return {
        eyebrow: "",
        heading1: "NOWA SEKCJA",
        heading2: "",
        body: "Wpisz tutaj treść tej sekcji.",
        alignment: "left",
      } satisfies TextSectionModuleData;
    case "imageText":
      return {
        image: "",
        heading1: "NOWA SEKCJA",
        heading2: "",
        body: "Wpisz tutaj treść tej sekcji.",
        buttonLabel: "",
        buttonUrl: "",
        imagePosition: "right",
      } satisfies ImageTextModuleData;
    case "spacer":
      return { size: "md" } satisfies SpacerModuleData;
    case "heading":
      return { text: "Nowy nagłówek", level: "h2", alignment: "left" } satisfies HeadingModuleData;
    case "text":
      return { text: "Wpisz tutaj swoją treść.", alignment: "left" } satisfies TextModuleData;
    case "image":
      return { image: "", alt: "", caption: "" } satisfies ImageModuleData;
    case "button":
      return { label: "Dowiedz się więcej", href: "#", alignment: "left", style: "primary" } satisfies ButtonModuleData;
    case "divider":
      return { style: "line" } satisfies DividerModuleData;
    case "gallery":
      return { image1: "", image2: "", image3: "" } satisfies GalleryModuleData;
    case "columns":
      return {
        layout: "two",
        background: "transparent",
        padding: "md",
        columns: [
          [{ id: generateModuleId(), type: "heading", data: defaultModuleData("heading") }, { id: generateModuleId(), type: "text", data: defaultModuleData("text") }],
          [{ id: generateModuleId(), type: "heading", data: { text: "Druga kolumna", level: "h2", alignment: "left" } }, { id: generateModuleId(), type: "text", data: defaultModuleData("text") }],
        ],
      } satisfies ColumnsModuleData;
    case "faq":
      return { title: "Najczęściej zadawane pytania", items: [{ question: "Pytanie", answer: "Wpisz odpowiedź na to pytanie." }] } satisfies FaqModuleData;
    case "video":
      return { url: "", title: "Wideo", caption: "" } satisfies VideoModuleData;
    case "map":
      return { embedUrl: "", title: "Jak do nas trafić", address: "", height: "md" } satisfies MapModuleData;
    case "quote":
      return { quote: "Tutaj wpisz opinię klienta lub ważny cytat.", author: "Imię i nazwisko", role: "Klient" } satisfies QuoteModuleData;
    case "iconList":
      return { title: "Dlaczego warto", items: ["Pierwsza korzyść", "Druga korzyść", "Trzecia korzyść"], style: "check" } satisfies IconListModuleData;
    case "callout":
      return { eyebrow: "WYRÓŻNIONA INFORMACJA", title: "Przyciągnij uwagę odbiorcy", body: "Dodaj krótki opis tego, co jest dla klienta najważniejsze.", buttonLabel: "Dowiedz się więcej", href: "#", style: "charcoal" } satisfies CalloutModuleData;
    default:
      return {};
  }
}

export function createModule(type: ModuleType): Module {
  return {
    id: generateModuleId(),
    type,
    hidden: false,
    data: defaultModuleData(type),
  };
}

/** Default homepage structure — used only to seed the homepage the first time. */
export function defaultHomepageModules(): Module[] {
  return [
    { id: generateModuleId(), type: "hero", hidden: false, data: defaultModuleData("hero") },
    { id: generateModuleId(), type: "stats", hidden: false, data: defaultModuleData("stats") },
    { id: generateModuleId(), type: "about", hidden: false, data: defaultModuleData("about") },
    { id: generateModuleId(), type: "ctaBar", hidden: false, data: defaultModuleData("ctaBar") },
    { id: generateModuleId(), type: "portfolio", hidden: false, data: defaultModuleData("portfolio") },
    { id: generateModuleId(), type: "studio", hidden: false, data: defaultModuleData("studio") },
    { id: generateModuleId(), type: "contact", hidden: false, data: defaultModuleData("contact") },
  ];
}

/** Type guard-ish helper: makes sure required fields exist even on older/partial module data. */
export function withDefaults<T extends ModuleType>(
  type: T,
  data: Record<string, unknown> | undefined | null
): ModuleDataFor<T> {
  return { ...(defaultModuleData(type) as object), ...(data || {}) } as unknown as ModuleDataFor<T>;
}

export type { SiteContent };
