"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendPush } from "@/lib/push";

import type { DisputeReason } from "@/lib/types";

const VALID_DISPUTE_REASONS: DisputeReason[] = [
  "wrong_items",
  "missing_items",
  "food_quality",
  "no_show",
  "rude_behavior",
  "payment_issue",
  "other",
];

interface ActionResult {
  success?: boolean;
  error?: string;
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

export async function fileDispute(
  orderId: string,
  reason: string,
  description: string
): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedUser();

  // Determine reporter role
  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id, seller_id, status")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found." };

  if (!VALID_DISPUTE_REASONS.includes(reason as DisputeReason)) {
    return { error: "Invalid dispute reason." };
  }

  if (!description?.trim()) {
    return { error: "Description is required." };
  }

  if (!["completed", "cancelled"].includes(order.status)) {
    return { error: "Disputes can only be filed on completed or cancelled orders." };
  }

  const isBuyer = user.id === order.buyer_id;
  const isSeller = user.id === order.seller_id;
  if (!isBuyer && !isSeller) return { error: "You are not a participant on this order." };

  const reporterRole = isBuyer ? "buyer" : "seller";

  const { error: insertErr } = await supabase.from("disputes").insert({
    order_id: orderId,
    reporter_id: user.id,
    reporter_role: reporterRole,
    reason,
    description: description.slice(0, 500),
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { error: "You have already filed a dispute for this order." };
    }
    return { error: insertErr.message };
  }

  // Notify other party
  const otherId = isBuyer ? order.seller_id : order.buyer_id;
  sendPush({
    userId: otherId,
    title: "Dispute filed",
    body: "A dispute has been filed on a recent order. We'll review it shortly.",
    url: isBuyer ? "/seller" : "/buyer",
    orderId,
  });

  revalidatePath("/disputes");
  return { success: true };
}

export async function getMyDisputes() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("disputes")
    .select("id, order_id, reporter_id, reporter_role, reason, description, status, resolution_notes, resolved_at, created_at")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((d) => ({
    id: d.id,
    orderId: d.order_id,
    reporterId: d.reporter_id,
    reporterRole: d.reporter_role,
    reason: d.reason,
    description: d.description,
    status: d.status,
    resolutionNotes: d.resolution_notes,
    resolvedAt: d.resolved_at,
    createdAt: d.created_at,
  }));
}
