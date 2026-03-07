"use client";

import type { MenuItem } from "@/lib/types";

interface MenuItemPillProps {
  item: MenuItem;
  quantity: number;
  onToggle: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export default function MenuItemPill({
  item,
  quantity,
  onToggle,
  onIncrement,
  onDecrement,
}: MenuItemPillProps) {
  const isSelected = quantity > 0;

  return (
    <div className="inline-flex items-center gap-0">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-2 px-3 py-1.5 font-[family-name:var(--font-body)] text-[13px] transition-all duration-200 ${
          isSelected
            ? "bg-ketchup text-ticket rounded-l-full border border-ketchup"
            : "bg-butcher-paper text-chalkboard rounded-full border border-[#ddd4c4] hover:border-ketchup hover:text-ketchup"
        }`}
      >
        <span>{item.name}</span>
        <span
          className={`font-[family-name:var(--font-mono)] text-[11px] ${
            isSelected ? "text-ticket/70" : "text-sidewalk"
          }`}
        >
          ${item.priceEstimate.toFixed(2)}
        </span>
      </button>

      {isSelected && (
        <div className="inline-flex items-center border border-ketchup border-l-0 rounded-r-full overflow-hidden">
          <button
            type="button"
            onClick={onDecrement}
            className="w-7 h-[34px] flex items-center justify-center bg-ketchup text-ticket text-[16px] font-semibold hover:bg-ketchup/90 transition-colors"
          >
            -
          </button>
          <span className="w-7 h-[34px] flex items-center justify-center bg-ketchup text-ticket font-[family-name:var(--font-mono)] text-[12px]">
            {quantity}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            className="w-7 h-[34px] flex items-center justify-center bg-ketchup text-ticket text-[16px] font-semibold hover:bg-ketchup/90 transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
