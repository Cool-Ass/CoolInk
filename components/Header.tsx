"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import MagneticButton from "@/components/MagneticButton";
import { CORE_NAV_LINKS, type NavLink } from "@/lib/nav";

export default function Header({
  navLinks = CORE_NAV_LINKS,
  bookLabel = "UMÓW WIZYTĘ",
  logoUrl = "/images/logo-white.jpg",
}: {
  navLinks?: NavLink[];
  bookLabel?: string;
  logoUrl?: string;
}) {
  const [active, setActive] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Solid background once the user scrolls past the hero.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 48);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the nav item for whichever homepage section is in
  // view. No-ops harmlessly on CMS subpages, which don't have these ids.
  useEffect(() => {
    const ids = ["home", "artists", "portfolio", "studio", "contact"];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? "border-b border-ink-white/10 bg-ink-black/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1536px] items-center justify-between px-6 transition-[padding] duration-500 md:px-10 lg:px-16 ${
          scrolled ? "py-4" : "py-6"
        }`}
      >
        {/* Logo */}
        <a
          href="/#home"
          className={`relative shrink-0 transition-all duration-500 ${
            scrolled ? "h-11 w-32 md:h-12 md:w-36" : "h-14 w-40 md:h-16 md:w-48"
          }`}
        >
          <Image
            src={logoUrl}
            alt="CoolInk Tattoo Studio — logo"
            fill
            priority
            className="object-contain mix-blend-screen"
            sizes="192px"
          />
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-9 text-[13px] font-medium text-ink-white lg:flex">
          {navLinks.map((item) => (
            <a
              key={item.id}
              href={item.href}
              data-active={item.isAnchor && active === item.id}
              className="nav-link py-1"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Public actions */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/app"
            className="border border-ink-white/30 px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold"
          >
            KONTO KLIENTA
          </a>
          <MagneticButton
            href="/#contact"
            animateOnScroll={false}
            className="items-center gap-3 border border-ink-gold px-5 py-3 text-[12px] font-medium tracking-[0.08em] text-ink-gold hover:bg-ink-gold hover:text-ink-black lg:px-6 lg:text-[13px]"
          >
            {bookLabel}
            <span aria-hidden>→</span>
          </MagneticButton>
        </div>

        {/* Mobile navigation toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          className="inline-flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          aria-label={mobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
        >
          <span className="h-px w-6 bg-ink-white" />
          <span className="h-px w-6 bg-ink-white" />
          <span className="h-px w-4 self-end bg-ink-gold" />
        </button>
      </div>

      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          className="border-t border-ink-white/10 bg-ink-black px-6 py-5 lg:hidden"
          aria-label="Nawigacja mobilna"
        >
          <div className="mx-auto flex max-w-[1536px] flex-col items-start gap-4">
            {navLinks.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[13px] font-medium tracking-[0.1em] text-ink-white transition-colors hover:text-ink-gold"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="border border-ink-white/30 px-5 py-3 text-[12px] tracking-[0.08em] text-ink-white"
            >
              KONTO KLIENTA
            </a>
            <a
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 border border-ink-gold px-5 py-3 text-[12px] tracking-[0.08em] text-ink-gold"
            >
              {bookLabel}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
