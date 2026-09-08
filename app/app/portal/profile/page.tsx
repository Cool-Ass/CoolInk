import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import ProfileSettings from "@/components/client/ProfileSettings";
import PushNotificationSettings from "@/components/client/PushNotificationSettings";
import InstallAppCard from "@/components/client/InstallAppCard";
import CompactDisclosure from "@/components/ui/CompactDisclosure";
export const dynamic = "force-dynamic";
export default async function ProfilePage() { const current = await getCurrentClient(); if (!current) redirect("/app"); const client = await prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true, lastName: true, phone: true, email: true, avatarUrl: true } }); return <div><p className="studio-eyebrow">PROFIL</p><h1 className="studio-page-title">Konto i aplikacja</h1><div className="mt-4 grid items-start gap-3 lg:grid-cols-3"><CompactDisclosure title="DANE PROFILU" summary={`${client.firstName} ${client.lastName}`} bodyClassName="[&>section]:border-0 [&>section]:p-0"><ProfileSettings client={client} /></CompactDisclosure><CompactDisclosure title="APLIKACJA COOLINK" summary="Instalacja na ekranie telefonu" bodyClassName="[&>section]:border-0 [&>section]:p-0"><InstallAppCard /></CompactDisclosure><CompactDisclosure title="POWIADOMIENIA PUSH" summary="Wizyty, wiadomości i dokumenty" bodyClassName="[&>section]:border-0 [&>section]:p-0"><PushNotificationSettings /></CompactDisclosure></div></div>; }
