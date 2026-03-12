"use server";

import { getDistanceMiles } from "@/lib/geo";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { getScaledFeeCap, VALID_WAIT_MINUTES } from "@/lib/fee-tiers";
import { getAuthenticatedUser } from "@/lib/auth";
import { SERVER_GEOFENCE_RADIUS_METERS, MILES_TO_METERS } from "@/lib/constants";


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

interface GoLiveSessionData {
  estimatedWaitMinutes: number;
  sellerFeeCents: number;
  pickupInstructions?: string;
}

export async function goLive(restaurantId: string, coords?: GoLiveCoords, sessionData?: GoLiveSessionData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Check billing gate — seller must have active Stripe Connect
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_status, completed_deliveries")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_connect_status !== "active") {
    return { error: "billing_gate", redirectUrl: "/profile?gate=seller#payouts" };
  }

  const completedDeliveries: number = profile?.completed_deliveries ?? 0;

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

  // Check for existing active or winding-down session
  const { data: existing } = await supabase
    .from("seller_sessions")
    .select("id, status")
    .eq("seller_id", user.id)
    .in("status", ["active", "winding_down"])
    .maybeSingle();

  if (existing) {
    return {
      error: existing.status === "winding_down"
        ? "You have a session winding down. Wait for active orders to finish or force end it."
        : "You already have an active session.",
    };
  }

  // Validate session data if provided
  if (sessionData) {
    if (!VALID_WAIT_MINUTES.includes(sessionData.estimatedWaitMinutes)) {
      return { error: "Invalid wait estimate." };
    }
    if (!Number.isInteger(sessionData.sellerFeeCents)) {
      return { error: "Invalid fee amount." };
    }
    const scaledCapDollars = getScaledFeeCap(sessionData.estimatedWaitMinutes, completedDeliveries);
    const maxFeeCents = Math.round(scaledCapDollars * 100);
    if (sessionData.sellerFeeCents < 100 || sessionData.sellerFeeCents > maxFeeCents) {
      return { error: `Fee must be between $1 and $${scaledCapDollars.toFixed(2)} for this wait estimate.` };
    }
    if (sessionData.pickupInstructions && sessionData.pickupInstructions.length > 200) {
      return { error: "Pickup instructions must be 200 characters or less." };
    }
  }

  const { error } = await supabase.from("seller_sessions").insert({
    seller_id: user.id,
    restaurant_id: restaurantId,
    ...(sessionData && {
      estimated_wait_minutes: sessionData.estimatedWaitMinutes,
      seller_fee_cents: sessionData.sellerFeeCents,
      ...(sessionData.pickupInstructions && {
        pickup_instructions: sessionData.pickupInstructions,
      }),
    }),
  });

  if (error) {
    return { error: "Failed to start session. Please try again." };
  }

  trackEvent(EVENTS.SELLER_WENT_LIVE, user.id, {
    restaurant_id: restaurantId,
    ...(sessionData && {
      estimated_wait_minutes: sessionData.estimatedWaitMinutes,
      seller_fee_cents: sessionData.sellerFeeCents,
    }),
  });

  return { success: true };
}

export async function endSession(
  sessionId: string,
  status: "completed" | "cancelled" = "completed",
  force: boolean = false
) {
  const { supabase, user } = await getAuthenticatedUser();

  // Get the session to compute duration — allow ending from both 'active' and 'winding_down'
  const { data: session } = await supabase
    .from("seller_sessions")
    .select("started_at, status")
    .eq("id", sessionId)
    .eq("seller_id", user.id)
    .in("status", ["active", "winding_down"])
    .single();

  if (!session) {
    return { error: "Session not found or already ended." };
  }

  // If ending gracefully (not forcing, not cancelling), check for active orders
  if (status === "completed" && !force && session.status === "active") {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .in("status", ["accepted", "in_progress", "ready"]);

    if (count && count > 0) {
      // Transition to winding_down instead of completed
      const { error: windDownError } = await supabase
        .from("seller_sessions")
        .update({ status: "winding_down" })
        .eq("id", sessionId)
        .eq("seller_id", user.id);

      if (windDownError) {
        return { error: "Failed to wind down session. Please try again." };
      }

      return { success: true, windingDown: true };
    }
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

  trackEvent(EVENTS.SELLER_ENDED_SESSION, user.id, {
    session_id: sessionId,
    status,
    duration_minutes: durationMinutes,
  });

  return { success: true };
}

/**
 * Complete a winding-down session. Called automatically when the last
 * active order finishes. Only transitions from 'winding_down' to 'completed'.
 */
export async function completeWindingDownSession(sessionId: string) {
  const { supabase, user } = await getAuthenticatedUser();

  // Verify the session is actually winding down
  const { data: session } = await supabase
    .from("seller_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .eq("seller_id", user.id)
    .eq("status", "winding_down")
    .single();

  if (!session) {
    return { error: "Session not found or not winding down." };
  }

  // Double-check no active orders remain
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", ["accepted", "in_progress", "ready"]);

  if (count && count > 0) {
    return { error: "Active orders still remain." };
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
      status: "completed",
    })
    .eq("id", sessionId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "Failed to complete session." };
  }

  return { success: true };
}
