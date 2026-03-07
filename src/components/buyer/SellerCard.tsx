"use client";

import type { Seller } from "@/lib/types";

interface SellerCardProps {
  seller: Seller;
  isSelected: boolean;
  onSelect: () => void;
}

function getFlexibilityLabel(flex: Seller["menuFlexibility"]): string {
  switch (flex) {
    case "full":
      return "Will order anything on the menu";
    case "popular-only":
      return "Popular items only";
    case "preset":
      return "Preset orders only";
  }
}

export default function SellerCard({
  seller,
  isSelected,
  onSelect,
}: SellerCardProps) {
  const initials = `${seller.firstName[0]}${seller.lastInitial}`;
  const isBusy = seller.status === "busy";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isBusy}
      className={`w-full text-left bg-ticket rounded-[10px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-200 ${
        isSelected
          ? "border-2 border-ketchup shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
          : "border border-[#eee6d8] hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:scale-[1.01]"
      } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {/* Row 1: Avatar + Name + Trust | Fee */}
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-mustard flex items-center justify-center flex-shrink-0">
            <span className="font-[family-name:var(--font-display)] text-[14px] text-chalkboard leading-none">
              {initials}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard">
                {seller.firstName} {seller.lastInitial}.
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#DDEFDD] font-[family-name:var(--font-mono)] text-[10px] tracking-[0.5px] text-[#2D6A2D]">
                {seller.trustScore}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-ketchup leading-none">
            ${seller.fee.toFixed(2)}
          </span>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk tracking-[0.5px]">
            FEE
          </p>
        </div>
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" />

      {/* Row 2: Stats */}
      <div className="flex items-center gap-6 mb-2">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk uppercase tracking-[1.5px]">
            SPOT
          </p>
          <p className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] leading-tight">
            #{seller.positionInLine}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk uppercase tracking-[1.5px]">
            WAIT
          </p>
          <p className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] leading-tight">
            {seller.waitEstimate}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk uppercase tracking-[1.5px]">
            DONE
          </p>
          <p className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] leading-tight">
            {seller.completedOrders}
          </p>
        </div>
      </div>

      {/* Row 3: Flexibility */}
      <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk mb-3">
        {getFlexibilityLabel(seller.menuFlexibility)}
      </p>

      {/* Row 4: Action */}
      {isBusy ? (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#E8E8E8] font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] text-[#666666]">
          BUSY
        </span>
      ) : isSelected ? (
        <div className="w-full py-2.5 px-4 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] text-center transition-all duration-200 hover:bg-ketchup/90">
          ORDER THROUGH {seller.firstName.toUpperCase()}
        </div>
      ) : null}
    </button>
  );
}
