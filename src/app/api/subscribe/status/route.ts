import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("email, referral_code, referral_count, credit_earned, created_at")
    .eq("referral_code", code)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Calculate raw position (signup order)
  const { count: aheadCount } = await supabase
    .from("waitlist_entries")
    .select("*", { count: "exact", head: true })
    .lt("created_at", entry.created_at);

  const { count: totalCount } = await supabase
    .from("waitlist_entries")
    .select("*", { count: "exact", head: true });

  const rawPosition = (aheadCount ?? 0) + 1;
  const position = Math.max(1, rawPosition - entry.referral_count * 5);

  return NextResponse.json({
    referral_code: entry.referral_code,
    referral_count: entry.referral_count,
    credit_earned: entry.credit_earned,
    position,
    total: totalCount ?? 0,
  });
}
