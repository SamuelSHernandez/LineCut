import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "./types";
import { restaurants as fallbackRestaurants } from "./restaurant-data";

export { restaurants } from "./restaurant-data";

export async function fetchRestaurants(): Promise<Restaurant[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, address, lat, lng, cuisine, default_wait_estimate, google_place_id, image_url");

    if (error || !data || data.length === 0) return fallbackRestaurants;

    return data.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      cuisine: r.cuisine,
      waitEstimate: r.default_wait_estimate,
      googlePlaceId: r.google_place_id ?? null,
      imageUrl: r.image_url ?? null,
    }));
  } catch {
    return fallbackRestaurants;
  }
}
