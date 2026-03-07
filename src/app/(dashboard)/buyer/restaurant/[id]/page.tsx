import { notFound } from "next/navigation";
import Link from "next/link";
import { restaurants } from "@/lib/restaurants";
import { getSellersByRestaurant } from "@/lib/sellers";
import { getMenuItemsByRestaurant } from "@/lib/menu-items";
import SellerList from "@/components/buyer/SellerList";
import EmptyState from "@/components/EmptyState";

interface RestaurantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RestaurantDetailPage({
  params,
}: RestaurantDetailPageProps) {
  const { id } = await params;
  const restaurant = restaurants.find((r) => r.id === id);

  if (!restaurant) {
    notFound();
  }

  const sellers = getSellersByRestaurant(id);
  const menuItems = getMenuItemsByRestaurant(id);

  // Compute stats from sellers
  const availableSellers = sellers.filter((s) => s.status === "available");
  const waitEstimates = availableSellers.map((s) => s.waitEstimate);
  const fees = availableSellers.map((s) => s.fee);

  const waitRange =
    waitEstimates.length > 1
      ? `${waitEstimates[0]} -- ${waitEstimates[waitEstimates.length - 1]}`
      : waitEstimates[0] ?? "N/A";

  const feeRange =
    fees.length > 1
      ? `$${Math.min(...fees).toFixed(2)} -- $${Math.max(...fees).toFixed(2)}`
      : fees.length === 1
        ? `$${fees[0].toFixed(2)}`
        : "N/A";

  return (
    <div className="space-y-8">
      {/* Back Navigation */}
      <Link
        href="/buyer"
        className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk hover:text-chalkboard transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 2L4 7L9 12" />
        </svg>
        BACK TO RESTAURANTS
      </Link>

      {/* Restaurant Header Card */}
      <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <h1 className="font-[family-name:var(--font-display)] text-[32px] tracking-[2px] leading-none mb-1">
          {restaurant.name}
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-3">
          {restaurant.address}
        </p>

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

        {/* Stats row */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#DDEFDD] font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] text-[#2D6A2D]">
            {availableSellers.length} IN LINE
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk">
            {waitRange}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk">
            {feeRange}
          </span>
        </div>
      </div>

      {/* Who's In Line */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-1">
          WHO&apos;S IN LINE
        </h2>
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
          Tap a seller to start your order.
        </p>

        {sellers.length > 0 ? (
          <SellerList
            sellers={sellers}
            menuItems={menuItems}
            restaurantName={restaurant.name}
          />
        ) : (
          <div className="bg-ticket rounded-[10px] border border-[#eee6d8]">
            <EmptyState message="Nobody's in line right now. Check back at lunch." />
          </div>
        )}
      </div>

      {/* Your Orders */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-3">
          YOUR ORDERS
        </h2>
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8]">
          <EmptyState message="No orders yet. Pick someone above and place your first order." />
        </div>
      </div>
    </div>
  );
}
