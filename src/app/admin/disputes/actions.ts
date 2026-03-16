"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { refundFull } from "@/lib/stripe/payment-intents";

const VALID_RESOLUTIONS = [
  "resolved_refund",
  "resolved_no_action",
  "resolved_warning",
] as const;

export async function resolveDispute({
  disputeId,
  resolution,
  notes,
}: {
  disputeId: string;
  resolution: string;
  notes: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return { ok: false, error: "Server configuration error." };
  }

  if (!disputeId || !resolution) {
    return { ok: false, error: "Missing fields." };
  }

  if (!VALID_RESOLUTIONS.includes(resolution as (typeof VALID_RESOLUTIONS)[number])) {
    return { ok: false, error: "Invalid resolution." };
  }

  const supabase = getAdminClient();

  // Fetch dispute + order info
  const { data: dispute, error: disputeErr } = await supabase
    .from("disputes")
    .select("id, order_id, reporter_id, reporter_role, status")
    .eq("id", disputeId)
    .single();

  if (disputeErr || !dispute) {
    return { ok: false, error: "Dispute not found." };
  }

  if (dispute.status !== "open" && dispute.status !== "under_review") {
    return { ok: false, error: "Dispute already resolved." };
  }

  // Update dispute
  const { error: updateErr } = await supabase
    .from("disputes")
    .update({
      status: resolution,
      resolution_notes: notes || null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  // If refund resolution, process refund
  if (resolution === "resolved_refund") {
    try {
      await refundFull(dispute.order_id);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[resolve-dispute] Refund failed:", err);
      }
      return { ok: false, error: "Dispute resolved but refund failed." };
    }
  }

  // Fetch order for push notifications
  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id, seller_id")
    .eq("id", dispute.order_id)
    .single();

  if (order) {
    const resolutionText =
      resolution === "resolved_refund"
        ? "resolved with a refund"
        : resolution === "resolved_warning"
          ? "resolved with a warning issued"
          : "resolved — no action needed";

    sendPush({
      userId: order.buyer_id,
      title: "Dispute resolved",
      body: `Your dispute has been ${resolutionText}.`,
      url: "/disputes",
      orderId: dispute.order_id,
    });
    sendPush({
      userId: order.seller_id,
      title: "Dispute resolved",
      body: `A dispute on your order has been ${resolutionText}.`,
      url: "/disputes",
      orderId: dispute.order_id,
    });
  }

  return { ok: true };
}
