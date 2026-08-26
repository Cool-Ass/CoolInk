import type { NextResponse } from "next/server";

type RateLimitResult = { allowed: true; remaining: number } | { allowed: false; retryAfter: number };
type RateLimitEntry = { hits: number[] };

// This is deliberately stored on globalThis so hot reloads do not clear it.
// For production with multiple server instances, Vercel's WAF/rate limiting
// should be enabled as an additional perimeter; this layer still protects
// each instance and local deployments without another service.
const store = globalThis as typeof globalThis & { coolinkRateLimits?: Map<string, RateLimitEntry> };
const limits = store.coolinkRateLimits ?? new Map<string, RateLimitEntry>();
store.coolinkRateLimits = limits;

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function rateLimit(request: Request, scope: string, maxHits: number, windowMs: number, discriminator = "") : RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${requestIp(request)}:${discriminator}`;
  const entry = limits.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((timestamp) => now - timestamp < windowMs);
  if (entry.hits.length >= maxHits) {
    limits.set(key, entry);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.hits[0] + windowMs - now) / 1000)) };
  }
  entry.hits.push(now);
  limits.set(key, entry);
  return { allowed: true, remaining: maxHits - entry.hits.length };
}

export function tooManyRequests(result: Extract<RateLimitResult, { allowed: false }>) {
  return Response.json({ error: "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie." }, { status: 429, headers: { "Retry-After": String(result.retryAfter) } });
}

export function setRateLimitHeaders(response: NextResponse, result: Extract<RateLimitResult, { allowed: true }>) {
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}
