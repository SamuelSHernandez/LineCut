import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import RestaurantBrowser from "@/components/buyer/RestaurantBrowser";
import BuyerOrdersSection from "@/components/buyer/BuyerOrdersSection";
import PullToRefreshWrapper from "@/components/shared/PullToRefreshWrapper";
import { fetchRestaurants } from "@/lib/restaurants";
import { getWaitTimeStats } from "@/lib/wait-times";
import { getOpenStatusMap } from "@/lib/google-places";

export default async function BuyerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_buyer, is_seller, trust_score")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  if (!profile.is_buyer) {
    // Only redirect if user is a seller — avoid redirect loops
    if (profile.is_seller) {
      redirect("/seller");
    }
    redirect("/auth/login");
  }

  const firstName = profile.display_name.split(" ")[0].toUpperCase();

  const [restaurantList, waitStats] = await Promise.all([
    fetchRestaurants(),
    getWaitTimeStats(),
  ]);

  const openStatus = await getOpenStatusMap(restaurantList);

  // Serialize waitStats map to plain object for client component
  const waitStatsObj: Record<
    string,
    { restaurantId: string; avgWaitMinutes: number; reportCount: number; activeSellers: number }
  > = {};
  for (const [key, value] of waitStats) {
    waitStatsObj[key] = value;
  }

  return (
    <PullToRefreshWrapper>
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[32px] tracking-[2px] leading-none mb-2">
          HEY, {firstName}.
        </h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFF3D6] font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-[#8B6914] font-medium">
            TRUST SCORE: {profile.trust_score}
          </span>
        </div>
      </div>

      {/* Restaurant Browser */}
      <RestaurantBrowser restaurants={restaurantList} waitStats={waitStatsObj} openStatus={openStatus} />

      {/* Your Orders */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-3">
          YOUR ORDERS
        </h2>
        <BuyerOrdersSection />
      </div>

      {/* Onboarding link */}
      <div className="text-center">
        <Link
          href="/onboarding/buyer"
          className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors underline underline-offset-2"
        >
          Forgot how this works?
        </Link>
      </div>
    </div>
    </PullToRefreshWrapper>
  );
}
