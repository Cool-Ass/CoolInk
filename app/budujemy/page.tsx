import type { Metadata } from "next";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Odświeżam przestrzeń | CoolInk Tattoo Studio",
  description: "CoolInk Tattoo Studio — strona jest właśnie dopracowywana. Zapraszam wkrótce.",
  robots: { index: false, follow: false },
};

export default async function ConstructionPage() {
  const content = await getSiteContent();
  return <MaintenanceScreen content={content.maintenance} theme={content.theme} />;
}
