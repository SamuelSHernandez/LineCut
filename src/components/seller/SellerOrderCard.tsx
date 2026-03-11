"use client";

import { useState, useEffect, useCallback } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import ReviewForm from "@/components/shared/ReviewForm";
import DisputeForm from "@/components/shared/DisputeForm";
import BlockReportButtons from "@/components/shared/BlockReportButtons";
import ChatPanel from "@/components/shared/ChatPanel";
import { PENDING_TIMEOUT_MS, READY_TIMEOUT_MS } from "@/lib/orders/state-machine";
import { useProfile } from "@/lib/profile-context";
import { createClient } from "@/lib/supabase/client";
import {
  acceptOrder,
  declineOrder,
  markInProgress,
  markReady,
  markCompleted,
  forceComplete,
} from "@/app/(dashboard)/seller/order-actions";

interface SellerOrderCardProps {
  order: Order;
  buyerName: string;
  onStatusChange: (orderId: string, newStatus: OrderStatus | "cancelled") => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case "pending":
      return { label: "WAITING", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" };
    case "accepted":
    case "in-progress":
      return { label: "ACTIVE", bg: "bg-[#DDEFDD]", text: "text-[#2D6A2D]" };
    case "ready":
      return { label: "READY", bg: "bg-[#FDECEA]", text: "text-[#C4382A]" };
    case "completed":
      return { label: "COMPLETE", bg: "bg-[#E8E8E8]", text: "text-[#4D4D4D]" };
    case "cancelled":
      return { label: "CANCELLED", bg: "bg-[#E8E8E8]", text: "text-[#4D4D4D]" };
    default:
      return { label: (status as string).toUpperCase(), bg: "bg-[#E8E8E8]", text: "text-[#4D4D4D]" };
  }
}

function getTimeAgo(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return "RECEIVED JUST NOW";
  const mins = Math.floor(diff / 60);
  return `RECEIVED ${mins} MIN AGO`;
}

