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
        <h1 className="font-display text-3xl text-ink-white">Marka i dane kontaktowe</h1>
        <p className="mt-2 max-w-xl text-[13px] text-ink-grey">
          To są elementy używane w wielu miejscach naraz (logo, social media, dane kontaktowe,
          stopka) — zmiana tutaj aktualizuje je wszędzie. Treść poszczególnych stron (Hero, O
          mnie, Portfolio…) edytujesz w wizualnym edytorze pod Strony.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-ink-white/10 bg-ink-charcoal/30 p-6">
          <p className="mb-5 text-[13px] tracking-[0.15em] text-ink-gold">MARKA</p>
          <GlobalLogoField initialLogoUrl={content.brand.logoUrl} />
        </div>

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
          title="Stopka"
          initialValues={flat("footer")}
          fields={[{ key: "footer.text", label: "Tekst stopki (po roku praw autorskich)" }]}
        />
      </div>
    </div>
  );
}
