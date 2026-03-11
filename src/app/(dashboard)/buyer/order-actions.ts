"use server";

import { revalidatePath } from "next/cache";
import { confirmHandoff } from "@/lib/handoff";
import { getAuthenticatedUser } from "@/lib/auth";

interface ActionResult {
  success?: boolean;
  error?: string;
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
