import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { STALE_READY_THRESHOLD_MS, SYSTEM_ACTOR_ID } from "@/lib/constants";
import { verifySecret } from "@/lib/auth-utils";

/**
 * Cron endpoint: safety net for stale ready-state orders.
 * If an order has been ready for 20+ min, auto-cancel it (buyer no-show).
 * Seller keeps payment — no refund issued.
 * The primary timeout is client-side (per-seller configurable); this is the backstop.
 * Intended to run every 5 min via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!verifySecret(cronSecret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  const threshold = new Date(Date.now() - STALE_READY_THRESHOLD_MS).toISOString();

  const { data: staleOrders, error } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, ready_at, total")
    .eq("status", "ready")
    .lt("ready_at", threshold);

  if (error) {
    console.error("[cron/stale-ready] DB error:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!staleOrders || staleOrders.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let cancelled = 0;

  for (const order of staleOrders) {
    // Auto-cancel — buyer no-show. Seller keeps payment.
    const { error: rpcErr } = await supabase.rpc("transition_order", {
      p_order_id: order.id,
      p_new_status: "cancelled",
      p_actor_id: SYSTEM_ACTOR_ID,
      p_metadata: { reason: "buyer_no_show", source: "cron_safety_net" },
    });

    if (rpcErr) {
      console.error("[cron/stale-ready] transition failed for", order.id, rpcErr.message);
      continue;
    }

    const totalStr = order.total ? `$${(order.total / 100).toFixed(2)}` : "";

    sendPush({
      userId: order.buyer_id,
      title: "Order cancelled — no pickup",
      body: `You didn't pick up in time.${totalStr ? ` You were charged ${totalStr}.` : ""}`,
      url: "/buyer",
      orderId: order.id,
    });
    sendPush({
      userId: order.seller_id,
      title: "Buyer didn't show",
      body: "Order cancelled — buyer didn't show. You keep the payment.",
      url: "/seller",
      orderId: order.id,
    });

    cancelled++;
  }

  return NextResponse.json({ processed: staleOrders.length, cancelled });
}
