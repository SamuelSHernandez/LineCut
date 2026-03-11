import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
