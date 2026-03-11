"use client";

import { useState, useCallback } from "react";
import { getDistanceMiles } from "@/lib/geo";
import { MILES_TO_METERS } from "@/lib/constants";

export type GeofenceStatus =
  | "idle"
  | "checking"
  | "inside"
  | "outside"
  | "denied"
  | "unavailable";

export interface GeofenceResult {
  /** Current geofence check status */
  status: GeofenceStatus;
  /**
   * Distance in meters from the target location.
   * Null until a successful position fix has been obtained.
   */
  distanceMeters: number | null;
  /** Human-readable error message, or null if no error */
  error: string | null;
  /**
   * Trigger a fresh geolocation check. Each call issues a new
   * getCurrentPosition request with maximumAge: 0 — never cached.
   */
  check: () => void;
}

interface UseGeofenceOptions {
  /** Target latitude */
  lat: number;
  /** Target longitude */
  lng: number;
  /**
   * Allowed radius in meters.
   * @default 150
   */
  radiusMeters?: number;
}

/**
 * Hook that checks whether the user is within a given radius of a location.
 *
 * Privacy contract:
 * - Raw coordinates (GeolocationCoordinates) are used in-memory only to
 *   compute Haversine distance, then immediately discarded. They are never
 *   assigned to state, logged, or transmitted anywhere.
 * - Only the computed distance (meters, an integer) is stored in state.
 *
 * Uses getCurrentPosition on every check — never watchPosition, never cached.
 */
export function useGeofence({
  lat,
  lng,
  radiusMeters = 150,
}: UseGeofenceOptions): GeofenceResult {
  const [status, setStatus] = useState<GeofenceStatus>("idle");
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setError(
        "We couldn't determine your location. Please make sure location services are enabled on your device and try again."
      );
      return;
    }

    setStatus("checking");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Raw coordinates are used here transiently to compute distance.
        // They are never stored in state, never logged, never transmitted.
        const distanceMiles = getDistanceMiles(
          position.coords.latitude,
          position.coords.longitude,
          lat,
          lng
        );
        const meters = Math.round(distanceMiles * MILES_TO_METERS);
        const isInside = meters <= radiusMeters;

        setDistanceMeters(meters);
        setStatus(isInside ? "inside" : "outside");
        setError(null);
      },
      (positionError) => {
        setDistanceMeters(null);

        switch (positionError.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            setStatus("denied");
            setError(
              "Location access was denied. To use Go Live, please enable location permissions in your browser settings and try again. If you believe this is an error, contact support for manual verification."
            );
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
          case GeolocationPositionError.TIMEOUT:
            setStatus("unavailable");
            setError(
              "We couldn't determine your location. Please make sure location services are enabled on your device and try again."
            );
            break;
          default:
            setStatus("unavailable");
            setError(
              "Something went wrong while checking your location. Please try again. If this keeps happening, contact support."
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      }
    );
  }, [lat, lng, radiusMeters]);

  return { status, distanceMeters, error, check };
}

/**
 * Perform a single, fresh getCurrentPosition call and return a Promise that
 * resolves with the raw GeolocationPosition.
 *
 * Callers are responsible for using the coordinates only transiently (compute
 * distance, then discard). Never store coords in state, log them, or transmit
 * them to any external service.
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new DOMException("Geolocation not supported", "NotSupportedError"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });
}

/**
 * Format a distance in meters as "Xm (Yft)".
 * Exported for use in UI components.
 */
export function formatDistanceMeters(meters: number): string {
  const feet = Math.round(meters * 3.28084);
  return `${Math.round(meters)}m (${feet}ft)`;
}

/**
 * Detect whether the current device is likely a desktop browser.
 * Used to show a proactive degraded-experience message.
 * This is a best-effort heuristic — not a hard block on go live.
 */
export function isLikelyDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  return !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
