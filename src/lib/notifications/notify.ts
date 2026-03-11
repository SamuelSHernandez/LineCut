/**
 * Unified notification dispatcher for LineCut.
 *
 * Each function fetches the data it needs from Supabase, then fans out
 * to push notifications (always) and email (when recipient has an email).
 *
 * All functions are fire-and-forget safe — they never throw.
 * Call from server actions or API routes only.
 */

import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";
import { sendEmail } from "./send-email";
import {
  orderConfirmationEmail,
  orderCompletedEmail,
  orderCancelledEmail,
} from "./email-templates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface OrderRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  restaurant_id: string;
  items: { name: string; quantity: number; price: number }[];
  items_subtotal: number;
  seller_fee: number;
  platform_fee: number;
  total: number;
  special_instructions: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
  email: string | null;
}

async function fetchOrder(orderId: string): Promise<OrderRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, seller_id, restaurant_id, items, items_subtotal, seller_fee, platform_fee, total, special_instructions, created_at"
    )
    .eq("id", orderId)
    .single();
  return data as OrderRow | null;
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", userId)
    .single();
  return data as ProfileRow | null;
}

async function fetchRestaurantName(restaurantId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", restaurantId)
    .single();
  return data?.name ?? "the restaurant";
}

function toEmailOrder(row: OrderRow) {
  return {
    id: row.id,
    items: row.items,
    itemsSubtotal: row.items_subtotal,
    sellerFee: row.seller_fee,
    platformFee: row.platform_fee,
    total: row.total,
    specialInstructions: row.special_instructions ?? undefined,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// notifyOrderConfirmation — buyer placed an order, notify the seller
// ---------------------------------------------------------------------------

export async function notifyOrderConfirmation(orderId: string): Promise<void> {
  try {
    const order = await fetchOrder(orderId);
    if (!order) return;

    const [buyer, seller, restaurantName] = await Promise.all([
      fetchProfile(order.buyer_id),
      fetchProfile(order.seller_id),
      fetchRestaurantName(order.restaurant_id),
    ]);

    const buyerName = buyer?.display_name ?? "Someone";
    const sellerName = seller?.display_name ?? "Your seller";
    const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

    // Push to seller (always)
    sendPush({
      userId: order.seller_id,
      title: "New order",
      body: `${buyerName} wants ${itemCount} item${itemCount !== 1 ? "s" : ""} from ${restaurantName}`,
      url: "/seller",
      orderId: order.id,
    });

    // Email to buyer (if they have an email)
    if (buyer?.email) {
      const template = orderConfirmationEmail(
        toEmailOrder(order),
        buyerName,
        sellerName,
        restaurantName
      );
      await sendEmail(buyer.email, template);
    }
  } catch (err) {
    console.error("[notify] orderConfirmation failed:", err);
  }
}

// ---------------------------------------------------------------------------
// notifyOrderCompleted — order delivered, notify both parties
// ---------------------------------------------------------------------------

export async function notifyOrderCompleted(orderId: string): Promise<void> {
  try {
    const order = await fetchOrder(orderId);
    if (!order) return;

    const [buyer, seller, restaurantName] = await Promise.all([
      fetchProfile(order.buyer_id),
      fetchProfile(order.seller_id),
      fetchRestaurantName(order.restaurant_id),
    ]);

    const buyerName = buyer?.display_name ?? "Buyer";
    const sellerName = seller?.display_name ?? "Seller";

    // Push to buyer
    sendPush({
      userId: order.buyer_id,
      title: "Order complete",
      body: `Your order from ${restaurantName} is done. Leave a review!`,
      url: "/buyer",
      orderId: order.id,
    });

    // Push to seller
    sendPush({
      userId: order.seller_id,
      title: "Order complete",
      body: `Order for ${buyerName} at ${restaurantName} is complete.`,
      url: "/seller",
      orderId: order.id,
    });

    // Email to both (if they have emails)
    const template = orderCompletedEmail(
      toEmailOrder(order),
      buyerName,
      sellerName,
      restaurantName
    );

    const emailPromises: Promise<unknown>[] = [];
    if (buyer?.email) emailPromises.push(sendEmail(buyer.email, template));
    if (seller?.email) emailPromises.push(sendEmail(seller.email, template));
    await Promise.allSettled(emailPromises);
  } catch (err) {
    console.error("[notify] orderCompleted failed:", err);
  }
}

// ---------------------------------------------------------------------------
// notifyOrderCancelled — order cancelled, notify affected party
// ---------------------------------------------------------------------------

export async function notifyOrderCancelled(
  orderId: string,
  reason: string
): Promise<void> {
  try {
    const order = await fetchOrder(orderId);
    if (!order) return;

    const [buyer, seller, restaurantName] = await Promise.all([
      fetchProfile(order.buyer_id),
      fetchProfile(order.seller_id),
      fetchRestaurantName(order.restaurant_id),
    ]);

    const buyerName = buyer?.display_name ?? "Buyer";
    const sellerName = seller?.display_name ?? "Seller";

    // Push to buyer
    sendPush({
      userId: order.buyer_id,
      title: "Order cancelled",
      body: `Your order at ${restaurantName} was cancelled.`,
      url: "/buyer",
      orderId: order.id,
    });

    // Push to seller
    sendPush({
      userId: order.seller_id,
      title: "Order cancelled",
      body: `Order from ${buyerName} at ${restaurantName} was cancelled.`,
      url: "/seller",
      orderId: order.id,
    });

    // Email to buyer
    if (buyer?.email) {
      const buyerTemplate = orderCancelledEmail(
        toEmailOrder(order),
        buyerName,
        reason
      );
      await sendEmail(buyer.email, buyerTemplate);
    }

    // Email to seller
    if (seller?.email) {
      const sellerTemplate = orderCancelledEmail(
        toEmailOrder(order),
        sellerName,
        reason
      );
      await sendEmail(seller.email, sellerTemplate);
    }
  } catch (err) {
    console.error("[notify] orderCancelled failed:", err);
  }
}
