"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DisputeReason } from "@/lib/types";

interface DisputeFormProps {
  orderId: string;
  otherPartyName: string;
  onSubmitted?: () => void;
}

const REASON_LABELS: Record<DisputeReason, string> = {
  wrong_items: "Wrong items received",
  missing_items: "Missing items",
  food_quality: "Food quality issue",
  no_show: "Buyer/seller didn't show",
  rude_behavior: "Rude or inappropriate behavior",
  payment_issue: "Payment or charge issue",
  other: "Other",
};

const REASON_OPTIONS = Object.entries(REASON_LABELS) as [DisputeReason, string][];

export default function DisputeForm({ orderId, otherPartyName, onSubmitted }: DisputeFormProps) {
  const [reason, setReason] = useState<DisputeReason | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyFiled, setAlreadyFiled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Check if already filed
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("disputes")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAlreadyFiled(true);
        }
      });
  }, [orderId]);

  if (submitted) {
    return (
      <div className="bg-butcher-paper rounded-[6px] p-4 text-center">
        <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard font-semibold">
          Dispute filed.
        </p>
        <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk mt-1">
          We&apos;ll review it within 24 hours.
        </p>
      </div>
    );
  }

  if (alreadyFiled) {
    return (
      <div className="bg-butcher-paper rounded-[6px] p-4 text-center">
        <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
          You&apos;ve already filed a dispute for this order.
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        className="w-full min-h-[44px] py-2.5 font-[family-name:var(--font-body)] text-[12px] text-sidewalk hover:text-ketchup transition-colors underline underline-offset-2"
      >
        Report an issue with this order
      </button>
    );
  }

  async function handleSubmit() {
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const { fileDispute } = await import("@/app/(dashboard)/disputes/actions");
      const result = await fileDispute(orderId, reason, description);

      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
        onSubmitted?.();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-butcher-paper rounded-[6px] p-4 space-y-3">
      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk">
        REPORT ISSUE WITH {otherPartyName.toUpperCase()}
      </p>

      <label htmlFor="dispute-reason" className="sr-only">Dispute reason</label>
      <select
        id="dispute-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value as DisputeReason)}
        className="w-full bg-ticket rounded-[6px] border border-[#ddd4c4] px-3 py-2.5 font-[family-name:var(--font-body)] text-[13px] text-chalkboard focus:outline-none focus:border-ketchup focus:ring-2 focus:ring-ketchup/50 transition-colors appearance-none cursor-pointer"
      >
        <option value="" disabled>
          Select a reason...
        </option>
        {REASON_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label htmlFor="dispute-description" className="sr-only">Issue description</label>
      <textarea
        id="dispute-description"
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 500))}
        placeholder="Describe the issue..."
        rows={3}
        className="w-full bg-ticket rounded-[6px] border border-[#ddd4c4] px-3 py-2 font-[family-name:var(--font-body)] text-[12px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-ketchup focus:ring-2 focus:ring-ketchup/50 transition-colors resize-none"
      />
      <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk text-right">
        {description.length}/500
      </p>

      {error && (
        <p className="font-[family-name:var(--font-body)] text-[12px] text-ketchup" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex-1 min-h-[44px] py-2.5 bg-ticket border border-[#ddd4c4] text-sidewalk font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-colors hover:bg-butcher-paper"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !reason || !description.trim()}
          className="flex-1 min-h-[44px] py-2.5 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-all hover:bg-ketchup/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "SUBMIT DISPUTE"}
        </button>
      </div>
    </div>
  );
}
