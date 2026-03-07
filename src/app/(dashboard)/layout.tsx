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

  const { data: row } = await supabase
    .from("profiles")
    .select("id, display_name, is_buyer, is_seller, avatar_url, trust_score")
    .eq("id", user.id)
    .single();

  // If no profile row yet (edge case), fall back to auth metadata
  const profile: Profile = row
    ? {
        id: row.id,
        displayName: row.display_name,
        isBuyer: row.is_buyer,
        isSeller: row.is_seller,
        avatarUrl: row.avatar_url,
        trustScore: row.trust_score,
      }
    : {
        id: user.id,
        displayName:
          (user.user_metadata?.display_name as string) ?? "User",
        isBuyer: (user.user_metadata?.is_buyer as boolean) ?? true,
        isSeller: (user.user_metadata?.is_seller as boolean) ?? false,
        avatarUrl: null,
        trustScore: 0,
      };

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
