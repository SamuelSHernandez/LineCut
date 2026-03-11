"use client";

import { useState, useTransition } from "react";
import { sendTip } from "@/app/(dashboard)/buyer/tip-actions";

interface TipPanelProps {
  orderId: string;
  sellerName: string;
  existingTip?: { amount: number; status: string } | null;
}

const PRESET_AMOUNTS = [100, 200, 500]; // cents

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TipPanel({
  orderId,
  sellerName,
  existingTip,
}: TipPanelProps) {
  const [selectedCents, setSelectedCents] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [completedTip, setCompletedTip] = useState<{
    amount: number;
    status: string;
  } | null>(existingTip ?? null);

  // Already tipped
  if (completedTip && completedTip.status !== "failed") {
    return (
      <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#2D6A2D] flex items-center justify-center shrink-0" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard">
            You tipped {sellerName}{" "}
            <span className="font-semibold">
              {formatDollars(completedTip.amount)}
            </span>
          </p>
        </div>
      </div>
    );
  }

  function getAmountCents(): number | null {
    if (showCustom) {
      const parsed = parseFloat(customValue);
      if (isNaN(parsed) || parsed < 1 || parsed > 50) return null;
      return Math.round(parsed * 100);
    }
    return selectedCents;
  }

  function handleSubmit() {
    const cents = getAmountCents();
    if (!cents) return;

    setError(null);
    startTransition(async () => {
      const result = await sendTip(orderId, cents);
      if ("error" in result) {
        setError(result.error);
      } else {
        setCompletedTip({ amount: cents, status: "succeeded" });
      }
    });
  }

  const activeCents = getAmountCents();

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h3 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard mb-1">
        TIP {sellerName.toUpperCase()}
      </h3>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
        100% goes directly to {sellerName}. No platform fee.
      </p>

      {/* Preset buttons */}
      <div className="flex gap-2.5 mb-3">
        {PRESET_AMOUNTS.map((cents) => {
          const isActive = !showCustom && selectedCents === cents;
          return (
            <button
              key={cents}
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowCustom(false);
                setSelectedCents(cents);
                setError(null);
              }}
              className={`flex-1 min-h-[44px] rounded-[6px] font-[family-name:var(--font-mono)] text-[14px] font-medium border-2 transition-colors ${
                isActive
                  ? "bg-mustard border-mustard text-chalkboard"
                  : "bg-butcher-paper border-[#eee6d8] text-chalkboard hover:border-mustard"
              } disabled:opacity-50`}
            >
              ${cents / 100}
            </button>
          );
        })}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setShowCustom(true);
            setSelectedCents(null);
            setError(null);
          }}
          className={`flex-1 min-h-[44px] rounded-[6px] font-[family-name:var(--font-mono)] text-[14px] font-medium border-2 transition-colors ${
            showCustom
              ? "bg-mustard border-mustard text-chalkboard"
              : "bg-butcher-paper border-[#eee6d8] text-chalkboard hover:border-mustard"
          } disabled:opacity-50`}
        >
          Other
        </button>
      </div>

      {/* Custom input */}
      {showCustom && (
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-[14px] text-sidewalk">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            max="50"
            step="0.50"
            placeholder="0.00"
            aria-label="Custom tip amount in dollars"
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value);
              setError(null);
            }}
            disabled={isPending}
            className="w-full min-h-[44px] pl-7 pr-3 bg-butcher-paper border-2 border-[#eee6d8] rounded-[6px] font-[family-name:var(--font-mono)] text-[14px] text-chalkboard placeholder:text-sidewalk/40 focus:outline-none focus:border-mustard disabled:opacity-50"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="bg-[#FDECEA] text-ketchup font-[family-name:var(--font-body)] text-[12px] px-3 py-2 rounded-[6px] mb-3"
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !activeCents}
        className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-mustard/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending
          ? "Processing..."
          : activeCents
            ? `TIP ${sellerName.toUpperCase()} ${formatDollars(activeCents)}`
            : `TIP ${sellerName.toUpperCase()}`}
      </button>
    </div>
  );
}
