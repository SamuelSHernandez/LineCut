"use client";

import { useState } from "react";

interface ConnectStripeButtonProps {
  status: "not_connected" | "pending" | "active" | "restricted";
}

export default function ConnectStripeButton({
  status,
}: ConnectStripeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/create", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start setup.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "active") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#2D6A2D]" />
        <span className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] font-semibold">
          Payouts active
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSetup}
        disabled={loading}
        className="w-full min-h-[48px] py-3 px-6 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-all duration-200 hover:bg-[#d4a843] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "SETTING UP..."
          : status === "pending" || status === "restricted"
            ? "COMPLETE PAYOUT SETUP"
            : "SET UP PAYOUTS"}
      </button>
      {(status === "pending" || status === "restricted") && (
        <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk mt-2 text-center">
          Finish Stripe onboarding to start earning.
        </p>
      )}
      {error && (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
