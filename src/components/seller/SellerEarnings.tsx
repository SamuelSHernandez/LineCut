"use client";

import type { Order } from "@/lib/types";

interface SellerEarningsProps {
  completedOrders: Order[];
}

export default function SellerEarnings({ completedOrders }: SellerEarningsProps) {
  const totalEarnings = completedOrders.reduce((sum, o) => sum + o.sellerFee, 0);

  return (
    <section
      aria-label="Your earnings"
      className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <h3 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard mb-3">
        YOUR EARNINGS
      </h3>
      <div className="grid grid-cols-3 gap-4" aria-live="polite">
        {["Today", "This Week", "All Time"].map((period) => (
          <div key={period} className="text-center">
            <p
              className="font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-1"
              id={`earnings-label-${period.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {period}
            </p>
            <p
              className="font-[family-name:var(--font-display)] text-[24px] tracking-[1px] text-chalkboard"
              aria-labelledby={`earnings-label-${period.replace(/\s+/g, "-").toLowerCase()}`}
            >
              ${totalEarnings.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
