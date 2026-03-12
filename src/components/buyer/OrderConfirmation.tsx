"use client";

import type { OrderItem } from "@/lib/types";
import { calculatePlatformFeeDollars } from "@/lib/fee-tiers";

interface OrderConfirmationProps {
  items: OrderItem[];
  sellerName: string;
  sellerFee: number;
  sellerMaxCap?: number; // cents
  onConfirm: () => void;
  disabled: boolean;
  confirmLabel?: string;
}

const ORDER_MAX = 200;

export default function OrderConfirmation({
  items,
  sellerName,
  sellerFee,
  sellerMaxCap,
  onConfirm,
  disabled,
  confirmLabel,
}: OrderConfirmationProps) {
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const platformFee = calculatePlatformFeeDollars(itemsSubtotal);
  const total = itemsSubtotal + sellerFee + platformFee;
  const totalCents = Math.round(total * 100);
  const sellerCap = sellerMaxCap ?? ORDER_MAX * 100;
  const overSellerCap = totalCents > sellerCap;
  const overCap = total > ORDER_MAX || overSellerCap;

  return (
    <div>
      {/* Line items */}
      <div className="space-y-2 mb-3" role="list" aria-label="Order items">
        {items.map((item) => (
          <div
            key={item.menuItemId}
            role="listitem"
            className="flex items-center justify-between font-[family-name:var(--font-body)] text-[13px]"
          >
            <span className="text-chalkboard">
              {item.name} x{item.quantity}
            </span>
            <span className="text-sidewalk font-[family-name:var(--font-mono)] text-[12px]">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" />

      {/* Subtotals */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between font-[family-name:var(--font-body)] text-[13px]">
          <span className="text-sidewalk">Items</span>
          <span className="text-chalkboard font-[family-name:var(--font-mono)] text-[12px]">
            ${itemsSubtotal.toFixed(2)}
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
      <div className="flex items-center justify-between mb-4" aria-live="polite">
        <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px]">
          TOTAL
        </span>
        <span className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-ketchup">
          ${total.toFixed(2)}
        </span>
      </div>

      {/* Cap warning */}
      {overSellerCap && (
        <p role="alert" className="text-center font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold mb-3">
          Exceeds {sellerName}&apos;s max of ${Math.round(sellerCap / 100)}. Remove some items to continue.
        </p>
      )}
      {!overSellerCap && total > ORDER_MAX && (
        <p role="alert" className="text-center font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold mb-3">
          Orders are capped at ${ORDER_MAX}. Remove some items to continue.
        </p>
      )}

      {/* Confirm button */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled || overCap}
        className="w-full min-h-[48px] py-3 px-6 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-all duration-200 hover:bg-ketchup/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ketchup/50"
      >
        {confirmLabel ?? "PLACE ORDER"} &mdash; ${total.toFixed(2)}
      </button>

      {/* Caption */}
      <p className="text-center font-[family-name:var(--font-body)] text-[11px] text-sidewalk mt-2">
        Your card will be authorized now and charged when your order is ready.
      </p>
    </div>
  );
}
