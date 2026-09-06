import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CoolInk Studio Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "CoolInk Admin", statusBarStyle: "black-translucent" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
