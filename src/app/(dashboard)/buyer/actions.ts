"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createOrderPaymentIntent } from "@/lib/stripe/payment-intents";
import { sendPush } from "@/lib/push";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { isBlocked } from "@/lib/blocked-users";

const ORDER_MAX_CENTS = 20000; // $200 absolute max

interface PlaceOrderInput {
  sellerId: string;
  restaurantId: string;
  items: { menuItemId: string; name: string; price: number; quantity: number }[];
  specialInstructions: string;
  sellerFee: number; // dollars
}

function calculatePlatformFee(itemsSubtotal: number): number {
  const fee = itemsSubtotal * 0.10;
  return Math.min(Math.max(fee, 0.50), 5.0);
}

export async function placeOrder(input: PlaceOrderInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check if either party has blocked the other
  const blocked = await isBlocked(user.id, input.sellerId);
  if (blocked) {
    return { error: "You cannot place an order with this seller." };
  }

  // Server-side price calculation
  const itemsSubtotal = input.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const platformFee = calculatePlatformFee(itemsSubtotal);
  const total = itemsSubtotal + input.sellerFee + platformFee;

  // Convert to cents for storage
  const itemsSubtotalCents = Math.round(itemsSubtotal * 100);
  const sellerFeeCents = Math.round(input.sellerFee * 100);
  const platformFeeCents = Math.round(platformFee * 100);
  const totalCents = Math.round(total * 100);

  // Absolute platform cap
  if (totalCents > ORDER_MAX_CENTS) {
    return { error: "Order exceeds $200 maximum." };
  }

  // Enforce seller's personal max order cap
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("max_order_cap")
    .eq("id", input.sellerId)
    .single();

  if (sellerProfile && totalCents > sellerProfile.max_order_cap) {
    const capDollars = (sellerProfile.max_order_cap / 100).toFixed(0);
    return { error: `Order exceeds this seller's max of $${capDollars}.` };
  }

  // Verify seller has an active session at this restaurant
  const { data: sellerSession } = await supabase
    .from("seller_sessions")
    .select("id")
    .eq("seller_id", input.sellerId)
    .eq("restaurant_id", input.restaurantId)
    .eq("status", "active")
    .maybeSingle();

  if (!sellerSession) {
    return { error: "This seller is no longer in line." };
  }

  // Insert order
  const { data: order, error: insertErr } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      seller_id: input.sellerId,
      restaurant_id: input.restaurantId,
      items: input.items,
      special_instructions: input.specialInstructions,
      items_subtotal: itemsSubtotalCents,
      seller_fee: sellerFeeCents,
      platform_fee: platformFeeCents,
      total: totalCents,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !order) {
    return { error: "Failed to create order. Please try again." };
  }

  // Create PaymentIntent
  let clientSecret: string;
  try {
    const paymentIntent = await createOrderPaymentIntent(order.id);
    clientSecret = paymentIntent.client_secret!;
  } catch (err) {
    // Clean up the order if PI creation fails
    await supabase.from("orders").delete().eq("id", order.id);
    const message = err instanceof Error ? err.message : "Payment setup failed";
    return { error: message };
  }

  // Notify seller — fire and forget
  const { data: buyerProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  const buyerName = buyerProfile
    ? `${buyerProfile.first_name ?? "Someone"}`
    : "Someone";
  const itemCount = input.items.reduce((sum, i) => sum + i.quantity, 0);

  sendPush({
    userId: input.sellerId,
    title: "New order",
    body: `${buyerName} wants ${itemCount} item${itemCount !== 1 ? "s" : ""}`,
    url: `/seller`,
    orderId: order.id,
  });

  trackEvent(EVENTS.ORDER_PLACED, user.id, {
    order_id: order.id,
    restaurant_id: input.restaurantId,
    total_cents: totalCents,
    item_count: input.items.reduce((sum, i) => sum + i.quantity, 0),
  });

  return { success: true, orderId: order.id, clientSecret };
}
