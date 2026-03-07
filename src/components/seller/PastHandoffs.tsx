"use client";

import type { Order } from "@/lib/types";

interface PastHandoffsProps {
  completedOrders: Order[];
  buyerNames: Record<string, string>;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function PastHandoffs({ completedOrders, buyerNames }: PastHandoffsProps) {
  if (completedOrders.length === 0) {
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
            No handoffs yet. Your completed orders will show up here.
          </p>
        </div>
      </div>
    );
  }

  const totalItems = (order: Order) =>
    order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      aria-live="polite"
    >
      <ul className="space-y-0 list-none p-0 m-0" aria-label="Completed handoffs">
        {completedOrders.map((order, idx) => {
          const name = buyerNames[order.buyerId] ?? "Unknown";
          const itemCount = totalItems(order);
          return (
            <li key={order.id}>
              {idx > 0 && (
                <div className="border-t border-dashed border-[#ddd4c4] my-3" role="separator" />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full bg-mustard flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="font-[family-name:var(--font-display)] text-[16px] text-chalkboard leading-none">
                      {getInitials(name)}
                    </span>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-body)] text-[14px] font-semibold text-chalkboard">
                      {name}
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
                <span
                  className="font-[family-name:var(--font-mono)] text-[13px] font-medium text-[#2D6A2D]"
                  aria-label={`Earned ${order.sellerFee.toFixed(2)} dollars`}
                >
                  +${order.sellerFee.toFixed(2)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
