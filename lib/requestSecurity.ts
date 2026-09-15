import type { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

type RateLimitResult = { allowed: true; remaining: number } | { allowed: false; retryAfter: number };
export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function isSameOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || requestUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || requestUrl.host;
  const expected = `${protocol}://${host}`;
  const origin = request.headers.get("origin");
  if (origin) return origin === expected;
  const referer = request.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin === expected; } catch { return false; }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export async function rateLimit(request: Request, scope: string, maxHits: number, windowMs: number, discriminator = "") : Promise<RateLimitResult> {
  const key = createHash("sha256").update(`${scope}:${requestIp(request)}:${discriminator}`).digest("hex");
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ hits: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "hits", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "RateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "RateLimitBucket"."hits" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN ${resetAt} ELSE "RateLimitBucket"."resetAt" END,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "hits", "resetAt"
  `;
  const row = rows[0];
  if (!row || row.hits <= maxHits) return { allowed: true, remaining: Math.max(0, maxHits - (row?.hits ?? 1)) };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000)) };
}

export function tooManyRequests(result: Extract<RateLimitResult, { allowed: false }>) {
  return Response.json({ error: "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie." }, { status: 429, headers: { "Retry-After": String(result.retryAfter) } });
}

export function setRateLimitHeaders(response: NextResponse, result: Extract<RateLimitResult, { allowed: true }>) {
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}
