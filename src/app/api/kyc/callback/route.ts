import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionDecision } from "@/lib/kyc/didit";

/**
 * GET /api/kyc/callback
 * Didit redirects the user here after completing verification.
 * We check the session result and update the profile, then redirect to /profile.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") ??
    req.nextUrl.searchParams.get("verificationSessionId");
  const status = req.nextUrl.searchParams.get("status");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // If we have a session ID, poll for the decision
  if (sessionId) {
    try {
      const decision = await getSessionDecision(sessionId);

      let kycStatus: "pending" | "approved" | "declined" = "pending";
      if (decision.status === "Approved") kycStatus = "approved";
      else if (decision.status === "Declined") kycStatus = "declined";

      const updateData: Record<string, unknown> = {
        kyc_status: kycStatus,
        kyc_session_id: sessionId,
      };

      if (kycStatus === "approved") {
        updateData.kyc_verified_at = new Date().toISOString();
      }

      await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
    } catch (err) {
      console.error("[kyc/callback] Failed to fetch session decision:", err);
      // Don't block redirect — webhook will update status async
    }
  }

  // Redirect back to profile page
  return NextResponse.redirect(new URL("/profile?kyc=done", req.url));
}
