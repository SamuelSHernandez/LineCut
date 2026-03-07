import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/auth/login", appUrl));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_connect_account_id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/profile", appUrl));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const accountLink = await stripe.accountLinks.create({
    account: profile.stripe_connect_account_id,
    refresh_url: `${appUrl}/api/stripe/connect/refresh`,
    return_url: `${appUrl}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  return NextResponse.redirect(accountLink.url);
}
