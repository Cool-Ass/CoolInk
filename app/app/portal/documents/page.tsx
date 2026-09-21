import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ClientDocuments from "@/components/client/ClientDocuments";
export const dynamic = "force-dynamic";
export default async function DocumentsPage() { const current = await getCurrentClient(); if (!current) redirect("/app"); const documents = await prisma.studioDocument.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" }, include: { acceptances: { where: { clientId: current.id }, select: { version: true, answers: true } } } }); return <ClientDocuments documents={documents.map((document) => ({ ...document, answers: JSON.parse(document.acceptances.find((item) => item.version === document.version)?.answers ?? "{}"), accepted: document.acceptances.some((item) => item.version === document.version) }))} />; }
