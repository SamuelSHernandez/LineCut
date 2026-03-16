import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  let payload: { orderId: string; senderId: string; body: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, senderId, body } = payload;
  if (!orderId || !senderId || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (body.length > 1000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  // Verify authenticated user matches senderId
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.id !== senderId) {
    return NextResponse.json({ error: "Sender mismatch" }, { status: 403 });
  }

  // API-level rate limit: 10 messages per minute per user
  const { success: withinLimit, remaining } = rateLimit(
    `chat:${user.id}`,
    10,
    60_000
  );
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a moment before sending again." },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  const supabase = getAdminClient();

  // Fetch order to validate participant and get other party info
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("buyer_id, seller_id, status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.buyer_id !== senderId && order.seller_id !== senderId) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  if (!["accepted", "in-progress", "ready"].includes(order.status)) {
    return NextResponse.json({ error: "Chat not available for this order status" }, { status: 400 });
  }

  // Get sender name for push notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", senderId)
    .single();

  const senderName = profile?.first_name ?? "Someone";
  const recipientId = senderId === order.buyer_id ? order.seller_id : order.buyer_id;
  const truncatedBody = body.length > 50 ? body.slice(0, 47) + "..." : body;

  // Send push to other party (fire and forget)
  sendPush({
    userId: recipientId,
    title: "New message",
    body: `${senderName}: ${truncatedBody}`,
    url: senderId === order.buyer_id ? "/seller" : "/buyer",
    orderId,
  });

  return NextResponse.json(
    { ok: true },
    {
      headers: { "X-RateLimit-Remaining": String(remaining) },
    }
  );
}
