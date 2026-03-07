import "server-only";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function calculatePlatformFeeCents(itemsSubtotalCents: number): number {
  const fee = Math.round(itemsSubtotalCents * 0.15);
  const minCents = 100; // $1
  const maxCents = 800; // $8
  return Math.min(Math.max(fee, minCents), maxCents);
}

const ORDER_MAX_CENTS = 5000; // $50

export async function createOrderPaymentIntent(orderId: string) {
  const supabase = getAdminClient();
  const stripe = getStripe();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*, profiles!orders_seller_id_fkey(stripe_connect_account_id)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found");
  }

  if (order.stripe_payment_intent_id) {
    throw new Error("PaymentIntent already exists for this order");
  }

  if (order.total > ORDER_MAX_CENTS) {
    throw new Error("Order exceeds $50 maximum");
  }

  const sellerConnectAccountId =
    order.profiles?.stripe_connect_account_id;
  if (!sellerConnectAccountId) {
    throw new Error("Seller has no Stripe Connect account");
  }

  const platformFee = calculatePlatformFeeCents(order.items_subtotal);

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: order.total,
      currency: "usd",
      capture_method: "manual",
      metadata: {
        order_id: orderId,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        restaurant_id: order.restaurant_id,
      },
      transfer_data: {
        destination: sellerConnectAccountId,
      },
      application_fee_amount: platformFee,
    },
    {
      idempotencyKey: `create_pi_${orderId}`,
    }
  );

  await supabase
    .from("orders")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", orderId);

  return paymentIntent;
}

export async function capturePaymentIntent(orderId: string) {
  const supabase = getAdminClient();
  const stripe = getStripe();

  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id, status")
    .eq("id", orderId)
    .single();

  if (!order?.stripe_payment_intent_id) {
    throw new Error("No PaymentIntent found for this order");
  }

  // Verify the PI is in a capturable state
  const pi = await stripe.paymentIntents.retrieve(
    order.stripe_payment_intent_id
  );
  if (pi.status !== "requires_capture") {
    throw new Error(
      `PaymentIntent is in state ${pi.status}, cannot capture`
    );
  }

  const captured = await stripe.paymentIntents.capture(
    order.stripe_payment_intent_id,
    {},
    { idempotencyKey: `capture_pi_${orderId}` }
  );

  await supabase
    .from("orders")
    .update({ status: "ready" })
    .eq("id", orderId);

  return captured;
}

export async function cancelPaymentIntent(orderId: string) {
  const supabase = getAdminClient();
  const stripe = getStripe();

  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id")
    .eq("id", orderId)
    .single();

  if (!order?.stripe_payment_intent_id) {
    throw new Error("No PaymentIntent found for this order");
  }

  const pi = await stripe.paymentIntents.retrieve(
    order.stripe_payment_intent_id
  );

  // Only cancel if not already captured
  if (
    pi.status === "requires_capture" ||
    pi.status === "requires_payment_method" ||
    pi.status === "requires_confirmation"
  ) {
    await stripe.paymentIntents.cancel(order.stripe_payment_intent_id, {}, {
      idempotencyKey: `cancel_pi_${orderId}`,
    });
  } else if (pi.status === "succeeded") {
    // Already captured — need to refund
    await stripe.refunds.create(
      {
        payment_intent: order.stripe_payment_intent_id,
      },
      { idempotencyKey: `refund_pi_${orderId}` }
    );
  }

  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);
}
