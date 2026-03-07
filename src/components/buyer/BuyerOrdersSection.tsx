"use client";

import { useState } from "react";
import { useOrders } from "@/lib/order-context";
import ActiveOrderCard from "./ActiveOrderCard";
import OrderTrackerDrawer from "./OrderTrackerDrawer";
import type { Order } from "@/lib/types";

export default function BuyerOrdersSection() {
  const { orders, cancelOrder } = useOrders();
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  const activeOrders = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  );

  function handleCancel() {
    if (trackingOrder) {
      cancelOrder(trackingOrder.id, "buyer");
      setTrackingOrder(null);
    }
  }

  // Keep tracking drawer in sync with latest order state
  const trackedOrder = trackingOrder
    ? orders.find((o) => o.id === trackingOrder.id) ?? null
    : null;

  if (activeOrders.length === 0) {
    return (
      <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <ellipse cx="8" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
            <line x1="12" y1="9" x2="22" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="20" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
            <line x1="16" y1="9" x2="6" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center">
            No orders yet. Find someone in line and place your first order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {activeOrders.map((order) => (
          <ActiveOrderCard
            key={order.id}
            order={order}
            onTap={() => setTrackingOrder(order)}
          />
        ))}
      </div>

      {trackedOrder && (
        <OrderTrackerDrawer
          order={trackedOrder}
          onClose={() => setTrackingOrder(null)}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
