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
import { useRealtimeSellers, rowToSellerSession } from "@/hooks/useRealtimeSellers";
import type { Seller, SellerSession } from "./types";
import { getSellersByRestaurant } from "./sellers";

// ── Context shape ─────────────────────────────────────────────────────────────

interface SellerPresenceContextValue {
  /**
   * All currently active seller sessions known to this client, across all
   * restaurants. Keyed by session id internally; exposed as an array.
   */
  liveSessions: SellerSession[];
  /**
   * Returns live sellers for a given restaurant, or falls back to hardcoded
   * demo sellers when no one is live (preserves existing behaviour).
   *
   * Note: this returns Seller objects synthesised from session data. Fields
   * like positionInLine and fee are not stored in seller_sessions — they
   * default to sensible placeholders until we extend the schema.
   */
  getLiveSellersForRestaurant: (restaurantId: string) => Seller[];
  /**
   * Register a restaurant for real-time updates. Call this from a useEffect
   * in the consuming component — NOT during render.
   */
  watchRestaurant: (restaurantId: string) => void;
}

const SellerPresenceContext =
  createContext<SellerPresenceContextValue | null>(null);

// ── DB row shape for initial fetch ────────────────────────────────────────────

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
  pickup_instructions: string | null;
  // Supabase returns joined rows as an array even for one-to-one relations
  // when using the select-string syntax.
  profiles: Array<{
    display_name: string;
    trust_score: number;
    avg_rating: number | null;
    rating_count: number;
    max_order_cap: number;
    kyc_status: string | null;
    max_concurrent_orders: number;
  }> | null;
}

// ── Helper: synthesise a Seller object from a session row ────────────────────
// The seller_sessions table doesn't store fee or position — these are captured
// at session start via the GoLivePanel but not yet persisted. We use
// placeholder values so the buyer-side UI doesn't break.

