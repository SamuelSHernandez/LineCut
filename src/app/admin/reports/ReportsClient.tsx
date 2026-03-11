"use client";

import { useState } from "react";
import Link from "next/link";
import { updateReportStatus } from "./actions";
import type { UserReport } from "./types";
import { statusColors, statusLabels } from "./types";

const REASON_LABELS: Record<string, string> = {
  inappropriate: "Inappropriate behavior",
  fraud: "Fraud or scam",
  harassment: "Harassment",
  other: "Other",
};

export default function ReportsClient({
  reports: initialReports,
}: {
  reports: UserReport[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(
    reportId: string,
    newStatus: "dismissed" | "actioned"
  ) {
    setProcessing(true);
    setError(null);

    try {
      const result = await updateReportStatus(reportId, newStatus, adminNotes);
      if (result.error) {
        setError(result.error);
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: newStatus,
                  reviewedAt: new Date().toISOString(),
                  adminNotes: adminNotes || null,
                }
              : r
          )
        );
        setExpandedId(null);
        setAdminNotes("");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard mb-6">
        USER REPORTS
      </h1>

      {reports.length === 0 ? (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
          No user reports yet.
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const colorClass =
              statusColors[r.status] ?? "bg-sidewalk/20 text-sidewalk";
            const label = statusLabels[r.status] ?? r.status.toUpperCase();
            const isPending = r.status === "pending";
            const isExpanded = expandedId === r.id;

            return (
              <div
                key={r.id}
                className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2.5 py-1 rounded-full font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] ${colorClass}`}
                      >
                        {label}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk">
                        {REASON_LABELS[r.reason] ?? r.reason}
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-medium">
                      {r.reporterName} reported {r.reportedName}
                    </p>
                    {r.orderId && (
                      <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk mt-1">
                        Order:{" "}
                        <Link
                          href={`/admin/orders`}
                          className="underline underline-offset-2 hover:text-chalkboard"
                        >
                          {r.orderId.slice(0, 8)}...
                        </Link>
                      </p>
                    )}
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk mt-2">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isPending && !isExpanded && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(r.id);
                        setAdminNotes(r.adminNotes ?? "");
                        setError(null);
                      }}
                      className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-ketchup text-ticket inline-flex items-center shrink-0"
                    >
                      Review
                    </button>
                  )}
                </div>

                {/* Expanded detail view */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-dashed border-[#ddd4c4] pt-4">
                    {r.details && (
                      <div>
                        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-1">
                          DETAILS
                        </p>
                        <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
                          {r.details}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-1">
                        ADMIN NOTES
                      </p>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about your decision..."
                        rows={2}
                        className="w-full bg-butcher-paper rounded-[6px] border border-[#ddd4c4] px-3 py-2 font-[family-name:var(--font-body)] text-[12px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-ketchup focus:ring-2 focus:ring-ketchup/50 transition-colors resize-none"
                      />
                    </div>

                    {error && (
                      <p
                        className="font-[family-name:var(--font-body)] text-[12px] text-ketchup"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(null);
                          setError(null);
                        }}
                        className="min-h-[40px] px-4 py-2 bg-ticket border border-[#ddd4c4] text-sidewalk font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-colors hover:bg-butcher-paper"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(r.id, "dismissed")}
                        disabled={processing}
                        className="min-h-[40px] px-4 py-2 bg-sidewalk/20 text-sidewalk font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-all disabled:opacity-50"
                      >
                        {processing ? "..." : "Dismiss"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(r.id, "actioned")}
                        disabled={processing}
                        className="min-h-[40px] px-4 py-2 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-all disabled:opacity-50"
                      >
                        {processing ? "..." : "Take Action"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Show admin notes for resolved reports */}
                {!isPending && r.adminNotes && (
                  <div className="mt-3 border-t border-dashed border-[#ddd4c4] pt-3">
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-1">
                      ADMIN NOTES
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
                      {r.adminNotes}
                    </p>
                    {r.reviewedAt && (
                      <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk/60 mt-1">
                        Reviewed{" "}
                        {new Date(r.reviewedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
