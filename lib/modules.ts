import type { SiteContent } from "@/lib/content";

export type ModuleType =
  | "hero"
  | "about"
  | "stats"
  | "ctaBar"
  | "portfolio"
  | "studio"
  | "contact"
  | "booking"
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
  | "callout"
  | "customCode";

export interface ModuleBase {
  id: string;
  type: ModuleType;
  /** Hidden modules stay in the structure (so settings aren't lost) but don't render publicly. */
  hidden?: boolean;
}

/** Optional visual layer shared by every module. Older Page.modules simply omit it. */
export interface ModuleStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto";
  overlayColor?: string;
  overlayOpacity?: number;
  radius?: "none" | "sm" | "md" | "lg";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  margin?: "none" | "sm" | "md" | "lg" | "xl";
  contentWidth?: "full" | "wide" | "normal" | "narrow";
  surface?: "plain" | "card" | "outline" | "glass";
  shadow?: "none" | "sm" | "md" | "lg";
  borderColor?: string;
  borderWidth?: number;
  minHeight?: number;
  opacity?: number;
  customCss?: string;
  cssClass?: string;
  anchorId?: string;
  hiddenOn?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
  color?: string;
  fontFamily?: "inherit" | "display" | "body";
  fontSize?: number;
  fontWeight?: "300" | "400" | "500" | "600" | "700";
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  marginBox?: SpacingBox;
  paddingBox?: SpacingBox;
  zIndex?: number;
}

export interface SpacingBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
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
  primaryBtnHref: string;
  secondaryBtnLabel: string;
  secondaryBtnHref: string;
  backgroundImage: string;
  portraitImage: string;
  portraitAlt: string;
  stampRingText: string;
  stampLeftText: string;
  stampCenterText: string;
  stampRightText: string;
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
  mainImageAlt: string;
  detailImage1Alt: string;
  detailImage2Alt: string;
  detailImage3Alt: string;
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
  primaryBtnHref: string;
  secondaryBtnLabel: string;
  secondaryBtnHref: string;
  emptyMessage: string;
  selectionMode: "all" | "selected";
  selectedIds: string[];
}

export interface StudioModuleData {
  eyebrow: string;
  heading1: string;
  heading2: string;
  body: string;
  primaryBtnLabel: string;
  primaryBtnHref: string;
  secondaryBtnLabel: string;
  secondaryBtnHref: string;
  image: string;
  imageAlt: string;
  ctaTitle1: string;
  ctaTitle2: string;
  ctaMessage: string;
  ctaButtonLabel: string;
  ctaButtonHref: string;
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
  contactSource: "global" | "module";
  addressLabel: string;
  phoneLabel: string;
  emailLabel: string;
  hoursLabel: string;
  formTitle: string;
  formDescription: string;
  formNameLabel: string;
  formNamePlaceholder: string;
  formEmailLabel: string;
  formEmailPlaceholder: string;
  formSubjectLabel: string;
  formSubjectPlaceholder: string;
  formMessageLabel: string;
  formMessagePlaceholder: string;
  formSubmitLabel: string;
  formSendingLabel: string;
  formSuccessMessage: string;
  /** Calendar shown in place of the retired public contact form. */
  booking: BookingModuleData;
}

