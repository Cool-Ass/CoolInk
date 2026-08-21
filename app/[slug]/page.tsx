import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RichText from "@/components/RichText";
import ModuleRenderer from "@/components/ModuleRenderer";
import { prisma } from "@/lib/prisma";
import { getPublicNavLinks } from "@/lib/nav";
import { getSiteContent } from "@/lib/content";
import { getPublishedPortfolioWorks } from "@/lib/portfolio";
import type { Module } from "@/lib/modules";
import { parseModules } from "@/lib/pageModules";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPage(slug: string) {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page || page.isHomepage || page.status !== "published") return null;
  return page;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: `${page.title} — CoolInk Tattoo Studio`,
    description: page.excerpt || undefined,
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const [navLinks, content, works] = await Promise.all([
    getPublicNavLinks(),
    getSiteContent(),
    getPublishedPortfolioWorks(),
  ]);

  const modules = parseModules(page.publishedModules);
  const globals = { instagramUrl: content.brand.instagramUrl, facebookUrl: content.brand.facebookUrl };

  return (
    <main className="relative min-h-screen bg-ink-black">
      <Header navLinks={navLinks} logoUrl={content.brand.logoUrl} />

      {modules.length > 0 ? (
        <div className="pt-24">
          <ModuleRenderer modules={modules} portfolioWorks={works} globals={globals} />
        </div>
      ) : (
        // Legacy fallback for pages created before the modular builder existed.
        <article className="relative overflow-hidden pb-28 pt-40 md:pt-48">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 520px 340px at 20% 0%, rgba(201,154,74,0.14), transparent 65%)",
            }}
          />

          <div className="relative mx-auto max-w-3xl px-6 md:px-10">
            <p className="mb-4 text-[13px] font-medium tracking-[0.35em] text-ink-gold">STRONA</p>

            <h1 className="headline-texture -ml-1 text-[13vw] leading-[0.9] tracking-tight sm:text-[8vw] md:text-[5.5vw] lg:text-[3.8vw]">
              {page.title}
            </h1>

            <div className="gold-underline mt-5 h-3 w-56 md:w-64" aria-hidden />

            {page.coverImage && (
              <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={page.coverImage}
                  alt={page.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 768px, 100vw"
                />
              </div>
            )}

            <div className="mt-10">
              <RichText text={page.content} />
            </div>
          </div>
        </article>
      )}

      <Footer navLinks={navLinks} text={content.footer.text} logoUrl={content.brand.logoUrl} />
    </main>
  );
}
