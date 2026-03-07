"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  capturePaymentIntent,
  cancelPaymentIntent,
} from "@/lib/stripe/payment-intents";

export async function acceptOrder(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Verify this order belongs to this seller and is pending
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, seller_id")
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .single();

  if (!order) {
    return { error: "Order not found." };
  }

  if (order.status !== "pending") {
    return { error: "Order is no longer pending." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "accepted" })
    .eq("id", orderId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "Failed to accept order." };
  }

  return { success: true };
}

export async function markOrderReady(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, seller_id, stripe_payment_intent_id")
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .single();

  if (!order) {
    return { error: "Order not found." };
  }

  if (order.status !== "accepted" && order.status !== "in-progress") {
    return { error: "Order must be accepted before marking as ready." };
  }

  // Capture payment
  if (order.stripe_payment_intent_id) {
    try {
      await capturePaymentIntent(orderId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment capture failed";
      return { error: message };
    }
  } else {
    // No PI — just update status (demo/sample orders)
    const { error } = await supabase
      .from("orders")
      .update({ status: "ready" })
      .eq("id", orderId)
      .eq("seller_id", user.id);

    if (error) {
      return { error: "Failed to update order." };
    }
  }

  return { success: true };
}

export async function declineOrder(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, seller_id, stripe_payment_intent_id")
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .single();

  if (!order) {
    return { error: "Order not found." };
  }

  // Cancel PaymentIntent if exists
  if (order.stripe_payment_intent_id) {
    try {
      await cancelPaymentIntent(orderId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment cancellation failed";
      return { error: message };
    }
  } else {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("seller_id", user.id);

    if (error) {
      return { error: "Failed to decline order." };
    }
  }

  return { success: true };
}
