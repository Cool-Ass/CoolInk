export function trustedWorkerHeaders(audience: string, mask: (token: string) => void): Promise<{ Authorization: string; "x-vercel-trusted-oidc-idp-token": string }>;
