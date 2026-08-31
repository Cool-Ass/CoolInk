export type ClientProfileFields = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
};

/** One source of truth for the one-time client onboarding gate. */
export function isClientProfileComplete(profile: ClientProfileFields) {
  return Boolean(profile.firstName?.trim() && profile.lastName?.trim());
}

/** Keeps post-auth redirects inside the client application. */
export function safeClientReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/app/")) return "/app/portal";
  return value;
}
