"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Restaurant, SellerSession } from "@/lib/types";
import { goLive, endSession } from "@/app/(dashboard)/seller/actions";
import ConnectStripeButton from "./ConnectStripeButton";
import { WAIT_TIERS, getTierForMinutes, getExperienceTier, getScaledFeeCap, type WaitTier } from "@/lib/fee-tiers";
import {
  useGeofence,
  getCurrentPosition,
  formatDistanceMeters,
  isLikelyDesktop,
} from "@/lib/use-geofence";
import { getDistanceMiles, formatDistance } from "@/lib/geo";

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

/** Max distance (miles) to consider a restaurant "nearby". */
const NEARBY_RADIUS_MILES = 1.0;

interface RestaurantWithDistance extends Restaurant {
  distanceMiles: number | null;
}

type ProximityStatus = "loading" | "ready" | "unavailable";

function useNearbyRestaurants(restaurants: Restaurant[]) {
  const geolocationAvailable =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const [status, setStatus] = useState<ProximityStatus>(
    () => (!geolocationAvailable || restaurants.length === 0) ? "unavailable" : "loading"
  );
  const [sorted, setSorted] = useState<RestaurantWithDistance[]>(
    () => restaurants.map((r) => ({ ...r, distanceMiles: null }))
  );

  useEffect(() => {
    if (!geolocationAvailable || restaurants.length === 0) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const withDistance = restaurants.map((r) => ({
          ...r,
          distanceMiles: getDistanceMiles(latitude, longitude, r.lat, r.lng),
        }));
        // Sort by distance ascending
        withDistance.sort((a, b) => a.distanceMiles - b.distanceMiles);
        setSorted(withDistance);
        setStatus("ready");
      },
      () => {
        // Permission denied or error — show all, no distances
        setStatus("unavailable");
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 }
    );
  }, [restaurants, geolocationAvailable]);

  const nearby = status === "ready"
    ? sorted.filter((r) => r.distanceMiles !== null && r.distanceMiles <= NEARBY_RADIUS_MILES)
    : sorted;
  const other = status === "ready"
    ? sorted.filter((r) => r.distanceMiles !== null && r.distanceMiles > NEARBY_RADIUS_MILES)
    : [];

  // The closest restaurant ID, available once proximity resolves
  const closestId = status === "ready" && nearby.length > 0
    ? nearby[0].id
    : null;

  return { status, nearby, other, closestId };
}

interface GoLivePanelProps {
  restaurants: Restaurant[];
  activeSession: SellerSession | null;
  stripeConnectStatus?: "not_connected" | "pending" | "active" | "restricted";
  kycStatus?: "none" | "pending" | "approved" | "declined";
  suggestedWaitMinutes?: number | null;
  completedDeliveries?: number;
  openStatus?: Record<string, boolean | null>;
}

