import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ProfileSettings from "@/components/client/ProfileSettings";
export const dynamic = "force-dynamic";
export default async function ProfilePage() { const current = await getCurrentClient(); if (!current) redirect("/app"); const client = await prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true, lastName: true, phone: true, email: true, avatarUrl: true } }); return <div><p className="text-[11px] tracking-[.18em] text-ink-gold">PROFIL</p><ProfileSettings client={client} /></div>; }
