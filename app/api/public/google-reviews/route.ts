import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/content";
import { fetchGoogleReviews } from "@/lib/googleReviews";
import { rateLimit, tooManyRequests } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = await rateLimit(request, "public-google-reviews", 60, 60_000);
  if (!limit.allowed) return tooManyRequests(limit);
  const content = await getSiteContent();
  try {
    const payload = await fetchGoogleReviews(content.googleReviews.placeId, content.googleReviews.mapsUrl);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ configured: true, reviews: [], error: error instanceof Error ? error.message : "Nie udało się pobrać opinii." }, { status: 502, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
}
