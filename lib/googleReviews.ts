export type GoogleReview = {
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
  googleMapsUri: string;
  author: { displayName: string; uri: string; photoUri: string };
};

export type GoogleReviewsPayload = {
  configured: boolean;
  placeName?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews: GoogleReview[];
};

type GooglePlaceResponse = {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }>;
};

export async function fetchGoogleReviews(placeId: string, mapsUrl: string): Promise<GoogleReviewsPayload> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !placeId) return { configured: false, reviews: [] };
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "pl");
  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,googleMapsUri",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google Places zwróciło błąd ${response.status}.`);
  const place = await response.json() as GooglePlaceResponse;
  return {
    configured: true,
    placeName: place.displayName?.text || "CoolInk Tattoo Studio",
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    googleMapsUri: place.googleMapsUri || mapsUrl,
    reviews: (place.reviews ?? []).map((review) => ({
      rating: review.rating ?? 0,
      text: review.text?.text ?? "",
      relativePublishTimeDescription: review.relativePublishTimeDescription ?? "",
      googleMapsUri: review.googleMapsUri || place.googleMapsUri || mapsUrl,
      author: {
        displayName: review.authorAttribution?.displayName ?? "Użytkownik Google",
        uri: review.authorAttribution?.uri ?? review.googleMapsUri ?? place.googleMapsUri ?? mapsUrl,
        photoUri: review.authorAttribution?.photoUri ?? "",
      },
    })).filter((review) => review.text),
  };
}
