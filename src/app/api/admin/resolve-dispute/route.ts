import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { refundFull } from "@/lib/stripe/payment-intents";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { disputeId, resolution, notes } = await req.json();

  if (!disputeId || !resolution) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const validResolutions = [
    "resolved_refund",
    "resolved_no_action",
    "resolved_warning",
  ];
  if (!validResolutions.includes(resolution)) {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Fetch dispute + order info
  const { data: dispute, error: disputeErr } = await supabase
    .from("disputes")
    .select("id, order_id, reporter_id, reporter_role, status")
    .eq("id", disputeId)
    .single();

  if (disputeErr || !dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }

  if (dispute.status !== "open" && dispute.status !== "under_review") {
    return NextResponse.json(
      { error: "Dispute already resolved" },
      { status: 400 }
    );
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
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // If refund resolution, process refund
  if (resolution === "resolved_refund") {
    try {
      await refundFull(dispute.order_id);
    } catch (err) {
      console.error("[resolve-dispute] Refund failed:", err);
      return NextResponse.json(
        { error: "Dispute resolved but refund failed" },
        { status: 500 }
      );
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

  return NextResponse.json({ ok: true, resolution });
}
