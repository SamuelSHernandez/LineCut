"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function goLive(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check for existing active session
  const { data: existing } = await supabase
    .from("seller_sessions")
    .select("id")
    .eq("seller_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return { error: "You already have an active session." };
  }

  const { error } = await supabase.from("seller_sessions").insert({
    seller_id: user.id,
    restaurant_id: restaurantId,
  });

  if (error) {
    return { error: "Failed to start session. Please try again." };
  }

  return { success: true };
}

export async function endSession(
  sessionId: string,
  status: "completed" | "cancelled" = "completed"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Get the session to compute duration
  const { data: session } = await supabase
    .from("seller_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .eq("seller_id", user.id)
    .eq("status", "active")
    .single();

  if (!session) {
    return { error: "Session not found or already ended." };
  }

  const startedAt = new Date(session.started_at);
  const now = new Date();
  const durationMinutes = Math.round(
    (now.getTime() - startedAt.getTime()) / 60000
  );

  const { error } = await supabase
    .from("seller_sessions")
    .update({
      ended_at: now.toISOString(),
      wait_duration_minutes: durationMinutes,
      status,
    })
    .eq("id", sessionId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: "Failed to end session. Please try again." };
  }

  return { success: true };
}
