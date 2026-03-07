"use client";

import { useState, useEffect, useCallback } from "react";
import type { Order, OrderStatus } from "@/lib/types";

interface SellerOrderCardProps {
  order: Order;
  buyerName: string;
  onStatusChange: (orderId: string, newStatus: OrderStatus | "cancelled") => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case "pending":
      return { label: "WAITING", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" };
    case "accepted":
    case "in-progress":
      return { label: "ACTIVE", bg: "bg-[#DDEFDD]", text: "text-[#2D6A2D]" };
    case "ready":
      return { label: "READY", bg: "bg-[#FDECEA]", text: "text-[#C4382A]" };
    case "completed":
      return { label: "COMPLETE", bg: "bg-[#E8E8E8]", text: "text-[#666]" };
    default:
      return { label: status.toUpperCase(), bg: "bg-[#E8E8E8]", text: "text-[#666]" };
  }
}

function getTimeAgo(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return "RECEIVED JUST NOW";
  const mins = Math.floor(diff / 60);
  return `RECEIVED ${mins} MIN AGO`;
}

export default function SellerOrderCard({
  order,
  buyerName,
  onStatusChange,
}: SellerOrderCardProps) {
  const [timeAgo, setTimeAgo] = useState(() => getTimeAgo(order.createdAt));
  const [lastProcessedStatus, setLastProcessedStatus] = useState<string | null>(null);
  const badge = getStatusBadge(order.status);

  // isProcessing is true only between when we fire the action and when the status actually changes
  const isProcessing = lastProcessedStatus !== null && lastProcessedStatus === order.status;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(order.createdAt));
    }, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // Double-tap prevention
  const handleAction = useCallback(
    (newStatus: OrderStatus | "cancelled") => {
      if (isProcessing) return;
      setLastProcessedStatus(order.status);
      onStatusChange(order.id, newStatus);
    },
    [isProcessing, onStatusChange, order.id, order.status]
  );

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article
      aria-label={`Order from ${buyerName}, ${badge.label}, ${totalItems} ${totalItems === 1 ? "item" : "items"}`}
      className={`bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
        order.status === "pending" ? "border-l-4 border-l-mustard" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full bg-mustard flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="font-[family-name:var(--font-display)] text-[16px] text-chalkboard leading-none">
              {getInitials(buyerName)}
            </span>
          </div>
          <span className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard">
            {buyerName}
          </span>
        </div>
        <span
          role="status"
          className={`${badge.bg} ${badge.text} font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] px-2.5 py-1 rounded-full`}
        >
          {badge.label}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" role="separator" />

      {/* Order items */}
      <ul className="space-y-1.5 list-none p-0 m-0" aria-label="Order items">
        {order.items.map((item) => (
          <li key={item.menuItemId} className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
              {item.name} x{item.quantity}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      {/* Special instructions */}
      {order.specialInstructions && (
        <div className="mt-3">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] uppercase text-sidewalk mb-0.5">
            SPECIAL INSTRUCTIONS
          </p>
          <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard italic">
            {order.specialInstructions}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" role="separator" />

      {/* Earnings */}
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
          Your fee
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[12px] text-chalkboard font-medium">
          ${order.sellerFee.toFixed(2)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" role="separator" />

      {/* Action area */}
      {order.status === "pending" && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleAction("accepted")}
            disabled={isProcessing}
            aria-label={`Accept order from ${buyerName}`}
            className="flex-1 min-h-[48px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/20 disabled:opacity-60"
          >
            ACCEPT
          </button>
          <button
            type="button"
            onClick={() => handleAction("cancelled")}
            disabled={isProcessing}
            aria-label={`Decline order from ${buyerName}`}
            className="min-h-[48px] px-4 text-ketchup font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/20 disabled:opacity-60"
          >
            DECLINE
          </button>
        </div>
      )}

      {order.status === "accepted" && (
        <div>
          <button
            type="button"
            onClick={() => handleAction("in-progress")}
            disabled={isProcessing}
            aria-label={`Mark ${buyerName}'s order as started`}
            className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-mustard/30 disabled:opacity-60"
          >
            STARTED ORDERING
          </button>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk text-center mt-1.5">
            Tap when you&apos;ve placed their order at the counter.
          </p>
        </div>
      )}

      {order.status === "in-progress" && (
        <div>
          <button
            type="button"
            onClick={() => handleAction("ready")}
            disabled={isProcessing}
            aria-label={`Mark ${buyerName}'s order as ready`}
            className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-mustard/30 disabled:opacity-60"
          >
            ORDER&apos;S READY
          </button>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk text-center mt-1.5">
            Tap when you&apos;ve got the food in hand.
          </p>
        </div>
      )}

      {order.status === "ready" && (
        <div>
          <button
            type="button"
            onClick={() => handleAction("completed")}
            disabled={isProcessing}
            aria-label={`Mark ${buyerName}'s order as handed off`}
            className="w-full min-h-[48px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/20 disabled:opacity-60"
          >
            HANDED OFF
          </button>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk text-center mt-1.5">
            Tap once the buyer has their food.
          </p>
        </div>
      )}

      {/* Timestamp */}
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk text-right mt-3">
        {timeAgo}
      </p>
    </article>
  );
}