function sessionToSeller(
  session: SellerSession,
  displayName: string,
  trustScore: number,
  avgRating: number | null = null,
  ratingCount: number = 0,
  maxOrderCap: number = 5000,
  kycVerified: boolean = false,
): Seller {
  const firstName = displayName.split(" ")[0] ?? displayName;
  const lastInitial = displayName.split(" ")[1]?.[0] ?? "";

  const startMs = new Date(session.startedAt).getTime();
  const elapsedMins = Math.floor((Date.now() - startMs) / 60000);

  return {
    id: session.sellerId,
    restaurantId: session.restaurantId,
    firstName,
    lastInitial,
    positionInLine: 1,
    waitEstimate: session.estimatedWaitMinutes
      ? `~${session.estimatedWaitMinutes} min`
      : `~${Math.max(5, 15 - elapsedMins)} min`,
    trustScore,
    completedOrders: 0,
    fee: session.sellerFeeCents ? session.sellerFeeCents / 100 : 5.0,
    menuFlexibility: "full",
    status: "available",
    joinedAt: session.startedAt,
    avgRating,
    ratingCount,
    maxOrderCap,
    kycVerified,
    pickupInstructions: session.pickupInstructions,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface SellerPresenceProviderProps {
  children: React.ReactNode;
}

/**
 * SellerPresenceProvider
 *
 * Tracks which sellers are currently live across all restaurants by:
 * 1. Fetching all active seller_sessions on mount (missed-event recovery)
 * 2. Subscribing to INSERT/UPDATE/DELETE events on seller_sessions via
 *    Supabase Realtime
 *
 * Replaces the BroadcastChannel-based presence that only worked within a
 * single browser. Now buyers on any device see sellers go live / offline
 * in real-time.
 *
 * The Realtime hook (useRealtimeSellers) requires a restaurantId filter.
 * Because this provider sits at the shell level and doesn't know the current
 * restaurantId, it subscribes globally by watching all restaurants from the
 * initial fetch, and exposes a registration function for page-level components
 * to declare which restaurant they care about.
 *
 * For MVP simplicity we use a single active-restaurants registry. The
 * restaurant detail page calls registerRestaurant on mount and the
 * subscription is set up dynamically.
 */
export function SellerPresenceProvider({ children }: SellerPresenceProviderProps) {
  // Map from sellerId -> { session, displayName, trustScore, avgRating, ratingCount, maxOrderCap, kycVerified, maxConcurrentOrders }
  const [liveMap, setLiveMap] = useState<
    Map<string, { session: SellerSession; displayName: string; trustScore: number; avgRating: number | null; ratingCount: number; maxOrderCap: number; kycVerified: boolean; maxConcurrentOrders: number }>
  >(new Map());

  // Map from sellerId -> count of active (non-terminal) orders
  const [orderCounts, setOrderCounts] = useState<Map<string, number>>(new Map());

  // The currently watched restaurant (set by whichever detail page is mounted)
  const [watchedRestaurantId, setWatchedRestaurantId] = useState<string | null>(null);

  // ── Blocked user IDs (bidirectional) ──────────────────────────────────────
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    async function fetchBlockedIds() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("get_blocked_user_ids", {
        p_user_id: user.id,
      });

      if (!error && data) {
        setBlockedUserIds(new Set(data as string[]));
      }
    }

    fetchBlockedIds();
  }, []);

  // ── Initial fetch: load all active sessions ──────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function fetchActiveSessions() {
      const { data, error } = await supabase
        .from("seller_sessions")
        .select(
          "id, seller_id, restaurant_id, started_at, ended_at, wait_duration_minutes, estimated_wait_minutes, seller_fee_cents, status, created_at, pickup_instructions, profiles(display_name, trust_score, avg_rating, rating_count, max_order_cap, kyc_status, max_concurrent_orders)"
        )
        .eq("status", "active");

      if (error) {
        console.error("[SellerPresenceProvider] Failed to fetch active sessions:", error);
        return;
      }

      const nextMap = new Map<
        string,
        { session: SellerSession; displayName: string; trustScore: number; avgRating: number | null; ratingCount: number; maxOrderCap: number; kycVerified: boolean; maxConcurrentOrders: number }
      >();

      for (const row of (data as unknown as SellerSessionRow[])) {
        const session = rowToSellerSession(row);
        if (row.pickup_instructions) {
          session.pickupInstructions = row.pickup_instructions;
        }
        const p = row.profiles?.[0];
        const displayName = p?.display_name ?? "Seller";
        const trustScore = p?.trust_score ?? 0;
        const avgRating = p?.avg_rating ?? null;
        const ratingCount = p?.rating_count ?? 0;
        const maxOrderCap = p?.max_order_cap ?? 5000;
        const kycVerified = p?.kyc_status === "approved";
        const maxConcurrentOrders = p?.max_concurrent_orders ?? 3;
        nextMap.set(session.sellerId, { session, displayName, trustScore, avgRating, ratingCount, maxOrderCap, kycVerified, maxConcurrentOrders });
      }

      // Fetch active order counts for all live sellers
      const sellerIds = Array.from(nextMap.keys());
      const countsMap = new Map<string, number>();
      if (sellerIds.length > 0) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("seller_id")
          .in("seller_id", sellerIds)
          .in("status", ["pending", "accepted", "in-progress", "ready"]);

        if (orderData) {
          for (const row of orderData) {
            countsMap.set(row.seller_id, (countsMap.get(row.seller_id) ?? 0) + 1);
          }
        }
      }

      setTimeout(() => {
        setLiveMap(nextMap);
        setOrderCounts(countsMap);
      }, 0);
    }

    fetchActiveSessions();
  }, []);

  // ── Realtime handlers ────────────────────────────────────────────────────

  const handleSessionInsert = useCallback((session: SellerSession) => {
    // For new inserts we don't have the profile name yet — fetch it.
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("display_name, trust_score, avg_rating, rating_count, max_order_cap, kyc_status, max_concurrent_orders")
      .eq("id", session.sellerId)
      .single()
      .then(({ data }) => {
        const displayName = data?.display_name ?? "Seller";
        const trustScore = data?.trust_score ?? 0;
        const avgRating = data?.avg_rating ?? null;
        const ratingCount = data?.rating_count ?? 0;
        const maxOrderCap = data?.max_order_cap ?? 5000;
        const kycVerified = data?.kyc_status === "approved";
        const maxConcurrentOrders = data?.max_concurrent_orders ?? 3;
        setTimeout(() => {
          setLiveMap((prev) => {
            const next = new Map(prev);
            next.set(session.sellerId, { session, displayName, trustScore, avgRating, ratingCount, maxOrderCap, kycVerified, maxConcurrentOrders });
            return next;
          });
        }, 0);
      });
  }, []);

  const handleSessionUpdate = useCallback((session: SellerSession) => {
    if (session.status !== "active") {
      // Seller went offline or is winding down (no new orders)
      setTimeout(() => {
        setLiveMap((prev) => {
          const next = new Map(prev);
          next.delete(session.sellerId);
          return next;
        });
      }, 0);
    } else {
      // Session still active but something changed (unlikely, but handle it)
      setTimeout(() => {
        setLiveMap((prev) => {
          const existing = prev.get(session.sellerId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(session.sellerId, { ...existing, session });
          return next;
        });
      }, 0);
    }
  }, []);

  const handleSessionDelete = useCallback((sessionId: string) => {
    setTimeout(() => {
      setLiveMap((prev) => {
        const next = new Map(prev);
        // We have sessionId, not sellerId — find by session.id
        for (const [sellerId, entry] of next.entries()) {
          if (entry.session.id === sessionId) {
            next.delete(sellerId);
            break;
          }
        }
        return next;
      });
    }, 0);
  }, []);

  useRealtimeSellers({
    restaurantId: watchedRestaurantId,
    onInsert: handleSessionInsert,
    onUpdate: handleSessionUpdate,
    onDelete: handleSessionDelete,
  });

  // ── Public API ────────────────────────────────────────────────────────────

  const liveSessions = useMemo(
    () => Array.from(liveMap.values()).map((e) => e.session),
    [liveMap]
  );

  const watchRestaurant = useCallback(
    (restaurantId: string) => {
      setWatchedRestaurantId(restaurantId);
    },
    []
  );

  const getLiveSellersForRestaurant = useCallback(
    (restaurantId: string): Seller[] => {
      const live = Array.from(liveMap.values())
        .filter((e) => e.session.restaurantId === restaurantId)
        // Filter out blocked users (bidirectional)
        .filter((e) => !blockedUserIds.has(e.session.sellerId))
        // Filter out sellers at capacity
        .filter((e) => {
          const activeCount = orderCounts.get(e.session.sellerId) ?? 0;
          return activeCount < e.maxConcurrentOrders;
        })
        .map((e) => sessionToSeller(e.session, e.displayName, e.trustScore, e.avgRating, e.ratingCount, e.maxOrderCap, e.kycVerified));

      if (live.length > 0) return live;

      // Fallback to hardcoded demo data when no live sellers
      return getSellersByRestaurant(restaurantId);
    },
    [liveMap, blockedUserIds, orderCounts]
  );

  const value = useMemo(
    () => ({ liveSessions, getLiveSellersForRestaurant, watchRestaurant }),
    [liveSessions, getLiveSellersForRestaurant, watchRestaurant]
  );

  return (
    <SellerPresenceContext.Provider value={value}>
      {children}
    </SellerPresenceContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

/**
 * useSellerPresence
 *
 * Returns the seller presence context. Must be used inside a
 * SellerPresenceProvider.
 */
export function useSellerPresence(): SellerPresenceContextValue {
  const ctx = useContext(SellerPresenceContext);
  if (!ctx) {
    throw new Error(
      "useSellerPresence must be used within a SellerPresenceProvider"
    );
  }
  return ctx;
}
