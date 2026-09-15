import ProjectRequestForm from "@/components/client/ProjectRequestForm";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedSystemModules } from "@/lib/systemPages";

export const metadata = { title: "Nowy projekt | CoolInk Tattoo Studio" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ slot?: string }> }) { const { slot } = await searchParams; const selected = slot ? new Date(slot) : null; const preferredDateNote = selected && !Number.isNaN(selected.getTime()) ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "full", timeStyle: "short" }).format(selected) : ""; const content = await getSiteContent(); const navLinks = await getPublicNavLinks(content.navigation); const modules = await getPublishedSystemModules("projectForm", content, navLinks); return <main className="min-h-screen bg-ink-black px-5 py-10 text-ink-white md:py-16"><div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[.75fr_1.25fr]"><ModuleRenderer modules={modules} globals={{ theme: content.theme, instagramUrl: content.brand.instagramUrl, facebookUrl: content.brand.facebookUrl, contact: content.contact }} /><ProjectRequestForm preferredDateNote={preferredDateNote} /></div></main>; }
