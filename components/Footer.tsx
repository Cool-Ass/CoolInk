import Image from "next/image";
import Link from "next/link";
import CalligraphyBackground from "@/components/CalligraphyBackground";
import { CORE_NAV_LINKS, type NavLink } from "@/lib/nav";
import { imageSource } from "@/lib/imageSource";
import { safeHref } from "@/lib/safeHref";

export default function Footer({
  navLinks = CORE_NAV_LINKS,
  text = "CoolInk Tattoo Studio. Wszelkie prawa zastrzeżone.",
  logoUrl = "/images/logo-white.jpg",
  logoAlt = "CoolInk Tattoo Studio — logo",
  brandName = "COOLINK",
  privacyLabel = "POLITYKA PRYWATNOŚCI",
  privacyHref = "/polityka-prywatnosci",
}: {
  navLinks?: NavLink[];
  text?: string;
  logoUrl?: string;
  logoAlt?: string;
  brandName?: string;
  privacyLabel?: string;
  privacyHref?: string;
}) {
  const logoSource = imageSource(logoUrl);
  return (
    <footer className="relative overflow-hidden border-t border-ink-white/10 bg-ink-black">
      <CalligraphyBackground opacity={0.04} position="60% 20%" />

      <div className="relative mx-auto flex max-w-[1536px] flex-col items-start gap-7 px-4 py-10 sm:px-6 sm:py-12 md:flex-row md:items-center md:justify-between md:px-10 lg:px-16">
        <Link href="/#home" className="relative h-12 w-36 shrink-0">
          {logoSource ? <Image src={logoSource} alt={logoAlt} fill className="object-contain mix-blend-screen opacity-90" sizes="144px" /> : <span className="flex h-full items-center font-display text-lg tracking-[0.08em] text-ink-white">{brandName}</span>}
        </Link>

        <nav className="flex w-full flex-col items-stretch text-[12px] tracking-[0.1em] text-ink-grey min-[420px]:w-auto min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center min-[420px]:gap-x-7">
          {navLinks.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex min-h-11 items-center border-b border-ink-white/10 py-2 transition-colors hover:text-ink-gold min-[420px]:border-0"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <p className="text-[12px] tracking-[0.05em] text-ink-grey/70">
          © {new Date().getFullYear()} {text}
        </p>
        {privacyLabel && <Link href={safeHref(privacyHref, "/polityka-prywatnosci")} className="flex min-h-11 items-center text-[12px] tracking-[0.05em] text-ink-grey/70 hover:text-ink-gold">{privacyLabel}</Link>}
      </div>
    </footer>
  );
}
