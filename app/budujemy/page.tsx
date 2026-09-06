import type { Metadata } from "next";
import MaintenanceScreen from "@/components/MaintenanceScreen";

export const metadata: Metadata = {
  title: "Odświeżam przestrzeń | CoolInk Tattoo Studio",
  description: "CoolInk Tattoo Studio — strona jest właśnie dopracowywana. Zapraszam wkrótce.",
  robots: { index: false, follow: false },
};

export default function ConstructionPage() {
  return <MaintenanceScreen />;
}
