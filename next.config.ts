import type { NextConfig } from "next";

const mediaPattern = process.env.S3_PUBLIC_URL
  ? new URL(`${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/**`)
  : null;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaPattern ? [mediaPattern] : [],
  },
  reactStrictMode: true,
};

export default nextConfig;
