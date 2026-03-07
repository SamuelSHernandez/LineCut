"use client";

import { useState, useTransition } from "react";
import { useProfile } from "@/lib/profile-context";
import {
  createConnectAccount,
  createConnectLoginLink,
} from "@/app/(dashboard)/profile/actions";

export default function SellerPayoutSection() {
  const profile = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!profile.isSeller) return null;

  const status = profile.stripeConnectStatus;

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      const result = await createConnectAccount();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  function handleDashboard() {
    setError(null);
    startTransition(async () => {
      const result = await createConnectLoginLink();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.open(result.url, "_blank");
      }
    });
  }

  const statusConfig = {
    not_connected: {
      label: "NOT CONNECTED",
      bg: "bg-[#E8E8E8]",
      text: "text-[#666]",
      description: "Connect your Stripe account to receive payouts.",
    },
    pending: {
      label: "PENDING",
      bg: "bg-[#FFF3D6]",
      text: "text-[#8B6914]",
      description:
        "Your Stripe account is being reviewed. Complete any remaining steps.",
    },
    active: {
      label: "ACTIVE",
      bg: "bg-[#DDEFDD]",
      text: "text-[#2D6A2D]",
      description: "Your payouts are set up. You can go live and earn.",
    },
    restricted: {
      label: "RESTRICTED",
      bg: "bg-[#FFF3D6]",
      text: "text-ketchup",
      description:
        "Your Stripe account has restrictions. Complete the required steps.",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      id="payouts"
      className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center gap-3 mb-1">
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px]">
          SELLER PAYOUTS
        </h2>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] ${config.bg} ${config.text}`}
        >
          {config.label}
        </span>
      </div>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
        {config.description}
      </p>

      {error && (
        <div className="bg-[#FFF3D6] border border-ketchup rounded-[6px] px-4 py-3 mb-4">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-medium">
            {error}
          </p>
        </div>
      )}

      {status === "not_connected" && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isPending}
          className="w-full py-3 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#d4a843] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Setting up..." : "Connect with Stripe"}
        </button>
      )}

      {status === "pending" && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isPending}
          className="w-full py-3 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#d4a843] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Loading..." : "Complete Setup"}
        </button>
      )}

      {status === "active" && (
        <button
          type="button"
          onClick={handleDashboard}
          disabled={isPending}
          className="w-full py-3 bg-transparent text-chalkboard border-2 border-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-chalkboard hover:text-ticket transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Loading..." : "Open Stripe Dashboard"}
        </button>
      )}

      {status === "restricted" && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isPending}
          className="w-full py-3 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Loading..." : "Fix Account Issues"}
        </button>
      )}
    </div>
  );
}
