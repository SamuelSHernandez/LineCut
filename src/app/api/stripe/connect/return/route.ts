import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_connect_account_id) {
    const account = await stripe.accounts.retrieve(
      profile.stripe_connect_account_id
    );

    let status: string = "pending";
    if (account.charges_enabled && account.payouts_enabled) {
      status = "active";
    } else if (account.requirements?.disabled_reason) {
      status = "restricted";
    }

    await supabase
      .from("profiles")
      .update({ stripe_connect_status: status })
      .eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/profile#payouts", appUrl));
}