export default function SellerOrderCard({
  order,
  buyerName,
  onStatusChange,
}: SellerOrderCardProps) {
  const profile = useProfile();
  const [timeAgo, setTimeAgo] = useState(() => getTimeAgo(order.createdAt));
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [autoExpireSeconds, setAutoExpireSeconds] = useState<number | null>(null);
  const badge = getStatusBadge(order.status);

  // Handoff state
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);

  // Ready-state timeout
  const [readyExpireSeconds, setReadyExpireSeconds] = useState<number | null>(null);
  const [readyExpired, setReadyExpired] = useState(false);

  // ── Time-ago ticker ───────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(order.createdAt));
    }, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // ── Fetch handoff confirmations ───────────────────────────
  useEffect(() => {
    if (order.status !== "ready") return;

    const supabase = createClient();
    supabase
      .from("handoff_confirmations")
      .select("role")
      .eq("order_id", order.id)
      .then(({ data }) => {
        if (data) {
          setSellerConfirmed(data.some((c) => c.role === "seller"));
          setBuyerConfirmed(data.some((c) => c.role === "buyer"));
        }
      });
  }, [order.id, order.status]);

  // ── Auto-cancel countdown for pending orders ──────────────
  useEffect(() => {
    if (order.status !== "pending") {
      setAutoExpireSeconds(null);
      return;
    }

    const createdMs = new Date(order.createdAt).getTime();
    const expiresAt = createdMs + PENDING_TIMEOUT_MS;

    function tick() {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setAutoExpireSeconds(remaining);

      if (remaining <= 0) {
        handleAction("cancelled");
      }
    }

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, order.createdAt, order.id]);

  // ── Ready-state timeout countdown ─────────────────────────
  useEffect(() => {
    if (order.status !== "ready" || !order.readyAt) {
      setReadyExpireSeconds(null);
      setReadyExpired(false);
      return;
    }

    const readyMs = new Date(order.readyAt).getTime();
    const expiresAt = readyMs + READY_TIMEOUT_MS;

    function tick() {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setReadyExpireSeconds(remaining);

      if (remaining <= 0) {
        setReadyExpired(true);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [order.status, order.readyAt]);

  // ── Server action dispatcher ──────────────────────────────
  const handleAction = useCallback(
    async (newStatus: OrderStatus | "cancelled") => {
      if (isProcessing) return;
      setIsProcessing(true);
      setActionError(null);

      try {
        let result: { success?: boolean; error?: string };

        switch (newStatus) {
          case "accepted":
            result = await acceptOrder(order.id);
            break;
          case "cancelled":
            result = await declineOrder(order.id);
            break;
          case "in-progress":
            result = await markInProgress(order.id);
            break;
          case "ready":
            result = await markReady(order.id);
            break;
          case "completed":
            result = await markCompleted(order.id);
            break;
          default:
            result = { error: "Unknown action" };
        }

        if (result.error) {
          setActionError(result.error);
        } else {
          onStatusChange(order.id, newStatus);
          if (newStatus === "completed") {
            setSellerConfirmed(true);
          }
        }
      } catch {
        setActionError("Something went wrong. Try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, onStatusChange, order.id]
  );

  const handleForceComplete = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      const result = await forceComplete(order.id);
      if (result.error) {
        setActionError(result.error);
      } else {
        onStatusChange(order.id, "completed");
      }
    } catch {
      setActionError("Something went wrong. Try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onStatusChange, order.id]);

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Format countdown as M:SS
  const countdownLabel =
    autoExpireSeconds !== null && autoExpireSeconds > 0
      ? `${Math.floor(autoExpireSeconds / 60)}:${String(autoExpireSeconds % 60).padStart(2, "0")}`
      : null;

  const readyCountdownLabel =
    readyExpireSeconds !== null && readyExpireSeconds > 0
      ? `${Math.floor(readyExpireSeconds / 60)}:${String(readyExpireSeconds % 60).padStart(2, "0")}`
      : null;

  const chatStatuses: OrderStatus[] = ["accepted", "in-progress", "ready"];
  const showChat = chatStatuses.includes(order.status);

  return (
    <article
      aria-label={`Order from ${buyerName}, ${badge.label}, ${totalItems} ${totalItems === 1 ? "item" : "items"}`}
      className={`bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
        order.status === "pending" ? "border-l-4 border-l-mustard" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full bg-mustard flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="font-[family-name:var(--font-display)] text-[16px] text-chalkboard leading-none">
              {getInitials(buyerName)}
            </span>
          </div>
          <span className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard">
            {buyerName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-expire countdown badge for pending orders */}
          {order.status === "pending" && countdownLabel && (
            <span
              role="timer"
              aria-label={`Auto-expires in ${countdownLabel}`}
              className={`font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] px-2 py-1 rounded-full ${
                autoExpireSeconds !== null && autoExpireSeconds <= 60
                  ? "bg-[#FDECEA] text-ketchup"
                  : "bg-[#FFF3D6] text-[#8B6914]"
              }`}
            >
              {countdownLabel}
            </span>
          )}
          {/* Ready timeout countdown */}
          {order.status === "ready" && readyCountdownLabel && !readyExpired && (
            <span
              role="timer"
              aria-label={`Buyer pickup time: ${readyCountdownLabel}`}
              className={`font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] px-2 py-1 rounded-full ${
                readyExpireSeconds !== null && readyExpireSeconds <= 120
                  ? "bg-[#FDECEA] text-ketchup"
                  : "bg-[#FFF3D6] text-[#8B6914]"
              }`}
            >
              {readyCountdownLabel}
            </span>
          )}
          <span
            role="status"
            className={`${badge.bg} ${badge.text} font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] px-2.5 py-1 rounded-full`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" role="separator" />

      {/* Order items */}
      <ul className="space-y-1.5 list-none p-0 m-0" aria-label="Order items">
        {order.items.map((item) => (
          <li key={item.menuItemId} className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
              {item.name} x{item.quantity}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      {/* Special instructions */}
      {order.specialInstructions && (
        <div className="mt-3">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] uppercase text-sidewalk mb-0.5">
            SPECIAL INSTRUCTIONS
          </p>
          <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard italic">
            {order.specialInstructions}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" role="separator" />

      {/* Earnings */}
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
          Your fee
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[12px] text-chalkboard font-medium">
          ${order.sellerFee.toFixed(2)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" role="separator" />

      {/* Error message */}
      {actionError && (
        <div
          role="alert"
          className="bg-[#FDECEA] text-ketchup font-[family-name:var(--font-body)] text-[12px] px-3 py-2 rounded-[6px] mb-3"
        >
          {actionError}
        </div>
      )}

      {/* Action area — buttons change based on current status */}
      {order.status === "pending" && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleAction("accepted")}
            disabled={isProcessing}
            aria-label={`Accept order from ${buyerName}`}
            className="flex-1 min-h-[48px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/50 disabled:opacity-60"
          >
            {isProcessing ? "..." : "ACCEPT"}
          </button>
          <button
            type="button"
            onClick={() => handleAction("cancelled")}
            disabled={isProcessing}
            aria-label={`Decline order from ${buyerName}`}
            className="min-h-[48px] px-4 text-ketchup font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/50 disabled:opacity-60"
          >
            DECLINE
          </button>
        </div>
      )}

      {order.status === "accepted" && (
        <div>
          <button
            type="button"
            onClick={() => handleAction("in-progress")}
            disabled={isProcessing}
            aria-label={`Mark ${buyerName}'s order as started`}
            className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-mustard/50 disabled:opacity-60"
          >
            {isProcessing ? "..." : "STARTED ORDERING"}
          </button>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk text-center mt-1.5">
            Tap when you&apos;ve placed their order at the counter.
          </p>
        </div>
      )}

      {order.status === "in-progress" && (
        <div>
          <button
            type="button"
            onClick={() => handleAction("ready")}
            disabled={isProcessing}
            aria-label={`Mark ${buyerName}'s order as ready`}
            className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-mustard/50 disabled:opacity-60"
          >
            {isProcessing ? "..." : "ORDER'S READY"}
          </button>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk text-center mt-1.5">
            Tap when you&apos;ve got the food in hand. Payment will be captured.
          </p>
        </div>
      )}

      {order.status === "ready" && !readyExpired && (
        <div className="space-y-3">
          {/* Confirmation badges */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                sellerConfirmed ? "bg-[#2D6A2D]" : "bg-[#ddd4c4]"
              }`}>
                {sellerConfirmed ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse motion-reduce:animate-none" />
                )}
              </div>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] text-sidewalk">
                YOU
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                buyerConfirmed ? "bg-[#2D6A2D]" : "bg-[#ddd4c4]"
              }`}>
                {buyerConfirmed ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse motion-reduce:animate-none" />
                )}
              </div>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] text-sidewalk">
                BUYER
              </span>
            </div>
          </div>

          {/* Status text */}
          {buyerConfirmed && !sellerConfirmed && (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] text-center font-semibold">
              Buyer confirmed — tap to complete
            </p>
          )}
          {sellerConfirmed && !buyerConfirmed && (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center">
              Waiting for buyer to confirm...
            </p>
          )}

          {!sellerConfirmed && (
            <button
              type="button"
              onClick={() => handleAction("completed")}
              disabled={isProcessing}
              aria-label={`Confirm hand-off to ${buyerName}`}
              className="w-full min-h-[48px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/50 disabled:opacity-60"
            >
              {isProcessing ? "..." : "CONFIRM HAND-OFF"}
            </button>
          )}
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk text-center">
            Both you and the buyer need to confirm the hand-off.
          </p>
        </div>
      )}

      {/* Ready expired — escalation options */}
      {order.status === "ready" && readyExpired && (
        <div className="space-y-3">
          <div className="bg-[#FFF3D6] border border-[#8B6914]/20 rounded-[6px] px-3 py-2 text-center">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[#8B6914] font-semibold">
              Buyer didn&apos;t show
            </p>
          </div>
          <button
            type="button"
            onClick={handleForceComplete}
            disabled={isProcessing}
            className="w-full min-h-[48px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/50 disabled:opacity-60"
          >
            {isProcessing ? "..." : "COMPLETE ANYWAY"}
          </button>
        </div>
      )}

      {/* Chat panel — active orders */}
      {showChat && (
        <div className="mt-3">
          <ChatPanel
            orderId={order.id}
            userId={profile.id}
            otherPartyName={buyerName}
          />
        </div>
      )}

      {/* Terminal states */}
      {order.status === "completed" && (
        <>
          <ReviewForm
            orderId={order.id}
            otherPartyName={buyerName}
            role="seller"
          />
          <DisputeForm orderId={order.id} otherPartyName={buyerName} />
          <div className="border-t border-dashed border-[#ddd4c4] mt-3 pt-2" />
          <BlockReportButtons
            targetUserId={order.buyerId}
            targetName={buyerName}
            orderId={order.id}
          />
        </>
      )}
      {order.status === "cancelled" && (
        <>
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk text-center">
            Order was cancelled.
          </p>
          <div className="border-t border-dashed border-[#ddd4c4] mt-1 pt-2" />
          <BlockReportButtons
            targetUserId={order.buyerId}
            targetName={buyerName}
            orderId={order.id}
          />
        </>
      )}

      {/* Timestamp */}
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk text-right mt-3">
        {timeAgo}
      </p>
    </article>
  );
}
