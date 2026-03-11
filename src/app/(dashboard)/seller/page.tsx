import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import GoLivePanel from "@/components/seller/GoLivePanel";
import SellerOrderManager from "@/components/seller/SellerOrderManager";
import { fetchRestaurants } from "@/lib/restaurants";
import type { SellerSession } from "@/lib/types";

export default async function SellerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_buyer, is_seller, trust_score, stripe_connect_status, kyc_status, completed_deliveries")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  if (!profile.is_seller) {
    // Only redirect if user is a buyer — avoid redirect loops
    if (profile.is_buyer) {
      redirect("/buyer");
    }
    redirect("/auth/login");
  }

  const firstName = profile.display_name.split(" ")[0].toUpperCase();

  const restaurantList = await fetchRestaurants();

  // Fetch historical wait stats for auto-suggest
  let suggestedWaitMinutes: number | null = null;
  if (restaurantList.length > 0) {
    const { data: waitStats } = await supabase.rpc("get_wait_time_stats", {
      p_restaurant_id: restaurantList[0].id,
    });
    if (waitStats && Array.isArray(waitStats) && waitStats.length > 0) {
      suggestedWaitMinutes = waitStats[0].avg_wait_minutes ?? null;
    }
  }

  // Fetch active or winding-down session for this seller
  const { data: activeSessionData } = await supabase
    .from("seller_sessions")
    .select("id, seller_id, restaurant_id, started_at, ended_at, wait_duration_minutes, estimated_wait_minutes, seller_fee_cents, status")
    .eq("seller_id", user.id)
    .in("status", ["active", "winding_down"])
    .maybeSingle();

  const activeSession: SellerSession | null = activeSessionData
    ? {
        id: activeSessionData.id,
        sellerId: activeSessionData.seller_id,
        restaurantId: activeSessionData.restaurant_id,
        startedAt: activeSessionData.started_at,
        endedAt: activeSessionData.ended_at,
        waitDurationMinutes: activeSessionData.wait_duration_minutes,
        estimatedWaitMinutes: activeSessionData.estimated_wait_minutes ?? null,
        sellerFeeCents: activeSessionData.seller_fee_cents ?? null,
        status: activeSessionData.status,
      }
    : null;

  return (
    <main className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[32px] tracking-[2px] leading-none text-chalkboard mb-2">
          HEY, {firstName}.
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[15px] text-sidewalk">
          {activeSession?.status === "winding_down"
            ? "Finishing up your current orders."
            : activeSession
              ? "You're currently in line."
              : "You're not in line right now."}
        </p>
      </div>

      {/* Go Live */}
      <GoLivePanel
        restaurants={restaurantList}
        activeSession={activeSession}
        stripeConnectStatus={profile.stripe_connect_status ?? "not_connected"}
        kycStatus={profile.kyc_status ?? "none"}
        suggestedWaitMinutes={suggestedWaitMinutes}
        completedDeliveries={profile.completed_deliveries ?? 0}
      />

      {/* Order Management */}
      <SellerOrderManager
        activeSession={activeSession}
        restaurantId={activeSession?.restaurantId ?? null}
      />

      {/* Onboarding link */}
      <div className="text-center">
        <Link
          href="/onboarding/seller"
          className="inline-block min-h-[44px] leading-[44px] font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors underline underline-offset-2"
        >
          Forgot how this works?
        </Link>
      </div>
    </main>
  );
}
