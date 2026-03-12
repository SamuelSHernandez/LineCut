/**
 * Unified notification dispatcher — sends both push and SMS.
 * All call sites should use this instead of sendPush directly.
 */

import { sendPush } from "@/lib/push";
import { sendSms } from "@/lib/sms";
import { createClient } from "@/lib/supabase/server";

interface NotifyParams {
  userId: string;
  title: string;
  body: string;
  url: string;
  orderId?: string;
  smsBody?: string;
}

/**
 * Sends push notification and optionally SMS to a user.
 * SMS is only sent if the user has a verified phone number and smsBody is provided.
 * Fire-and-forget — never throws.
 */
export async function sendNotification({
  userId,
  title,
  body,
  url,
  orderId,
  smsBody,
}: NotifyParams): Promise<void> {
  // Always send push
  sendPush({ userId, title, body, url, orderId });

  // Send SMS if smsBody provided
  if (smsBody) {
    try {
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, phone_verified")
        .eq("id", userId)
        .single();

      if (profile?.phone && profile?.phone_verified) {
        sendSms({ to: profile.phone, body: smsBody });
      }
    } catch (err) {
      console.error("[notify] SMS lookup failed:", err);
    }
  }
}
