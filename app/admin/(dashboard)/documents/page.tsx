import { prisma } from "@/lib/prisma";
import NewDocumentForm from "@/components/admin/NewDocumentForm";
import DocumentManager from "@/components/admin/DocumentManager";
export const dynamic = "force-dynamic";
export default async function DocumentsPage() { const documents = await prisma.studioDocument.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { acceptances: true } } } }); return <div className="flex flex-col gap-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] tracking-[0.16em] text-ink-gold">TREŚCI OPERACYJNE</p><h1 className="mt-1 font-display text-3xl text-ink-white">Dokumenty i zgody</h1><p className="mt-1 max-w-xl text-sm text-ink-grey">Twórz, aktualizuj, publikuj i usuwaj wersjonowane dokumenty klienta.</p></div><NewDocumentForm /></div><DocumentManager documents={documents.map(({ _count, ...document }) => ({ ...document, acceptanceCount: _count.acceptances }))} /></div>; }