function RestaurantOption({
  restaurant,
  selected,
  onSelect,
  showDistance,
}: {
  restaurant: RestaurantWithDistance;
  selected: boolean;
  onSelect: () => void;
  showDistance: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full text-left px-4 min-h-[48px] rounded-[6px] font-[family-name:var(--font-body)] text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-mustard/50 flex items-center justify-between ${
        selected
          ? "bg-[#FFF3D6] border-2 border-mustard text-chalkboard"
          : "bg-butcher-paper border border-[#ddd4c4] text-sidewalk hover:border-mustard"
      }`}
    >
      <span>
        <span className="font-semibold">{restaurant.name}</span>
        <span className="text-[12px] text-sidewalk ml-2">
          {restaurant.address}
        </span>
      </span>
      {showDistance && restaurant.distanceMiles !== null && (
        <span className="text-[11px] text-sidewalk font-[family-name:var(--font-mono)] whitespace-nowrap ml-3">
          {formatDistance(restaurant.distanceMiles)}
        </span>
      )}
    </button>
  );
}

export default function GoLivePanel({
  restaurants,
  activeSession: initialSession,
  stripeConnectStatus = "not_connected",
  kycStatus = "none",
  suggestedWaitMinutes = null,
  completedDeliveries = 0,
  openStatus,
}: GoLivePanelProps) {
  const experienceTier = getExperienceTier(completedDeliveries);
  const proximity = useNearbyRestaurants(restaurants);
  const [selectedRestaurant, setSelectedRestaurant] = useState(
    restaurants[0]?.id ?? ""
  );
  const [showAllRestaurants, setShowAllRestaurants] = useState(false);
  const [activeSession, setActiveSession] = useState(initialSession);
  const elapsed = useElapsedTime(activeSession?.startedAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedTier, setSelectedTier] = useState<WaitTier | null>(
    suggestedWaitMinutes ? getTierForMinutes(suggestedWaitMinutes) : null
  );
  const [fee, setFee] = useState("5.00");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const router = useRouter();

  // Auto-select closest restaurant when proximity resolves.
  // The closestId changes from null → an ID exactly once when geolocation
  // succeeds. We track the last value we acted on to detect the transition.
  const [lastAppliedClosest, setLastAppliedClosest] = useState<string | null>(null);
  if (proximity.closestId && proximity.closestId !== lastAppliedClosest) {
    setLastAppliedClosest(proximity.closestId);
    setSelectedRestaurant(proximity.closestId);
  }

  function handleSelectTier(tier: WaitTier) {
    setSelectedTier(tier);
    const scaledCap = getScaledFeeCap(tier.representativeMinutes, completedDeliveries);
    const currentFee = parseFloat(fee);
    if (!isNaN(currentFee) && currentFee > scaledCap) {
      setFee(scaledCap.toFixed(2));
    }
  }

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

  // Check if the selected restaurant is closed
  const selectedRestaurantClosed = openStatus?.[selectedRestaurant] === false;

  // Button is disabled while:
  // - a server transition is in flight
  // - no restaurant is selected
  // - geolocation is actively checking
  // - the seller is confirmed outside the geofence
  // - the selected restaurant is closed
  const canGoLive =
    !isPending &&
    !!selectedRestaurant &&
    !!selectedTier &&
    geofence.status !== "checking" &&
    geofence.status !== "outside" &&
    !selectedRestaurantClosed;

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

      const feeCents = Math.round(parseFloat(fee) * 100);
      const result = await goLive(selectedRestaurant, coords, {
        estimatedWaitMinutes: selectedTier!.representativeMinutes,
        sellerFeeCents: feeCents,
        pickupInstructions: pickupInstructions.trim() || undefined,
      });

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

  function handleEndSession(status: "completed" | "cancelled", force: boolean = false) {
    if (!activeSession) return;
    setError(null);

    // Session status update is persisted via the server action. The
    // Supabase Realtime UPDATE event on seller_sessions automatically
    // notifies buyers that this seller has gone offline — no manual
    // BroadcastChannel publish is needed.
    startTransition(async () => {
      const result = await endSession(activeSession.id, status, force);
      if (result.error) {
        setError(result.error);
      } else if ("windingDown" in result && result.windingDown) {
        // Session transitioned to winding_down — update local state
        setActiveSession({ ...activeSession, status: "winding_down" });
      } else {
        setActiveSession(null);
      }
    });
  }

  const activeRestaurant = activeSession
    ? restaurants.find((r) => r.id === activeSession.restaurantId)
    : null;

  const isWindingDown = activeSession?.status === "winding_down";

  if (activeSession) {
    return (
      <section
        aria-label={isWindingDown ? "Winding down session" : "Live session"}
        className={`bg-ticket rounded-[10px] p-6 border-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
          isWindingDown ? "border-mustard" : "border-[#2D6A2D]"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-block w-2 h-2 rounded-full animate-pulse motion-reduce:animate-none ${
              isWindingDown ? "bg-mustard" : "bg-[#2D6A2D]"
            }`}
            aria-hidden="true"
          />
          <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard">
            {isWindingDown ? "WINDING DOWN" : "YOU\u0027RE LIVE"}
          </h2>
        </div>
        {isWindingDown && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-3">
            Finishing current orders. No new orders will come in.
          </p>
        )}
        <p className="font-[family-name:var(--font-body)] text-[15px] text-chalkboard mb-1">
          {activeRestaurant?.name ?? "Unknown restaurant"}
        </p>
        <p
          className="font-[family-name:var(--font-mono)] text-[28px] tracking-[2px] text-chalkboard mb-3"
          aria-label={`Session elapsed time: ${elapsed}`}
          aria-live="off"
        >
          {elapsed}
        </p>
        {(activeSession.estimatedWaitMinutes || activeSession.sellerFeeCents) && (
          <div className="flex gap-4 mb-3 font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
            {activeSession.estimatedWaitMinutes && (
              <span>Est. wait: ~{activeSession.estimatedWaitMinutes} min</span>
            )}
            {activeSession.sellerFeeCents && (
              <span>Your fee: ${(activeSession.sellerFeeCents / 100).toFixed(2)}</span>
            )}
          </div>
        )}
        {activeSession.pickupInstructions && (
          <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk mb-5">
            Pickup: {activeSession.pickupInstructions}
          </p>
        )}

        {error && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mb-3" role="alert">
            {error}
          </p>
        )}

        {isWindingDown ? (
          <button
            type="button"
            onClick={() => handleEndSession("completed", true)}
            disabled={isPending}
            aria-label="Force end session immediately"
            className="w-full min-h-[48px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-ketchup/90 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ketchup/50"
          >
            {isPending ? "ENDING..." : "FORCE END"}
          </button>
        ) : (
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
              className="px-4 min-h-[48px] bg-butcher-paper text-sidewalk border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[14px] rounded-[6px] hover:border-ketchup hover:text-ketchup transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ketchup/50"
            >
              CANCEL
            </button>
          </div>
        )}
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

      {/* KYC verification gate */}
      {stripeConnectStatus === "active" && kycStatus !== "approved" && (
        <div className="mb-5">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-3">
            {kycStatus === "pending"
              ? "Your identity verification is in progress. You'll be able to go live once it's approved."
              : kycStatus === "declined"
                ? "Your identity verification was declined. Please try again from your profile."
                : "Before you can go live, verify your identity. This is required for all sellers."}
          </p>
          <a
            href="/profile"
            className="inline-flex items-center min-h-[44px] px-6 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] tracking-[1px] transition-colors hover:bg-ketchup/90"
          >
            {kycStatus === "pending" ? "CHECK STATUS" : kycStatus === "declined" ? "TRY AGAIN" : "VERIFY IDENTITY"}
          </a>
        </div>
      )}

      {/* Restaurant selector — only show when Stripe is active and KYC approved */}
      {stripeConnectStatus === "active" && kycStatus === "approved" && (
        <>
          <fieldset className="mb-4 border-none p-0 m-0">
            <legend className="block font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-2">
              {proximity.status === "loading" ? "FINDING NEARBY..." : "SELECT RESTAURANT"}
            </legend>
            <div className="space-y-2" role="radiogroup">
              {proximity.status === "loading" && (
                <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-sidewalk font-[family-name:var(--font-body)]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sidewalk/30 border-t-sidewalk" />
                  Checking your location...
                </div>
              )}
              {proximity.status !== "loading" && proximity.nearby.map((r) => (
                <RestaurantOption
                  key={r.id}
                  restaurant={r}
                  selected={selectedRestaurant === r.id}
                  onSelect={() => setSelectedRestaurant(r.id)}
                  showDistance={proximity.status === "ready"}
                />
              ))}
              {proximity.status === "ready" && proximity.nearby.length === 0 && (
                <p className="px-4 py-3 text-[13px] text-sidewalk font-[family-name:var(--font-body)]">
                  No restaurants within walking distance. Showing all locations.
                </p>
              )}
              {proximity.other.length > 0 && (
                <>
                  {!showAllRestaurants && proximity.nearby.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllRestaurants(true)}
                      className="w-full text-center py-2 text-[12px] font-medium text-sidewalk hover:text-chalkboard transition-colors font-[family-name:var(--font-body)] cursor-pointer"
                    >
                      + {proximity.other.length} more location{proximity.other.length !== 1 ? "s" : ""}
                    </button>
                  ) : (
                    proximity.other.map((r) => (
                      <RestaurantOption
                        key={r.id}
                        restaurant={r}
                        selected={selectedRestaurant === r.id}
                        onSelect={() => setSelectedRestaurant(r.id)}
                        showDistance={proximity.status === "ready"}
                      />
                    ))
                  )}
                </>
              )}
              {/* When no nearby found, auto-expand all */}
              {proximity.status === "ready" && proximity.nearby.length === 0 && proximity.other.map((r) => (
                <RestaurantOption
                  key={r.id}
                  restaurant={r}
                  selected={selectedRestaurant === r.id}
                  onSelect={() => setSelectedRestaurant(r.id)}
                  showDistance
                />
              ))}
            </div>
          </fieldset>

          {/* Wait estimate picker */}
          <fieldset className="mb-4 border-none p-0 m-0">
            <legend className="block font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-2">
              ESTIMATED WAIT
            </legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {WAIT_TIERS.map((tier) => (
                <button
                  key={tier.representativeMinutes}
                  type="button"
                  role="radio"
                  aria-checked={selectedTier?.representativeMinutes === tier.representativeMinutes}
                  onClick={() => handleSelectTier(tier)}
                  className={`text-center px-2 py-3 rounded-[6px] font-[family-name:var(--font-body)] transition-colors focus:outline-none focus:ring-2 focus:ring-mustard/50 ${
                    selectedTier?.representativeMinutes === tier.representativeMinutes
                      ? "bg-[#FFF3D6] border-2 border-mustard text-chalkboard"
                      : "bg-butcher-paper border border-[#ddd4c4] text-sidewalk hover:border-mustard"
                  }`}
                >
                  <span className="block text-[14px] font-semibold">{tier.label}</span>
                  <span className="block text-[11px] mt-0.5">{tier.description}</span>
                  <span className="block text-[10px] mt-1 font-[family-name:var(--font-mono)] tracking-[1px]">
                    up to ${getScaledFeeCap(tier.representativeMinutes, completedDeliveries).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

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
              max={selectedTier ? getScaledFeeCap(selectedTier.representativeMinutes, completedDeliveries) : 10}
              step="0.50"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="w-full min-h-[48px] px-4 bg-butcher-paper rounded-[6px] border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[14px] text-chalkboard focus:outline-none focus:border-mustard focus:ring-2 focus:ring-mustard/50 transition-colors"
            />
            {selectedTier && (
              <>
                <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk mt-1">
                  Max ${getScaledFeeCap(selectedTier.representativeMinutes, completedDeliveries).toFixed(2)} for this wait
                </p>
                {experienceTier.feeCapMultiplier < 1 && (
                  <p className="font-[family-name:var(--font-body)] text-[11px] text-mustard mt-1">
                    {completedDeliveries === 0
                      ? "Complete your first delivery to unlock higher fees!"
                      : `${3 - completedDeliveries} more ${3 - completedDeliveries === 1 ? "delivery" : "deliveries"} to unlock full earning potential!`}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Restaurant closed warning */}
          {selectedRestaurantClosed && (
            <div className="mb-4 px-4 py-3 bg-[#FBE9E7] border border-[#f0b0aa] rounded-[6px]">
              <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold">
                {selectedRestaurantObj?.name ?? "This restaurant"} appears to be closed right now.
              </p>
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mt-1">
                You can&apos;t go live at a closed restaurant.
              </p>
            </div>
          )}

          {/* Pickup location */}
          <div className="mb-4">
            <label
              htmlFor="pickup-instructions"
              className="block font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-2"
            >
              PICKUP LOCATION
            </label>
            <textarea
              id="pickup-instructions"
              maxLength={200}
              rows={2}
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              placeholder="e.g. Meet outside front door"
              className="w-full px-4 py-3 bg-butcher-paper rounded-[6px] border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50 focus:outline-none focus:border-mustard focus:ring-2 focus:ring-mustard/50 transition-colors resize-none"
            />
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk mt-1">
              {pickupInstructions.length}/200 — Tell buyers where to find you
            </p>
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
                className="inline-block w-2 h-2 rounded-full bg-mustard animate-pulse motion-reduce:animate-none flex-shrink-0"
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
            className="w-full min-h-[48px] bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#d4a843] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-mustard/50"
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
              className="w-full mt-2 min-h-[44px] bg-transparent text-sidewalk font-[family-name:var(--font-body)] text-[13px] underline underline-offset-2 hover:text-chalkboard transition-colors focus:outline-none focus:ring-2 focus:ring-chalkboard/30 rounded-[6px]"
            >
              Try location check again
            </button>
          )}
        </>
      )}
    </section>
  );
}
