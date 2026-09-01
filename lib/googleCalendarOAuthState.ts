import { timingSafeEqual } from "crypto";

export const GOOGLE_CALENDAR_STATE_COOKIE = "coolink_google_calendar_oauth_state";

/**
 * Keeps an OAuth nonce bound to the authenticated administrator who initiated
 * the flow. The value lives only in an httpOnly, short-lived cookie.
 */
export function googleCalendarStateCookieValue(adminId: string, state: string) {
  return `${adminId}.${state}`;
}

export function isValidGoogleCalendarOAuthState(input: {
  adminId: string;
  state: string;
  savedValue?: string;
}) {
  if (!input.savedValue) return false;
  const expected = Buffer.from(googleCalendarStateCookieValue(input.adminId, input.state));
  const received = Buffer.from(input.savedValue);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
