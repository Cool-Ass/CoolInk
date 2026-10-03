import { prisma } from "@/lib/prisma";
import { publicPrivacyStatus } from "@/lib/privacyReview";
import CompactDisclosure from "@/components/ui/CompactDisclosure";

/** Caller supplies the authenticated client's ID; never accept a URL parameter. */
export default async function PrivacyRequestStatus({ clientId }: { clientId: string }) {
  const request = await prisma.accountDeletionRequest.findUnique({ where: { clientId }, select: { status: true, note: true, requestedAt: true } });
  if (!request) return null;
  const status = publicPrivacyStatus(request);
  return <CompactDisclosure title="TWÓJ WNIOSEK DOTYCZĄCY DANYCH" summary={status.label} className="mt-4 rounded-xl">
    <div className="space-y-2 text-sm"><p>{status.label}</p><p className="text-xs text-ink-grey">Przyjęto: <time dateTime={status.receivedAt}>{new Date(status.receivedAt).toLocaleDateString("pl-PL")}</time></p>
      {status.response && <p className="whitespace-pre-wrap break-words">{status.response}</p>}
      {status.retainedUntil && <p className="text-xs text-ink-grey">Data wskazana w decyzji o retencji: <time dateTime={status.retainedUntil}>{new Date(status.retainedUntil).toLocaleDateString("pl-PL", { timeZone: "UTC" })}</time></p>}
      <p className="text-xs text-ink-grey">Zapis oceny nie oznacza wykonania usunięcia danych. W sprawie odpowiedzi skontaktuj się ze studiem.</p>
    </div>
  </CompactDisclosure>;
}
