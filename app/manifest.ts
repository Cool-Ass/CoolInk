import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "CoolInk Tattoo Studio",
    short_name: "CoolInk",
    description: "Rezerwacje, projekty i kontakt z CoolInk Tattoo Studio w Zielonej Górze.",
    start_url: "/app/portal",
    scope: "/",
    display: "standalone",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    orientation: "portrait",
    categories: ["lifestyle", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Wolne terminy", short_name: "Terminy", url: "/app/portal/calendar", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Moje projekty", short_name: "Projekty", url: "/app/portal/projects", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
