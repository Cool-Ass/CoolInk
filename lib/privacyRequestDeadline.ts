/** Default response reminder: one calendar month from receipt, clamped to the
 * destination month's last day. Retention/exceptions are assessed by the owner;
 * retries must never restart this clock. */
export function privacyRequestDeadline(receivedAt: Date) {
  const result = new Date(receivedAt);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
