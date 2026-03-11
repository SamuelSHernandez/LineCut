import { createClient } from "@/lib/supabase/server";

/**
 * Check if either user has blocked the other (bidirectional).
 * Uses SECURITY DEFINER RPC to bypass RLS for reverse-direction check.
 */
export async function isBlocked(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  const excluded = await getExcludedUserIds(userId);
  return excluded.has(otherUserId);
}

/**
 * Get the complete set of user IDs that should be excluded from results
 * for a given user — both users they blocked AND users who blocked them.
 * Uses a SECURITY DEFINER RPC function to read blocks in both directions.
 */
export async function getExcludedUserIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_blocked_user_ids", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Failed to fetch blocked user IDs:", error);
    return new Set();
  }

  return new Set((data as string[]) ?? []);
}
