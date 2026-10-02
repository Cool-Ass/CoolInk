const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { loadDryRunEnvironment, requireTestProject, requireTestDatabase } = require("./dryRunTestEnv.cjs");
const env = loadDryRunEnvironment(); requireTestProject(env);
process.env.DATABASE_URL = requireTestDatabase(env);
process.env.NODE_ENV = "production";
require("tsx/cjs");
const { prisma } = require("../lib/prisma.ts");
const { claimGoogleExport, releaseGoogleExport } = require("../lib/googleExportOutbox.ts");
const id = `outbox-${randomUUID()}`;
const visitId = `${id}-visit`, rolledBackId = `${id}-rollback`;
const marker = (appointmentId) => `google_retry:${appointmentId}`;
let stage = "fixture";
async function main() {
  try {
    await prisma.client.create({ data: { id, email: `${id}@example.com`, firstName: "Outbox", lastName: "Fixture" } });
    await prisma.tattooProject.create({ data: { id, clientId: id, title: "Outbox fixture", description: "Disposable isolated queue fixture" } });
    const data = { projectId: id, startsAt: new Date("2030-01-01T10:00:00Z"), endsAt: new Date("2030-01-01T11:00:00Z"), status: "requested" };
    const rollback = new Error("EXPECTED_ROLLBACK");
    stage = "transaction-rollback";
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.appointment.create({ data: { ...data, id: rolledBackId } });
      assert(await tx.siteSetting.findUnique({ where: { key: marker(rolledBackId) } }));
      throw rollback;
    }), (error) => error === rollback);
    assert.equal(await prisma.siteSetting.findUnique({ where: { key: marker(rolledBackId) } }), null);
    await prisma.appointment.create({ data: { ...data, id: visitId } });
    stage = "exclusive-claim";
    const original = await prisma.siteSetting.findUniqueOrThrow({ where: { key: marker(visitId) } });
    await prisma.appointment.update({ where: { id: visitId }, data: { price: 1400 } });
    assert.equal((await prisma.siteSetting.findUniqueOrThrow({ where: { key: original.key } })).value, original.value);
    const concurrent = await Promise.all([claimGoogleExport(visitId), claimGoogleExport(visitId)]);
    assert.equal(concurrent.filter(Boolean).length, 1, "Only one worker may claim a visit");
    const first = concurrent.find(Boolean);
    stage = "stale-acknowledgement";
    await prisma.appointment.update({ where: { id: visitId }, data: { status: "confirmed" } });
    const newer = await prisma.siteSetting.findUniqueOrThrow({ where: { key: original.key } });
    assert.notEqual(JSON.parse(newer.value).nonce, first.nonce);
    await releaseGoogleExport(first, true);
    assert(await prisma.siteSetting.findUnique({ where: { key: original.key } }), "Old completion must preserve newer work");
    assert.equal(await claimGoogleExport(visitId), null, "New mutation must respect the existing lease");
    stage = "lease-recovery-and-backoff";
    await prisma.$executeRaw`UPDATE "SiteSetting" SET "value" = ("value"::jsonb || jsonb_build_object('leaseUntil', now() - interval '1 minute'))::text WHERE "key" = ${original.key}`;
    const reclaimed = await claimGoogleExport(visitId);
    assert(reclaimed, "Expired lease must be recoverable");
    await releaseGoogleExport(reclaimed, false);
    const deferred = JSON.parse((await prisma.siteSetting.findUniqueOrThrow({ where: { key: original.key } })).value);
    assert.equal(deferred.attempts, 1);
    assert.equal(deferred.lastError, "EXPORT_FAILED");
    assert(new Date(deferred.nextAttemptAt) > new Date());
    assert.equal(await claimGoogleExport(visitId), null, "Backoff must prevent immediate repeated calls");
    await prisma.$executeRaw`UPDATE "SiteSetting" SET "value" = ("value"::jsonb || jsonb_build_object('nextAttemptAt', now() - interval '1 minute'))::text WHERE "key" = ${original.key}`;
    const retry = await claimGoogleExport(visitId);
    assert.equal(retry.nonce, reclaimed.nonce, "Retries must retain the generation for remote idempotency");
    await releaseGoogleExport(retry, true);
    assert.equal(await prisma.siteSetting.findUnique({ where: { key: original.key } }), null);
    console.log("PASS: transactional Google outbox, exclusive claims, stale completion, backoff and lease recovery.");
  } finally {
    await prisma.client.deleteMany({ where: { id } });
    await prisma.siteSetting.deleteMany({ where: { key: { in: [marker(visitId), marker(rolledBackId)] } } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  // Error messages can contain connection strings; emit only the fixture stage
  // and documented error identifiers, never the exception body or metadata.
  const code = /^[A-Z0-9_]{1,30}$/.test(error?.code ?? "") ? error.code : "UNKNOWN";
  console.error("Google outbox verification failed.", { stage, code });
  process.exitCode = 1;
});
