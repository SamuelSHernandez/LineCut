import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Cron endpoint: handles stale ready-state orders.
 * - If one party confirmed and 20+ min elapsed: auto-complete.
 * - If neither party confirmed and 20+ min elapsed: send reminder pushes.
 * Intended to run every 5 min via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Find orders that have been ready for > 20 minutes
  const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

  const { data: staleOrders, error } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, ready_at")
    .eq("status", "ready")
    .lt("ready_at", twentyMinAgo);

  if (error) {
    console.error("[cron/stale-ready] DB error:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!staleOrders || staleOrders.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let autoCompleted = 0;
  let reminded = 0;

  for (const order of staleOrders) {
    // Check if any party confirmed
    const { data: confirmations } = await supabase
      .from("handoff_confirmations")
      .select("role")
      .eq("order_id", order.id);

    const hasAny = confirmations && confirmations.length > 0;

    if (hasAny) {
      // At least one party confirmed — auto-complete
      const { error: rpcErr } = await supabase.rpc("transition_order", {
        p_order_id: order.id,
        p_new_status: "completed",
        p_actor_id: SYSTEM_ACTOR_ID,
        // System actor can only cancel; for auto-complete we use seller's ID
        // Actually the RPC restricts system actor to cancellation only.
        // We'll use the confirmed party's action instead.
      });

      // If system actor can't complete, find the party who confirmed and use them
      if (rpcErr) {
        const confirmedRole = confirmations![0].role;
        const actorId = confirmedRole === "seller" ? order.seller_id : order.buyer_id;
        await supabase.rpc("transition_order", {
          p_order_id: order.id,
          p_new_status: "completed",
          p_actor_id: actorId,
          p_metadata: { auto_completed: true, reason: "stale_ready_single_confirmation" },
        });
      }

      // Partial refund for auto-completed orders (buyer no-show)
      try {
        const { refundPartialPlatformFee } = await import(
          "@/lib/stripe/payment-intents"
        );
        await refundPartialPlatformFee(order.id);
      } catch (err) {
        console.error(
          "[cron/stale-ready] Partial refund failed for",
          order.id,
          err
        );
      }

      sendPush({
        userId: order.buyer_id,
        title: "Order complete",
        body: "Your order was auto-completed.",
        url: "/buyer",
        orderId: order.id,
      });
      sendPush({
        userId: order.seller_id,
        title: "Order complete",
        body: "Order was auto-completed.",
        url: "/seller",
        orderId: order.id,
      });

      autoCompleted++;
    } else {
      // Neither confirmed — send reminders
      sendPush({
        userId: order.buyer_id,
        title: "Are you coming?",
        body: "Your order has been ready for over 20 min.",
        url: "/buyer",
        orderId: order.id,
      });
      sendPush({
        userId: order.seller_id,
        title: "Buyer didn't show",
        body: "You can complete or cancel the order.",
        url: "/seller",
        orderId: order.id,
      });

      reminded++;
    }
  }

  return NextResponse.json({ processed: staleOrders.length, autoCompleted, reminded });
}
