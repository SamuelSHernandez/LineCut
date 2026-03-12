"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SellerSession } from "@/lib/types";

// ── Database row shape (snake_case from Postgres) ──────────────────────────

interface SellerSessionRow {
  id: string;
  seller_id: string;
  restaurant_id: string;
  started_at: string;
  ended_at: string | null;
  wait_duration_minutes: number | null;
  estimated_wait_minutes: number | null;
  seller_fee_cents: number | null;
  status: "active" | "winding_down" | "completed" | "cancelled";
  created_at: string;
  pickup_instructions?: string | null;
}

/**
 * Map a database row to the client-side SellerSession type.
 */
export function rowToSellerSession(row: SellerSessionRow): SellerSession {
  return {
    id: row.id,
    sellerId: row.seller_id,
    restaurantId: row.restaurant_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    waitDurationMinutes: row.wait_duration_minutes,
    estimatedWaitMinutes: row.estimated_wait_minutes ?? null,
    sellerFeeCents: row.seller_fee_cents ?? null,
    status: row.status,
    pickupInstructions: row.pickup_instructions ?? null,
  };
}

// ── Hook options ────────────────────────────────────────────────────────────

interface UseRealtimeSellersOptions {
  /**
   * The restaurant to watch. When null/undefined the subscription is not
   * created (e.g., the buyer hasn't navigated to a restaurant yet).
   */
  restaurantId: string | null | undefined;
  /** Called when a new seller session is INSERTed (seller went live). */
  onInsert?: (session: SellerSession) => void;
  /**
   * Called when an existing session is UPDATEd (status changed to
   * 'completed' or 'cancelled' — seller went offline).
   */
  onUpdate?: (session: SellerSession) => void;
  /** Called when a session row is DELETEd (rare, but handle it). */
  onDelete?: (sessionId: string) => void;
}

/**
 * useRealtimeSellers
 *
 * Subscribes to Supabase Realtime Postgres Changes on the `seller_sessions`
 * table, filtered by restaurant_id, so buyers see sellers go live or offline
 * in real-time without polling.
 *
 * The channel is created per restaurantId and torn down on unmount or when
 * restaurantId changes.
 *
 * Requires migration 005 (`REPLICA IDENTITY FULL` on seller_sessions).
 */
export function useRealtimeSellers({
  restaurantId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSellersOptions): void {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  useEffect(() => { onInsertRef.current = onInsert; }, [onInsert]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);

  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();
    const channelName = `seller_sessions:restaurant:${restaurantId}`;

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "seller_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const session = rowToSellerSession(payload.new as SellerSessionRow);
          setTimeout(() => {
            onInsertRef.current?.(session);
          }, 0);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "seller_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const session = rowToSellerSession(payload.new as SellerSessionRow);
          setTimeout(() => {
            onUpdateRef.current?.(session);
          }, 0);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "seller_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          // With REPLICA IDENTITY FULL, payload.old contains the deleted row.
          // Fall back to payload.old.id if available.
          const deletedId = (payload.old as Partial<SellerSessionRow>)?.id;
          if (deletedId) {
            setTimeout(() => {
              onDeleteRef.current?.(deletedId);
            }, 0);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            `[useRealtimeSellers] channel error for restaurant ${restaurantId} (${status}):`,
            err
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);
}
