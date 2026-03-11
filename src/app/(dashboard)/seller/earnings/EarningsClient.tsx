"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { EarningsData, EarningsTransaction, DailyEarnings } from "./page";
import { createConnectLoginLink } from "@/app/(dashboard)/profile/actions";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// --- Stats Card ---

function StatsCard({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[1.5px] uppercase text-sidewalk mb-1">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-[28px] tracking-[1px] text-chalkboard leading-none">
        {formatCents(amount)}
      </p>
    </div>
  );
}

// --- Daily Bar Chart ---

function DailyChart({ days }: { days: DailyEarnings[] }) {
  const maxTotal = Math.max(...days.map((d) => d.total), 1);

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h2 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard mb-4">
        LAST 7 DAYS
      </h2>
      <div className="space-y-2.5">
        {days.map((day) => {
          const pct = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;
          return (
            <div key={day.date} className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk w-16 shrink-0">
                {formatDayLabel(day.date)}
              </span>
              <div className="flex-1 h-6 bg-[#eee6d8] rounded-[4px] overflow-hidden">
                {pct > 0 && (
                  <div
                    className="h-full bg-mustard rounded-[4px] transition-all duration-300"
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                )}
              </div>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-chalkboard w-14 text-right shrink-0">
                {day.total > 0 ? formatCents(day.total) : "--"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Transaction Row ---

function TransactionRow({ tx }: { tx: EarningsTransaction }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-dashed border-[#eee6d8] last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard truncate">
          {tx.restaurantName}
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk">
          {tx.buyerName} &middot; {formatDate(tx.completedAt)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[14px] text-chalkboard font-medium">
            +{formatCents(tx.sellerFee)}
          </span>
          <span className="bg-[#DDEFDD] text-[#2D6A2D] font-[family-name:var(--font-mono)] text-[9px] tracking-[1px] px-2 py-0.5 rounded-full">
            COMPLETE
          </span>
        </div>
        {tx.tipAmount > 0 && (
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#8B6914] font-medium">
            +{formatCents(tx.tipAmount)} tip
          </span>
        )}
      </div>
    </div>
  );
}

// --- Payout Info ---

function PayoutSection({
  status,
  accountId,
}: {
  status: string;
  accountId: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusConfig: Record<
    string,
    { label: string; bg: string; text: string }
  > = {
    not_connected: {
      label: "NOT CONNECTED",
      bg: "bg-[#E8E8E8]",
      text: "text-[#4D4D4D]",
    },
    pending: {
      label: "PENDING",
      bg: "bg-[#FFF3D6]",
      text: "text-[#8B6914]",
    },
    active: {
      label: "ACTIVE",
      bg: "bg-[#DDEFDD]",
      text: "text-[#2D6A2D]",
    },
    restricted: {
      label: "RESTRICTED",
      bg: "bg-[#FFF3D6]",
      text: "text-ketchup",
    },
  };

  const config = statusConfig[status] ?? statusConfig.not_connected;

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

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard">
          PAYOUTS
        </h2>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] ${config.bg} ${config.text}`}
        >
          {config.label}
        </span>
      </div>

      {error && (
        <div className="bg-[#FDECEA] rounded-[6px] px-3 py-2 mb-3">
          <p className="font-[family-name:var(--font-body)] text-[12px] text-ketchup">
            {error}
          </p>
        </div>
      )}

      {status === "active" && accountId && (
        <button
          type="button"
          onClick={handleDashboard}
          disabled={isPending}
          className="w-full min-h-[48px] py-3 bg-transparent text-chalkboard border-2 border-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-chalkboard hover:text-ticket transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-chalkboard/30"
        >
          {isPending ? "Loading..." : "Open Stripe Dashboard"}
        </button>
      )}

      {status !== "active" && (
        <Link
          href="/profile#payouts"
          className="block w-full py-3 text-center bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#d4a843] transition-colors"
        >
          {status === "not_connected" ? "Connect Stripe" : "Complete Setup"}
        </Link>
      )}
    </div>
  );
}

// --- Empty State ---

function EmptyState() {
  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.06)] text-center">
      <p className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard mb-2">
        NO EARNINGS YET
      </p>
      <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk mb-4">
        Complete your first order to start earning. Go live from your seller
        dashboard to get started.
      </p>
      <Link
        href="/seller"
        className="inline-block min-h-[44px] leading-[44px] px-6 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

// --- Main Client Component ---

export default function EarningsClient({ data }: { data: EarningsData }) {
  const hasEarnings = data.allTime > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[32px] tracking-[2px] leading-none text-chalkboard mb-1">
            EARNINGS
          </h1>
          <p className="font-[family-name:var(--font-body)] text-[15px] text-sidewalk">
            Your order earnings and payout info.
          </p>
        </div>
        <Link
          href="/seller"
          className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors underline underline-offset-2"
        >
          Back to dashboard
        </Link>
      </div>

      {!hasEarnings ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatsCard label="Today" amount={data.today} />
            <StatsCard label="This Week" amount={data.thisWeek} />
            <StatsCard label="This Month" amount={data.thisMonth} />
            <StatsCard label="All Time" amount={data.allTime} />
          </div>

          {/* Tips callout */}
          {data.tipsAllTime > 0 && (
            <div className="bg-ticket rounded-[10px] border border-[#eee6d8] px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center justify-between">
              <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[1.5px] uppercase text-sidewalk">
                Tips Earned (All Time)
              </p>
              <p className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-[#8B6914] leading-none">
                {formatCents(data.tipsAllTime)}
              </p>
            </div>
          )}

          {/* Daily chart */}
          <DailyChart days={data.dailyBreakdown} />

          {/* Recent transactions */}
          <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <h2 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard mb-3">
              RECENT ORDERS
            </h2>
            <div>
              {data.recentTransactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Payout info -- always shown */}
      <PayoutSection
        status={data.stripeConnectStatus}
        accountId={data.stripeConnectAccountId}
      />
    </div>
  );
}
