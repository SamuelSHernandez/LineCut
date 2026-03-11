import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Cron endpoint: deletes chat messages for orders that completed/cancelled > 30 min ago.
 * Intended to run every 10 min via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc("cleanup_old_chat_messages");

  if (error) {
    console.error("[cron/cleanup-chat] RPC error:", error.message);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }

  const deleted = typeof data === "number" ? data : 0;
  console.log(`[cron/cleanup-chat] Deleted ${deleted} messages`);

  return NextResponse.json({ deleted });
}
