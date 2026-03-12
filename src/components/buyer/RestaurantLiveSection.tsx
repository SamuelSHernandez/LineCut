"use client";

import { useEffect } from "react";
import type { MenuItem } from "@/lib/types";
import { useSellerPresence } from "@/lib/seller-presence-context";
import { useOrders } from "@/lib/order-context";
import SellerList from "./SellerList";
import BuyerOrdersSection from "./BuyerOrdersSection";

interface RestaurantLiveSectionProps {
  restaurantId: string;
  restaurantName: string;
  menuItems: MenuItem[];
}

export default function RestaurantLiveSection({
  restaurantId,
  restaurantName,
  menuItems,
}: RestaurantLiveSectionProps) {
  const { getLiveSellersForRestaurant, watchRestaurant } = useSellerPresence();

  // Register for real-time updates — must be in useEffect, not during render
  useEffect(() => {
    watchRestaurant(restaurantId);
  }, [restaurantId, watchRestaurant]);

  const sellers = getLiveSellersForRestaurant(restaurantId);
  const { orders } = useOrders();

  const availableSellers = sellers.filter((s) => s.status === "available");
  const hasActiveOrders = orders.some(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  );

  const sellersSection = (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard mb-1">
        WHO&apos;S IN LINE
      </h2>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
        {availableSellers.length > 0
          ? "Tap a seller to start your order."
          : "Showing demo sellers. No one is live right now."}
      </p>

      {sellers.length > 0 ? (
        <SellerList
          sellers={sellers}
          menuItems={menuItems}
          restaurantName={restaurantName}
        />
      ) : (
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <ellipse cx="8" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
              <line x1="12" y1="9" x2="22" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="20" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
              <line x1="16" y1="9" x2="6" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center">
              Nobody&apos;s in line right now. Check back at lunch.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const ordersSection = (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard mb-3">
        YOUR ORDERS
      </h2>
      <BuyerOrdersSection />
    </div>
  );

  return (
    <>
      {hasActiveOrders ? (
        <>
          {ordersSection}
          {sellersSection}
        </>
      ) : (
        <>
          {sellersSection}
          {ordersSection}
        </>
      )}
    </>
  );
}
