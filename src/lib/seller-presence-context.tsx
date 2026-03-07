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
  status: "active" | "completed" | "cancelled";
  created_at: string;
  // Supabase returns joined rows as an array even for one-to-one relations
  // when using the select-string syntax.
  profiles: Array<{
    display_name: string;
    trust_score: number;
  }> | null;
}

// ── Helper: synthesise a Seller object from a session row ────────────────────
// The seller_sessions table doesn't store fee or position — these are captured
// at session start via the GoLivePanel but not yet persisted. We use
// placeholder values so the buyer-side UI doesn't break.

function sessionToSeller(session: SellerSession, displayName: string, trustScore: number): Seller {
  const firstName = displayName.split(" ")[0] ?? displayName;
  const lastInitial = displayName.split(" ")[1]?.[0] ?? "";

  const startMs = new Date(session.startedAt).getTime();
  const elapsedMins = Math.floor((Date.now() - startMs) / 60000);

  return {
    id: session.sellerId,
    restaurantId: session.restaurantId,
    firstName,
    lastInitial,
    positionInLine: 1, // not stored yet — placeholder
    waitEstimate: `~${Math.max(5, 15 - elapsedMins)} min`,
    trustScore,
    completedOrders: 0,
    fee: 5.0, // not stored yet — placeholder
    menuFlexibility: "full",
    status: "available",
    joinedAt: session.startedAt,
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
  // Map from sellerId -> { session, displayName, trustScore }
  const [liveMap, setLiveMap] = useState<
    Map<string, { session: SellerSession; displayName: string; trustScore: number }>
  >(new Map());

  // The currently watched restaurant (set by whichever detail page is mounted)
  const [watchedRestaurantId, setWatchedRestaurantId] = useState<string | null>(null);

  // ── Initial fetch: load all active sessions ──────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function fetchActiveSessions() {
      const { data, error } = await supabase
        .from("seller_sessions")
        .select(
          "id, seller_id, restaurant_id, started_at, ended_at, wait_duration_minutes, status, created_at, profiles(display_name, trust_score)"
        )
        .eq("status", "active");

      if (error) {
        console.error("[SellerPresenceProvider] Failed to fetch active sessions:", error);
        return;
      }

      const nextMap = new Map<
        string,
        { session: SellerSession; displayName: string; trustScore: number }
      >();

      for (const row of (data as unknown as SellerSessionRow[])) {
        const session = rowToSellerSession(row);
        const displayName = row.profiles?.[0]?.display_name ?? "Seller";
        const trustScore = row.profiles?.[0]?.trust_score ?? 0;
        nextMap.set(session.sellerId, { session, displayName, trustScore });
      }

      setTimeout(() => {
        setLiveMap(nextMap);
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
      .select("display_name, trust_score")
      .eq("id", session.sellerId)
      .single()
      .then(({ data }) => {
        const displayName = data?.display_name ?? "Seller";
        const trustScore = data?.trust_score ?? 0;
        setTimeout(() => {
          setLiveMap((prev) => {
            const next = new Map(prev);
            next.set(session.sellerId, { session, displayName, trustScore });
            return next;
          });
        }, 0);
      });
  }, []);

  const handleSessionUpdate = useCallback((session: SellerSession) => {
    if (session.status !== "active") {
      // Seller went offline
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

  const getLiveSellersForRestaurant = useCallback(
    (restaurantId: string): Seller[] => {
      // Register this restaurant as the one we want real-time updates for.
      // This is a side-effect-in-callback pattern; it's safe because React
      // state updates are batched and setWatchedRestaurantId is idempotent.
      setWatchedRestaurantId(restaurantId);

      const live = Array.from(liveMap.values())
        .filter((e) => e.session.restaurantId === restaurantId)
        .map((e) => sessionToSeller(e.session, e.displayName, e.trustScore));

      if (live.length > 0) return live;

      // Fallback to hardcoded demo data when no live sellers
      return getSellersByRestaurant(restaurantId);
    },
    [liveMap]
  );

  const value = useMemo(
    () => ({ liveSessions, getLiveSellersForRestaurant }),
    [liveSessions, getLiveSellersForRestaurant]
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
