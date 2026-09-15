import { getSiteContent } from "@/lib/content";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedSystemModules } from "@/lib/systemPages";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const content = await getSiteContent();
  const navLinks = await getPublicNavLinks(content.navigation);
  const modules = await getPublishedSystemModules("adminLogin", content, navLinks);
  return <main className="flex min-h-screen items-center bg-ink-black text-ink-white"><div className="mx-auto w-full max-w-7xl"><ModuleRenderer modules={modules} globals={{ theme: content.theme, instagramUrl: content.brand.instagramUrl, facebookUrl: content.brand.facebookUrl, contact: content.contact }} /></div></main>;
}
