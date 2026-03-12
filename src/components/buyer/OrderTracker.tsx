"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import ReviewForm from "@/components/shared/ReviewForm";
import DisputeForm from "@/components/shared/DisputeForm";
import ChatPanel from "@/components/shared/ChatPanel";
import { useProfile } from "@/lib/profile-context";
import { useGeofence, formatDistanceMeters } from "@/lib/use-geofence";
import { restaurants } from "@/lib/restaurant-data";
import BlockReportButtons from "@/components/shared/BlockReportButtons";
import { confirmBuyerHandoff } from "@/app/(dashboard)/buyer/order-actions";
import { cancelReadyOrderNoShow } from "@/app/(dashboard)/seller/order-actions";
import { getTipForOrder } from "@/app/(dashboard)/buyer/tip-actions";
import TipPanel from "@/components/buyer/TipPanel";
import { createClient } from "@/lib/supabase/client";
import { READY_TIMEOUT_MS, READY_REMINDER_MS } from "@/lib/orders/state-machine";

interface OrderTrackerProps {
  order: Order;
  onCancel: () => void;
  onModify?: () => void;
}

interface Step {
  key: OrderStatus;
  label: string;
  description: (order: Order) => string;
}

const STEPS: Step[] = [
  {
    key: "pending",
    label: "ORDER SENT",
    description: (o) => `Waiting on ${o.sellerName} to accept...`,
  },
  {
    key: "accepted",
    label: "ACCEPTED",
    description: (o) => `${o.sellerName}'s got it. Sit tight.`,
  },
  {
    key: "in-progress",
    label: "AT THE COUNTER",
    description: (o) => `${o.sellerName} is ordering at the counter now.`,
  },
  {
    key: "ready",
    label: "READY FOR PICKUP",
    description: (o) => {
      const base = `Your food is ready. Head to ${o.restaurantName}.`;
      return o.pickupInstructions ? `${base} ${o.pickupInstructions}` : base;
    },
  },
  {
    key: "completed",
    label: "HANDED OFF",
    description: () => "Done. How'd it go?",
  },
];

