import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createVerificationSession } from "@/lib/kyc/didit";
import { trackEvent, EVENTS } from "@/lib/analytics";

/**
 * POST /api/kyc/create-session
 * Creates a Didit verification session for the authenticated seller.
 * Returns the verification URL to redirect to.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check current KYC status
  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status, is_seller")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.is_seller) {
    return NextResponse.json(
      { error: "Only sellers need identity verification" },
      { status: 400 }
    );
  }

  if (profile.kyc_status === "approved") {
    return NextResponse.json(
      { error: "Already verified" },
      { status: 400 }
    );
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const callbackUrl = `${base}/api/kyc/callback`;

  try {
    const session = await createVerificationSession({
      vendorData: user.id,
      callbackUrl,
    });

    // Store session ID on profile
    await supabase
      .from("profiles")
      .update({
        kyc_status: "pending",
        kyc_session_id: session.session_id,
      })
      .eq("id", user.id);

    trackEvent(EVENTS.KYC_STARTED, user.id);

    return NextResponse.json({ url: session.url, sessionId: session.session_id });
  } catch (err) {
    console.error("[kyc/create-session] Error:", err);
    return NextResponse.json(
      { error: "Failed to create verification session" },
      { status: 500 }
    );
  }
}
