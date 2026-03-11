"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitBuyerReview(
  orderId: string,
  stars: number,
  comment?: string,
  tags?: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  if (stars < 1 || stars > 5) return { error: "Invalid rating." };
  if (comment && comment.length > 200) return { error: "Comment too long." };

  // Verify order exists, belongs to buyer, and is completed
  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, status")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found." };
  if (order.buyer_id !== user.id) return { error: "Not your order." };
  if (order.status !== "completed") return { error: "Order not completed yet." };

  // Check if already reviewed
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("order_id", orderId)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  if (existing) return { error: "Already reviewed." };

  const { error: insertErr } = await supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: user.id,
    reviewee_id: order.seller_id,
    role: "buyer",
    stars,
    comment: comment?.trim() || null,
    tags: tags ?? [],
  });

  if (insertErr) return { error: "Failed to submit review." };

  return { success: true };
}
