import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// Use service role for webhook handlers to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  switch (event.type) {
    case "setup_intent.succeeded": {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const userId = setupIntent.metadata?.supabase_user_id;
      if (!userId) break;

      // Retrieve the payment method details
      const pm = await stripe.paymentMethods.retrieve(
        setupIntent.payment_method as string
      );

      if (pm.card) {
        await supabase
          .from("profiles")
          .update({
            payment_method_last4: pm.card.last4,
            payment_method_brand: pm.card.brand,
            payment_method_exp_month: pm.card.exp_month,
            payment_method_exp_year: pm.card.exp_year,
          })
          .eq("id", userId);
      }
      break;
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.order_id;
      if (!orderId) break;

      // Update order status if still in a pre-completion state
      await supabase
        .from("orders")
        .update({ status: "ready" })
        .eq("id", orderId)
        .in("status", ["pending", "accepted", "in-progress"]);
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.order_id;
      if (!orderId) break;

      // Cancel the order on payment failure
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .neq("status", "completed");
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.supabase_user_id;
      if (!userId) break;

      let connectStatus: string = "pending";
      if (account.charges_enabled && account.payouts_enabled) {
        connectStatus = "active";
      } else if (account.requirements?.disabled_reason) {
        connectStatus = "restricted";
      }

      // Update profiles table
      await supabase
        .from("profiles")
        .update({ stripe_connect_status: connectStatus })
        .eq("id", userId);

      // Also update payout_accounts if exists
      const payoutStatus =
        account.charges_enabled && account.payouts_enabled
          ? "active"
          : connectStatus === "restricted"
            ? "revoked"
            : "pending";

      await supabase
        .from("payout_accounts")
        .update({
          status: payoutStatus,
          charges_enabled: account.charges_enabled ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
        })
        .eq("stripe_account_id", account.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
