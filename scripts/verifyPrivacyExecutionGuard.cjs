const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { loadDryRunEnvironment, requireTestProject, requireTestDatabase } = require("./dryRunTestEnv.cjs");
const env = loadDryRunEnvironment(); requireTestProject(env);
process.env.DATABASE_URL = requireTestDatabase(env);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const id = `privacy-fixture-${randomUUID()}`;
const executionId = `${id}-execution`;
require("tsx/cjs");
const { executePrivacyRequest } = require("../lib/privacyExecution.ts");
const { privacyRevision } = require("../lib/privacyRevision.ts");
const { withClientMediaWrite } = require("../lib/clientMediaWrite.ts");
const { claimGoogleExport } = require("../lib/googleExportOutbox.ts");
let stage = "create";
async function main() {
  try {
    await prisma.client.create({ data: { id, firstName: "Privacy", lastName: "Fixture", email: `${id}@example.test` } });
    await prisma.tattooProject.create({ data: { id, clientId: id, title: "Disposable fixture", description: "Private data" } });
    await prisma.appointment.create({ data: { id, projectId: id, startsAt: new Date("2000-01-01T10:00:00Z"), endsAt: new Date("2000-01-01T11:00:00Z"), status: "completed" } });
    await prisma.studioDocument.create({ data: { id, title: "Private signature fixture", slug: id, content: "Disposable consent", category: "consent" } });
    await prisma.documentAcceptance.create({ data: { id, clientId: id, documentId: id, version: 1 } });
    await prisma.siteSetting.deleteMany({ where: { key: `google_retry:${id}` } });
    await prisma.accountDeletionRequest.create({ data: { id, clientId: id, status: "awaiting_execution" } });
    stage = "upload-erasure-race";
    let entered; const enteredPromise = new Promise(resolve => { entered = resolve; });
    let release; const releasePromise = new Promise(resolve => { release = resolve; });
    const upload = withClientMediaWrite(id, async tx => {
      entered(); await releasePromise;
      await tx.projectActivity.create({ data: { projectId: id, type: "fixture_upload", message: "Registered before quarantine" } });
    });
    await enteredPromise;
    let quarantined = false;
    const quarantine = prisma.accountDeletionRequest.update({ where: { id }, data: { status: "executing" } }).then(() => { quarantined = true; });
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(quarantined, false, "Erasure must wait for a started upload's DB registration");
    release(); await upload; await quarantine;
    let callbackStarted = false;
    await assert.rejects(withClientMediaWrite(id, async () => { callbackStarted = true; }));
    assert.equal(callbackStarted, false, "No new upload can begin after quarantine");
    assert.equal(await claimGoogleExport(id), null, "Manual sync cannot create an external copy after quarantine");
    assert.equal(await prisma.siteSetting.count({ where: { key: `google_retry:${id}` } }), 0);
    stage = "quarantine";
    stage = "blocked-writes";
    for (const work of [
      () => prisma.client.update({ where: { id }, data: { firstName: "Changed" } }),
      () => prisma.tattooProject.update({ where: { id }, data: { description: "Changed" } }),
      () => prisma.appointment.update({ where: { id }, data: { depositStatus: "paid", depositAmount: 100 } }),
      () => prisma.projectImage.create({ data: { projectId: id, url: "test-path" } }),
      () => prisma.assistantDraft.create({ data: { projectId: id, clientId: id, adminUserId: "fixture", body: "Quarantined draft" } }),
      () => prisma.sessionDocumentSignature.create({ data: { clientId: id, acceptanceId: id, appointmentId: id, signature: "[]", snapshot: "{}", digest: "fixture" } }),
      () => prisma.directMessage.create({ data: { clientId: id, author: "client", body: "Changed" } }),
      () => prisma.loyaltyEntry.create({ data: { clientId: id, key: id, kind: "paper", stamps: 1, note: "test", adminId: "fixture" } }),
      () => prisma.accountDeletionRequest.delete({ where: { id } }),
      () => prisma.client.delete({ where: { id } }),
    ]) {
      let rejected = false; try { await work(); } catch (error) { rejected = /privacy execution locks/.test(error.message); }
      assert(rejected, "Quarantined record must reject a write, including cascades");
    }
    stage = "executor-and-completion";
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('coolink.privacy_execution', ${id}, true)`;
      await tx.tattooProject.update({ where: { id }, data: { description: "" } });
      await tx.accountDeletionRequest.update({ where: { id }, data: { status: "completed_retained", resolvedAt: new Date() } });
    });
    let rejected = false; try { await prisma.client.update({ where: { id }, data: { phone: "new" } }); } catch (error) { rejected = /privacy execution locks/.test(error.message); }
    assert(rejected, "Completed tombstone must remain write protected");
    stage = "isolated-executor";
    await prisma.client.create({ data: { id: executionId, firstName: "Erasure", lastName: "Fixture", email: `${executionId}@example.test` } });
    await prisma.tattooProject.create({ data: { id: executionId, clientId: executionId, title: "Private disposable brief", description: "Disposable private description" } });
    await prisma.assistantDraft.create({ data: { projectId: executionId, clientId: executionId, adminUserId: "fixture", body: "Private unsent draft must be erased" } });
    const review = { version: 1, decision: "approve", identityConfirmed: true, reason: "Disposable isolated test, no statutory records.", response: "Approved disposable test only.", retainedScopes: [], retainUntil: null, reviewerId: "fixture", reviewedAt: new Date().toISOString() };
    const request = await prisma.accountDeletionRequest.create({ data: { id: executionId, clientId: executionId, status: "awaiting_execution", note: JSON.stringify(review) } });
    // Fixture proof tests the executor boundary, NOT real backup freshness.
    // Reject every network call except fixed public GitHub metadata. Auth/media
    // are absent in this disposable fixture; no provider mutation is possible.
    const savedFetch = global.fetch;
    global.fetch = async target => {
      const url = String(target);
      if (!url.startsWith("https://api.github.com/repos/Cool-Ass/CoolInk/actions/")) throw new Error("Unexpected executor network call");
      const now = Date.now();
      const value = url.includes("/artifacts?") ? { artifacts: [{ id: 123, name: "coolink-encrypted-backup-123", digest: "sha256:" + "a".repeat(64), expires_at: new Date(now + 86400_000).toISOString(), expired: false }] }
        : url.includes("/workflows/") ? { workflow_runs: [{ id: 124, head_branch: "main", head_sha: "fixture", conclusion: "success", created_at: new Date(now - 1000).toISOString() }] }
        : { head_branch: "main", path: ".github/workflows/backup.yml", status: "completed", conclusion: "success", head_sha: "fixture", created_at: new Date(now - 2000).toISOString() };
      return Response.json(value);
    };
    try {
      await assert.rejects(withClientMediaWrite(executionId, async tx => {
        await tx.projectActivity.create({ data: { projectId: executionId, type: "fixture", message: "Must roll back" } });
        throw new Error("EXPECTED_CALLBACK_FAILURE");
      }));
      assert.equal(await prisma.projectActivity.count({ where: { projectId: executionId } }), 0, "Failed upload transaction must roll back");
      stage = "deposit-fixture";
      const depositVisit = await prisma.appointment.create({ data: { projectId: executionId, startsAt: new Date("2000-01-01T10:00:00Z"), endsAt: new Date("2000-01-01T11:00:00Z"), status: "completed", depositStatus: "paid", depositAmount: 100 } });
      await prisma.tattooProject.update({ where: { id: executionId }, data: { depositAssignedAppointmentId: depositVisit.id } });
      stage = "deposit-retention-rejection";
      await assert.rejects(executePrivacyRequest(executionId, null, privacyRevision(request), "123"), /Zadatki wizyt wymagają/);
      assert.equal((await prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: executionId } })).status, "awaiting_execution", "Deposit retention fails before quarantine or external deletion");
      assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: depositVisit.id } })).depositStatus, "paid");
      // Clear only this disposable fixture's artificial payment to test the existing zero-record erasure path.
      await prisma.appointment.update({ where: { id: depositVisit.id }, data: { depositStatus: "not_required", depositAmount: null } });
      stage = "fixture-export-rejection";
      // Creating this isolated appointment also enqueues its Google export.
      // Prove that boundary, then remove only the disposable fixture's marker:
      // this visit has no external Google copy and must never contact a provider.
      await assert.rejects(executePrivacyRequest(executionId, null, privacyRevision(request), "123"), /oczekujące eksporty Google/);
      await prisma.siteSetting.deleteMany({ where: { key: `google_retry:${depositVisit.id}` } });
      stage = "zero-payment-execution";
      const result = await executePrivacyRequest(executionId, null, privacyRevision(request), "123");
      assert.equal(result.completed, true);
      assert.equal(await prisma.assistantDraft.count({ where: { clientId: executionId } }), 0, "Erasure must remove unsent drafts even when projects are retained");
      const client = await prisma.client.findUniqueOrThrow({ where: { id: executionId } });
      assert.equal(client.firstName, "Usunięty"); assert.equal(client.email, `erased-${executionId}@privacy.invalid`);
      const resolved = await prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: executionId } });
      assert.equal(resolved.status, "completed"); assert(resolved.resolvedAt);
      const journal = await prisma.siteSetting.findUniqueOrThrow({ where: { key: `internal.privacyExecution:${executionId}` } });
      assert(!journal.value.includes("@example.test"), "Completion journal must not retain erased contact data");
      stage = "completed-execution-replay";
      const replay = await executePrivacyRequest(executionId, null, privacyRevision(request), "123");
      assert.equal(replay.completed, true);
      assert.equal(await prisma.adminAuditLog.count({ where: { targetId: executionId, action: "privacy.execution_completed" } }), 1);
    } finally { global.fetch = savedFetch; }
    console.log("PASS: isolated privacy quarantine blocks client/project/media/chat/financial writes and cascades; only exact executor transaction can complete.");
  } finally {
    await prisma.$transaction(async tx => {
      for (const target of [id, executionId]) {
        await tx.$executeRaw`SELECT set_config('coolink.privacy_execution', ${target}, true)`;
        await tx.tattooProject.updateMany({ where: { clientId: target }, data: { depositAssignedAppointmentId: null } });
        await tx.client.deleteMany({ where: { id: target } });
      }
      await tx.siteSetting.deleteMany({ where: { key: `internal.privacyExecution:${executionId}` } });
      await tx.studioDocument.deleteMany({ where: { id } });
      await tx.adminAuditLog.deleteMany({ where: { targetId: executionId } });
    });
    await prisma.$disconnect();
  }
}
main().catch(error => {
  // Fixed codes only: database/provider messages can contain private records.
  const code = /^(P\d{4}|ERR_ASSERTION)$/.test(error?.code || "") ? error.code : "WITHHELD";
  const actualCode = /^(P\d{4})$/.test(error?.actual?.code || "") ? error.actual.code : undefined;
  console.error("Privacy guard verification failed", { stage, code, actualCode }); process.exitCode = 1;
});
