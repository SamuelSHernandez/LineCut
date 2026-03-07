"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeOrders, rowToOrder } from "@/hooks/useRealtimeOrders";
import type { Order, OrderStatus } from "./types";

// ── Context shape ────────────────────────────────────────────────────────────

interface OrderContextValue {
  orders: Order[];
  /**
   * Add an order to local state optimistically. Call this immediately after
   * placeOrder() succeeds on the server so the buyer sees their order right
   * away. The Realtime INSERT event will arrive shortly but we deduplicate
   * by id, so there is no double-add.
   */
  placeOrder: (order: Order) => void;
  /**
   * Update an order's status in local state and propagate via the server
   * action (sellers call this). The buyer sees the change via Realtime UPDATE.
   */
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  /**
   * Mark an order as cancelled locally. The caller is responsible for
   * persisting the cancellation on the server; this is purely a UI helper.
   */
  cancelOrder: (orderId: string, cancelledBy: "buyer" | "seller") => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

// ── Database row shape for initial fetch ────────────────────────────────────

interface OrderRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  restaurant_id: string;
  items: Order["items"];
  special_instructions: string;
  status: OrderStatus;
  items_subtotal: number;
  seller_fee: number;
  platform_fee: number;
  total: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Provider ─────────────────────────────────────────────────────────────────

interface OrderProviderProps {
  userId: string;
  role: "buyer" | "seller";
  children: React.ReactNode;
}

/**
 * OrderProvider
 *
 * Manages order state for both buyers and sellers.
 *
 * On mount it fetches the user's active (non-terminal) orders from the
 * database so no orders are missed when the user navigates back to the app.
 * It then opens a Supabase Realtime channel so subsequent changes arrive
 * in real-time across devices without polling.
 *
 * Transport hierarchy:
 * 1. Supabase Realtime postgres_changes (primary — cross-device)
 * 2. Local setState after placeOrder() (optimistic — same device, same session)
 */
export function OrderProvider({ userId, role, children }: OrderProviderProps) {
  const [orders, setOrders] = useState<Order[]>([]);

  // ── Initial fetch on mount ─────────────────────────────────────────────
  // Fetch active orders so we don't miss anything that happened while the
  // component was unmounted (navigation away and back, page reload, etc.).
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    async function fetchActiveOrders() {
      const column = role === "seller" ? "seller_id" : "buyer_id";

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, buyer_id, seller_id, restaurant_id, items, special_instructions, status, items_subtotal, seller_fee, platform_fee, total, stripe_payment_intent_id, created_at, updated_at"
        )
        .eq(column, userId)
        .not("status", "in", '("completed","cancelled")')
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[OrderProvider] Failed to fetch active orders:", error);
        return;
      }

      const fetched = (data as OrderRow[]).map(rowToOrder);

      setTimeout(() => {
        setOrders((prev) => {
          // Merge: keep any optimistic orders that are not yet in DB result,
          // and update any that already exist with the fresh DB data.
          const dbIds = new Set(fetched.map((o) => o.id));
          const optimisticOnly = prev.filter((o) => !dbIds.has(o.id));
          return [...fetched, ...optimisticOnly];
        });
      }, 0);
    }

    fetchActiveOrders();
    // Only re-fetch when the user identity or role changes.
  }, [userId, role]);

  // ── Realtime: sellers receive new orders ───────────────────────────────
  const handleInsert = useCallback((order: Order) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
  }, []);

  // ── Realtime: buyers receive status updates ────────────────────────────
  const handleUpdate = useCallback((updatedOrder: Order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === updatedOrder.id);
      if (!exists) {
        // The order might have been placed before this session; add it.
        if (
          updatedOrder.status !== "completed" &&
          updatedOrder.status !== "cancelled"
        ) {
          return [updatedOrder, ...prev];
        }
        return prev;
      }
      return prev.map((o) =>
        o.id === updatedOrder.id
          ? {
              // Preserve display fields (restaurantName, sellerName, buyerName)
              // that were set during placeOrder() since the DB row doesn't
              // store them — they are denormalised client-side only.
              ...o,
              status: updatedOrder.status,
              statusUpdatedAt: updatedOrder.statusUpdatedAt,
            }
          : o
      );
    });
  }, []);

  useRealtimeOrders({
    role,
    userId,
    onInsert: role === "seller" ? handleInsert : undefined,
    onUpdate: role === "buyer" ? handleUpdate : undefined,
  });

  // ── Imperative actions ─────────────────────────────────────────────────

  /**
   * Optimistically add an order to local state. Call after the server action
   * confirms the order was created. The Realtime INSERT will arrive later but
   * we deduplicate by id.
   */
  const placeOrder = useCallback((order: Order) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
  }, []);

  /**
   * Update an order's status locally. Sellers call this after a server action
   * (acceptOrder / markOrderReady) succeeds. The buyer's device will receive
   * the change via Realtime UPDATE.
   */
  const updateOrderStatus = useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      const updatedAt = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, statusUpdatedAt: updatedAt }
            : o
        )
      );
    },
    []
  );

  /**
   * Remove a cancelled order from local state.
   */
  const cancelOrder = useCallback(
    (_orderId: string, _cancelledBy: "buyer" | "seller") => {
      setOrders((prev) => prev.filter((o) => o.id !== _orderId));
    },
    []
  );

  const value = useMemo(
    () => ({ orders, placeOrder, updateOrderStatus, cancelOrder }),
    [orders, placeOrder, updateOrderStatus, cancelOrder]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

// ── Consumer hooks ────────────────────────────────────────────────────────────

/**
 * useOrders
 *
 * Returns the order context. Must be used inside an OrderProvider.
 */
export function useOrders(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return ctx;
}

/**
 * useActiveOrder
 *
 * Convenience hook that returns the most recently created non-terminal order,
 * or null if there are none. Useful for showing a persistent "order in
 * progress" banner on the buyer side.
 */
export function useActiveOrder(): Order | null {
  const { orders } = useOrders();
  const active = orders
    .filter((o) => o.status !== "completed" && o.status !== "cancelled")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  return active[0] ?? null;
}
