/**
 * Send an SMS via Twilio. Fire-and-forget — never throws.
 * Silently returns if Twilio env vars are not set (dev environments).
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return;

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      to,
      from: fromNumber,
      body,
    });
  } catch (err) {
    console.error("[sms] sendSms failed:", err);
  }
}
