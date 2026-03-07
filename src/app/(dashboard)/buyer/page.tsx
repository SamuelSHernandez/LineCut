import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import RestaurantBrowser from "@/components/buyer/RestaurantBrowser";

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

  if (!profile?.is_buyer) {
    redirect("/seller");
  }

  const firstName = profile.display_name.split(" ")[0].toUpperCase();

  return (
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
      <RestaurantBrowser />

      {/* Your Orders */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-3">
          YOUR ORDERS
        </h2>
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8]">
          <EmptyState message="No orders yet. Find someone in line and place your first order." />
        </div>
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
  );
}
