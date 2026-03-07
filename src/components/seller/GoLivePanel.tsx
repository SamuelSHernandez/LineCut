"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Restaurant, SellerSession } from "@/lib/types";
import { goLive, endSession } from "@/app/(dashboard)/seller/actions";
import { useProfile } from "@/lib/profile-context";
import { sellerBus } from "@/lib/order-bus";
import ConnectStripeButton from "./ConnectStripeButton";

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function useElapsedTime(startedAt: string | null): string {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startedAt) return;

    function update() {
      const diff = Math.floor(
        (Date.now() - new Date(startedAt!).getTime()) / 1000
      );
      setElapsed(formatElapsed(Math.max(0, diff)));
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}

interface GoLivePanelProps {
  restaurants: Restaurant[];
  activeSession: SellerSession | null;
  stripeConnectStatus?: "not_connected" | "pending" | "active" | "restricted";
}

export default function GoLivePanel({
  restaurants,
  activeSession: initialSession,
  stripeConnectStatus = "not_connected",
}: GoLivePanelProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState(
    restaurants[0]?.id ?? ""
  );
  const [activeSession, setActiveSession] = useState(initialSession);
  const elapsed = useElapsedTime(activeSession?.startedAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [positionInLine, setPositionInLine] = useState("1");
  const [fee, setFee] = useState("5.00");
  const router = useRouter();
  const profile = useProfile();

  // Broadcast seller-online when we have an active session (including after page reload)
  useEffect(() => {
    if (!activeSession) return;

    const sellerData = {
      id: profile.id,
      restaurantId: activeSession.restaurantId,
      firstName: profile.displayName.split(" ")[0],
      lastInitial: profile.displayName.split(" ")[1]?.[0] ?? "",
      positionInLine: parseInt(positionInLine, 10) || 1,
      waitEstimate: `~${(parseInt(positionInLine, 10) || 1) * 4} min`,
      trustScore: profile.trustScore,
      completedOrders: 0,
      fee: parseFloat(fee) || 5.0,
      menuFlexibility: "full" as const,
      status: "available" as const,
      joinedAt: activeSession.startedAt,
    };

    sellerBus.publish({
      type: "seller-online",
      seller: sellerData,
      restaurantId: activeSession.restaurantId,
      sessionId: activeSession.id,
    });

    // Respond to roll calls while live
    const unsubscribe = sellerBus.subscribe((message) => {
      if (message.type === "seller-roll-call") {
        sellerBus.publish({
          type: "seller-online",
          seller: sellerData,
          restaurantId: activeSession.restaurantId,
          sessionId: activeSession.id,
        });
      }
    });

    return unsubscribe;
    // Only re-run when session changes — not on every profile/fee/position change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  function handleGoLive() {
    setError(null);
    startTransition(async () => {
      const result = await goLive(selectedRestaurant);
      if (result.error === "billing_gate" && "redirectUrl" in result) {
        router.push(result.redirectUrl as string);
      } else if (result.error) {
        setError(result.error);
      } else {
        // Reload to get fresh session from server
        window.location.reload();
      }
    });
  }

  function handleEndSession(status: "completed" | "cancelled") {
    if (!activeSession) return;
    setError(null);

    // Broadcast seller-offline before ending
    sellerBus.publish({
      type: "seller-offline",
      sellerId: profile.id,
      restaurantId: activeSession.restaurantId,
    });

    startTransition(async () => {
      const result = await endSession(activeSession.id, status);
      if (result.error) {
        setError(result.error);
      } else {
        setActiveSession(null);
      }
    });
  }

  const activeRestaurant = activeSession
    ? restaurants.find((r) => r.id === activeSession.restaurantId)
    : null;

  if (activeSession) {
    return (
      <section
        aria-label="Live session"
        className="bg-ticket rounded-[10px] p-6 border-2 border-[#2D6A2D] shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#2D6A2D] animate-pulse" aria-hidden="true" />
          <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard">
            YOU&apos;RE LIVE
          </h2>
        </div>
        <p className="font-[family-name:var(--font-body)] text-[15px] text-chalkboard mb-1">
          {activeRestaurant?.name ?? "Unknown restaurant"}
        </p>
        <p
          className="font-[family-name:var(--font-mono)] text-[28px] tracking-[2px] text-chalkboard mb-5"
          aria-label={`Session elapsed time: ${elapsed}`}
          aria-live="off"
        >
          {elapsed}
        </p>

        {error && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mb-3" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleEndSession("completed")}
            disabled={isPending}
            aria-label="End live session"
            className="flex-1 min-h-[48px] bg-[#2D6A2D] text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#245a24] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2D6A2D]/30"
          >
            {isPending ? "ENDING..." : "END SESSION"}
          </button>
          <button
            type="button"
            onClick={() => handleEndSession("cancelled")}
            disabled={isPending}
            aria-label="Cancel live session"
            className="px-4 min-h-[48px] bg-butcher-paper text-sidewalk border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[14px] rounded-[6px] hover:border-ketchup hover:text-ketchup transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ketchup/20"
          >
            CANCEL
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Go live"
      className="bg-ticket rounded-[10px] p-6 border-2 border-mustard shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard mb-2">
        GO LIVE
      </h2>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-5">
        Already in line? Let nearby buyers know you can order for them.
      </p>

      {/* Stripe onboarding gate */}
      {stripeConnectStatus !== "active" && (
        <div className="mb-5">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-3">
            Before you can go live, set up payouts so you get paid for orders.
          </p>
          <ConnectStripeButton status={stripeConnectStatus} />
        </div>
      )}

      {/* Restaurant selector — only show when Stripe is active */}
      {stripeConnectStatus === "active" && (
        <>
          <fieldset className="mb-4 border-none p-0 m-0">
            <legend className="block font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-2">
              SELECT RESTAURANT
            </legend>
            <div className="space-y-2" role="radiogroup">
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedRestaurant === r.id}
                  onClick={() => setSelectedRestaurant(r.id)}
                  className={`w-full text-left px-4 min-h-[48px] rounded-[6px] font-[family-name:var(--font-body)] text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-mustard/30 ${
                    selectedRestaurant === r.id
                      ? "bg-[#FFF3D6] border-2 border-mustard text-chalkboard"
                      : "bg-butcher-paper border border-[#ddd4c4] text-sidewalk hover:border-mustard"
                  }`}
                >
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-[12px] text-sidewalk ml-2">
                    {r.address}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Position in line */}
          <div className="mb-4">
            <label
              htmlFor="position-in-line"
              className="block font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-2"
            >
              YOUR SPOT IN LINE
            </label>
            <input
              id="position-in-line"
              type="number"
              min="1"
              max="99"
              value={positionInLine}
              onChange={(e) => setPositionInLine(e.target.value)}
              className="w-full min-h-[48px] px-4 bg-butcher-paper rounded-[6px] border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[14px] text-chalkboard focus:outline-none focus:border-mustard focus:ring-2 focus:ring-mustard/20 transition-colors"
            />
          </div>

          {/* Fee */}
          <div className="mb-4">
            <label
              htmlFor="seller-fee"
              className="block font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-2"
            >
              YOUR FEE ($)
            </label>
            <input
              id="seller-fee"
              type="number"
              min="1"
              max="20"
              step="0.50"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="w-full min-h-[48px] px-4 bg-butcher-paper rounded-[6px] border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[14px] text-chalkboard focus:outline-none focus:border-mustard focus:ring-2 focus:ring-mustard/20 transition-colors"
            />
          </div>

          {error && (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mb-3" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoLive}
            disabled={isPending || !selectedRestaurant}
            className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#d4a843] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-mustard/30"
          >
            {isPending ? "GOING LIVE..." : "I'M IN LINE"}
          </button>
        </>
      )}
    </section>
  );
}
