const audiences = new Set([
  "https://www.coolinktattoo.pl/api/cron/google-exports",
  "https://www.coolinktattoo.pl/api/cron/recovery-health",
]);

/** Separate application authorization from Vercel's existing trusted IdP gate. */
export async function trustedWorkerHeaders(audience, mask) {
  if (!audiences.has(audience)) throw new Error("Invalid worker audience");
  const identity = async target => {
    const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
    url.searchParams.set("audience", target);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
      signal: AbortSignal.timeout(15000), redirect: "error",
    });
    if (!response.ok) throw new Error("Unable to obtain worker identity");
    const token = (await response.json()).value;
    if (typeof token !== "string" || !token) throw new Error("Missing worker identity");
    mask(token);
    return token;
  };
  const application = await identity(audience);
  const edge = await identity("https://github.com/Cool-Ass");
  return { Authorization: `Bearer ${application}`, "x-vercel-trusted-oidc-idp-token": edge };
}
