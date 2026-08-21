import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify, RESERVED_SLUGS } from "@/lib/slugify";
import { parseModules, serializeModules } from "@/lib/pageModules";
import { MODULE_TYPE_ORDER, type Module } from "@/lib/modules";

interface Params {
  params: Promise<{ id: string }>;
}

function isValidModules(value: unknown): value is Module[] {
  if (!Array.isArray(value) || value.length > 50 || JSON.stringify(value).length > 250_000) return false;
  return value.every(
    (module) =>
      module &&
      typeof module === "object" &&
      typeof (module as Module).id === "string" &&
      (module as Module).id.length <= 120 &&
      MODULE_TYPE_ORDER.includes((module as Module).type) &&
      (module as Module).data &&
      typeof (module as Module).data === "object" &&
      !Array.isArray((module as Module).data)
  );
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Nie znaleziono strony." }, { status: 404 });
  return NextResponse.json({ page });
}

/**
 * Handles three kinds of updates, all via PATCH:
 *  - { modules: [...] }              -> "Zapisz wersję roboczą": updates the working copy only
 *  - { modules: [...], publish: true } -> "Opublikuj": updates modules AND publishes that snapshot
 *  - { unpublish: true }             -> "Cofnij publikację": hides the page without discarding it
 *  - any of title/slug/excerpt/coverImage/showInNav/navOrder -> page settings
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  if (body.modules !== undefined && !isValidModules(body.modules)) {
    return NextResponse.json({ error: "Nieprawidłowa struktura modułów strony." }, { status: 400 });
  }

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono strony." }, { status: 404 });

  let slug = existing.slug;
  if (typeof body.slug === "string" && body.slug.trim() && !existing.isHomepage) {
    slug = slugify(body.slug);
    if (!slug) {
      return NextResponse.json({ error: "Nieprawidłowy adres URL." }, { status: 400 });
    }
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { error: `"${slug}" jest zarezerwowaną ścieżką — wybierz inny adres URL.` },
        { status: 400 }
      );
    }
    if (slug !== existing.slug) {
      const clash = await prisma.page.findUnique({ where: { slug } });
      if (clash) {
        return NextResponse.json(
          { error: `Strona o adresie "${slug}" już istnieje.` },
          { status: 409 }
        );
      }
    }
  }

  const nextModules = Array.isArray(body.modules) ? body.modules : parseModules(existing.modules);

  let status = existing.status;
  let publishedModules = existing.publishedModules ? parseModules(existing.publishedModules) : null;
  if (body.publish === true) {
    status = "published";
    publishedModules = nextModules;
  } else if (body.unpublish === true) {
    status = existing.status === "draft" ? "draft" : "unpublished";
  }

  const page = await prisma.page.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : existing.title,
      slug,
      excerpt: body.excerpt ?? existing.excerpt,
      coverImage: body.coverImage ?? existing.coverImage,
      showInNav: typeof body.showInNav === "boolean" ? body.showInNav : existing.showInNav,
      navOrder: body.navOrder !== undefined ? Number(body.navOrder) : existing.navOrder,
      modules: serializeModules(nextModules),
      publishedModules: publishedModules ? serializeModules(publishedModules) : null,
      status,
    },
  });

  return NextResponse.json({ page });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono strony." }, { status: 404 });
  if (existing.isHomepage) {
    return NextResponse.json(
      { error: "Nie można usunąć strony głównej." },
      { status: 400 }
    );
  }

  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
