"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createOrderPaymentIntent } from "@/lib/stripe/payment-intents";
import { sendPush } from "@/lib/push";

const ORDER_MAX_CENTS = 5000; // $50

interface PlaceOrderInput {
  sellerId: string;
  restaurantId: string;
  items: { menuItemId: string; name: string; price: number; quantity: number }[];
  specialInstructions: string;
  sellerFee: number; // dollars
}

function calculatePlatformFee(itemsSubtotal: number): number {
  const fee = itemsSubtotal * 0.15;
  return Math.min(Math.max(fee, 1.0), 8.0);
}

export async function placeOrder(input: PlaceOrderInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

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

  // $50 cap check
  if (totalCents > ORDER_MAX_CENTS) {
    return { error: "Order exceeds $50 maximum." };
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

  return { success: true, orderId: order.id, clientSecret };
}
