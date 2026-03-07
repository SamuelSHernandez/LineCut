"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Restaurant, SellerSession } from "@/lib/types";
import { goLive, endSession } from "@/app/(dashboard)/seller/actions";
import ConnectStripeButton from "./ConnectStripeButton";
import {
  useGeofence,
  getCurrentPosition,
  formatDistanceMeters,
  isLikelyDesktop,
} from "@/lib/use-geofence";

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

  // Resolve the currently selected restaurant object for geofence targeting
  const selectedRestaurantObj = restaurants.find(
    (r) => r.id === selectedRestaurant
  ) ?? restaurants[0];

  const geofence = useGeofence({
    lat: selectedRestaurantObj?.lat ?? 0,
    lng: selectedRestaurantObj?.lng ?? 0,
    radiusMeters: 150,
  });

  const onDesktop = isLikelyDesktop();

  // Button is disabled while:
  // - a server transition is in flight
  // - no restaurant is selected
  // - geolocation is actively checking
  // - the seller is confirmed outside the geofence
  const canGoLive =
    !isPending &&
    !!selectedRestaurant &&
    geofence.status !== "checking" &&
    geofence.status !== "outside";

  // Derive button label from current state
  function getButtonLabel(): string {
    if (isPending) return "GOING LIVE...";
    if (geofence.status === "checking") return "CHECKING LOCATION...";
    if (geofence.status === "idle") return "CHECK LOCATION";
    return "I'M IN LINE";
  }

  function handleGoLive() {
    setError(null);

    // Phase 1 — location not yet checked: trigger a check and wait for result.
    // The button label changes to guide the seller through the two-step flow.
    if (geofence.status === "idle") {
      geofence.check();
      return;
    }

    // Phase 2 — confirmed outside: block and show distance.
    if (geofence.status === "outside") {
      // Error is already set in geofence.error; nothing extra needed.
      return;
    }

    // Phase 2 — confirmed inside (or location unavailable/denied — server validates):
    // do a final fresh position read, pass coords to the server action transiently,
    // then discard. Coordinates are never assigned to state.
    startTransition(async () => {
      let coords: { lat: number; lng: number } | undefined;

      if (geofence.status === "inside") {
        try {
          // Fresh position read — coordinates are ephemeral local variables only.
          // They flow directly into the server action and are then discarded.
          // Never stored in state, never logged, never sent to any external service.
          const position = await getCurrentPosition();
          coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch {
          // If the second check fails, proceed without coords.
          // The server will skip its proximity validation for this call.
          coords = undefined;
        }
      }

      const result = await goLive(selectedRestaurant, coords);

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

    // Session status update is persisted via the server action. The
    // Supabase Realtime UPDATE event on seller_sessions automatically
    // notifies buyers that this seller has gone offline — no manual
    // BroadcastChannel publish is needed.
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

          {/* Desktop degraded experience notice — shown before first check */}
          {onDesktop && geofence.status === "idle" && (
            <div className="mb-4 px-4 py-3 bg-butcher-paper border border-[#ddd4c4] rounded-[6px]">
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Location works best on mobile. Desktop GPS may be limited.
              </p>
            </div>
          )}

          {/* Geolocation in progress */}
          {geofence.status === "checking" && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 px-4 py-3 bg-butcher-paper border border-[#ddd4c4] rounded-[6px] flex items-center gap-2"
            >
              <span
                className="inline-block w-2 h-2 rounded-full bg-mustard animate-pulse flex-shrink-0"
                aria-hidden="true"
              />
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Checking your location...
              </p>
            </div>
          )}

          {/* Confirmed inside */}
          {geofence.status === "inside" && (
            <div className="mb-4 px-4 py-3 bg-[#DDEFDD] border border-[#b4d9b4] rounded-[6px] flex items-start gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full bg-[#2D6A2D] mt-[3px] flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] font-semibold">
                  You&apos;re at {selectedRestaurantObj?.name ?? "the restaurant"}.
                </p>
                {geofence.distanceMeters !== null && (
                  <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-[#2D6A2D] mt-0.5">
                    {formatDistanceMeters(geofence.distanceMeters).toUpperCase()} AWAY
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Confirmed outside */}
          {geofence.status === "outside" && (
            <div className="mb-4 px-4 py-3 bg-[#FBE9E7] border border-[#f0b0aa] rounded-[6px]">
              <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold">
                You need to be at {selectedRestaurantObj?.name ?? "the restaurant"}.
              </p>
              {geofence.distanceMeters !== null && (
                <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-ketchup mt-1">
                  YOU ARE {formatDistanceMeters(geofence.distanceMeters).toUpperCase()} AWAY
                </p>
              )}
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mt-1">
                Move closer and try again.
              </p>
            </div>
          )}

          {/* Location permission denied */}
          {geofence.status === "denied" && (
            <div className="mb-4 px-4 py-3 bg-[#FBE9E7] border border-[#f0b0aa] rounded-[6px]">
              <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold mb-1">
                Location access denied.
              </p>
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Enable location in your browser settings and try again. Need help? Contact support for manual verification.
              </p>
            </div>
          )}

          {/* Location unavailable */}
          {geofence.status === "unavailable" && (
            <div className="mb-4 px-4 py-3 bg-butcher-paper border border-[#ddd4c4] rounded-[6px]">
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                {geofence.error ?? "Couldn't get your location. Make sure location services are on."}
              </p>
            </div>
          )}

          {/* Server-action error */}
          {error && (
            <p
              role="alert"
              className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mb-3"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoLive}
            disabled={!canGoLive}
            aria-busy={geofence.status === "checking" || isPending}
            className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#d4a843] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-mustard/30"
          >
            {getButtonLabel()}
          </button>

          {/* Retry after a failed or out-of-range check */}
          {(geofence.status === "outside" ||
            geofence.status === "denied" ||
            geofence.status === "unavailable") && (
            <button
              type="button"
              onClick={() => geofence.check()}
              className="w-full mt-2 min-h-[44px] bg-transparent text-sidewalk font-[family-name:var(--font-body)] text-[13px] underline underline-offset-2 hover:text-chalkboard transition-colors focus:outline-none"
            >
              Try location check again
            </button>
          )}
        </>
      )}
    </section>
  );
}
