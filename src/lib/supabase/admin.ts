import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase admin client using the service role key.
 * Bypasses RLS — use only in server-side code (API routes, server actions, cron).
 */
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
