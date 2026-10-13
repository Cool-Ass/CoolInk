import type { NextConfig } from "next";

const mediaPattern = process.env.S3_PUBLIC_URL
  ? new URL(`${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/**`)
  : null;
const remoteMediaPatterns = [
  {
    protocol: "https" as const,
    hostname: "*.public.blob.vercel-storage.com",
    pathname: "/**",
  },
  ...(mediaPattern ? [mediaPattern] : []),
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/api/**/signatures/**": ["./assets/fonts/NotoSans-Regular.ttf"] },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
      ],
    }, {
      source: "/voucher/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }, { key: "Referrer-Policy", value: "no-referrer" }],
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
    remotePatterns: remoteMediaPatterns,
  },
  reactStrictMode: true,
};

export default nextConfig;
