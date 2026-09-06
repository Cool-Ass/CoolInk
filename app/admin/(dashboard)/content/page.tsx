import { getSiteContent } from "@/lib/content";
import SettingsSection from "@/components/admin/SettingsSection";
import ImageUploadField from "@/components/admin/ImageUploadField";
import GlobalLogoField from "@/components/admin/GlobalLogoField";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const content = await getSiteContent();

  const flat = (section: keyof typeof content) =>
    Object.fromEntries(
      Object.entries(content[section]).map(([field, value]) => [
        `${section}.${field}`,
        value as string,
      ])
    );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">
          TREŚCI GLOBALNE
        </p>
        <h1 className="font-display text-3xl text-ink-white">Wspólne elementy strony</h1>
        <p className="mt-2 max-w-xl text-[13px] text-ink-grey">
          To są elementy używane w wielu miejscach naraz (logo, social media, dane kontaktowe,
          menu, przyciski nagłówka, ekran budowy i stopka) — zmiana tutaj aktualizuje je wszędzie.
          Treść sekcji strony głównej edytujesz w wizualnym edytorze pod Strony.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-ink-white/10 bg-ink-charcoal/30 p-6">
          <p className="mb-5 text-[13px] tracking-[0.15em] text-ink-gold">MARKA</p>
          <GlobalLogoField initialLogoUrl={content.brand.logoUrl} />
        </div>

        <SettingsSection
          title="Nazwa marki i opis logo"
          initialValues={{
            "brand.name": content.brand.name,
            "brand.logoAlt": content.brand.logoAlt,
          }}
          fields={[
            { key: "brand.name", label: "Nazwa marki (również zamiast logo, gdy obraz jest pusty)" },
            { key: "brand.logoAlt", label: "Opis logo dla dostępności" },
          ]}
        />

        <SettingsSection
          title="Social media"
          initialValues={{
            "brand.instagramUrl": content.brand.instagramUrl,
            "brand.facebookUrl": content.brand.facebookUrl,
          }}
          fields={[
            { key: "brand.instagramUrl", label: "Link do Instagrama" },
            { key: "brand.facebookUrl", label: "Link do Facebooka" },
          ]}
        />

        <SettingsSection
          title="Górny pasek strony"
          initialValues={flat("header")}
          fields={[
            { key: "header.clientAreaLabel", label: "Tekst przycisku konta klienta (puste pole ukrywa przycisk)" },
            { key: "header.clientAreaHref", label: "Link przycisku konta klienta" },
            { key: "header.bookingLabel", label: "Tekst przycisku rezerwacji (puste pole ukrywa przycisk)" },
            { key: "header.bookingHref", label: "Link przycisku rezerwacji" },
          ]}
        />

        <SettingsSection
          title="Kolory całej witryny"
          initialValues={flat("theme")}
          fields={[
            { key: "theme.background", label: "Główne tło", type: "color" },
            { key: "theme.surface", label: "Tło kart i paneli", type: "color" },
            { key: "theme.accent", label: "Kolor akcentu", type: "color" },
            { key: "theme.accentBright", label: "Jaśniejszy akcent", type: "color" },
            { key: "theme.text", label: "Główny tekst", type: "color" },
            { key: "theme.muted", label: "Tekst pomocniczy", type: "color" },
          ]}
        />

        <SettingsSection
          title="Menu główne"
          initialValues={flat("navigation")}
          fields={[
            { key: "navigation.homeLabel", label: "Strona główna (puste pole ukrywa link)" },
            { key: "navigation.aboutLabel", label: "Sekcja O mnie (puste pole ukrywa link)" },
            { key: "navigation.portfolioLabel", label: "Sekcja Portfolio (puste pole ukrywa link)" },
            { key: "navigation.studioLabel", label: "Sekcja Studio (puste pole ukrywa link)" },
            { key: "navigation.contactLabel", label: "Sekcja Kontakt (puste pole ukrywa link)" },
          ]}
        />

        <SettingsSection
          title="Dane kontaktowe"
          initialValues={flat("contact")}
          fields={[
            { key: "contact.address", label: "Adres" },
            { key: "contact.phone", label: "Telefon" },
            { key: "contact.email", label: "Email" },
            { key: "contact.hours", label: "Godziny otwarcia" },
          ]}
        />

        <SettingsSection
          title="Ekran trybu budowy"
          initialValues={flat("maintenance")}
          fields={[
            { key: "maintenance.brandLabel", label: "Nazwa studia u góry" },
            { key: "maintenance.statusLabel", label: "Mały nadpis" },
            { key: "maintenance.headingLine1", label: "Nagłówek — linia 1" },
            { key: "maintenance.headingLine2", label: "Nagłówek — linia 2" },
            { key: "maintenance.message", label: "Wiadomość", multiline: true },
            { key: "maintenance.mark", label: "Znak / inicjał na dole (puste pole ukrywa element)" },
          ]}
        />

        <SettingsSection
          title="Stopka"
          initialValues={flat("footer")}
          fields={[
            { key: "footer.text", label: "Tekst stopki (po roku praw autorskich)" },
            { key: "footer.privacyLabel", label: "Tekst linku do polityki prywatności (puste pole ukrywa link)" },
            { key: "footer.privacyHref", label: "Link do polityki prywatności" },
          ]}
        />
      </div>
    </div>
  );
}
