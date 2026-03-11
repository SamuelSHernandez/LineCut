"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  capturePaymentIntent,
  cancelPaymentIntent,
} from "@/lib/stripe/payment-intents";
import { sendPush } from "@/lib/push";
import { confirmHandoff } from "@/lib/handoff";
import { getAuthenticatedUser } from "@/lib/auth";

/** Look up buyer_id for an order (used to send push notifications). */
async function getBuyerId(orderId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("buyer_id")
    .eq("id", orderId)
    .single();
  return data?.buyer_id ?? null;
}

// ── Helpers ─────────────────────────────────────────────────

interface ActionResult {
  success?: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Call the transition_order RPC. Returns the updated order row on success,
 * or an error result on failure.
 */
async function callTransitionRpc(
  orderId: string,
  newStatus: string,
  actorId: string,
  metadata: Record<string, unknown> = {}
): Promise<
  | { data: Record<string, unknown>; error: null }
  | { data: null; error: string; errorCode: string }
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("transition_order", {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_actor_id: actorId,
    p_metadata: metadata,
  });

  if (error) {
    // Parse machine-readable error codes from the RPC exception messages
    const msg = error.message ?? "Unknown error";

    if (msg.includes("ORDER_NOT_FOUND")) {
      return { data: null, error: "Order not found.", errorCode: "ORDER_NOT_FOUND" };
    }
    if (msg.includes("INVALID_TRANSITION")) {
      return {
        data: null,
        error: "This action is no longer available for this order.",
        errorCode: "INVALID_TRANSITION",
      };
    }
    if (msg.includes("PERMISSION_DENIED")) {
      return {
        data: null,
        error: "You don't have permission to perform this action.",
        errorCode: "PERMISSION_DENIED",
      };
    }

    return { data: null, error: msg, errorCode: "RPC_ERROR" };
  }

  return { data: data as Record<string, unknown>, error: null };
}

// ── Actions ─────────────────────────────────────────────────

/**
 * Seller accepts a pending order.
 * Transition: pending -> accepted
 */
export async function acceptOrder(orderId: string): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser();

  const result = await callTransitionRpc(orderId, "accepted", user.id);

  if (result.error) {
    return { error: result.error, errorCode: result.errorCode };
  }

  // Notify buyer — fire and forget
  getBuyerId(orderId).then((buyerId) => {
    if (buyerId) {
      sendPush({
        userId: buyerId,
        title: "Order accepted",
        body: "Your order was accepted. Hang tight.",
        url: `/buyer`,
        orderId,
      });
    }
  }).catch((err) => console.error("[acceptOrder] push failed:", err));

  revalidatePath("/seller");
  return { success: true };
}

/**
 * Seller declines a pending order.
 * Transition: pending -> cancelled
 * Side effect: cancel (void) PaymentIntent if one exists.
 */
export async function declineOrder(orderId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedUser();

  // Fetch PI id before transitioning so we can cancel it
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id")
    .eq("id", orderId)
    .single();

  const result = await callTransitionRpc(orderId, "cancelled", user.id, {
    reason: "seller_declined",
  });

  if (result.error) {
    return { error: result.error, errorCode: result.errorCode };
  }

  // Void the payment hold
  if (order?.stripe_payment_intent_id) {
    try {
      await cancelPaymentIntent(orderId);
    } catch (err) {
      // Payment already cancelled or in a terminal state — not a blocker
      console.error("[declineOrder] cancelPaymentIntent error:", err);
    }
  }

  // Notify buyer — fire and forget
  getBuyerId(orderId).then((buyerId) => {
    if (buyerId) {
      sendPush({
        userId: buyerId,
        title: "Order declined",
        body: "Your order was declined. You won't be charged.",
        url: `/buyer`,
        orderId,
      });
    }
  }).catch((err) => console.error("[declineOrder] push failed:", err));

  revalidatePath("/seller");
  return { success: true };
}

/**
 * Seller marks an accepted order as in-progress.
 * Transition: accepted -> in-progress
 */
export async function markInProgress(orderId: string): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser();

  const result = await callTransitionRpc(orderId, "in-progress", user.id);

  if (result.error) {
    return { error: result.error, errorCode: result.errorCode };
  }

  revalidatePath("/seller");
  return { success: true };
}

/**
 * Seller marks an in-progress order as ready for pickup.
 * Transition: in-progress -> ready
 * Side effect: capture the PaymentIntent (charge the buyer).
 */
export async function markReady(orderId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedUser();

  // Fetch PI id before transitioning
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id")
    .eq("id", orderId)
    .single();

  // Capture payment BEFORE transitioning status — if capture fails we don't
  // want the order stuck in "ready" with no payment.
  if (order?.stripe_payment_intent_id) {
    try {
      await capturePaymentIntent(orderId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment capture failed";
      return { error: message, errorCode: "PAYMENT_CAPTURE_FAILED" };
    }
  }

  const result = await callTransitionRpc(orderId, "ready", user.id, {
    payment_captured: !!order?.stripe_payment_intent_id,
  });

  if (result.error) {
    return { error: result.error, errorCode: result.errorCode };
  }

  // Notify buyer — fire and forget
  getBuyerId(orderId).then((buyerId) => {
    if (buyerId) {
      sendPush({
        userId: buyerId,
        title: "Order ready",
        body: "Your order is ready for pickup.",
        url: `/buyer`,
        orderId,
      });
    }
  }).catch((err) => console.error("[markReady] push failed:", err));

  revalidatePath("/seller");
  return { success: true };
}

/**
 * Seller confirms hand-off. If buyer has also confirmed, transitions to completed.
 * Transition: ready -> completed (when both parties confirm)
 */
export async function markCompleted(orderId: string): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser();

  const result = await confirmHandoff(orderId, user.id, "seller");

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/seller");
  return { success: true };
}

/**
 * Seller force-completes after timeout (buyer didn't show or didn't confirm).
 */
export async function forceComplete(orderId: string): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser();

  const result = await callTransitionRpc(orderId, "completed", user.id, {
    unilateral: true,
    reason: "seller_force_complete",
  });

  if (result.error) {
    return { error: result.error, errorCode: result.errorCode };
  }

  // Partial refund: buyer gets platform fee back (seller did the work)
  try {
    const { refundPartialPlatformFee } = await import(
      "@/lib/stripe/payment-intents"
    );
    await refundPartialPlatformFee(orderId);
  } catch (err) {
    console.error("[forceComplete] Partial refund failed:", err);
    // Don't block the completion — refund can be handled manually
  }

  revalidatePath("/seller");
  return { success: true };
}
