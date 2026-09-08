import type { SiteContent } from "@/lib/content";

export type ModuleType =
  | "siteHeader"
  | "siteFooter"
  | "maintenance"
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
  | "navigation"
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

export interface SiteHeaderModuleData {
  logoUrl: string;
  logoAlt: string;
  brandName: string;
  bookLabel: string;
  bookHref: string;
  clientAreaLabel: string;
  clientAreaHref: string;
  navItems: { id: string; label: string; href: string }[];
}

export interface SiteFooterModuleData {
  logoUrl: string;
  logoAlt: string;
  brandName: string;
  text: string;
  privacyLabel: string;
  privacyHref: string;
  navItems: { id: string; label: string; href: string }[];
}

export interface MaintenanceModuleData {
  brandLabel: string;
  statusLabel: string;
  headingLine1: string;
  headingLine2: string;
  message: string;
  mark: string;
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
  instagramUrl: string;
  facebookUrl: string;
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
export interface ImageModuleData { image: string; alt: string; caption: string; aspect?: "square" | "portrait" | "landscape" | "wide"; fit?: "cover" | "contain"; maxWidth?: number; alignment?: "left" | "center" | "right"; }
export interface ButtonModuleData { label: string; href: string; alignment: "left" | "center" | "right"; style: "primary" | "outline"; icon?: string; iconPosition?: "left" | "right"; width?: "auto" | "full"; }
export interface NavigationModuleData { items: { id: string; label: string; href: string }[]; alignment: "left" | "center" | "right"; mobileLabel: string; style: "plain" | "pills"; }
export interface DividerModuleData { style: "line" | "gold" | "space"; icon?: string; }
export interface GalleryModuleData { image1: string; image2: string; image3: string; images?: string[]; layout?: "grid" | "masonry"; columns?: { desktop: number; tablet: number; mobile: number }; gap?: "sm" | "md" | "lg"; radius?: "none" | "sm" | "md" | "lg"; lightbox?: boolean; }
export type ColumnWidgetType =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "navigation"
  | "portfolio"
  | "booking"
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
  mobileLayout?: "stack" | "row";
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
  : T extends "navigation"
  ? NavigationModuleData
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
  : T extends "siteHeader"
  ? SiteHeaderModuleData
  : T extends "siteFooter"
  ? SiteFooterModuleData
  : T extends "maintenance"
  ? MaintenanceModuleData
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
  siteHeader: "Nagłówek strony",
  siteFooter: "Stopka strony",
  maintenance: "Ekran budowy",
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
  navigation: "Menu nawigacyjne",
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
  siteHeader: "Globalny nagłówek z logo, menu i przyciskami.",
  siteFooter: "Globalna stopka z menu, logo i informacjami prawnymi.",
  maintenance: "Ekran widoczny dla klientów podczas trybu budowy.",
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
  navigation: "Edytowalne menu strony z automatycznym wariantem mobilnym.",
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
  heading: "widgets", text: "widgets", image: "widgets", button: "widgets", navigation: "widgets", divider: "widgets", gallery: "widgets", columns: "widgets", spacer: "widgets", faq: "widgets", video: "widgets", map: "widgets", quote: "widgets", iconList: "widgets", callout: "widgets", customCode: "widgets",
  siteHeader: "templates", siteFooter: "templates", maintenance: "templates", hero: "templates", about: "templates", stats: "templates", ctaBar: "templates", portfolio: "templates", studio: "templates", contact: "templates", booking: "templates", textSection: "templates", imageText: "templates",
};

export const MODULE_TYPE_ORDER: ModuleType[] = [
  "heading",
  "text",
  "image",
  "button",
  "navigation",
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
  "siteHeader",
  "siteFooter",
  "maintenance",
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
  "heading", "text", "image", "button", "navigation", "portfolio", "booking", "gallery", "callout", "iconList",
  "faq", "quote", "video", "map", "divider", "spacer", "customCode",
];

export function isColumnWidgetType(type: string): type is ColumnWidgetType {
  return (COLUMN_WIDGET_TYPES as string[]).includes(type);
}

