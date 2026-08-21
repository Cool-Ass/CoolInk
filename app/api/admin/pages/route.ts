import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify, RESERVED_SLUGS } from "@/lib/slugify";

export async function GET() {
  const pages = await prisma.page.findMany({
    orderBy: [{ isHomepage: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ pages });
}

/** Quick-create: title + slug only. Modules are then edited in the builder. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.title) {
    return NextResponse.json({ error: "Tytuł jest wymagany." }, { status: 400 });
  }

  const slug = slugify(body.slug || body.title);
  if (!slug) {
    return NextResponse.json(
      { error: "Nie udało się wygenerować poprawnego adresu URL z tytułu." },
      { status: 400 }
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json(
      { error: `"${slug}" jest zarezerwowaną ścieżką — wybierz inny adres URL.` },
      { status: 400 }
    );
  }

  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: `Strona o adresie "${slug}" już istnieje.` },
      { status: 409 }
    );
  }

  const page = await prisma.page.create({
    data: {
      title: body.title,
      slug,
      showInNav: body.showInNav !== false,
      navOrder: Number(body.navOrder) || 0,
      modules: "[]",
      status: "draft",
    },
  });

  return NextResponse.json({ page }, { status: 201 });
}
