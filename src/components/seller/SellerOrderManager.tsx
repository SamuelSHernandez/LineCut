"use client";

import { useCallback } from "react";
import type { OrderStatus } from "@/lib/types";
import type { SellerSession } from "@/lib/types";
import { useOrders } from "@/lib/order-context";
import SellerOrderCard from "./SellerOrderCard";
import SellerEarnings from "./SellerEarnings";
import PastHandoffs from "./PastHandoffs";

interface SellerOrderManagerProps {
  activeSession: SellerSession | null;
  restaurantId: string | null;
}

export default function SellerOrderManager({
  activeSession,
  restaurantId,
}: SellerOrderManagerProps) {
  const { orders, updateOrderStatus, cancelOrder } = useOrders();

  // Only show orders matching the active session's restaurant
  const sessionOrders = restaurantId
    ? orders.filter((o) => o.restaurantId === restaurantId)
    : [];

  const handleStatusChange = useCallback(
    (orderId: string, newStatus: OrderStatus | "cancelled") => {
      if (newStatus === "cancelled") {
        cancelOrder(orderId, "seller");
        return;
      }
      updateOrderStatus(orderId, newStatus);
    },
    [updateOrderStatus, cancelOrder]
  );

  const activeOrders = sessionOrders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  );
  const completedOrders = sessionOrders.filter((o) => o.status === "completed");

  const isLive = activeSession !== null;

  return (
    <div className="space-y-8">
      {/* Earnings */}
      <SellerEarnings completedOrders={completedOrders} />

      {/* Active Orders */}
      <section aria-label="Active orders">
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard mb-3">
          ACTIVE ORDERS
        </h2>
        <div aria-live="polite" aria-atomic="false">
          {activeOrders.length > 0 ? (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <SellerOrderCard
                  key={order.id}
                  order={order}
                  buyerName={order.buyerName || "Unknown"}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : isLive ? (
            <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                {/* Animated scissors */}
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 28 28"
                  fill="none"
                  className="animate-pulse"
                  aria-hidden="true"
                >
                  <ellipse cx="8" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
                  <line x1="12" y1="9" x2="22" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
                  <ellipse cx="20" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
                  <line x1="16" y1="9" x2="6" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center">
                  You&apos;re live. Waiting for orders to come in...
                </p>
              </div>
            </div>
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
                  No active orders. Go live to start accepting orders.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Past Handoffs */}
      <section aria-label="Past handoffs">
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard mb-3">
          PAST HANDOFFS
        </h2>
        <PastHandoffs
          completedOrders={completedOrders}
          buyerNames={Object.fromEntries(completedOrders.map((o) => [o.buyerId, o.buyerName || "Unknown"]))}
        />
      </section>
    </div>
  );
}
