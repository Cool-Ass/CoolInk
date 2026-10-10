import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECOVERY_MONITOR_KEY, readRecoveryMonitor, readRecoveryMonitorReceipt } from "@/lib/recoveryMonitor";
import { readOperationalHealth } from "@/lib/operationalHealth";
import { formatCoolinkDateTime } from "@/lib/dateTime";

export default async function SystemHealth() {
  if ((await getCurrentAdmin())?.role !== "owner") return null;
  const [setting, google, reminders, history, legacy] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: RECOVERY_MONITOR_KEY } }),
    readOperationalHealth("google_calendar_sync"), readOperationalHealth("reminders_worker"), readOperationalHealth("recovery_monitor"),
    prisma.adminAuditLog.findFirst({ where: { action: { in: ["operational.reminders", "operational.reminders.success"] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);
  const recovery = readRecoveryMonitor(setting?.value);
  const receipt = readRecoveryMonitorReceipt(setting?.value);
  const cards = [{ name: "Google Calendar", ...google }, { name: "Przypomnienia", ...reminders }, { name: "Kopie i odtworzenie", ...history, status: !recovery ? "stale" : recovery.healthy ? "healthy" : "failed", errorCode: !recovery ? "RECOVERY_REPORT_STALE" : recovery.healthy ? null : "RECOVERY_UNHEALTHY", lastSuccessAt: receipt?.healthy ? new Date(receipt.checkedAt) : history.lastSuccessAt, lastFailureAt: receipt && !receipt.healthy ? new Date(receipt.checkedAt) : history.lastFailureAt }];
  const fmt = (date: Date | null) => date ? formatCoolinkDateTime(date) : "Brak potwierdzenia";
  return <section id="system-health" className="studio-panel scroll-mt-24"><h2 className="text-lg font-semibold">Stan systemu</h2><p className="mt-2 text-sm text-ink-grey">Monitoring sprawdza świeżość kopii i dostępność artefaktu oraz ostatni test odtworzenia. Opóźniony raport nie oznacza utraty danych.</p><div className="mt-4 grid gap-3">{cards.map(card => <section key={card.name} className="rounded-lg border border-ink-white/10 p-3 text-xs"><h3 className="font-semibold">{card.name}</h3><p className={`mt-1 ${card.status === "failed" ? "text-red-200" : "text-ink-grey"}`}>{card.status === "healthy" ? "Ostatnie wykonanie poprawne" : card.status === "failed" ? "Wymaga sprawdzenia" : card.status === "stale" ? "Raport opóźniony lub niedostępny" : "Brak osobnego potwierdzenia"}</p><p className="mt-2">Sukces: {fmt(card.lastSuccessAt)}</p><p>Błąd: {fmt(card.lastFailureAt)}</p>{card.errorCode && <p className="mt-1 break-words text-ink-grey">{card.errorCode}</p>}</section>)}</div>{receipt && <p className="mt-3 text-xs text-ink-grey">Ostatni raport: {formatCoolinkDateTime(receipt.checkedAt)}. Limit świeżości: 2 godziny.</p>}{receipt && !receipt.healthy && <p className="mt-2 text-xs text-red-200">{receipt.reasons.join(" · ")}</p>}{legacy?.action === "operational.reminders" && <details className="mt-3 text-xs"><summary>Wcześniejszy wspólny błąd — {fmt(legacy.createdAt)}</summary><p className="mt-2 text-ink-grey">Historyczny zapis nie rozróżnia Google i przypomnień. Nie jest potwierdzeniem obecnej awarii; aktualne moduły mają oddzielne wyniki powyżej.</p></details>}<a className="mt-4 inline-block text-sm text-ink-gold" href="https://github.com/Cool-Ass/CoolInk/actions/workflows/recovery-health.yml" target="_blank" rel="noreferrer">Raporty monitoringu →</a></section>;
}
