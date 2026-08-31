import Image from "next/image";
import CalligraphyBackground from "@/components/CalligraphyBackground";
import { CORE_NAV_LINKS, type NavLink } from "@/lib/nav";

export default function Footer({
  navLinks = CORE_NAV_LINKS,
  text = "CoolInk Tattoo Studio. Wszelkie prawa zastrzeżone.",
  logoUrl = "/images/logo-white.jpg",
}: {
  navLinks?: NavLink[];
  text?: string;
  logoUrl?: string;
}) {
  return (
    <footer className="relative overflow-hidden border-t border-ink-white/10 bg-ink-black">
      <CalligraphyBackground opacity={0.04} position="60% 20%" />

      <div className="relative mx-auto flex max-w-[1536px] flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-10 lg:px-16">
        <a href="/#home" className="relative h-12 w-36 shrink-0">
          <Image
            src={logoUrl}
            alt="CoolInk Tattoo Studio — logo"
            fill
            className="object-contain mix-blend-screen opacity-90"
            sizes="144px"
          />
        </a>

        <nav className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] tracking-[0.1em] text-ink-grey">
          {navLinks.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="transition-colors hover:text-ink-gold"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <p className="text-[12px] tracking-[0.05em] text-ink-grey/70">
          © {new Date().getFullYear()} {text}
        </p>
        <a href="/polityka-prywatnosci" className="text-[12px] tracking-[0.05em] text-ink-grey/70 hover:text-ink-gold">POLITYKA PRYWATNOŚCI</a>
      </div>
    </footer>
  );
}
