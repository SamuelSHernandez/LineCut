import { createClient } from "@/lib/supabase/server";
import type { WaitTimeStats } from "./types";

export async function getWaitTimeStats(): Promise<Map<string, WaitTimeStats>> {
  const supabase = await createClient();
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  const isWeekend = day === 0 || day === 6;

  const { data, error } = await supabase.rpc("get_wait_time_stats", {
    p_hour: hour,
    p_is_weekend: isWeekend,
  });

  const statsMap = new Map<string, WaitTimeStats>();

  if (error || !data) return statsMap;

  for (const row of data) {
    statsMap.set(row.restaurant_id, {
      restaurantId: row.restaurant_id,
      avgWaitMinutes: row.avg_wait_minutes,
      reportCount: row.report_count,
      activeSellers: row.active_sellers,
    });
  }

  return statsMap;
}
