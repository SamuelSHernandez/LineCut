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
    <div className="inline-flex items-center h-[38px]">
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          isSelected
            ? `Remove ${item.name} from order`
            : `Add ${item.name} to order, estimated $${item.price.toFixed(2)}`
        }
        aria-pressed={isSelected}
        className={`inline-flex items-center gap-2 px-3 h-full font-[family-name:var(--font-body)] text-[13px] transition-all duration-200 ${
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
          ${item.price.toFixed(2)}
        </span>
      </button>

      {isSelected && (
        <div className="inline-flex items-center h-full border border-ketchup border-l-0 rounded-r-full overflow-hidden">
          <button
            type="button"
            onClick={onDecrement}
            aria-label={`Decrease ${item.name} quantity, currently ${quantity}`}
            className="w-9 h-full flex items-center justify-center bg-ketchup text-ticket text-[16px] font-semibold hover:bg-ketchup/90 transition-colors"
          >
            -
          </button>
          <span
            className="w-7 h-full flex items-center justify-center bg-ketchup text-ticket font-[family-name:var(--font-mono)] text-[12px]"
            aria-live="polite"
            aria-label={`${item.name} quantity: ${quantity}`}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            aria-label={`Increase ${item.name} quantity, currently ${quantity}`}
            className="w-9 h-full flex items-center justify-center bg-ketchup text-ticket text-[16px] font-semibold hover:bg-ketchup/90 transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
