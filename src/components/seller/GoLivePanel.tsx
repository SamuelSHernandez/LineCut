"use client";

import { useState, useEffect, useTransition } from "react";
import type { Restaurant, SellerSession } from "@/lib/types";
import { goLive, endSession } from "@/app/(dashboard)/seller/actions";

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
}

export default function GoLivePanel({
  restaurants,
  activeSession: initialSession,
}: GoLivePanelProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState(
    restaurants[0]?.id ?? ""
  );
  const [activeSession, setActiveSession] = useState(initialSession);
  const elapsed = useElapsedTime(activeSession?.startedAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGoLive() {
    setError(null);
    startTransition(async () => {
      const result = await goLive(selectedRestaurant);
      if (result.error) {
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
      <div className="bg-ticket rounded-[10px] p-6 border-2 border-[#2D6A2D] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#2D6A2D] animate-pulse" />
          <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px]">
            YOU&apos;RE LIVE
          </h2>
        </div>
        <p className="font-[family-name:var(--font-body)] text-[15px] text-chalkboard mb-1">
          {activeRestaurant?.name ?? "Unknown restaurant"}
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[28px] tracking-[2px] text-chalkboard mb-5">
          {elapsed}
        </p>

        {error && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mb-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleEndSession("completed")}
            disabled={isPending}
            className="flex-1 py-3 bg-[#2D6A2D] text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#245a24] transition-colors disabled:opacity-50"
          >
            {isPending ? "ENDING..." : "END SESSION"}
          </button>
          <button
            type="button"
            onClick={() => handleEndSession("cancelled")}
            disabled={isPending}
            className="px-4 py-3 bg-butcher-paper text-sidewalk border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[14px] rounded-[6px] hover:border-ketchup hover:text-ketchup transition-colors disabled:opacity-50"
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ticket rounded-[10px] p-6 border-2 border-mustard shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-2">
        GO LIVE
      </h2>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-5">
        Already in line? Let nearby buyers know you can order for them.
      </p>

      {/* Restaurant selector */}
      <div className="mb-4">
        <label className="block font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-2">
          SELECT RESTAURANT
        </label>
        <div className="space-y-2">
          {restaurants.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRestaurant(r.id)}
              className={`w-full text-left px-4 py-3 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] transition-colors ${
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
      </div>

      {error && (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mb-3">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoLive}
        disabled={isPending || !selectedRestaurant}
        className="w-full py-3 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:bg-[#d4a843] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "GOING LIVE..." : "I'M IN LINE"}
      </button>
    </div>
  );
}
