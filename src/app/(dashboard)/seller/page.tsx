import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PlaceholderCard from "@/components/PlaceholderCard";
import EmptyState from "@/components/EmptyState";

export default async function SellerDashboard() {
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

  if (!profile?.is_seller) {
    redirect("/buyer");
  }

  const firstName = profile.display_name.split(" ")[0].toUpperCase();

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[32px] tracking-[2px] leading-none mb-2">
          HEY, {firstName}.
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[15px] text-sidewalk">
          You&apos;re not in line right now.
        </p>
      </div>

      {/* Go Live */}
      <div className="bg-ticket rounded-[10px] p-6 border-2 border-mustard shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-2">
          GO LIVE
        </h2>
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-5">
          Already in line? Let nearby buyers know you can order for them.
        </p>
        <button
          disabled
          className="w-full py-3 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] opacity-50 cursor-not-allowed"
        >
          I&apos;M IN LINE
        </button>
      </div>

      {/* Earnings */}
      <PlaceholderCard title="YOUR EARNINGS">
        <div className="grid grid-cols-3 gap-4">
          {["Today", "This Week", "All Time"].map((period) => (
            <div key={period} className="text-center">
              <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mb-1">
                {period}
              </p>
              <p className="font-[family-name:var(--font-display)] text-[24px] tracking-[1px]">
                $0.00
              </p>
            </div>
          ))}
        </div>
      </PlaceholderCard>

      {/* Active Orders */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-3">
          ACTIVE ORDERS
        </h2>
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8]">
          <EmptyState message="No active orders. Go live to start accepting orders." />
        </div>
      </div>

      {/* Past Handoffs */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-3">
          PAST HANDOFFS
        </h2>
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8]">
          <EmptyState message="No handoffs yet. Your completed orders will show up here." />
        </div>
      </div>

      {/* Onboarding link */}
      <div className="text-center">
        <Link
          href="/onboarding/seller"
          className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors underline underline-offset-2"
        >
          Forgot how this works?
        </Link>
      </div>
    </div>
  );
}
