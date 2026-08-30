/* HTTP smoke test of the protected admin workflow on the test project only. */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { loadDryRunEnvironment, requireTestProject } = require("./dryRunTestEnv.cjs");

const prisma = new PrismaClient();
const base = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3120").replace(/\/$/, "");
const tag = `admin-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
const assert = (value, message) => { if (!value) throw new Error(message); };
const cookieOf = (response) => (response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean)).map((value) => value.split(";", 1)[0]).join("; ");

async function call(path, options = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(cookie ? { cookie } : {}), ...(options.headers || {}) } });
  return { response, body: await response.text() };
}

async function main() {
  requireTestProject(loadDryRunEnvironment());
  const email = `${tag}@example.test`;
  const password = `CoolInk!${randomUUID()}A1`;
  const [admin, client] = await Promise.all([
    prisma.adminUser.create({ data: { email, name: "Smoke Admin", passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.client.create({ data: { firstName: "Admin", lastName: "Smoke", email: `client-${email}` } }),
  ]);
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Admin smoke", description: "Workflow test." } });
  try {
    const login = await call("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    assert(login.response.status === 200, `admin login returned ${login.response.status}`);
    const cookie = cookieOf(login.response);
    assert(cookie.includes("coolink_admin_session="), "admin login did not establish a session");

    for (const path of ["/admin", "/admin/clients", "/admin/calendar", "/admin/documents"]) {
      const page = await call(path, {}, cookie);
      assert(page.response.status === 200, `${path} returned ${page.response.status}`);
    }

    const settings = await call(`/api/admin/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "scheduled", internalNotes: "Prywatna notatka testowa", estimatedPrice: 600, finalPrice: 750, depositStatus: "paid", depositAmount: 150, depositPaymentMethod: "BLIK" }) }, cookie);
    assert(settings.response.status === 200, `project edit returned ${settings.response.status}`);

    const message = await call(`/api/admin/projects/${project.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "Prywatna wiadomość testowa 🙂" }) }, cookie);
    assert(message.response.status === 201, `admin message returned ${message.response.status}`);
    const history = await call(`/api/admin/projects/${project.id}/messages`, {}, cookie);
    assert(history.response.status === 200 && JSON.parse(history.body).messages.some((item) => item.body === "Prywatna wiadomość testowa 🙂"), "admin message history is unavailable");
    const messageNotification = await prisma.clientNotification.count({ where: { clientId: client.id, projectId: project.id, type: "PROJECT_MESSAGE" } });
    assert(messageNotification === 1, `message notification duplicated or missing (${messageNotification})`);

    const proposal = await call(`/api/admin/projects/${project.id}/proposed-appointment`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt: "2034-01-10T10:00:00.000Z", endsAt: "2034-01-10T11:00:00.000Z", note: "Propozycja testowa" }) }, cookie);
    assert(proposal.response.status === 201, `proposal returned ${proposal.response.status}`);
    const proposed = JSON.parse(proposal.body).appointment;
    const proposalEvents = await prisma.projectActivity.count({ where: { projectId: project.id, type: "appointment_proposed" } });
    assert(proposalEvents === 1, `proposal activity duplicated (${proposalEvents})`);

    const edited = await call(`/api/admin/appointments/${proposed.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt: "2034-01-10T10:30:00.000Z", endsAt: "2034-01-10T12:00:00.000Z", status: "confirmed", price: 750, notes: "Zmieniona długość, cena i notatka" }) }, cookie);
    assert(edited.response.status === 200, `appointment edit returned ${edited.response.status}`);

    const extra = await call("/api/admin/appointments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: project.id, startsAt: "2034-01-12T10:00:00.000Z", endsAt: "2034-01-12T11:00:00.000Z", price: 500 }) }, cookie);
    assert(extra.response.status === 201, `second session returned ${extra.response.status}`);
    const extraAppointment = JSON.parse(extra.body).appointment;
    const completed = await call(`/api/admin/appointments/${extraAppointment.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "completed" }) }, cookie);
    assert(completed.response.status === 200, `completed returned ${completed.response.status}`);

    const noShow = await prisma.appointment.create({ data: { projectId: project.id, startsAt: new Date("2034-01-14T10:00:00.000Z"), endsAt: new Date("2034-01-14T11:00:00.000Z"), status: "confirmed" } });
    const noShowResult = await call(`/api/admin/appointments/${noShow.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "no_show" }) }, cookie);
    assert(noShowResult.response.status === 200, `no-show returned ${noShowResult.response.status}`);

    const cancelled = await prisma.appointment.create({ data: { projectId: project.id, startsAt: new Date("2034-01-16T10:00:00.000Z"), endsAt: new Date("2034-01-16T11:00:00.000Z"), status: "confirmed" } });
    // Calendar Hub cancels through the normal status workflow — it must not
    // delete the appointment record used by client/project history.
    const cancelResult = await call(`/api/admin/appointments/${cancelled.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) }, cookie);
    assert(cancelResult.response.status === 200, `cancel returned ${cancelResult.response.status}`);
    const cancelledHistory = await prisma.appointment.findUnique({ where: { id: cancelled.id } });
    assert(cancelledHistory?.status === "cancelled", "cancelled appointment was not preserved in history");
    const cancellationNotification = await prisma.clientNotification.count({ where: { appointmentId: cancelled.id, type: "APPOINTMENT_CANCELLED" } });
    assert(cancellationNotification === 1, `cancellation notification duplicated or missing (${cancellationNotification})`);

    const activities = await prisma.projectActivity.groupBy({ by: ["type"], where: { projectId: project.id }, _count: { _all: true } });
    const count = (type) => activities.find((item) => item.type === type)?._count._all || 0;
    assert(count("appointment_proposed") === 1, "proposal activity is not exactly one");
    assert(count("appointment_cancelled") === 1, "cancellation activity is not exactly one");
    assert(count("appointment_updated") >= 3, "expected appointment update activities were not recorded");
    const deleted = await call(`/api/admin/projects/${project.id}`, { method: "DELETE" }, cookie);
    assert(deleted.response.status === 200, `project deletion returned ${deleted.response.status}`);
    assert(!await prisma.tattooProject.findUnique({ where: { id: project.id } }), "project was not fully deleted");
    assert(await prisma.projectMessage.count({ where: { projectId: project.id } }) === 0, "project messages survived deletion");
    console.log("PASS: admin login, dashboard/pages, private project messages, project deletion cascade, pricing/deposit/note, proposal, multi-session, edit, completed, no-show, cancel, and activity-log cardinality.");
  } finally {
    await prisma.adminUser.delete({ where: { id: admin.id } }).catch(() => null);
    await prisma.client.delete({ where: { id: client.id } }).catch(() => null);
    await prisma.$disconnect();
  }
}

main().catch(async (error) => { console.error(`FAIL: ${error.message}`); await prisma.$disconnect(); process.exitCode = 1; });
