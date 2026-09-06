import type { NextConfig } from "next";

const mediaPattern = process.env.S3_PUBLIC_URL
  ? new URL(`${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/**`)
  : null;

const nextConfig: NextConfig = {
  async headers() {
    const scriptSource = process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; ${scriptSource}; connect-src 'self' https://*.supabase.co; font-src 'self' data:; frame-src 'self' https://accounts.google.com https://www.google.com https://maps.google.com https://www.youtube-nocookie.com https://player.vimeo.com${process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : ""}`;
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Content-Security-Policy", value: csp },
      ],
    }, {
      source: "/admin/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      source: "/app/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      source: "/api/admin/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      source: "/api/client/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaPattern ? [mediaPattern] : [],
  },
  reactStrictMode: true,
};

export default nextConfig;
