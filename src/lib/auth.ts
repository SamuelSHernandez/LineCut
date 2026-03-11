import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Get the authenticated user or redirect to login.
 * Returns both the Supabase client and the user object.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  return { supabase, user };
}
