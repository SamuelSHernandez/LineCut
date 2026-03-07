"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Order, OrderStatus } from "@/lib/types";

// ── Database row shape (snake_case from Postgres) ──────────────────────────

interface OrderRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  restaurant_id: string;
  items: Order["items"];
  special_instructions: string;
  status: OrderStatus;
  items_subtotal: number; // cents
  seller_fee: number;     // cents
  platform_fee: number;   // cents
  total: number;          // cents
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row (snake_case, cents) to the client-side Order type
 * (camelCase, dollars). Names and display strings are left empty — the
 * context layer enriches them from existing state or re-fetches as needed.
 */
export function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    restaurantId: row.restaurant_id,
    items: row.items,
    specialInstructions: row.special_instructions,
    status: row.status,
    itemsSubtotal: row.items_subtotal / 100,
    sellerFee: row.seller_fee / 100,
    platformFee: row.platform_fee / 100,
    total: row.total / 100,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    createdAt: row.created_at,
    statusUpdatedAt: row.updated_at,
    restaurantName: "",
    sellerName: "",
    buyerName: "",
  };
}

// ── Hook options ────────────────────────────────────────────────────────────

interface UseRealtimeOrdersOptions {
  /**
   * When role === "seller", subscribe to INSERT events filtered by seller_id
   * so the seller is notified of new incoming orders in real-time.
   */
  role: "buyer" | "seller";
  userId: string;
  /** Called when a new order INSERT arrives (seller-side). */
  onInsert?: (order: Order) => void;
  /** Called when an existing order UPDATE arrives (buyer-side status changes). */
  onUpdate?: (order: Order) => void;
}

/**
 * useRealtimeOrders
 *
 * Subscribes to Supabase Realtime Postgres Changes on the `orders` table.
 *
 * - Seller: listens for INSERT events filtered by seller_id
 * - Buyer:  listens for UPDATE events filtered by buyer_id
 *
 * Both subscriptions use a single channel per mount. The channel is torn
 * down on unmount (or when userId/role changes) to prevent leaks.
 *
 * Requires migration 005 to have run (`REPLICA IDENTITY FULL` on orders
 * and the table added to the supabase_realtime publication).
 */
export function useRealtimeOrders({
  role,
  userId,
  onInsert,
  onUpdate,
}: UseRealtimeOrdersOptions): void {
  // Store stable refs to callbacks so the subscription is not torn down
  // every render when the parent re-renders.
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const channelName =
      role === "seller"
        ? `orders:seller:${userId}`
        : `orders:buyer:${userId}`;

    if (role === "seller") {
      // Sellers subscribe to new orders placed with them
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "orders",
            filter: `seller_id=eq.${userId}`,
          },
          (payload) => {
            const order = rowToOrder(payload.new as OrderRow);
            // Defer setState out of the Realtime callback frame to satisfy
            // React Compiler's rule against setState in synchronous event
            // handlers that aren't triggered by user interaction.
            setTimeout(() => {
              onInsertRef.current?.(order);
            }, 0);
          }
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(
              `[useRealtimeOrders] seller channel error (${status}):`,
              err
            );
            // Supabase client auto-reconnects; we log but don't forcibly
            // re-subscribe here to avoid infinite loops.
          }
        });
    } else {
      // Buyers subscribe to status changes on their own orders
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `buyer_id=eq.${userId}`,
          },
          (payload) => {
            const order = rowToOrder(payload.new as OrderRow);
            setTimeout(() => {
              onUpdateRef.current?.(order);
            }, 0);
          }
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(
              `[useRealtimeOrders] buyer channel error (${status}):`,
              err
            );
          }
        });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role]);
}
