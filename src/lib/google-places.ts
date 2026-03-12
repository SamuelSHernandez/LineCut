import { unstable_cache } from "next/cache";

interface OpeningHoursPeriod {
  open: { day: number; hour: number; minute: number };
  close: { day: number; hour: number; minute: number };
}

interface PlaceResponse {
  currentOpeningHours?: {
    openNow?: boolean;
    periods?: OpeningHoursPeriod[];
  };
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceResponse | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=currentOpeningHours`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "currentOpeningHours",
        },
      }
    );

    if (!res.ok) return null;
    return (await res.json()) as PlaceResponse;
  } catch {
    return null;
  }
}

/**
 * Check if a restaurant is currently open via Google Places API.
 * Returns null if no placeId or API unavailable.
 */
export async function isRestaurantOpen(placeId: string | null | undefined): Promise<boolean | null> {
  if (!placeId) return null;

  const getCachedHours = unstable_cache(
    async (id: string) => fetchPlaceDetails(id),
    [`restaurant-hours`],
    { revalidate: 3600, tags: [`restaurant-hours-${placeId}`] }
  );

  const data = await getCachedHours(placeId);
  if (!data?.currentOpeningHours) return null;

  return data.currentOpeningHours.openNow ?? null;
}

/**
 * Batch-check open status for multiple restaurants.
 */
export async function getOpenStatusMap(
  restaurants: { id: string; googlePlaceId?: string | null }[]
): Promise<Record<string, boolean | null>> {
  const results: Record<string, boolean | null> = {};

  await Promise.all(
    restaurants.map(async (r) => {
      results[r.id] = await isRestaurantOpen(r.googlePlaceId);
    })
  );

  return results;
}
