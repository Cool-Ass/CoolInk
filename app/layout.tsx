import type { Metadata } from "next";
import { Anton, Jost, Dancing_Script } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollReveal from "@/components/ScrollReveal";
import PwaRegister from "@/components/PwaRegister";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-dancing",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.coolinktattoo.pl"),
  title: "CoolInk Tattoo Studio — tatuaże w Zielonej Górze",
  description:
    "CoolInk Tattoo Studio w Zielonej Górze. Indywidualne projekty, realizm, szkic i covery. Sprawdź wolne terminy i obsługuj wizytę online.",
  keywords: ["tatuaż Zielona Góra", "studio tatuażu Zielona Góra", "CoolInk", "realizm", "cover tatuażu"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "CoolInk Tattoo Studio",
    description: "Indywidualne tatuaże i rezerwacje online w Zielonej Górze.",
    locale: "pl_PL",
    url: "/",
    siteName: "CoolInk Tattoo Studio",
    images: [
      {
        url: "/images/logo-white.jpg",
        width: 1710,
        height: 755,
        alt: "Logo CoolInk Tattoo Studio",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CoolInk Tattoo Studio",
    description: "Tatuaże i rezerwacje online w Zielonej Górze.",
    images: [{ url: "/images/logo-white.jpg", alt: "Logo CoolInk Tattoo Studio" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      className={`${anton.variable} ${jost.variable} ${dancingScript.variable}`}
    >
      <body className="antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <ScrollReveal />
        <PwaRegister />
      </body>
    </html>
  );
}
