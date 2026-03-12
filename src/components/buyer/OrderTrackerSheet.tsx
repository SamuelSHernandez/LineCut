"use client";

import type { Order } from "@/lib/types";
import FullScreenSheet from "./FullScreenSheet";
import OrderTracker from "./OrderTracker";

interface OrderTrackerSheetProps {
  order: Order;
  onClose: () => void;
  onCancel: () => void;
}

export default function OrderTrackerSheet({
  order,
  onClose,
  onCancel,
}: OrderTrackerSheetProps) {
  return (
    <FullScreenSheet
      title="YOUR ORDER"
      subtitle={`Through ${order.sellerName} at ${order.restaurantName}`}
      onClose={onClose}
      ariaLabel={`Tracking order at ${order.restaurantName}`}
    >
      <OrderTracker order={order} onCancel={onCancel} />
    </FullScreenSheet>
  );
}
