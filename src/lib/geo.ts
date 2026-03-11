import { EARTH_RADIUS_MILES } from "@/lib/constants";

export function getDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = EARTH_RADIUS_MILES;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(miles: number): string {
  if (miles < 0.5) {
    const blocks = Math.round(miles * 20);
    return `${blocks} block${blocks !== 1 ? "s" : ""}`;
  }
  return `${miles.toFixed(1)} mi`;
}