export function generateModuleId(prefix = "m") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneColumnWidget(widget: ColumnWidget): ColumnWidget {
  return {
    ...cloneValue(widget),
    id: generateModuleId("w"),
  };
}

/** Deep builder clone: nested widget IDs must never be shared by two sections. */
export function cloneBuilderModule(module: Module): Module {
  const clone = cloneValue(module);
  clone.id = generateModuleId();
  if (clone.type === "columns") {
    const data = withDefaults("columns", clone.data);
    clone.data = {
      ...data,
      columns: data.columns.map((column) => column.map(cloneColumnWidget)),
    };
  }
  return clone;
}

/** Default `data` for a freshly-added module of the given type. */
export function defaultModuleData(type: ModuleType): Record<string, unknown> {
  switch (type) {
    case "siteHeader":
      return {
        logoUrl: "/images/logo-white.jpg", logoAlt: "CoolInk Tattoo Studio — logo", brandName: "COOLINK",
        bookLabel: "UMÓW WIZYTĘ", bookHref: "/#kalendarz", clientAreaLabel: "KONTO KLIENTA", clientAreaHref: "/app",
        navItems: [{ id: "home", label: "STRONA GŁÓWNA", href: "/#home" }, { id: "artists", label: "O MNIE", href: "/#artists" }, { id: "portfolio", label: "PORTFOLIO", href: "/#portfolio" }, { id: "studio", label: "STUDIO", href: "/#studio" }, { id: "contact", label: "KONTAKT", href: "/#contact" }],
      } satisfies SiteHeaderModuleData;
    case "siteFooter":
      return {
        logoUrl: "/images/logo-white.jpg", logoAlt: "CoolInk Tattoo Studio — logo", brandName: "COOLINK", text: "CoolInk Tattoo Studio. Wszelkie prawa zastrzeżone.", privacyLabel: "POLITYKA PRYWATNOŚCI", privacyHref: "/polityka-prywatnosci",
        navItems: [{ id: "home", label: "STRONA GŁÓWNA", href: "/#home" }, { id: "portfolio", label: "PORTFOLIO", href: "/#portfolio" }, { id: "contact", label: "KONTAKT", href: "/#contact" }],
      } satisfies SiteFooterModuleData;
    case "maintenance":
      return { brandLabel: "COOLINK TATTOO STUDIO", statusLabel: "TRYB BUDOWY", headingLine1: "ZAPRASZAM", headingLine2: "WKRÓTCE", message: "Dopracowuję przestrzeń. Wróć za chwilę — będzie warto.", mark: "P" } satisfies MaintenanceModuleData;
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
        instagramUrl: "https://instagram.com/coolink.tattoo.studio",
        facebookUrl: "https://facebook.com/coolink.tattoo.studio",
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
        unmarkedLabel: "",
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
      return { image: "", alt: "", caption: "", aspect: "landscape", fit: "cover", maxWidth: 0, alignment: "left" } satisfies ImageModuleData;
    case "button":
      return { label: "Dowiedz się więcej", href: "#", alignment: "left", style: "primary", icon: "", iconPosition: "left", width: "auto" } satisfies ButtonModuleData;
    case "navigation":
      return { items: [{ id: "start", label: "START", href: "/#home" }, { id: "portfolio", label: "PORTFOLIO", href: "/#portfolio" }, { id: "booking", label: "REZERWACJA", href: "/#kalendarz" }], alignment: "center", mobileLabel: "MENU", style: "plain" } satisfies NavigationModuleData;
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
        mobileLayout: "stack",
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

function homepageWidget(type: ColumnWidgetType, data: Record<string, unknown>, style?: ModuleStyle): ColumnWidget {
  return { id: generateModuleId("w"), type, data: { ...defaultModuleData(type), ...data }, style };
}

function homepageSection(columns: ColumnWidget[][], options: { padding?: "sm" | "md" | "lg"; gap?: number; widths?: number[]; background?: "transparent" | "charcoal" | "gold"; style?: ModuleStyle } = {}): Module {
  const count = columns.length;
  return { id: generateModuleId(), type: "columns", hidden: false, data: {
    ...defaultModuleData("columns"),
    layout: (["one", "two", "three", "four"] as const)[count - 1],
    columns,
    background: options.background ?? "transparent",
    padding: options.padding ?? "md",
    gap: options.gap ?? 24,
    verticalAlign: "center",
    columnWidths: options.widths ?? Array(count).fill(100 / count),
  }, style: options.style };
}

/** Builder-native public site: every visible part is an independently editable widget. */
export function defaultHomepageModules(): Module[] {
  const booking = defaultModuleData("booking");
  const portfolio = defaultModuleData("portfolio");
  return [
    homepageSection([
      [
        homepageWidget("text", { text: "COOLINK / PRIVATE TATTOO STUDIO", alignment: "left" }, { color: "#c99a4a", fontSize: 12, letterSpacing: 2.6, textTransform: "uppercase" }),
        homepageWidget("heading", { text: "TATUAŻ, KTÓRY NIE POTRZEBUJE WYJAŚNIEŃ.", level: "h1", alignment: "left" }, { fontSize: 78, lineHeight: .92, letterSpacing: -.8 }),
        homepageWidget("text", { text: "Indywidualne projekty, mocny detal i spokojny proces — od pierwszej rozmowy do zagojonej pracy.", alignment: "left" }, { fontSize: 18, lineHeight: 1.55, color: "#b7b2aa" }),
        homepageWidget("button", { label: "SPRAWDŹ WOLNE TERMINY", href: "#kalendarz", alignment: "left", style: "primary", width: "auto", icon: "ArrowDown", iconPosition: "right" }),
        homepageWidget("button", { label: "ZOBACZ PORTFOLIO", href: "#portfolio", alignment: "left", style: "outline", width: "auto" }),
      ],
      [homepageWidget("image", { image: "/images/portrait.jpg", alt: "Patryk — artysta CoolInk Tattoo Studio", caption: "", aspect: "portrait", fit: "cover", maxWidth: 620, alignment: "center" }, { radius: "lg", shadow: "lg" })],
    ], { padding: "lg", gap: 48, widths: [54, 46], style: { minHeight: 760, backgroundColor: "#0a0908", backgroundImage: "/images/texture-bg.jpg", overlayColor: "#0a0908", overlayOpacity: 72, anchorId: "home" } }),

    homepageSection([
      [homepageWidget("heading", { text: "01 / POMYSŁ", level: "h3", alignment: "left" }, { color: "#c99a4a", fontSize: 24 }), homepageWidget("text", { text: "Opisz kierunek, miejsce i klimat. Nie musisz mieć gotowego projektu.", alignment: "left" }, { fontSize: 14 })],
      [homepageWidget("heading", { text: "02 / PROJEKT", level: "h3", alignment: "left" }, { color: "#c99a4a", fontSize: 24 }), homepageWidget("text", { text: "Tworzę kompozycję pod Twoją anatomię, nie z katalogowego szablonu.", alignment: "left" }, { fontSize: 14 })],
      [homepageWidget("heading", { text: "03 / SESJA", level: "h3", alignment: "left" }, { color: "#c99a4a", fontSize: 24 }), homepageWidget("text", { text: "Kameralne studio, jasne ustalenia i opieka również po wykonaniu tatuażu.", alignment: "left" }, { fontSize: 14 })],
    ], { background: "charcoal", padding: "md", gap: 16, style: { contentWidth: "wide", surface: "outline" } }),

    homepageSection([[homepageWidget("portfolio", { ...portfolio, eyebrow: "SELECTED WORK", heading1: "PRACE, KTÓRE", heading2: "ZOSTAJĄ.", body: "Czerń, kontrast, detal i kompozycje dopasowane do ciała." })]], { padding: "sm", style: { anchorId: "portfolio" } }),

    homepageSection([
      [homepageWidget("image", { image: "/images/crops/about-main.jpg", alt: "Detal realistycznego tatuażu CoolInk", caption: "", aspect: "portrait", fit: "cover", maxWidth: 620, alignment: "center" }, { radius: "md" })],
      [
        homepageWidget("text", { text: "O ARTYŚCIE", alignment: "left" }, { color: "#c99a4a", fontSize: 12, letterSpacing: 2.4 }),
        homepageWidget("heading", { text: "TECHNIKA MA ZNACZENIE. CHARAKTER JESZCZE WIĘKSZE.", level: "h2", alignment: "left" }, { fontSize: 58, lineHeight: .98 }),
        homepageWidget("text", { text: "Nazywam się Patryk. Projektuję tatuaże, które pracują razem z sylwetką — mocne, precyzyjne i osobiste. Każdy klient ma własny projekt, historię i bezpośredni kontakt w aplikacji CoolInk.", alignment: "left" }, { fontSize: 17, lineHeight: 1.65 }),
        homepageWidget("iconList", { title: "STANDARD COOLINK", items: ["Indywidualny projekt 1:1", "Przejrzysty proces i historia ustaleń", "Sterylność, jakość i opieka po sesji"], style: "check", layout: "list", columns: "one" }),
      ],
    ], { padding: "lg", gap: 44, widths: [44, 56], style: { anchorId: "artists", contentWidth: "wide" } }),

    homepageSection([
      [homepageWidget("quote", { quote: "Dobry tatuaż nie kończy się na ładnym obrazku. Musi pasować do człowieka, ruchu i czasu.", author: "Patryk", role: "CoolInk Tattoo Studio", variant: "editorial" })],
      [homepageWidget("faq", { title: "Zanim zarezerwujesz", items: [
        { question: "Jak wygląda rezerwacja?", answer: "Wybierz dostępny termin, zaloguj się i opisz pomysł. Potwierdzenie oraz dalsze ustalenia zobaczysz w koncie klienta." },
        { question: "Czy projekt jest indywidualny?", answer: "Tak. Kierunek, rozmiar i miejsce ustalamy przed sesją, a kompozycja powstaje dla konkretnej osoby." },
        { question: "Jak przygotować się do wizyty?", answer: "Przed terminem otrzymasz aktualne zalecenia w aplikacji. Odpocznij, zjedz posiłek i poinformuj studio o przeciwwskazaniach." },
      ], variant: "lines", initiallyOpen: "none" })],
    ], { background: "charcoal", padding: "lg", gap: 28, widths: [40, 60], style: { contentWidth: "wide" } }),

    homepageSection([[homepageWidget("booking", { ...booking, eyebrow: "REZERWACJE ONLINE", heading: "Wybierz termin, który naprawdę jest wolny.", body: "Kalendarz jest połączony z systemem studia. Po zalogowaniu dokończysz zgłoszenie bez ponownego wybierania daty." })]], { padding: "sm", style: { anchorId: "kalendarz" } }),

    homepageSection([
      [homepageWidget("heading", { text: "ZIELONA GÓRA", level: "h3", alignment: "left" }, { color: "#c99a4a", fontSize: 26 }), homepageWidget("text", { text: "al. Konstytucji 3 Maja 10\n65-001 Zielona Góra", alignment: "left" }, { fontSize: 14 })],
      [homepageWidget("heading", { text: "KONTAKT", level: "h3", alignment: "left" }, { color: "#c99a4a", fontSize: 26 }), homepageWidget("button", { label: "kontakt@coolinktattoo.pl", href: "mailto:kontakt@coolinktattoo.pl", alignment: "left", style: "outline", width: "auto" })],
      [homepageWidget("heading", { text: "GODZINY", level: "h3", alignment: "left" }, { color: "#c99a4a", fontSize: 26 }), homepageWidget("text", { text: "Wt–Sob / 11:00–18:00\nWizyty po potwierdzeniu", alignment: "left" }, { fontSize: 14 })],
    ], { background: "charcoal", padding: "md", gap: 24, style: { anchorId: "contact", contentWidth: "wide" } }),
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
