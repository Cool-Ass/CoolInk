import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isClientProfileComplete, safeClientReturnTo } from "@/lib/clientProfile";
import CompleteProfileForm from "@/components/client/CompleteProfileForm";

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { returnTo } = await searchParams;
  const client = await prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true, lastName: true, phone: true } });
  const target = safeClientReturnTo(returnTo);
  if (isClientProfileComplete(client)) redirect(target);
  return <CompleteProfileForm initial={client} returnTo={target} />;
}
