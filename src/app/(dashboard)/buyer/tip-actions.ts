"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { getAuthenticatedUser } from "@/lib/auth";

const MIN_TIP_CENTS = 100; // $1
const MAX_TIP_CENTS = 5000; // $50

export async function sendTip(
  orderId: string,
  amountCents: number
): Promise<{ success: true; tipId: string } | { error: string }> {
  const { user } = await getAuthenticatedUser();

  // Validate amount
  if (
    !Number.isInteger(amountCents) ||
    amountCents < MIN_TIP_CENTS ||
    amountCents > MAX_TIP_CENTS
  ) {
    return { error: "Tip must be between $1 and $50." };
  }

  const admin = getAdminClient();

  // Fetch order — verify it's completed and buyer owns it
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, status, restaurant_id")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return { error: "Order not found." };
  }

  if (order.buyer_id !== user.id) {
    return { error: "Not your order." };
  }

  if (order.status !== "completed") {
    return { error: "Order is not completed." };
  }

  // Check no existing tip for this order
  const { data: existingTip } = await admin
    .from("tips")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingTip) {
    return { error: "You already tipped on this order." };
  }

  // Fetch buyer's stripe_customer_id
  const { data: buyerProfile } = await admin
    .from("profiles")
    .select("stripe_customer_id, display_name")
    .eq("id", user.id)
    .single();

  if (!buyerProfile?.stripe_customer_id) {
    return { error: "No payment method on file. Add one in your profile." };
  }

  // Fetch seller's Connect account
  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", order.seller_id)
    .single();

  if (!sellerProfile?.stripe_connect_account_id) {
    return { error: "Seller cannot receive tips right now." };
  }

  // Fetch restaurant name for notification
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", order.restaurant_id)
    .single();

  const stripe = getStripe();

  // Get default payment method for the customer
  const customer = await stripe.customers.retrieve(
    buyerProfile.stripe_customer_id
  );

  if (customer.deleted) {
    return { error: "Payment profile not found." };
  }

  const defaultPm =
    customer.invoice_settings?.default_payment_method ??
    customer.default_source;

  if (!defaultPm) {
    return { error: "No payment method on file. Add one in your profile." };
  }

  try {
    // Create a PaymentIntent with immediate capture (not manual) for the tip
    // 100% of the tip goes to the seller — no platform fee on tips
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        customer: buyerProfile.stripe_customer_id,
        payment_method: typeof defaultPm === "string" ? defaultPm : defaultPm.id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        transfer_data: {
          destination: sellerProfile.stripe_connect_account_id,
        },
        application_fee_amount: 0, // No platform fee on tips
        metadata: {
          type: "tip",
          order_id: orderId,
          buyer_id: user.id,
          seller_id: order.seller_id,
        },
      },
      {
        idempotencyKey: `tip_${orderId}_${user.id}`,
      }
    );

    const tipStatus =
      paymentIntent.status === "succeeded" ? "succeeded" : "pending";

    // Insert tip record
    const { data: tip, error: insertErr } = await admin
      .from("tips")
      .insert({
        order_id: orderId,
        buyer_id: user.id,
        seller_id: order.seller_id,
        amount: amountCents,
        stripe_payment_intent_id: paymentIntent.id,
        status: tipStatus,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[tip] Insert failed:", insertErr.message);
      return { error: "Tip payment succeeded but failed to record. Contact support." };
    }

    // Send push notification to seller (fire and forget)
    if (tipStatus === "succeeded") {
      const buyerName = buyerProfile.display_name ?? "A buyer";
      const restaurantName = restaurant?.name ?? "an order";
      sendPush({
        userId: order.seller_id,
        title: "You got a tip!",
        body: `${buyerName} tipped you $${(amountCents / 100).toFixed(2)} on your ${restaurantName} order`,
        url: "/seller/earnings",
        orderId,
      });
    }

    return { success: true, tipId: tip.id };
  } catch (err: unknown) {
    console.error("[tip] Stripe error:", err);

    // If the PaymentIntent was created but failed, record it as failed
    const piId =
      err && typeof err === "object" && "payment_intent" in err
        ? (err as { payment_intent: { id: string } }).payment_intent?.id
        : null;

    if (piId) {
      await admin.from("tips").insert({
        order_id: orderId,
        buyer_id: user.id,
        seller_id: order.seller_id,
        amount: amountCents,
        stripe_payment_intent_id: piId,
        status: "failed",
      });
    }

    const message =
      err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Payment failed";

    return { error: message };
  }
}

export async function getTipForOrder(
  orderId: string
): Promise<{ tip: { amount: number; status: string } | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { tip: null };

  const { data } = await supabase
    .from("tips")
    .select("amount, status")
    .eq("order_id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  return { tip: data };
}