export interface BookingModuleData {
  eyebrow: string;
  heading: string;
  body: string;
  calendarLabel: string;
  legend: string;
  freeLabel: string;
  consultationLabel: string;
  unavailableLabel: string;
  unmarkedLabel: string;
  unavailableMessage: string;
  partiallyBookedMessage: string;
  addToProjectLabel: string;
  newVisitLabel: string;
  proposeButtonLabel: string;
  bookingButtonLabel: string;
  consultationButtonLabel: string;
  eventFallbackLabel: string;
  promotionFallbackLabel: string;
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
  imageAlt: string;
  emptyMessage: string;
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
export interface HeadingModuleData { text: string; level: "h1" | "h2" | "h3"; alignment: "left" | "center"; icon?: string; }
export interface TextModuleData { text: string; alignment: "left" | "center"; }
export interface ImageModuleData { image: string; alt: string; caption: string; }
export interface ButtonModuleData { label: string; href: string; alignment: "left" | "center" | "right"; style: "primary" | "outline"; icon?: string; iconPosition?: "left" | "right"; width?: "auto" | "full"; }
export interface DividerModuleData { style: "line" | "gold" | "space"; icon?: string; }
export interface GalleryModuleData { image1: string; image2: string; image3: string; images?: string[]; layout?: "grid" | "masonry"; columns?: { desktop: number; tablet: number; mobile: number }; gap?: "sm" | "md" | "lg"; radius?: "none" | "sm" | "md" | "lg"; lightbox?: boolean; }
export type ColumnWidgetType =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "gallery"
  | "faq"
  | "video"
  | "map"
  | "quote"
  | "iconList"
  | "callout"
  | "customCode";
export interface ColumnWidget { id: string; type: ColumnWidgetType; data: Record<string, unknown>; style?: ModuleStyle; }
export interface ColumnsModuleData {
  layout: "one" | "two" | "three" | "four";
  columns: ColumnWidget[][];
  background: "transparent" | "charcoal" | "gold";
  padding: "sm" | "md" | "lg";
  gap?: number;
  verticalAlign?: "start" | "center" | "end" | "stretch";
  columnWidths?: number[];
}
export interface FaqModuleData { title: string; items: { question: string; answer: string }[]; variant: "lines" | "cards" | "split"; initiallyOpen: "none" | "first"; }
export interface VideoModuleData { url: string; title: string; caption: string; }
export interface MapModuleData { embedUrl: string; title: string; address: string; height: "sm" | "md" | "lg"; }
export interface QuoteModuleData { quote: string; author: string; role: string; variant: "editorial" | "card" | "centered"; }
export interface IconListModuleData { title: string; items: string[]; style: "check" | "dot" | "arrow"; layout: "list" | "cards" | "steps"; columns: "one" | "two" | "three"; }
export interface CalloutModuleData { eyebrow: string; title: string; body: string; buttonLabel: string; href: string; style: "charcoal" | "gold" | "outline"; }
export interface CustomCodeModuleData { title: string; html: string; css: string; height: number; backgroundColor: string; }

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
  : T extends "booking"
  ? BookingModuleData
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
  : T extends "customCode"
  ? CustomCodeModuleData
  : never;

/** A module as it lives inside Page.modules (JSON) — loosely typed data, validated on render. */
export interface Module {
  id: string;
  type: ModuleType;
  hidden?: boolean;
  data: Record<string, unknown>;
  style?: ModuleStyle;
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
  booking: "Kalendarz rezerwacji",
  textSection: "Sekcja tekstowa",
  imageText: "Obraz + tekst",
  spacer: "Odstęp",
  heading: "Nagłówek",
  text: "Tekst",
  image: "Obraz",
  button: "Przycisk",
  divider: "Separator",
  gallery: "Galeria zdjęć",
  columns: "Sekcja / kolumny",
  faq: "FAQ / akordeon",
  video: "Wideo",
  map: "Mapa",
  quote: "Cytat / opinia",
  iconList: "Lista korzyści",
  callout: "Wyróżniony komunikat",
  customCode: "Własny HTML + CSS",
};

/** Short helper description shown in the "add module" picker. */
export const MODULE_DESCRIPTIONS: Record<ModuleType, string> = {
  hero: "Główna sekcja powitalna z nagłówkiem, opisem i przyciskami.",
  about: "Historia artysty, zdjęcia i podpis.",
  stats: "Liczby: doświadczenie, klienci, zaangażowanie, projekty.",
  ctaBar: "Wąski baner z wezwaniem do działania i przyciskiem.",
  portfolio: "Galeria prac — wszystkie lub wybrane ręcznie.",
  studio: "Zdjęcie i opis studia + baner CTA.",
  contact: "Dane kontaktowe i kalendarz rezerwacji.",
  booking: "Publiczny kalendarz wolnych terminów z własnymi nagłówkami i komunikatami.",
  textSection: "Prosty blok tekstowy z nagłówkiem.",
  imageText: "Zdjęcie obok tekstu, z opcjonalnym przyciskiem.",
  spacer: "Pusty odstęp między sekcjami.",
  heading: "Samodzielny nagłówek z wyborem rozmiaru i wyrównania.",
  text: "Dowolny akapit lub krótki opis.",
  image: "Pojedyncze zdjęcie z opcjonalnym opisem.",
  button: "Link lub wezwanie do działania.",
  divider: "Delikatna linia albo oddech między elementami.",
  gallery: "Prosta galeria trzech własnych zdjęć.",
  columns: "Sekcja dzielona na 1–4 kolumny z widgetami przeciąganymi do środka.",
  faq: "Rozwijane pytania i odpowiedzi.",
  video: "Film z YouTube lub Vimeo osadzony na stronie.",
  map: "Osadzona mapa Google Maps.",
  quote: "Opinia klienta, cytat lub wyróżniona rekomendacja.",
  iconList: "Lista zalet, informacji lub kolejnych kroków.",
  callout: "Wyróżniona treść z opcjonalnym przyciskiem.",
  customCode: "Zaawansowany, izolowany blok z własnym kodem HTML i CSS.",
};

export const MODULE_CATEGORIES: Record<ModuleType, "widgets" | "templates"> = {
  heading: "widgets", text: "widgets", image: "widgets", button: "widgets", divider: "widgets", gallery: "widgets", columns: "widgets", spacer: "widgets", faq: "widgets", video: "widgets", map: "widgets", quote: "widgets", iconList: "widgets", callout: "widgets", customCode: "widgets",
  hero: "templates", about: "templates", stats: "templates", ctaBar: "templates", portfolio: "templates", studio: "templates", contact: "templates", booking: "templates", textSection: "templates", imageText: "templates",
};

export const MODULE_TYPE_ORDER: ModuleType[] = [
  "heading",
  "text",
  "image",
  "button",
  "gallery",
  "columns",
  "callout",
  "customCode",
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
  "booking",
  "textSection",
  "imageText",
];

export const COLUMN_WIDGET_TYPES: ColumnWidgetType[] = [
  "heading", "text", "image", "button", "gallery", "callout", "iconList",
  "faq", "quote", "video", "map", "divider", "spacer", "customCode",
];

export function isColumnWidgetType(type: string): type is ColumnWidgetType {
  return (COLUMN_WIDGET_TYPES as string[]).includes(type);
}

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
        primaryBtnHref: "#kalendarz",
        secondaryBtnLabel: "OBEJRZYJ SHOWREEL",
        secondaryBtnHref: "#portfolio",
        backgroundImage: "/images/texture-bg.jpg",
        portraitImage: "/images/portrait.jpg",
        portraitAlt: "Portret artysty tatuażu CoolInk",
        stampRingText: "COOLINK · TATTOO STUDIO ·",
        stampLeftText: "20",
        stampCenterText: "GT",
        stampRightText: "21",
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
        mainImageAlt: "Szczegółowa realistyczna praca tatuażu",
        detailImage1Alt: "Maszynka do tatuażu w dłoni artysty",
        detailImage2Alt: "Precyzyjny tatuaż dotwork na plecach",
        detailImage3Alt: "Zbliżenie na proces tatuowania",
      } satisfies AboutModuleData;
    case "stats":
      return { items: [{ value: "5+", label: "LAT DOŚWIADCZENIA" }, { value: "1000+", label: "ZADOWOLONYCH KLIENTÓW" }, { value: "100%", label: "ZAANGAŻOWANIA" }, { value: "1/1", label: "INDYWIDUALNE PROJEKTY" }] } satisfies StatsModuleData;
    case "ctaBar":
      return {
        title1: "SZUKASZ ARTYSTY,",
        title2: "KTÓRY ZROZUMIE TWÓJ POMYSŁ?",
        message: "Porozmawiajmy o Twoim tatuażu.",
        buttonLabel: "UMÓW WIZYTĘ",
        href: "#kalendarz",
      } satisfies CtaBarModuleData;
    case "portfolio":
      return {
        eyebrow: "PORTFOLIO",
        heading1: "WYBRANE",
        heading2: "PRACE.",
        body: "Każdy projekt to historia.\nRealizm. Detal. Charakter.\nTatuaże, które mówią więcej niż słowa.",
        primaryBtnLabel: "ZOBACZ PORTFOLIO",
        primaryBtnHref: "#portfolio",
        secondaryBtnLabel: "OBEJRZYJ REEL",
        secondaryBtnHref: "#portfolio",
        emptyMessage: "Portfolio pojawi się wkrótce.",
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
        primaryBtnHref: "#contact",
        secondaryBtnLabel: "ZOBACZ WNĘTRZE",
        secondaryBtnHref: "#studio",
        image: "/images/crops/studio-room.jpg",
        imageAlt: "Wnętrze studia CoolInk z fotelem do tatuażu",
        ctaTitle1: "MASZ POMYSŁ?",
        ctaTitle2: "ZRÓBMY TO NAPRAWDĘ.",
        ctaMessage: "Podziel się swoją wizją, a zaprojektujemy coś stworzonego specjalnie dla Ciebie.",
        ctaButtonLabel: "UMÓW WIZYTĘ",
        ctaButtonHref: "#kalendarz",
      } satisfies StudioModuleData;
    case "contact":
      return {
        eyebrow: "KONTAKT",
        heading1: "NAPISZ",
        heading2: "DO NAS.",
        body: "Masz pomysł na tatuaż, ale nie wiesz od czego zacząć?\nNapisz do nas, umówmy się na konsultację\ni porozmawiajmy o Twoim projekcie.",
        address: "al. Konstytucji 3 Maja 10, 65-001 Zielona Góra",
        phone: "+48 530 178 346",
        email: "kontakt@coolinktattoo.pl",
        hours: "Wt–Sob: 11:00 – 18:00",
        contactSource: "global",
        addressLabel: "ADRES",
        phoneLabel: "TELEFON",
        emailLabel: "EMAIL",
        hoursLabel: "GODZINY",
        formTitle: "NAPISZ WIADOMOŚĆ",
        formDescription: "Odpowiadamy zwykle w ciągu 24 godzin.",
        formNameLabel: "IMIĘ I NAZWISKO",
        formNamePlaceholder: "Jan Kowalski",
        formEmailLabel: "EMAIL",
        formEmailPlaceholder: "jan@email.pl",
        formSubjectLabel: "TEMAT",
        formSubjectPlaceholder: "Realizm, rękaw, cover-up...",
        formMessageLabel: "WIADOMOŚĆ",
        formMessagePlaceholder: "Opisz swój pomysł na tatuaż...",
        formSubmitLabel: "WYŚLIJ WIADOMOŚĆ",
        formSendingLabel: "WYSYŁANIE…",
        formSuccessMessage: "Dziękujemy — wiadomość została wysłana. Odpowiemy możliwie szybko.",
        booking: defaultModuleData("booking") as unknown as BookingModuleData,
      } satisfies ContactModuleData;
    case "booking":
      return {
        eyebrow: "UMÓW WIZYTĘ",
        heading: "Sprawdź wolne terminy.",
        body: "Wybierz zielony termin. Po zalogowaniu wrócimy dokładnie do wybranej daty, aby dokończyć prośbę o wizytę.",
        calendarLabel: "KALENDARZ DOSTĘPNOŚCI",
        legend: "Szary oznacza brak udostępnionego terminu. Zielony — wolny termin. Niebieski — konsultację. Czerwony — niedostępny.",
        freeLabel: "WOLNY",
        consultationLabel: "KONSULTACJA",
        unavailableLabel: "NIEDOSTĘPNY",
        unmarkedLabel: "BRAK OZNACZENIA",
        unavailableMessage: "Ten dzień nie został udostępniony jako wolny termin.",
        partiallyBookedMessage: "Ten wolny termin został już częściowo wykorzystany. Wybierz inny dzień albo napisz do studia.",
        addToProjectLabel: "DODAJ DO ISTNIEJĄCEGO PROJEKTU (OPCJONALNIE)",
        newVisitLabel: "Nowa wizyta",
        proposeButtonLabel: "ZAPROPONUJ WIZYTĘ",
        bookingButtonLabel: "UMÓW WIZYTĘ",
        consultationButtonLabel: "UMÓW KONSULTACJĘ",
        eventFallbackLabel: "EVENT",
        promotionFallbackLabel: "PROMO",
      } satisfies BookingModuleData;
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
        imageAlt: "",
        emptyMessage: "Brak wybranego obrazu",
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
      return { text: "Nowy nagłówek", level: "h2", alignment: "left", icon: "" } satisfies HeadingModuleData;
    case "text":
      return { text: "Wpisz tutaj swoją treść.", alignment: "left" } satisfies TextModuleData;
    case "image":
      return { image: "", alt: "", caption: "" } satisfies ImageModuleData;
    case "button":
      return { label: "Dowiedz się więcej", href: "#", alignment: "left", style: "primary", icon: "", iconPosition: "left", width: "auto" } satisfies ButtonModuleData;
    case "divider":
      return { style: "line", icon: "" } satisfies DividerModuleData;
    case "gallery":
      return { image1: "", image2: "", image3: "", images: [], layout: "grid", columns: { desktop: 3, tablet: 2, mobile: 1 }, gap: "md", radius: "none", lightbox: true } satisfies GalleryModuleData;
    case "columns":
      return {
        layout: "one",
        background: "transparent",
        padding: "md",
        gap: 24,
        verticalAlign: "start",
        columnWidths: [100],
        columns: [[]],
      } satisfies ColumnsModuleData;
    case "faq":
      return { title: "Najczęściej zadawane pytania", items: [{ question: "Pytanie", answer: "Wpisz odpowiedź na to pytanie." }], variant: "lines", initiallyOpen: "none" } satisfies FaqModuleData;
    case "video":
      return { url: "", title: "Wideo", caption: "" } satisfies VideoModuleData;
    case "map":
      return { embedUrl: "", title: "Jak do nas trafić", address: "", height: "md" } satisfies MapModuleData;
    case "quote":
      return { quote: "Tutaj wpisz opinię klienta lub ważny cytat.", author: "Imię i nazwisko", role: "Klient", variant: "editorial" } satisfies QuoteModuleData;
    case "iconList":
      return { title: "Dlaczego warto", items: ["Pierwsza korzyść", "Druga korzyść", "Trzecia korzyść"], style: "check", layout: "list", columns: "one" } satisfies IconListModuleData;
    case "callout":
      return { eyebrow: "WYRÓŻNIONA INFORMACJA", title: "Przyciągnij uwagę odbiorcy", body: "Dodaj krótki opis tego, co jest dla klienta najważniejsze.", buttonLabel: "Dowiedz się więcej", href: "#", style: "charcoal" } satisfies CalloutModuleData;
    case "customCode":
      return {
        title: "Własna sekcja",
        html: '<section class="custom-section"><p class="eyebrow">WŁASNY MODUŁ</p><h2>Pełna swoboda HTML i CSS</h2><p>Zbuduj dowolny układ w bezpiecznie odizolowanym podglądzie.</p></section>',
        css: "body { margin: 0; background: #111; color: #f5f5f5; font-family: Arial, sans-serif; }\n.custom-section { padding: 48px; }\n.eyebrow { color: #c8a86b; letter-spacing: .18em; font-size: 12px; }\nh2 { margin: 12px 0; font-size: clamp(32px, 6vw, 72px); }\np { line-height: 1.7; }",
        height: 420,
        backgroundColor: "#111111",
      } satisfies CustomCodeModuleData;
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
    { id: generateModuleId(), type: "iconList", hidden: false, data: { title: "Od pomysłu do zagojonego tatuażu", style: "arrow", items: ["Krótki brief i wybór bezpiecznego wolnego terminu", "Konsultacja, indywidualny projekt i jasne ustalenia", "Sesja w kameralnym studiu oraz instrukcja pielęgnacji"] } },
    { id: generateModuleId(), type: "stats", hidden: false, data: { items: [{ value: "ZIELONA GÓRA", label: "STUDIO STACJONARNE" }, { value: "1 / 1", label: "INDYWIDUALNY PROJEKT" }, { value: "WT–SOB", label: "11:00–18:00" }, { value: "ONLINE", label: "REZERWACJE I KONTO" }] } },
    { id: generateModuleId(), type: "about", hidden: false, data: defaultModuleData("about") },
    { id: generateModuleId(), type: "ctaBar", hidden: false, data: defaultModuleData("ctaBar") },
    { id: generateModuleId(), type: "portfolio", hidden: false, data: defaultModuleData("portfolio") },
    { id: generateModuleId(), type: "studio", hidden: false, data: defaultModuleData("studio") },
    { id: generateModuleId(), type: "faq", hidden: false, data: { title: "Zanim zarezerwujesz", items: [
      { question: "Jak wygląda rezerwacja?", answer: "Wybierz dostępny termin i opisz pomysł. Po zalogowaniu wyślesz prośbę, a studio potwierdzi szczegóły w Twoim koncie." },
      { question: "Czy projekt jest indywidualny?", answer: "Tak. Kierunek projektu, rozmiar i miejsce ustalamy przed sesją. Podgląd i wiadomości znajdziesz w koncie klienta." },
      { question: "Jak przygotować się do wizyty?", answer: "Przed terminem otrzymasz aktualne zalecenia w koncie. Nie opalaj miejsca, odpocznij, zjedz posiłek i poinformuj studio o przeciwwskazaniach." },
      { question: "Gdzie znajduje się studio?", answer: "al. Konstytucji 3 Maja 10, 65-001 Zielona Góra. Aktualne godziny i dane kontaktowe są w sekcji Kontakt." }
    ] } },
    { id: generateModuleId(), type: "callout", hidden: false, data: { eyebrow: "GOTOWY NA PIERWSZY KROK?", title: "Sprawdź realnie dostępne terminy", body: "Zamiast czekać na odpowiedź w wiadomościach, wybierz termin i śledź cały proces w jednym miejscu.", buttonLabel: "ZOBACZ WOLNE TERMINY", href: "#kalendarz", style: "outline" } },
    { id: generateModuleId(), type: "contact", hidden: false, data: defaultModuleData("contact") },
  ];
}

/** Type guard-ish helper: makes sure required fields exist even on older/partial module data. */
export function withDefaults<T extends ModuleType>(
  type: T,
  data: Record<string, unknown> | undefined | null
): ModuleDataFor<T> {
  const defaults = defaultModuleData(type) as Record<string, unknown>;
  const merged = { ...defaults, ...(data || {}) };
  if (type === "contact") {
    const defaultBooking = defaults.booking as Record<string, unknown>;
    const savedBooking = data?.booking && typeof data.booking === "object" && !Array.isArray(data.booking) ? data.booking as Record<string, unknown> : {};
    merged.booking = { ...defaultBooking, ...savedBooking };
  }
  return merged as unknown as ModuleDataFor<T>;
}

export type { SiteContent };
