"use client";

import type { Order, OrderStatus } from "@/lib/types";

interface ActiveOrderCardProps {
  order: Order;
  onTap: () => void;
}

const STEPS: { key: OrderStatus; label: string; description: (o: Order) => string }[] = [
  {
    key: "pending",
    label: "Sent",
    description: (o) => `Waiting on ${o.sellerName} to accept...`,
  },
  {
    key: "accepted",
    label: "Accepted",
    description: (o) => `${o.sellerName}'s got it. Sit tight.`,
  },
  {
    key: "in-progress",
    label: "Counter",
    description: (o) => `${o.sellerName} is ordering at the counter now.`,
  },
  {
    key: "ready",
    label: "Ready",
    description: (o) => {
      const base = `Your food is ready. Head to ${o.restaurantName}.`;
      return o.pickupInstructions ? `${base} ${o.pickupInstructions}` : base;
    },
  },
  {
    key: "completed",
    label: "Done",
    description: () => "Order complete!",
  },
];

function getStepIndex(status: OrderStatus): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case "pending":
      return { label: "WAITING", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" };
    case "accepted":
      return { label: "ACCEPTED", bg: "bg-[#DDEFDD]", text: "text-[#2D6A2D]" };
    case "in-progress":
      return { label: "AT COUNTER", bg: "bg-[#DDEFDD]", text: "text-[#2D6A2D]" };
    case "ready":
      return { label: "READY", bg: "bg-[#FDECEA]", text: "text-[#C4382A]" };
    default:
      return { label: status.toUpperCase(), bg: "bg-[#E8E8E8]", text: "text-[#4D4D4D]" };
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function ActiveOrderCard({ order, onTap }: ActiveOrderCardProps) {
  const badge = getStatusBadge(order.status);
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const currentIndex = getStepIndex(order.status);

  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full text-left bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-ketchup/50"
      aria-label={`Order at ${order.restaurantName} through ${order.sellerName}, ${badge.label}, ${totalItems} items. Tap to track.`}
    >
      {/* Header: seller info + badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full bg-mustard flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <span className="font-[family-name:var(--font-display)] text-[16px] text-chalkboard leading-none">
              {getInitials(order.sellerName)}
            </span>
          </div>
          <div>
            <p className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard">
              {order.sellerName}
            </p>
            <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
              {order.restaurantName}
            </p>
          </div>
        </div>
        <span
          className={`${badge.bg} ${badge.text} font-[family-name:var(--font-body)] text-[11px] font-semibold tracking-[0.3px] uppercase px-2.5 py-1 rounded-full`}
          role="status"
        >
          {badge.label}
        </span>
      </div>

      {/* Horizontal progress stepper */}
      <div className="mb-3" role="list" aria-label="Order progress">
        <div className="flex items-center">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none" role="listitem">
                {/* Dot */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? "bg-sidewalk border-sidewalk"
                      : isCurrent
                        ? "bg-ketchup border-ketchup"
                        : "bg-butcher-paper border-divider"
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFFDF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-ticket animate-pulse motion-reduce:animate-none" />
                  )}
                </div>

                {/* Connecting line (not after last dot) */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-1 ${
                      index < currentIndex ? "bg-sidewalk" : "bg-divider"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Labels below dots */}
        <div className="flex mt-1.5">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                key={step.key}
                className={`flex-1 ${index === STEPS.length - 1 ? "flex-none text-right" : ""}`}
              >
                <span
                  className={`font-[family-name:var(--font-mono)] text-[9px] tracking-[0.5px] uppercase ${
                    isCompleted
                      ? "text-sidewalk"
                      : isCurrent
                        ? "text-ketchup font-semibold"
                        : "text-sidewalk/40"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step description */}
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-3">
        {STEPS[currentIndex].description(order)}
      </p>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-2" />

      {/* Footer: items + total */}
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[13px] text-chalkboard font-medium">
          ${order.total.toFixed(2)}
        </span>
      </div>
    </button>
  );
}
