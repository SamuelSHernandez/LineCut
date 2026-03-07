"use client";

import { useEffect } from "react";

interface BillingGateBannerProps {
  gate: "buyer" | "seller" | null;
}

export default function BillingGateBanner({ gate }: BillingGateBannerProps) {
  useEffect(() => {
    if (!gate) return;

    const targetId = gate === "buyer" ? "billing" : "payouts";
    const el = document.getElementById(targetId);
    if (el) {
      // Small delay to let page render
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [gate]);

  if (!gate) return null;

  const message =
    gate === "buyer"
      ? "Add a payment method to place orders."
      : "Connect your Stripe account to go live.";

  return (
    <div className="bg-[#FFF3D6] border-2 border-mustard rounded-[10px] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <p className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard">
        One more step
      </p>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mt-1">
        {message}
      </p>
    </div>
  );
}
