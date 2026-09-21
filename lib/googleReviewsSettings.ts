import { prisma } from "@/lib/prisma";
import { decryptGoogleRefreshToken } from "@/lib/googleCalendarCrypto";

export const GOOGLE_REVIEWS_KEY = "private_google_reviews_api_key";
export async function getGoogleReviewsApiKey() {
  const row = await prisma.siteSetting.findUnique({ where: { key: GOOGLE_REVIEWS_KEY } });
  return row?.value ? decryptGoogleRefreshToken(row.value) : process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}
export async function getGoogleReviewsSettings() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [GOOGLE_REVIEWS_KEY, "googleReviews.placeId", "googleReviews.mapsUrl"] } } });
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return {
    placeId: values.get("googleReviews.placeId") || "",
    mapsUrl: values.get("googleReviews.mapsUrl") || "",
    configured: Boolean(values.get(GOOGLE_REVIEWS_KEY) || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
  };
}
