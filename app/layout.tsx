import type { Metadata } from "next";
import { Anton, Jost, Dancing_Script } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollReveal from "@/components/ScrollReveal";

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
  title: "CoolInk Tattoo Studio — Your Story. Our Craft.",
  description:
    "CoolInk Tattoo Studio — unikalne tatuaże w najwyższej jakości. Indywidualne projekty, realizm, detal. Sztuka, która zostaje na zawsze.",
  keywords: ["tattoo", "tattoo studio", "CoolInk", "tatuaż", "realism tattoo"],
  openGraph: {
    title: "CoolInk Tattoo Studio",
    description: "Your Story. Our Craft.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${jost.variable} ${dancingScript.variable}`}
    >
      <body className="antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <ScrollReveal />
      </body>
    </html>
  );
}
