import type { Metadata } from "next";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedSystemModules } from "@/lib/systemPages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Odświeżam przestrzeń | CoolInk Tattoo Studio",
  description: "CoolInk Tattoo Studio — strona jest właśnie dopracowywana. Zapraszam wkrótce.",
  robots: { index: false, follow: false },
};

export default async function ConstructionPage() {
  const content = await getSiteContent();
  const navLinks = await getPublicNavLinks(content.navigation);
  const modules = await getPublishedSystemModules("maintenance", content, navLinks);
  return <ModuleRenderer modules={modules} globals={{ theme: content.theme }} />;
}
