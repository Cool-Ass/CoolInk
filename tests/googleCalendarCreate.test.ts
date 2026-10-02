import { beforeEach, expect, test, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/googleCalendar", async (original) => ({ ...await original<typeof import("../lib/googleCalendar")>(), googleCalendarRequest: request }));
import { createIdempotentGoogleEvent } from "../lib/googleCalendarCreate";
import { GoogleCalendarApiError } from "../lib/googleCalendar";
import { googleEventPayload } from "../lib/googleCalendarSync";

const payload = googleEventPayload({ startsAt: new Date("2026-10-10T10:00:00Z"), endsAt: new Date("2026-10-10T11:00:00Z") });
beforeEach(() => { vi.resetAllMocks(); });
test("repeated attempts use one valid ID and new generations get another", async () => {
  request.mockResolvedValue({ id: "created" });
  await createIdempotentGoogleEvent("token", "calendar", "appointment", "generation", payload);
  await createIdempotentGoogleEvent("token", "calendar", "appointment", "generation", payload);
  await createIdempotentGoogleEvent("token", "calendar", "appointment", "next-generation", payload);
  const ids = request.mock.calls.map((call) => JSON.parse(call[2].body).id);
  expect(ids[0]).toMatch(/^[a-f0-9]{64}$/);
  expect(ids[0]).toBe(ids[1]); expect(ids[2]).not.toBe(ids[0]);
});
test("a lost POST response is recovered by reading the same matching event", async () => {
  request.mockRejectedValueOnce(new GoogleCalendarApiError("Exists", 409)).mockResolvedValueOnce({ id: "existing", start: payload.start, end: payload.end });
  expect((await createIdempotentGoogleEvent("token", "calendar", "appointment", "generation", payload)).id).toBe("existing");
  const id = JSON.parse(request.mock.calls[0][2].body).id;
  expect(request.mock.calls[1][1]).toBe(`/calendars/calendar/events/${id}`);
  expect(request).toHaveBeenCalledTimes(2);
});
test("a local change after a lost link cannot create a second remote event", async () => {
  request.mockResolvedValueOnce({ id: "created" }).mockRejectedValueOnce(new GoogleCalendarApiError("Exists", 409)).mockResolvedValueOnce({ id: "created", start: payload.start, end: payload.end });
  await createIdempotentGoogleEvent("token", "calendar", "appointment", "initial|", payload);
  const changed = googleEventPayload({ startsAt: new Date("2026-10-10T12:00:00Z"), endsAt: new Date("2026-10-10T13:00:00Z") });
  await expect(createIdempotentGoogleEvent("token", "calendar", "appointment", "initial|", changed)).rejects.toThrow("ręcznego wyjaśnienia");
  expect(JSON.parse(request.mock.calls[0][2].body).id).toBe(JSON.parse(request.mock.calls[1][2].body).id);
});
test.each([{ status: "cancelled" }, { start: { dateTime: "2026-10-10T12:00:00Z" }, end: { dateTime: "2026-10-10T13:00:00Z" } }])("does not adopt deleted or remotely changed events", async (event) => {
  request.mockRejectedValueOnce(new GoogleCalendarApiError("Exists", 409)).mockResolvedValueOnce(event);
  await expect(createIdempotentGoogleEvent("token", "calendar", "appointment", "generation", payload)).rejects.toThrow("ręcznego wyjaśnienia");
});
