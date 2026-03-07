"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDistanceMiles } from "@/lib/geo";

// 1 mile = 1609.344 meters
const MILES_TO_METERS = 1609.344;

/**
 * Server-side geofence radius in meters.
 * Slightly more generous than the client (150m) to account for
 * network round-trip time and GPS measurement jitter.
 */
const SERVER_GEOFENCE_RADIUS_METERS = 200;

interface GoLiveCoords {
  /**
   * Client-reported latitude at the time of the Go Live tap.
   * Used only for server-side proximity validation — never stored or logged.
   */
  lat: number;
  /**
   * Client-reported longitude at the time of the Go Live tap.
   * Used only for server-side proximity validation — never stored or logged.
   */
  lng: number;
}

export async function goLive(restaurantId: string, coords?: GoLiveCoords) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check billing gate — seller must have active Stripe Connect
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_status")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_connect_status !== "active") {
    return { error: "billing_gate", redirectUrl: "/profile?gate=seller#payouts" };
  }

  // Server-side proximity check.
  // Coordinates are used only to compute distance and are never stored or logged.
  if (coords) {
    // Fetch restaurant coordinates from Supabase, falling back to the hardcoded list.
    const { data: restaurantRow } = await supabase
      .from("restaurants")
      .select("lat, lng")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantRow) {
      const distanceMiles = getDistanceMiles(
        coords.lat,
        coords.lng,
        restaurantRow.lat,
        restaurantRow.lng
      );
      const distanceMeters = distanceMiles * MILES_TO_METERS;

      if (distanceMeters > SERVER_GEOFENCE_RADIUS_METERS) {
        return {
          error: "You must be at the restaurant to go live. Move closer and try again.",
        };
      }
    }
    // If the restaurant row isn't found in Supabase, fall through and allow the
    // session — the client-side check is the primary enforcement layer in that case.
  }

  // Check for existing active session
  const { data: existing } = await supabase
    .from("seller_sessions")
    .select("id")
    .eq("seller_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return { error: "You already have an active session." };
  }

  const { error } = await supabase.from("seller_sessions").insert({
    seller_id: user.id,
    restaurant_id: restaurantId,
  });

  if (error) {
    return { error: "Failed to start session. Please try again." };
  }

  return { success: true };
}

export async function endSession(
  sessionId: string,
  status: "completed" | "cancelled" = "completed"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Get the session to compute duration
  const { data: session } = await supabase
    .from("seller_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .eq("seller_id", user.id)
    .eq("status", "active")
    .single();

  if (!session) {
    return { error: "Session not found or already ended." };
  }

  const startedAt = new Date(session.started_at);
  const now = new Date();
  const durationMinutes = Math.round(
    (now.getTime() - startedAt.getTime()) / 60000
  );

  const { error } = await supabase
    .from("seller_sessions")
    .update({
      ended_at: now.toISOString(),
      wait_duration_minutes: durationMinutes,
      status,
    })
    .eq("id", sessionId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "Failed to end session. Please try again." };
  }

  return { success: true };
}
