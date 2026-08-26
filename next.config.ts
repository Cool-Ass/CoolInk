import type { NextConfig } from "next";

const mediaPattern = process.env.S3_PUBLIC_URL
  ? new URL(`${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/**`)
  : null;

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co; font-src 'self' data:; frame-src https://accounts.google.com" },
      ],
    }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaPattern ? [mediaPattern] : [],
  },
  reactStrictMode: true,
};

export default nextConfig;
