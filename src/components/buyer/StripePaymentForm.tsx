"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";

interface StripePaymentFormProps {
  clientSecret: string;
  total: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function PaymentFormInner({
  total,
  onSuccess,
  onError,
}: Omit<StripePaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full min-h-[48px] mt-4 py-3 px-6 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-all duration-200 hover:bg-ketchup/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? "PROCESSING..." : `PAY $${total.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function StripePaymentForm({
  clientSecret,
  total,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#C4382A",
            fontFamily: "var(--font-body), system-ui, sans-serif",
            borderRadius: "6px",
          },
        },
      }}
    >
      <PaymentFormInner total={total} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
