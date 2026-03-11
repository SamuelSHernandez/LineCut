import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/kyc/didit";
import { trackEvent, EVENTS } from "@/lib/analytics";

/**
 * POST /api/kyc/webhook
 * Receives Didit verification completion webhooks.
 * Updates profile KYC status based on the decision.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";

  // Verify HMAC signature
  try {
    const valid = await verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      console.error("[kyc/webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    console.error("[kyc/webhook] Signature verification error:", err);
    return NextResponse.json({ error: "Signature error" }, { status: 401 });
  }

  let payload: {
    session_id: string;
    status: string;
    vendor_data: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { session_id, status, vendor_data: userId } = payload;

  if (!session_id || !status || !userId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Map Didit status to our kyc_status
  let kycStatus: "pending" | "approved" | "declined";
  if (status === "Approved") {
    kycStatus = "approved";
  } else if (status === "Declined") {
    kycStatus = "declined";
  } else {
    // "In Review" or other — keep as pending
    kycStatus = "pending";
  }

  const updateData: Record<string, unknown> = {
    kyc_status: kycStatus,
    kyc_session_id: session_id,
  };

  if (kycStatus === "approved") {
    updateData.kyc_verified_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error("[kyc/webhook] DB update error:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (kycStatus === "approved") {
    trackEvent(EVENTS.KYC_APPROVED, userId);
  }

  return NextResponse.json({ ok: true, kycStatus });
}
