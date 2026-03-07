"use client";

import { useState, useEffect, useRef } from "react";
import type { Order, OrderStatus } from "@/lib/types";

interface OrderTrackerProps {
  order: Order;
  onCancel: () => void;
}

interface Step {
  key: OrderStatus;
  label: string;
  description: (order: Order) => string;
}

const STEPS: Step[] = [
  {
    key: "pending",
    label: "ORDER SENT",
    description: (o) => `Waiting on ${o.sellerName} to accept...`,
  },
  {
    key: "accepted",
    label: "ACCEPTED",
    description: (o) => `${o.sellerName}'s got it. Sit tight.`,
  },
  {
    key: "in-progress",
    label: "AT THE COUNTER",
    description: (o) => `${o.sellerName} is ordering at the counter now.`,
  },
  {
    key: "ready",
    label: "READY FOR PICKUP",
    description: (o) => `Your food is ready. Head to ${o.restaurantName}.`,
  },
  {
    key: "completed",
    label: "HANDED OFF",
    description: () => "Done. How'd it go?",
  },
];

function getStepIndex(status: OrderStatus): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderTracker({ order, onCancel }: OrderTrackerProps) {
  const currentIndex = getStepIndex(order.status);
  const [showBanner, setShowBanner] = useState(false);
  const prevStatusRef = useRef(order.status);

  // Show notification banner when status changes
  useEffect(() => {
    if (order.status !== prevStatusRef.current) {
      prevStatusRef.current = order.status;
      // Use queueMicrotask to avoid synchronous setState in effect body
      const showTimer = setTimeout(() => setShowBanner(true), 0);
      const hideTimer = setTimeout(() => setShowBanner(false), 5000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [order.status]);

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-5">
      {/* Status change banner — persistent aria-live container so screen readers catch updates */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {showBanner && (
          <div className="bg-[#DDEFDD] border border-[#2D6A2D]/20 rounded-[6px] px-4 py-3 transition-opacity duration-300">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] font-semibold">
              {STEPS[currentIndex]?.label} -- {STEPS[currentIndex]?.description(order)}
            </p>
          </div>
        )}
      </div>

      {/* Vertical stepper */}
      <div className="relative pl-8" role="list" aria-label="Order progress">
        {/* Vertical line */}
        <div
          className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-[#ddd4c4]"
          aria-hidden="true"
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div
              key={step.key}
              role="listitem"
              className="relative pb-6 last:pb-0"
            >
              {/* Circle indicator */}
              <div
                className={`absolute left-[-20px] top-[2px] w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${
                  isCompleted
                    ? "bg-sidewalk border-sidewalk"
                    : isCurrent
                      ? "bg-ketchup border-ketchup"
                      : "bg-butcher-paper border-[#ddd4c4]"
                }`}
                aria-hidden="true"
              >
                {isCompleted && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFFDF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full bg-ticket animate-pulse" />
                )}
              </div>

              {/* Step content */}
              <div>
                <p
                  className={`font-[family-name:var(--font-display)] text-[16px] tracking-[1px] ${
                    isCompleted
                      ? "text-sidewalk"
                      : isCurrent
                        ? "text-ketchup"
                        : "text-sidewalk/50"
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`font-[family-name:var(--font-body)] text-[13px] mt-0.5 ${
                    isUpcoming ? "text-sidewalk/40" : "text-sidewalk"
                  }`}
                >
                  {step.description(order)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[#ddd4c4]" />

      {/* Order summary */}
      <div>
        <h4 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-2">
          ORDER SUMMARY
        </h4>
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

        <div className="border-t border-dashed border-[#ddd4c4] my-3" />

        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] text-chalkboard">
            TOTAL
          </span>
          <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ketchup">
            ${order.total.toFixed(2)}
          </span>
        </div>

        <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk mt-1">
          {totalItems} {totalItems === 1 ? "item" : "items"} through {order.sellerName}
        </p>
      </div>

      {/* Cancel button — only while pending */}
      {order.status === "pending" && (
        <>
          <div className="border-t border-dashed border-[#ddd4c4]" />
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] py-3 px-6 bg-butcher-paper border border-ketchup text-ketchup font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-colors hover:bg-ketchup hover:text-ticket focus:outline-none focus:ring-2 focus:ring-ketchup/20"
          >
            CANCEL ORDER
          </button>
        </>
      )}
    </div>
  );
}
