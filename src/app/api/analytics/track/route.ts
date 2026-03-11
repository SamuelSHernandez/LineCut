import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";

/**
 * POST /api/analytics/track
 * Lightweight endpoint for client-side event tracking.
 * Authenticates user from session (optional — logs anonymous if no session).
 */
export async function POST(req: NextRequest) {
  let body: { event?: string; properties?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.event || typeof body.event !== "string") {
    return NextResponse.json({ error: "Missing event name" }, { status: 400 });
  }

  // Try to get authenticated user — optional
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  } catch {
    // Anonymous event — that's fine
  }

  trackEvent(body.event, userId, body.properties);

  return NextResponse.json({ ok: true });
}
