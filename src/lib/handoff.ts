import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";

interface HandoffResult {
  confirmed: boolean;
  completed: boolean;
  error?: string;
}

/**
 * Confirm handoff for one party. If both parties have now confirmed,
 * transitions the order to completed.
 *
 * Race-condition safety: The insert + check-other-party + transition sequence
 * is protected by the UNIQUE constraint on (order_id, role) which prevents
 * duplicate confirmations, and the transition_order RPC which atomically
 * verifies the order is still in "ready" status before transitioning. If two
 * concurrent requests both insert and both attempt to transition, only one
 * will succeed — the other gets an INVALID_TRANSITION error and we return
 * { confirmed: true, completed: false } (the client will see the completion
 * via realtime subscription).
 */
export async function confirmHandoff(
  orderId: string,
  actorId: string,
  role: "buyer" | "seller"
): Promise<HandoffResult> {
  const supabase = await createClient();

  // Verify order is in ready state
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return { confirmed: false, completed: false, error: "Order not found." };
  }

  if (order.status !== "ready") {
    return { confirmed: false, completed: false, error: "Order is not in ready state." };
  }

  // Verify actor is the correct party
  const expectedId = role === "buyer" ? order.buyer_id : order.seller_id;
  if (actorId !== expectedId) {
    return { confirmed: false, completed: false, error: "Permission denied." };
  }

  // Insert confirmation (UNIQUE constraint prevents dupes)
  const { error: insertErr } = await supabase
    .from("handoff_confirmations")
    .insert({
      order_id: orderId,
      confirmed_by: actorId,
      role,
    });

  if (insertErr) {
    // Unique violation = already confirmed
    if (insertErr.code === "23505") {
      return { confirmed: true, completed: false };
    }
    return { confirmed: false, completed: false, error: insertErr.message };
  }

  // Check if the other party has also confirmed
  const otherRole = role === "buyer" ? "seller" : "buyer";
  const { data: otherConfirmation } = await supabase
    .from("handoff_confirmations")
    .select("id")
    .eq("order_id", orderId)
    .eq("role", otherRole)
    .maybeSingle();

  if (otherConfirmation) {
    // Both confirmed — transition to completed.
    // The RPC atomically checks status = "ready" so concurrent calls are safe.
    const { error: rpcErr } = await supabase.rpc("transition_order", {
      p_order_id: orderId,
      p_new_status: "completed",
      p_actor_id: actorId,
      p_metadata: { handoff_confirmed_by: "both" },
    });

    if (rpcErr) {
      // INVALID_TRANSITION means another request already completed the order
      if (rpcErr.message?.includes("INVALID_TRANSITION")) {
        return { confirmed: true, completed: false };
      }
      return { confirmed: true, completed: false, error: rpcErr.message };
    }

    // Notify both parties
    sendPush({
      userId: order.buyer_id,
      title: "Order complete",
      body: "Hand-off confirmed. Leave a review!",
      url: "/buyer",
      orderId,
    });

    sendPush({
      userId: order.seller_id,
      title: "Order complete",
      body: "Hand-off confirmed. Leave a review!",
      url: "/seller",
      orderId,
    });

    return { confirmed: true, completed: true };
  }

  // Only this party confirmed — notify the other party
  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", actorId)
    .single();

  const actorName = actorProfile?.first_name ?? "Your partner";
  const otherId = role === "buyer" ? order.seller_id : order.buyer_id;

  sendPush({
    userId: otherId,
    title: "Confirm hand-off",
    body: `${actorName} confirmed. Please confirm on your end.`,
    url: role === "buyer" ? "/seller" : "/buyer",
    orderId,
  });

  return { confirmed: true, completed: false };
}
