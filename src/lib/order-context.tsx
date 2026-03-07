"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Order, OrderStatus } from "./types";
import { orderBus } from "./order-bus";
import type { OrderMessage } from "./order-bus";

interface OrderContextValue {
  orders: Order[];
  placeOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  cancelOrder: (orderId: string, cancelledBy: "buyer" | "seller") => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

interface OrderProviderProps {
  userId: string;
  role: "buyer" | "seller";
  children: React.ReactNode;
}

export function OrderProvider({ userId, role, children }: OrderProviderProps) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsubscribe = orderBus.subscribe((message: OrderMessage) => {
      switch (message.type) {
        case "order-placed": {
          setOrders((prev) => {
            if (prev.some((o) => o.id === message.order.id)) return prev;
            // Sellers see orders sent to them; buyers see their own orders
            if (role === "seller" && message.order.sellerId === userId) {
              return [...prev, message.order];
            }
            if (role === "buyer" && message.order.buyerId === userId) {
              return [...prev, message.order];
            }
            return prev;
          });
          break;
        }
        case "order-status-changed": {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === message.orderId
                ? { ...o, status: message.newStatus, statusUpdatedAt: message.updatedAt }
                : o
            )
          );
          break;
        }
        case "order-cancelled": {
          setOrders((prev) => prev.filter((o) => o.id !== message.orderId));
          break;
        }
      }
    });

    return unsubscribe;
  }, [userId, role]);

  const placeOrder = useCallback((order: Order) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [...prev, order];
    });
    orderBus.publish({ type: "order-placed", order });
  }, []);

  const updateOrderStatus = useCallback((orderId: string, newStatus: OrderStatus) => {
    const updatedAt = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus, statusUpdatedAt: updatedAt } : o
      )
    );
    orderBus.publish({ type: "order-status-changed", orderId, newStatus, updatedAt });
  }, []);

  const cancelOrder = useCallback((orderId: string, cancelledBy: "buyer" | "seller") => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    orderBus.publish({ type: "order-cancelled", orderId, cancelledBy });
  }, []);

  const value = useMemo(
    () => ({ orders, placeOrder, updateOrderStatus, cancelOrder }),
    [orders, placeOrder, updateOrderStatus, cancelOrder]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return ctx;
}

export function useActiveOrder(): Order | null {
  const { orders } = useOrders();
  const active = orders
    .filter((o) => o.status !== "completed" && o.status !== "cancelled")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return active[0] ?? null;
}
