/**
 * Server-side utility for sending push notifications.
 * Call from server actions — fire and forget (never throws).
 */

import type { SendPushBody } from "@/app/api/push/send/route";

export async function sendPush(params: SendPushBody): Promise<void> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    await fetch(`${base}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
      },
      body: JSON.stringify(params),
    });
  } catch (err) {
    // Push is best-effort — never block the main flow
    console.error("[push] sendPush failed:", err);
  }
}
