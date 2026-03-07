"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Seller } from "./types";
import { sellerBus } from "./order-bus";
import type { SellerPresenceMessage } from "./order-bus";
import { getSellersByRestaurant } from "./sellers";

interface SellerPresenceContextValue {
  liveSellers: Seller[];
  getLiveSellersForRestaurant: (restaurantId: string) => Seller[];
}

const SellerPresenceContext = createContext<SellerPresenceContextValue | null>(null);

interface SellerPresenceProviderProps {
  children: React.ReactNode;
}

export function SellerPresenceProvider({ children }: SellerPresenceProviderProps) {
  const [liveSellers, setLiveSellers] = useState<Seller[]>([]);

  useEffect(() => {
    // Request a roll call so any live seller tabs respond
    sellerBus.publish({ type: "seller-roll-call" });

    const unsubscribe = sellerBus.subscribe((message: SellerPresenceMessage) => {
      switch (message.type) {
        case "seller-online": {
          setLiveSellers((prev) => {
            if (prev.some((s) => s.id === message.seller.id)) return prev;
            return [...prev, message.seller];
          });
          break;
        }
        case "seller-offline": {
          setLiveSellers((prev) => prev.filter((s) => s.id !== message.sellerId));
          break;
        }
        case "seller-busy": {
          setLiveSellers((prev) =>
            prev.map((s) => (s.id === message.sellerId ? { ...s, status: "busy" } : s))
          );
          break;
        }
        case "seller-available": {
          setLiveSellers((prev) =>
            prev.map((s) => (s.id === message.sellerId ? { ...s, status: "available" } : s))
          );
          break;
        }
        case "seller-roll-call": {
          // Handled by GoLivePanel — it re-broadcasts seller-online
          break;
        }
      }
    });

    return unsubscribe;
  }, []);

  const getLiveSellersForRestaurant = useCallback(
    (restaurantId: string): Seller[] => {
      const live = liveSellers.filter((s) => s.restaurantId === restaurantId);
      if (live.length > 0) return live;
      // Fallback to hardcoded demo data when no live sellers
      return getSellersByRestaurant(restaurantId);
    },
    [liveSellers]
  );

  const value = useMemo(
    () => ({ liveSellers, getLiveSellersForRestaurant }),
    [liveSellers, getLiveSellersForRestaurant]
  );

  return (
    <SellerPresenceContext.Provider value={value}>
      {children}
    </SellerPresenceContext.Provider>
  );
}

export function useSellerPresence(): SellerPresenceContextValue {
  const ctx = useContext(SellerPresenceContext);
  if (!ctx) {
    throw new Error("useSellerPresence must be used within a SellerPresenceProvider");
  }
  return ctx;
}
