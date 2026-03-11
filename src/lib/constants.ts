/** 1 mile in meters */
export const MILES_TO_METERS = 1609.344;

/** Earth's radius in miles (for Haversine) */
export const EARTH_RADIUS_MILES = 3958.8;

/** Server-side geofence radius in meters (slightly generous for GPS jitter) */
export const SERVER_GEOFENCE_RADIUS_METERS = 200;

/** Client-side geofence radius in meters */
export const CLIENT_GEOFENCE_RADIUS_METERS = 150;

/** Absolute maximum order total in cents ($200) */
export const ORDER_MAX_CENTS = 20000;

/** Stale ready-order threshold in milliseconds (20 minutes) */
export const STALE_READY_THRESHOLD_MS = 20 * 60 * 1000;

/** System actor UUID for automated transitions */
export const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";
