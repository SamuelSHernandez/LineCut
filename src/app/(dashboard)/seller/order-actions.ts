"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  capturePaymentIntent,
  cancelPaymentIntent,
} from "@/lib/stripe/payment-intents";
import { sendNotification } from "@/lib/notify";
import { confirmHandoff } from "@/lib/handoff";
import { getAuthenticatedUser } from "@/lib/auth";
import { calculateStreak } from "@/lib/gamification";
import { SYSTEM_ACTOR_ID, SELLER_CANCEL_FEE_CENTS } from "@/lib/orders/state-machine";
import { stripe } from "@/lib/stripe";

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
      sendNotification({
        userId: buyerId,
        title: "Order accepted",
        body: "Your order was accepted. Hang tight.",
        url: `/buyer`,
        orderId,
        smsBody: "LineCut: Your order was accepted! Hang tight.",
      });
    }
  }).catch((err) => console.error("[acceptOrder] notify failed:", err));

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
      sendNotification({
        userId: buyerId,
        title: "Order declined",
        body: "Your order was declined. You won't be charged.",
        url: `/buyer`,
        orderId,
        smsBody: "LineCut: Your order was declined. You won't be charged.",
      });
    }
  }).catch((err) => console.error("[declineOrder] notify failed:", err));

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

  // Fetch PI id and pickup instructions before transitioning
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id, pickup_instructions, restaurant_id")
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

  // Notify buyer — fire and forget (include pickup instructions if available)
  const pickupNote = order?.pickup_instructions
    ? ` ${order.pickup_instructions}`
    : "";
  getBuyerId(orderId).then(async (buyerId) => {
    if (buyerId) {
      // Look up restaurant name for SMS
      let restaurantName = "the restaurant";
      if (order?.restaurant_id) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", order.restaurant_id)
          .maybeSingle();
        if (restaurant?.name) restaurantName = restaurant.name;
      }
      sendNotification({
        userId: buyerId,
        title: "Order ready",
        body: `Your order is ready for pickup.${pickupNote}`,
        url: `/buyer`,
        orderId,
        smsBody: `LineCut: Your ${restaurantName} order is ready!${pickupNote}`,
      });
    }
  }).catch((err) => console.error("[markReady] notify failed:", err));

  revalidatePath("/seller");
  return { success: true };
}

/**
 * Seller confirms hand-off. If buyer has also confirmed, transitions to completed.
 * Transition: ready -> completed (when both parties confirm)
 */
export async function markCompleted(orderId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedUser();

  const result = await confirmHandoff(orderId, user.id, "seller");

  if (result.error) {
    return { error: result.error };
  }

  // Update streak (fire and forget)
  (async () => {
    try {
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, last_active_date")
        .eq("id", user.id)
        .single();
      if (!sellerProfile) return;
      const { streak, isNewDay } = calculateStreak(
        sellerProfile.last_active_date,
        sellerProfile.current_streak
      );
      if (isNewDay) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase
          .from("profiles")
          .update({
            current_streak: streak,
            longest_streak: Math.max(streak, sellerProfile.longest_streak),
            last_active_date: today,
          })
          .eq("id", user.id);
      }
    } catch (err) {
      console.error("[markCompleted] streak update failed:", err);
    }
  })();

  revalidatePath("/seller");
  return { success: true };
}

/**
 * System-initiated cancellation when buyer doesn't pick up a ready order.
 * Seller keeps the payment — no refund issued.
 */
export async function cancelReadyOrderNoShow(orderId: string): Promise<ActionResult> {
  await getAuthenticatedUser(); // auth gate

  const result = await callTransitionRpc(orderId, "cancelled", SYSTEM_ACTOR_ID, {
    reason: "buyer_no_show",
  });

  if (result.error) {
    return { error: result.error, errorCode: result.errorCode };
  }

  // Fetch order details for notifications
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id, seller_id, total")
    .eq("id", orderId)
    .single();

  if (order) {
    const totalStr = `$${(order.total / 100).toFixed(2)}`;

    sendNotification({
      userId: order.buyer_id,
      title: "Order cancelled — no pickup",
      body: `You didn't pick up in time. You were charged ${totalStr}.`,
      url: `/buyer`,
      orderId,
      smsBody: `LineCut: You didn't pick up in time. You were charged ${totalStr}.`,
    }).catch((err) => console.error("[cancelReadyOrderNoShow] buyer notify failed:", err));

    sendNotification({
      userId: order.seller_id,
      title: "Buyer didn't show",
      body: `Order cancelled — buyer didn't show. You keep the payment.`,
      url: `/seller`,
      orderId,
      smsBody: `LineCut: Buyer didn't show. Order cancelled. You keep the payment.`,
    }).catch((err) => console.error("[cancelReadyOrderNoShow] seller notify failed:", err));
  }

  revalidatePath("/seller");
  return { success: true };
}

/**
 * Seller cancels an accepted or in-progress order.
 * Buyer's payment is voided. Seller is charged a $5 cancellation fee.
 */
export async function cancelAcceptedOrder(orderId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedUser();

  // Fetch order and seller profile
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id, status, buyer_id")
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .single();

  if (!order) {
    return { error: "Order not found.", errorCode: "ORDER_NOT_FOUND" };
  }

  if (order.status !== "accepted" && order.status !== "in-progress") {
    return { error: "Order can only be cancelled when accepted or in-progress.", errorCode: "INVALID_TRANSITION" };
  }

  // Fetch seller's Stripe Connect account for the fee charge
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .single();

  // Void the buyer's payment
  if (order.stripe_payment_intent_id) {
    try {
      await cancelPaymentIntent(orderId);
    } catch (err) {
      console.error("[cancelAcceptedOrder] cancelPaymentIntent error:", err);
    }
  }

  // Transition order to cancelled
  const result = await callTransitionRpc(orderId, "cancelled", user.id, {
    reason: "seller_cancelled_post_accept",
    fee_charged: SELLER_CANCEL_FEE_CENTS,
  });

  if (result.error) {
    return { error: result.error, errorCode: result.errorCode };
  }

  // Charge the seller a cancellation fee via their Connect account
  if (sellerProfile?.stripe_connect_account_id) {
    try {
      await stripe.charges.create({
        amount: SELLER_CANCEL_FEE_CENTS,
        currency: "usd",
        source: sellerProfile.stripe_connect_account_id,
        description: `LineCut cancellation fee — Order ${orderId.slice(0, 8)}`,
      });
    } catch (err) {
      // Log but don't block — fee can be collected later
      console.error("[cancelAcceptedOrder] fee charge failed:", err);
    }
  }

  // Notify buyer
  sendNotification({
    userId: order.buyer_id,
    title: "Order cancelled by seller",
    body: "Your seller cancelled the order. You won't be charged.",
    url: `/buyer`,
    orderId,
    smsBody: "LineCut: Your seller cancelled the order. You won't be charged.",
  }).catch((err) => console.error("[cancelAcceptedOrder] notify failed:", err));

  revalidatePath("/seller");
  return { success: true };
}