function getStepIndex(status: OrderStatus): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderTracker({ order, onCancel, onModify }: OrderTrackerProps) {
  const profile = useProfile();
  const userId = profile.id;
  const currentIndex = getStepIndex(order.status);
  const [showBanner, setShowBanner] = useState(false);
  const [showReadySplash, setShowReadySplash] = useState(false);
  const prevStatusRef = useRef(order.status);

  // Handoff state
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Geofence
  const restaurant = restaurants.find((r) => r.id === order.restaurantId);
  const geofence = useGeofence({
    lat: restaurant?.lat ?? 0,
    lng: restaurant?.lng ?? 0,
    radiusMeters: 200,
  });
  const [geofenceChecked, setGeofenceChecked] = useState(false);

  // Tip state
  const [existingTip, setExistingTip] = useState<{ amount: number; status: string } | null>(null);
  const [tipLoaded, setTipLoaded] = useState(false);

  // Ready-state timer
  const [elapsedSinceReady, setElapsedSinceReady] = useState(0);
  const [showReminder, setShowReminder] = useState(false);

  // Show notification banner when status changes
  useEffect(() => {
    if (order.status !== prevStatusRef.current) {
      const wasReady = prevStatusRef.current !== "ready" && order.status === "ready";
      prevStatusRef.current = order.status;

      if (wasReady) {
        setShowReadySplash(true);
      }

      const showTimer = setTimeout(() => setShowBanner(true), 0);
      const hideTimer = setTimeout(() => setShowBanner(false), 5000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [order.status]);

  // Fetch existing tip when order is completed
  useEffect(() => {
    if (order.status !== "completed") return;
    let cancelled = false;
    getTipForOrder(order.id).then(({ tip }) => {
      if (!cancelled) {
        setExistingTip(tip);
        setTipLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [order.id, order.status]);

  // Fetch handoff confirmations on mount / when status is ready
  useEffect(() => {
    if (order.status !== "ready") return;

    const supabase = createClient();
    supabase
      .from("handoff_confirmations")
      .select("role")
      .eq("order_id", order.id)
      .then(({ data }) => {
        if (data) {
          setBuyerConfirmed(data.some((c) => c.role === "buyer"));
          setSellerConfirmed(data.some((c) => c.role === "seller"));
        }
      });
  }, [order.id, order.status]);

  // Ready-state elapsed timer + auto-cancel when timeout expires
  const [readyExpired, setReadyExpired] = useState(false);
  const cancelTriggeredRef = useRef(false);

  useEffect(() => {
    if (order.status !== "ready" || !order.readyAt) return;

    function tick() {
      const elapsed = Date.now() - new Date(order.readyAt!).getTime();
      setElapsedSinceReady(elapsed);
      if (elapsed >= READY_REMINDER_MS && !showReminder) {
        setShowReminder(true);
      }
      if (elapsed >= READY_TIMEOUT_MS) {
        setReadyExpired(true);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [order.status, order.readyAt, showReminder]);

  // Auto-trigger no-show cancel from buyer side as well (redundant with seller side, but ensures it fires)
  useEffect(() => {
    if (readyExpired && order.status === "ready" && !cancelTriggeredRef.current) {
      cancelTriggeredRef.current = true;
      cancelReadyOrderNoShow(order.id).catch((err) =>
        console.error("[OrderTracker] auto-cancel failed:", err)
      );
    }
  }, [readyExpired, order.status, order.id]);

  const handleConfirmHandoff = useCallback(async () => {
    // If geofence hasn't been checked yet, trigger it
    if (!geofenceChecked && geofence.status === "idle") {
      geofence.check();
      setGeofenceChecked(true);
      return;
    }

    // If geofence is currently checking, wait
    if (geofence.status === "checking") return;

    // For outside, denied, or unavailable — allow with appropriate messaging
    // (soft gate per plan)

    setIsConfirming(true);
    setConfirmError(null);
    try {
      const result = await confirmBuyerHandoff(order.id);
      if (result.error) {
        setConfirmError(result.error);
      } else {
        setBuyerConfirmed(true);
      }
    } catch {
      setConfirmError("Something went wrong. Try again.");
    } finally {
      setIsConfirming(false);
    }
  }, [order.id, geofence, geofenceChecked]);

  // After geofence check completes, auto-proceed to confirm if inside
  useEffect(() => {
    if (geofenceChecked && geofence.status === "inside" && !buyerConfirmed && !isConfirming) {
      handleConfirmHandoff();
    }
  }, [geofenceChecked, geofence.status, buyerConfirmed, isConfirming, handleConfirmHandoff]);

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const chatStatuses: OrderStatus[] = ["accepted", "in-progress", "ready"];
  const showChat = chatStatuses.includes(order.status);

  const elapsedMinutes = Math.floor(elapsedSinceReady / 60000);
  const elapsedSeconds = Math.floor((elapsedSinceReady % 60000) / 1000);

  return (
    <div className="space-y-5">
      {/* Ready splash overlay */}
      {showReadySplash && (
        <button
          type="button"
          onClick={() => setShowReadySplash(false)}
          className="fixed inset-0 z-50 bg-ketchup flex flex-col items-center justify-center text-center p-6 cursor-pointer"
        >
          <p className="font-[family-name:var(--font-display)] text-[32px] tracking-[2px] text-ticket mb-4">
            YOUR FOOD IS READY
          </p>
          <p className="font-[family-name:var(--font-body)] text-[16px] text-ticket/80 mb-2">
            {order.restaurantName}
          </p>
          <p className="font-[family-name:var(--font-body)] text-[14px] text-ticket/60">
            Pick up from {order.sellerName}
          </p>
          {order.pickupInstructions && (
            <p className="font-[family-name:var(--font-body)] text-[14px] text-ticket/80 mt-3">
              {order.pickupInstructions}
            </p>
          )}
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-ticket/40 mt-8">
            Tap anywhere to dismiss
          </p>
        </button>
      )}

      {/* Status change banner */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {showBanner && (
          <div className="bg-[#DDEFDD] border border-[#2D6A2D]/20 rounded-[6px] px-4 py-3 transition-opacity duration-300">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] font-semibold">
              {STEPS[currentIndex]?.label} -- {STEPS[currentIndex]?.description(order)}
            </p>
          </div>
        )}
      </div>

      {/* Vertical stepper */}
      <div className="relative pl-10" role="list" aria-label="Order progress">
        <div
          className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-divider"
          aria-hidden="true"
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div
              key={step.key}
              role="listitem"
              className="relative pb-6 last:pb-0"
            >
              <div
                className={`absolute left-[-28px] top-[2px] w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${
                  isCompleted
                    ? "bg-sidewalk border-sidewalk"
                    : isCurrent
                      ? "bg-ketchup border-ketchup animate-status-pulse"
                      : "bg-butcher-paper border-divider"
                }`}
                aria-hidden="true"
              >
                {isCompleted && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-checkmark-draw">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFFDF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full bg-ticket animate-pulse motion-reduce:animate-none" />
                )}
              </div>

              <div className={isCurrent ? "animate-slide-in-right" : ""}>
                <p
                  className={`font-[family-name:var(--font-display)] text-[16px] tracking-[1px] ${
                    isCompleted
                      ? "text-sidewalk"
                      : isCurrent
                        ? "text-ketchup"
                        : "text-sidewalk/50"
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`font-[family-name:var(--font-body)] text-[13px] mt-0.5 ${
                    isUpcoming ? "text-sidewalk/40" : "text-sidewalk"
                  }`}
                >
                  {step.description(order)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hand-off confirmation area — when ready */}
      {order.status === "ready" && (
        <div className="space-y-3">
          <div className="border-t border-dashed border-[#ddd4c4]" />

          {/* Elapsed time + countdown */}
          {order.readyAt && !readyExpired && (
            <div className="text-center">
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk" aria-live="off">
                Ready for {elapsedMinutes}:{String(elapsedSeconds).padStart(2, "0")}
              </p>
              {(() => {
                const remainingMs = READY_TIMEOUT_MS - elapsedSinceReady;
                if (remainingMs <= 0) return null;
                const remainMin = Math.floor(remainingMs / 60000);
                const remainSec = Math.floor((remainingMs % 60000) / 1000);
                return (
                  <p className={`font-[family-name:var(--font-mono)] text-[11px] mt-0.5 ${remainingMs < 120000 ? "text-ketchup" : "text-sidewalk"}`}>
                    Pick up within {remainMin}:{String(remainSec).padStart(2, "0")}
                  </p>
                );
              })()}
            </div>
          )}
          {readyExpired && (
            <div className="bg-[#FDECEA] border border-ketchup/20 rounded-[6px] px-3 py-2 text-center">
              <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold">
                Pickup window expired. Order is being cancelled.
              </p>
            </div>
          )}

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
                SELLER
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
                YOU
              </span>
            </div>
          </div>

          {/* Status text */}
          {sellerConfirmed && !buyerConfirmed && (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] text-center font-semibold">
              {order.sellerName} confirmed — tap to complete
            </p>
          )}
          {buyerConfirmed && !sellerConfirmed && (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center">
              Waiting for {order.sellerName} to confirm...
            </p>
          )}

          {/* Geofence feedback */}
          {geofenceChecked && geofence.status === "outside" && geofence.distanceMeters && (
            <div className="bg-[#FFF3D6] border border-[#8B6914]/20 rounded-[6px] px-3 py-2">
              <p className="font-[family-name:var(--font-body)] text-[12px] text-[#8B6914]">
                You appear to be {formatDistanceMeters(geofence.distanceMeters)} from {order.restaurantName}. Are you sure you&apos;re picking up?
              </p>
            </div>
          )}
          {geofenceChecked && (geofence.status === "denied" || geofence.status === "unavailable") && (
            <div className="bg-[#FFF3D6] border border-[#8B6914]/20 rounded-[6px] px-3 py-2">
              <p className="font-[family-name:var(--font-body)] text-[12px] text-[#8B6914]">
                We couldn&apos;t verify your location. By confirming, you&apos;re saying you received your food.
              </p>
            </div>
          )}

          {confirmError && (
            <div role="alert" className="bg-[#FDECEA] text-ketchup font-[family-name:var(--font-body)] text-[12px] px-3 py-2 rounded-[6px]">
              {confirmError}
            </div>
          )}

          {/* Confirm button */}
          {!buyerConfirmed && (
            <button
              type="button"
              onClick={handleConfirmHandoff}
              disabled={isConfirming || geofence.status === "checking"}
              className="w-full min-h-[48px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ketchup/50 disabled:opacity-60"
            >
              {geofence.status === "checking"
                ? "Checking location..."
                : isConfirming
                  ? "..."
                  : geofenceChecked && geofence.status === "outside"
                    ? "CONFIRM ANYWAY"
                    : "CONFIRM HAND-OFF"}
            </button>
          )}

          {/* Reminder prompt at 10 min */}
          {showReminder && !buyerConfirmed && elapsedSinceReady < READY_TIMEOUT_MS && (
            <div className="bg-[#FFF3D6] border border-[#8B6914]/20 rounded-[6px] px-3 py-2 text-center">
              <p className="font-[family-name:var(--font-body)] text-[12px] text-[#8B6914] font-semibold">
                Your order has been ready for {elapsedMinutes} min. Are you coming?
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[#ddd4c4]" />

      {/* Order summary */}
      <div>
        <h4 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-2">
          ORDER SUMMARY
        </h4>

        {/* Order ID and timestamp for completed orders */}
        {order.status === "completed" && (
          <div className="mb-3 space-y-1">
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk">
              {new Date(order.statusUpdatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              at{" "}
              {new Date(order.statusUpdatedAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {restaurant && (
              <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
                {restaurant.name} &middot; {restaurant.address}
              </p>
            )}
          </div>
        )}

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

        <div className="border-t border-dashed border-[#ddd4c4] my-3" />

        {/* Fee breakdown for completed orders */}
        {order.status === "completed" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Subtotal
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk">
                ${order.itemsSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Seller fee
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk">
                ${order.sellerFee.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Platform fee
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk">
                ${order.platformFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-dashed border-[#ddd4c4] my-2" />
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] text-chalkboard">
                TOTAL
              </span>
              <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ketchup">
                ${order.total.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] text-chalkboard">
                TOTAL
              </span>
              <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ketchup">
                ${order.total.toFixed(2)}
              </span>
            </div>

            <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk mt-1">
              {totalItems} {totalItems === 1 ? "item" : "items"} through {order.sellerName}
            </p>
          </>
        )}
      </div>

      {/* Chat panel — active orders */}
      {showChat && (
        <ChatPanel
          orderId={order.id}
          userId={userId}
          otherPartyName={order.sellerName}
        />
      )}

      {/* Review form and tip — when completed */}
      {order.status === "completed" && (
        <>
          <ReviewForm
            orderId={order.id}
            otherPartyName={order.sellerName}
            role="buyer"
          />
          {tipLoaded && (
            <TipPanel
              orderId={order.id}
              sellerName={order.sellerName}
              existingTip={existingTip}
            />
          )}
          <DisputeForm orderId={order.id} otherPartyName={order.sellerName} />
          <div className="border-t border-dashed border-[#ddd4c4] mt-3 pt-2" />
          <BlockReportButtons
            targetUserId={order.sellerId}
            targetName={order.sellerName}
            orderId={order.id}
          />
        </>
      )}

      {/* Block/report after cancelled orders too */}
      {order.status === "cancelled" && (
        <>
          {order.cancellationReason === "buyer_no_show" ? (
            <div className="bg-[#FDECEA] border border-ketchup/20 rounded-[6px] px-4 py-3 text-center space-y-1">
              <p className="font-[family-name:var(--font-body)] text-[14px] text-ketchup font-semibold">
                You didn&apos;t pick up in time
              </p>
              <p className="font-[family-name:var(--font-body)] text-[12px] text-ketchup/80">
                You were still charged ${order.total.toFixed(2)}.
              </p>
            </div>
          ) : order.cancellationReason === "seller_cancelled_post_accept" ? (
            <div className="bg-[#DDEFDD] border border-[#2D6A2D]/20 rounded-[6px] px-4 py-3 text-center space-y-1">
              <p className="font-[family-name:var(--font-body)] text-[14px] text-[#2D6A2D] font-semibold">
                Seller cancelled your order
              </p>
              <p className="font-[family-name:var(--font-body)] text-[12px] text-[#2D6A2D]/80">
                You won&apos;t be charged.
              </p>
            </div>
          ) : null}
          <div className="border-t border-dashed border-[#ddd4c4] mt-1 pt-2" />
          <BlockReportButtons
            targetUserId={order.sellerId}
            targetName={order.sellerName}
            orderId={order.id}
          />
        </>
      )}

      {/* Modify + Cancel buttons — only while pending */}
      {order.status === "pending" && (
        <>
          <div className="border-t border-dashed border-divider" />
          {onModify && (
            <button
              type="button"
              onClick={onModify}
              className="w-full min-h-[48px] py-3 px-6 bg-ticket border border-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-colors hover:bg-mustard hover:text-chalkboard focus:outline-none focus:ring-2 focus:ring-mustard/50"
            >
              MODIFY ORDER
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] py-3 px-6 bg-butcher-paper border border-ketchup text-ketchup font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-colors hover:bg-ketchup hover:text-ticket focus:outline-none focus:ring-2 focus:ring-ketchup/50"
          >
            CANCEL ORDER
          </button>
        </>
      )}
    </div>
  );
}
