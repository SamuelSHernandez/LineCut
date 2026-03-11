import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyDisputes } from "./actions";
import type { DisputeReason, DisputeStatus } from "@/lib/types";

const REASON_LABELS: Record<DisputeReason, string> = {
  wrong_items: "Wrong items received",
  missing_items: "Missing items",
  food_quality: "Food quality issue",
  no_show: "Buyer/seller didn't show",
  rude_behavior: "Rude or inappropriate behavior",
  payment_issue: "Payment or charge issue",
  other: "Other",
};

function getStatusBadge(status: DisputeStatus) {
  switch (status) {
    case "open":
      return { label: "OPEN", bg: "bg-[#FFF3D6]", text: "text-[#8B6914]" };
    case "under_review":
      return { label: "UNDER REVIEW", bg: "bg-[#D6EAFF]", text: "text-[#1A5276]" };
    case "resolved_refund":
      return { label: "REFUNDED", bg: "bg-[#DDEFDD]", text: "text-[#2D6A2D]" };
    case "resolved_no_action":
      return { label: "CLOSED", bg: "bg-[#E8E8E8]", text: "text-[#4D4D4D]" };
    case "resolved_warning":
      return { label: "RESOLVED", bg: "bg-[#DDEFDD]", text: "text-[#2D6A2D]" };
    default:
      return { label: (status as string).toUpperCase(), bg: "bg-[#E8E8E8]", text: "text-[#4D4D4D]" };
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const disputes = await getMyDisputes();

  return (
    <div className="max-w-xl mx-auto px-5 py-8 space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] tracking-[2px] text-chalkboard">
        DISPUTES
      </h1>

      {disputes.length === 0 ? (
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-8 text-center">
          <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk">
            No disputes filed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const badge = getStatusBadge(dispute.status as DisputeStatus);
            return (
              <article
                key={dispute.id}
                className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk tracking-[1px]">
                    ORDER {dispute.orderId.slice(0, 8).toUpperCase()}
                  </span>
                  <span
                    className={`${badge.bg} ${badge.text} font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] px-2.5 py-1 rounded-full`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Reason */}
                <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-semibold">
                  {REASON_LABELS[dispute.reason as DisputeReason] ?? dispute.reason}
                </p>

                {/* Description */}
                <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mt-1">
                  {dispute.description}
                </p>

                {/* Resolution notes */}
                {dispute.resolutionNotes && (
                  <div className="mt-3 bg-[#DDEFDD] rounded-[6px] px-3 py-2">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] text-[#2D6A2D] mb-0.5">
                      RESOLUTION
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[12px] text-[#2D6A2D]">
                      {dispute.resolutionNotes}
                    </p>
                  </div>
                )}

                {/* Date */}
                <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk text-right mt-3">
                  {formatDate(dispute.createdAt)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
