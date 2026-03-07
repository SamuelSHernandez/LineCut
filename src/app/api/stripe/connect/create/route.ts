import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a Connect account
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let accountId = profile?.stripe_connect_account_id;

  if (!accountId) {
    // Create new Express account
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { supabase_user_id: user.id },
    });
    accountId = account.id;

    // Save to profiles
    await supabase
      .from("profiles")
      .update({
        stripe_connect_account_id: accountId,
        stripe_connect_status: "pending",
      })
      .eq("id", user.id);

    // Also create payout_accounts row
    await supabase.from("payout_accounts").upsert({
      user_id: user.id,
      stripe_account_id: accountId,
      status: "pending",
      charges_enabled: false,
      payouts_enabled: false,
    });
  }

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/api/stripe/connect/refresh`,
    return_url: `${appUrl}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
