import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ClientDocuments from "@/components/client/ClientDocuments";
export const dynamic = "force-dynamic";
export default async function DocumentsPage() { const current = await getCurrentClient(); if (!current) redirect("/app"); const documents = await prisma.studioDocument.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" }, include: { acceptances: { where: { clientId: current.id }, select: { version: true } } } }); return <div><p className="text-[11px] tracking-[.18em] text-ink-gold">DOKUMENTY</p><ClientDocuments documents={documents.map((document) => ({ ...document, accepted: document.acceptances.some((item) => item.version === document.version) }))} /></div>; }
