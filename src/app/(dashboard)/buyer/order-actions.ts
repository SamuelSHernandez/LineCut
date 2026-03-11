"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { confirmHandoff } from "@/lib/handoff";

interface ActionResult {
  success?: boolean;
  error?: string;
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  return { supabase, user };
}

/**
 * Buyer confirms hand-off receipt.
 */
export async function confirmBuyerHandoff(orderId: string): Promise<ActionResult> {
  const { user } = await getAuthenticatedUser();

  const result = await confirmHandoff(orderId, user.id, "buyer");

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/buyer");
  return { success: true };
}
