import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import type { Profile } from "@/lib/profile-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: row, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, is_buyer, is_seller, avatar_url, trust_score, email, phone, bio, neighborhood, phone_verified, email_verified, stripe_customer_id, stripe_connect_account_id, stripe_connect_status, max_order_cap, avg_rating, rating_count, payment_method_last4, payment_method_brand, payment_method_exp_month, payment_method_exp_year, kyc_status, created_at")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[DashboardLayout] Failed to fetch profile:", profileError.message);
  }

  // If no profile row yet (edge case), fall back to auth metadata
  const profile: Profile = row
    ? {
        id: row.id,
        displayName: row.display_name,
        isBuyer: row.is_buyer,
        isSeller: row.is_seller,
        avatarUrl: row.avatar_url,
        trustScore: row.trust_score,
        email: row.email ?? null,
        phone: row.phone,
        bio: row.bio,
        neighborhood: row.neighborhood,
        phoneVerified: row.phone_verified,
        emailVerified: row.email_verified ?? false,
        stripeCustomerId: row.stripe_customer_id,
        stripeConnectAccountId: row.stripe_connect_account_id,
        stripeConnectStatus: row.stripe_connect_status,
        maxOrderCap: row.max_order_cap,
        avgRating: row.avg_rating ? Number(row.avg_rating) : null,
        ratingCount: row.rating_count,
        paymentMethodLast4: row.payment_method_last4,
        paymentMethodBrand: row.payment_method_brand,
        paymentMethodExpMonth: row.payment_method_exp_month,
        paymentMethodExpYear: row.payment_method_exp_year,
        kycStatus: row.kyc_status ?? "none",
        createdAt: row.created_at,
      }
    : {
        id: user.id,
        displayName:
          (user.user_metadata?.display_name as string) ?? "User",
        isBuyer: (user.user_metadata?.is_buyer as boolean) ?? true,
        isSeller: (user.user_metadata?.is_seller as boolean) ?? false,
        avatarUrl: null,
        trustScore: 0,
        email: null,
        phone: null,
        bio: null,
        neighborhood: null,
        phoneVerified: false,
        emailVerified: false,
        stripeCustomerId: null,
        stripeConnectAccountId: null,
        stripeConnectStatus: "not_connected",
        maxOrderCap: 5000,
        avgRating: null,
        ratingCount: 0,
        paymentMethodLast4: null,
        paymentMethodBrand: null,
        paymentMethodExpMonth: null,
        paymentMethodExpYear: null,
        kycStatus: "none" as const,
        createdAt: new Date().toISOString(),
      };

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
