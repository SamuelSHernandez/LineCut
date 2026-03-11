"use client";

import { useState, useTransition } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useProfile } from "@/lib/profile-context";
import { getStripe } from "@/lib/stripe-client";
import {
  createSetupIntent,
  detachPaymentMethod,
} from "@/app/(dashboard)/profile/actions";

function CardForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError(null);
    setSaving(true);

    const result = await createSetupIntent();
    if ("error" in result && result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    const clientSecret = result.clientSecret;
    if (!clientSecret) {
      setError("Failed to initialize card setup.");
      setSaving(false);
      return;
    }

    const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card setup failed.");
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    // Give webhook time to update the profile before reloading
    setTimeout(() => window.location.reload(), 4000);
  }

  if (success) {
    return (
      <div className="bg-[#DDEFDD] border border-[#2D6A2D] rounded-[6px] px-4 py-3">
        <p className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] font-medium">
          Card saved. Refreshing...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="px-4 py-3 rounded-[6px] bg-butcher-paper border border-[#eee6d8]">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "15px",
                fontFamily: "DM Sans, sans-serif",
                color: "#1A1A18",
                "::placeholder": { color: "#8C8778" },
              },
            },
          }}
        />
      </div>

      {error && (
        <p role="alert" className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !stripe}
        className="w-full min-h-[48px] py-3 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ketchup/50"
      >
        {saving ? "Saving card..." : "Save Card"}
      </button>
    </form>
  );
}

function SavedCard() {
  const profile = useProfile();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const isExpired =
    profile.paymentMethodExpYear != null &&
    profile.paymentMethodExpMonth != null &&
    (profile.paymentMethodExpYear < now.getFullYear() ||
      (profile.paymentMethodExpYear === now.getFullYear() &&
        profile.paymentMethodExpMonth < now.getMonth() + 1));

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await detachPaymentMethod();
      if (result.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex items-center justify-between py-3 px-4 rounded-[6px] border ${
          isExpired
            ? "bg-[#FFF3D6] border-ketchup"
            : "bg-butcher-paper border-[#eee6d8]"
        }`}
      >
        <div>
          <span className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard capitalize">
            {profile.paymentMethodBrand}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-sidewalk ml-2">
            **** {profile.paymentMethodLast4}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk ml-3">
            {String(profile.paymentMethodExpMonth).padStart(2, "0")}/
            {profile.paymentMethodExpYear}
          </span>
          {isExpired && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-ketchup/10 font-[family-name:var(--font-body)] text-[11px] font-semibold text-ketchup uppercase">
              EXPIRED
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="font-[family-name:var(--font-body)] text-[13px] text-ketchup hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
        >
          {isPending ? "Removing..." : "Remove"}
        </button>
      </div>
      {error && (
        <p role="alert" className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
          {error}
        </p>
      )}
    </div>
  );
}

export default function BuyerBillingSection() {
  const profile = useProfile();

  if (!profile.isBuyer) return null;

  const hasCard = !!profile.paymentMethodLast4;

  return (
    <div
      id="billing"
      className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-1">
        PAYMENT METHOD
      </h2>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
        {hasCard
          ? "Your saved card for placing orders."
          : "Add a card to start placing orders."}
      </p>

      {hasCard ? (
        <SavedCard />
      ) : (
        <Elements stripe={getStripe()}>
          <CardForm />
        </Elements>
      )}
    </div>
  );
}
