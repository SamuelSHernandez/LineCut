"use client";

import type { OrderItem } from "@/lib/types";

interface OrderConfirmationProps {
  items: OrderItem[];
  sellerName: string;
  sellerFee: number;
  onConfirm: () => void;
  disabled: boolean;
}

function calculatePlatformFee(itemsEstimate: number): number {
  const fee = itemsEstimate * 0.15;
  return Math.min(Math.max(fee, 1.0), 8.0);
}

export default function OrderConfirmation({
  items,
  sellerName,
  sellerFee,
  onConfirm,
  disabled,
}: OrderConfirmationProps) {
  const itemsEstimate = items.reduce(
    (sum, item) => sum + item.priceEstimate * item.quantity,
    0
  );
  const platformFee = calculatePlatformFee(itemsEstimate);
  const total = itemsEstimate + sellerFee + platformFee;

  return (
    <div>
      {/* Line items */}
      <div className="space-y-2 mb-3">
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="flex items-center justify-between font-[family-name:var(--font-body)] text-[13px]"
          >
            <span className="text-chalkboard">
              {item.name} x{item.quantity}
            </span>
            <span className="text-sidewalk font-[family-name:var(--font-mono)] text-[12px]">
              ${(item.priceEstimate * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" />

      {/* Subtotals */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between font-[family-name:var(--font-body)] text-[13px]">
          <span className="text-sidewalk">Items estimate</span>
          <span className="text-chalkboard font-[family-name:var(--font-mono)] text-[12px]">
            ${itemsEstimate.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between font-[family-name:var(--font-body)] text-[13px]">
          <span className="text-sidewalk">{sellerName}&apos;s fee</span>
          <span className="text-chalkboard font-[family-name:var(--font-mono)] text-[12px]">
            ${sellerFee.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between font-[family-name:var(--font-body)] text-[13px]">
          <span className="text-sidewalk">LineCut fee</span>
          <span className="text-chalkboard font-[family-name:var(--font-mono)] text-[12px]">
            ${platformFee.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Solid divider for total */}
      <div className="border-t border-[#ddd4c4] my-3" />

      {/* Total */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px]">
          TOTAL
        </span>
        <span className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-ketchup">
          ${total.toFixed(2)}
        </span>
      </div>

      {/* Confirm button */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="w-full py-3 px-6 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-all duration-200 hover:bg-ketchup/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        PLACE ORDER &mdash; ${total.toFixed(2)}
      </button>

      {/* Caption */}
      <p className="text-center font-[family-name:var(--font-body)] text-[11px] text-sidewalk mt-2">
        Prices are estimates. Final amount may vary.
      </p>
    </div>
  );
}
