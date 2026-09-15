import { getSiteContent } from "@/lib/content";
import LoginForm from "@/components/admin/LoginForm";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedSystemModules } from "@/lib/systemPages";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const content = await getSiteContent();
  const navLinks = await getPublicNavLinks(content.navigation);
  const modules = await getPublishedSystemModules("adminLogin", content, navLinks);
  return <main className="flex min-h-screen items-center bg-ink-black px-5 py-10 text-ink-white"><div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.25fr_.75fr]"><ModuleRenderer modules={modules} globals={{ theme: content.theme, instagramUrl: content.brand.instagramUrl, facebookUrl: content.brand.facebookUrl, contact: content.contact }} /><LoginForm /></div></main>;
}
