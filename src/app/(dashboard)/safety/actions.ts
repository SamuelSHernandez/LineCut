"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ── Block / Unblock ───────────────────────────────────────────

export async function blockUser(blockedId: string, reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (blockedId === user.id) {
    return { error: "You cannot block yourself." };
  }

  const { error } = await supabase.from("blocked_users").insert({
    blocker_id: user.id,
    blocked_id: blockedId,
    reason: reason ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You have already blocked this user." };
    }
    console.error("Block user error:", error);
    return { error: "Failed to block user." };
  }

  return { success: true };
}

export async function unblockUser(blockedId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  if (error) {
    console.error("Unblock user error:", error);
    return { error: "Failed to unblock user." };
  }

  return { success: true };
}

// ── Get Blocked Users ─────────────────────────────────────────

export async function getBlockedUsers(): Promise<
  { blockedId: string; displayName: string; createdAt: string }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("blocked_users")
    .select(
      `
      blocked_id,
      created_at,
      blocked:profiles!blocked_users_blocked_id_fkey(display_name)
    `
    )
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get blocked users error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const blocked = row.blocked as unknown as { display_name: string } | null;
    return {
      blockedId: row.blocked_id,
      displayName: blocked?.display_name ?? "Unknown",
      createdAt: row.created_at,
    };
  });
}

// ── Report User ───────────────────────────────────────────────

export type ReportReason = "inappropriate" | "fraud" | "harassment" | "other";

export async function reportUser(
  reportedId: string,
  orderId: string | null,
  reason: ReportReason,
  details: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (reportedId === user.id) {
    return { error: "You cannot report yourself." };
  }

  // Sanitize details — strip HTML tags
  const sanitizedDetails = details
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 1000);

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: user.id,
    reported_id: reportedId,
    order_id: orderId || null,
    reason,
    details: sanitizedDetails || null,
  });

  if (error) {
    console.error("Report user error:", error);
    return { error: "Failed to submit report." };
  }

  return { success: true };
}
