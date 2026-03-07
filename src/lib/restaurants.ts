import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "./types";

const fallbackRestaurants: Restaurant[] = [
  {
    id: "katzs",
    name: "Katz's Delicatessen",
    address: "205 E Houston St",
    lat: 40.7223,
    lng: -73.9874,
    cuisine: ["Deli", "Sandwich"],
    waitEstimate: "~25 min",
  },
  {
    id: "joes-pizza",
    name: "Joe's Pizza",
    address: "7 Carmine St",
    lat: 40.7308,
    lng: -74.0021,
    cuisine: ["Pizza"],
    waitEstimate: "~12 min",
  },
  {
    id: "russ-daughters",
    name: "Russ & Daughters",
    address: "179 E Houston St",
    lat: 40.7222,
    lng: -73.9882,
    cuisine: ["Deli", "Bagels"],
    waitEstimate: "~15 min",
  },
];

export const restaurants = fallbackRestaurants;

export async function fetchRestaurants(): Promise<Restaurant[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, address, lat, lng, cuisine, default_wait_estimate");

    if (error || !data || data.length === 0) return fallbackRestaurants;

    return data.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      cuisine: r.cuisine,
      waitEstimate: r.default_wait_estimate,
    }));
  } catch {
    return fallbackRestaurants;
  }
}
