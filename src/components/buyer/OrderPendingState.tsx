"use client";

import { useState, useEffect } from "react";

interface OrderPendingStateProps {
  sellerName: string;
  positionInLine: number;
  onCancel: () => void;
}

export default function OrderPendingState({
  sellerName,
  positionInLine,
  onCancel,
}: OrderPendingStateProps) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAccepted(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      {/* Scissors icon with pulse */}
      <div className={accepted ? "" : "animate-pulse"}>
        <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
          <ellipse
            cx="8"
            cy="6"
            rx="5.5"
            ry="5"
            stroke={accepted ? "#2D6A2D" : "#C4382A"}
            strokeWidth="1.5"
            fill="none"
          />
          <line
            x1="12"
            y1="9"
            x2="22"
            y2="22"
            stroke={accepted ? "#2D6A2D" : "#C4382A"}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse
            cx="20"
            cy="6"
            rx="5.5"
            ry="5"
            stroke={accepted ? "#2D6A2D" : "#C4382A"}
            strokeWidth="1.5"
            fill="none"
          />
          <line
            x1="16"
            y1="9"
            x2="6"
            y2="22"
            stroke={accepted ? "#2D6A2D" : "#C4382A"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Status heading */}
      <h3 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px]">
        {accepted ? "ORDER ACCEPTED" : "ORDER SENT"}
      </h3>

      {/* Status message */}
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center max-w-[260px]">
        {accepted
          ? `${sellerName}'s got it. They'll grab your order when they hit the counter.`
          : `Waiting on ${sellerName} to accept. Hang tight -- they're ${positionInLine}${getOrdinalSuffix(positionInLine)} from the counter.`}
      </p>

      {/* Status badge */}
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] ${
          accepted
            ? "bg-[#DDEFDD] text-[#2D6A2D]"
            : "bg-[#FFF3D6] text-[#8B6914]"
        }`}
      >
        {accepted ? "ACCEPTED" : "PENDING"}
      </span>

      {/* Cancel button */}
      {!accepted && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold hover:text-ketchup/80 transition-colors"
        >
          CANCEL ORDER
        </button>
      )}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
