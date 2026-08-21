const ICON_PATHS = {
  instagram:
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17.75 5.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
  facebook:
    "M13.5 21v-7.2h2.4l.36-2.8h-2.76V9.2c0-.81.22-1.36 1.39-1.36h1.48V5.34C15.98 5.24 15.1 5.16 14.06 5.16c-2.14 0-3.6 1.31-3.6 3.7v2.14H8v2.8h2.46V21h3.04Z",
  location:
    "M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 4.5A2.5 2.5 0 1 0 12 11.5 2.5 2.5 0 0 0 12 6.5Z",
};

export default function SocialRail({
  instagramUrl = "https://instagram.com",
  facebookUrl = "https://facebook.com",
}: {
  instagramUrl?: string;
  facebookUrl?: string;
}) {
  const links = [
    { label: "Instagram", href: instagramUrl, path: ICON_PATHS.instagram },
    { label: "Facebook", href: facebookUrl, path: ICON_PATHS.facebook },
    { label: "Lokalizacja", href: "#studio", path: ICON_PATHS.location },
  ];

  return (
    <div className="absolute right-6 top-[168px] z-10 hidden flex-col items-center gap-6 md:right-10 lg:right-16 lg:flex">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          aria-label={link.label}
          target={link.href.startsWith("http") ? "_blank" : undefined}
          rel={link.href.startsWith("http") ? "noreferrer" : undefined}
          className="flex h-6 w-6 items-center justify-center text-ink-white/80 transition-colors hover:text-ink-gold"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d={link.path} />
          </svg>
        </a>
      ))}
    </div>
  );
}
