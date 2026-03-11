"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/profile-context";
import type { OrderHistoryItem } from "./page";

interface Props {
  orders: OrderHistoryItem[];
  userId: string;
}

type Tab = "buyer" | "seller";

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  completed: { label: "COMPLETED", bg: "bg-[#DDEFDD]", text: "text-[#2D6A2D]" },
  cancelled: { label: "CANCELLED", bg: "bg-[#FDDEDE]", text: "text-[#C4382A]" },
  pending: { label: "PENDING", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" },
  accepted: { label: "ACCEPTED", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" },
  "in-progress": { label: "IN PROGRESS", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" },
  ready: { label: "READY", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" },
};

function getStatusBadge(status: string) {
  return (
    STATUS_BADGE[status] ?? {
      label: status.toUpperCase(),
      bg: "bg-[#E8E8E8]",
      text: "text-[#4D4D4D]",
    }
  );
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function itemsSummary(items: { name: string; quantity: number }[]): string {
  if (items.length === 0) return "No items";
  const first = items.slice(0, 2).map((i) => {
    const qty = i.quantity > 1 ? `${i.quantity}x ` : "";
    return `${qty}${i.name}`;
  });
  const remaining = items.length - 2;
  if (remaining > 0) {
    return `${first.join(", ")} + ${remaining} more`;
  }
  return first.join(", ");
}

function OrderCard({
  order,
  tab,
}: {
  order: OrderHistoryItem;
  tab: Tab;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = getStatusBadge(order.status);

  return (
    <article
      className="bg-ticket rounded-[10px] border border-[#eee6d8] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      {/* Clickable header area */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full text-left p-5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ketchup/50 rounded-[10px]"
      >
        {/* Top row: restaurant + status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard leading-tight">
            {order.restaurantName.toUpperCase()}
          </h3>
          <span
            className={`${badge.bg} ${badge.text} font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0`}
          >
            {badge.label}
          </span>
        </div>

        {/* Items summary */}
        <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard mb-2">
          {itemsSummary(order.items)}
        </p>

        {/* Bottom row: other party, total, date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
              {tab === "buyer" ? "Seller" : "Buyer"}: {order.otherPartyName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-semibold">
              {formatCents(order.total)}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk tracking-[0.5px]">
              {formatRelativeDate(order.createdAt)}
            </span>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex justify-center mt-2">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk tracking-[1px]">
            {expanded ? "LESS" : "DETAILS"}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5">
          {/* Dashed divider */}
          <div className="border-t border-dashed border-[#ddd4c4] mb-4" />

          {/* All items */}
          <div className="space-y-1.5 mb-4">
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk tracking-[2px] uppercase mb-2">
              Items
            </p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
                  {item.quantity > 1 ? `${item.quantity}x ` : ""}
                  {item.name}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Fee breakdown */}
          <div className="border-t border-dashed border-[#ddd4c4] pt-3 space-y-1.5">
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk tracking-[2px] uppercase mb-2">
              Breakdown
            </p>
            <div className="flex justify-between">
              <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Subtotal
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-chalkboard">
                {formatCents(order.itemsSubtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Line-skip tip
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-chalkboard">
                {formatCents(order.sellerFee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Service fee
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-chalkboard">
                {formatCents(order.platformFee)}
              </span>
            </div>
            <div className="border-t border-dashed border-[#ddd4c4] pt-2 flex justify-between">
              <span className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-semibold">
                Total
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[13px] text-chalkboard font-semibold">
                {formatCents(order.total)}
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t border-dashed border-[#ddd4c4] mt-3 pt-3">
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk tracking-[2px] uppercase mb-2">
              Timeline
            </p>
            <div className="flex justify-between">
              <span className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
                Placed
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk">
                {new Date(order.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {order.updatedAt !== order.createdAt && (
              <div className="flex justify-between mt-1">
                <span className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
                  Last updated
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk">
                  {new Date(order.updatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Order ID */}
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk tracking-[1px] mt-3 text-right">
            ORDER {order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      )}
    </article>
  );
}

export default function OrderHistoryClient({ orders, userId }: Props) {
  const profile = useProfile();
  const hasBuyerOrders = orders.some((o) => o.buyerId === userId);
  const hasSellerOrders = orders.some((o) => o.sellerId === userId);

  // Default to buyer tab if they have buyer orders or are a buyer, else seller
  const defaultTab: Tab =
    profile.isBuyer && (hasBuyerOrders || !hasSellerOrders) ? "buyer" : "seller";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const filtered = orders.filter((o) =>
    tab === "buyer" ? o.buyerId === userId : o.sellerId === userId
  );

  const showTabs = profile.isBuyer && profile.isSeller;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Page heading */}
      <h1 className="font-[family-name:var(--font-display)] text-[24px] tracking-[2px] text-chalkboard">
        ORDER HISTORY
      </h1>

      {/* Tab switcher */}
      {showTabs && (
        <div className="flex border-b border-dashed border-[#ddd4c4]" role="tablist" aria-label="Order history view">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "buyer"}
            onClick={() => setTab("buyer")}
            className={`px-4 min-h-[44px] py-2 font-[family-name:var(--font-body)] text-[13px] transition-colors cursor-pointer ${
              tab === "buyer"
                ? "font-semibold text-chalkboard border-b-2 border-ketchup"
                : "font-normal text-sidewalk border-b-2 border-transparent hover:text-chalkboard"
            }`}
          >
            As Buyer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "seller"}
            onClick={() => setTab("seller")}
            className={`px-4 min-h-[44px] py-2 font-[family-name:var(--font-body)] text-[13px] transition-colors cursor-pointer ${
              tab === "seller"
                ? "font-semibold text-chalkboard border-b-2 border-mustard"
                : "font-normal text-sidewalk border-b-2 border-transparent hover:text-chalkboard"
            }`}
          >
            As Seller
          </button>
        </div>
      )}

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-8 text-center">
          <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk mb-4">
            {tab === "buyer"
              ? "No orders yet. Find someone in line and skip the wait."
              : "No orders yet. Go live at a restaurant to start earning."}
          </p>
          <Link
            href={tab === "buyer" ? "/buyer" : "/seller"}
            className="inline-block bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold px-6 py-3 rounded-[6px] transition-all duration-200 hover:opacity-90"
          >
            {tab === "buyer" ? "Browse restaurants" : "Go live"}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} tab={tab} />
          ))}
        </div>
      )}
    </div>
  );
}
