import Link from "next/link";
import type { Restaurant, WaitTimeStats } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  distance: string | null;
  waitStats?: WaitTimeStats;
}

export default function RestaurantCard({
  restaurant,
  distance,
  waitStats,
}: RestaurantCardProps) {
  return (
    <Link
      href={`/buyer/restaurant/${restaurant.id}`}
      className="block w-full text-left bg-ticket rounded-[10px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#eee6d8] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:scale-[1.01]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] leading-tight">
          {restaurant.name}
        </h3>
      </div>

      {/* Address + Distance */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
          {restaurant.address}
        </span>
        {distance && (
          <>
            <span className="text-[#ddd4c4]">|</span>
            <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk">
              {distance}
            </span>
          </>
        )}
      </div>

      {/* Cuisine pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {restaurant.cuisine.map((c) => (
          <span
            key={c}
            className="px-3 py-1 rounded-full bg-butcher-paper border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[12px] text-sidewalk"
          >
            {c}
          </span>
        ))}
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[#ddd4c4] my-3" />

      {/* Seller info */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#DDEFDD] font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] text-[#2D6A2D]">
          {waitStats ? waitStats.activeSellers : (restaurant.activeSellers ?? 0)} IN LINE
        </span>
        <div className="text-right">
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk">
            {waitStats && waitStats.reportCount >= 1
              ? `~${waitStats.avgWaitMinutes} min`
              : restaurant.waitEstimate}
          </span>
          {waitStats && waitStats.reportCount >= 3 && (
            <p className="font-[family-name:var(--font-body)] text-[10px] text-sidewalk mt-0.5">
              Based on {waitStats.reportCount} reports
            </p>
          )}
          {waitStats && waitStats.reportCount >= 1 && waitStats.reportCount < 3 && (
            <p className="font-[family-name:var(--font-body)] text-[10px] text-sidewalk mt-0.5">
              Limited data
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
