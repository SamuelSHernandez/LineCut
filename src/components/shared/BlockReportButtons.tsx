"use client";

import { useState } from "react";
import type { ReportReason } from "@/app/(dashboard)/safety/actions";

interface BlockReportButtonsProps {
  /** The user ID of the person to block/report */
  targetUserId: string;
  /** Display name of the target */
  targetName: string;
  /** Optional order ID to attach to the report */
  orderId?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "inappropriate", label: "Inappropriate behavior" },
  { value: "fraud", label: "Fraud or scam" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
];

export default function BlockReportButtons({
  targetUserId,
  targetName,
  orderId,
}: BlockReportButtonsProps) {
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | "">("");
  const [reportDetails, setReportDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleBlock() {
    setBlocking(true);
    setError(null);

    try {
      const { blockUser } = await import(
        "@/app/(dashboard)/safety/actions"
      );
      const result = await blockUser(targetUserId);
      if (result.error) {
        setError(result.error);
      } else {
        setBlocked(true);
        setShowBlockConfirm(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBlocking(false);
    }
  }

  async function handleReport() {
    if (!reportReason) {
      setError("Please select a reason.");
      return;
    }
    setReporting(true);
    setError(null);

    try {
      const { reportUser } = await import(
        "@/app/(dashboard)/safety/actions"
      );
      const result = await reportUser(
        targetUserId,
        orderId ?? null,
        reportReason,
        reportDetails
      );
      if (result.error) {
        setError(result.error);
      } else {
        setReported(true);
        setShowReportForm(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setReporting(false);
    }
  }

  // Already completed states
  if (blocked && reported) {
    return (
      <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk text-center py-2">
        User blocked and reported.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p
          className="font-[family-name:var(--font-body)] text-[12px] text-ketchup"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Block confirmation dialog */}
      {showBlockConfirm && (
        <div className="bg-butcher-paper rounded-[6px] p-4 space-y-3">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
            Block {targetName}? They won&apos;t be able to see your sessions or
            send you orders, and you won&apos;t see theirs.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowBlockConfirm(false)}
              className="flex-1 min-h-[40px] py-2 bg-ticket border border-[#ddd4c4] text-sidewalk font-[family-name:var(--font-body)] text-[12px] font-semibold rounded-[6px] transition-colors hover:bg-butcher-paper"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleBlock}
              disabled={blocking}
              className="flex-1 min-h-[40px] py-2 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[12px] font-semibold rounded-[6px] transition-all disabled:opacity-50"
            >
              {blocking ? "..." : "BLOCK"}
            </button>
          </div>
        </div>
      )}

      {/* Report form */}
      {showReportForm && (
        <div className="bg-butcher-paper rounded-[6px] p-4 space-y-3">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk">
            REPORT {targetName.toUpperCase()}
          </p>

          <label htmlFor="report-reason" className="sr-only">Report reason</label>
          <select
            id="report-reason"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value as ReportReason)}
            className="w-full bg-ticket rounded-[6px] border border-[#ddd4c4] px-3 py-2.5 font-[family-name:var(--font-body)] text-[13px] text-chalkboard focus:outline-none focus:border-ketchup focus:ring-2 focus:ring-ketchup/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="" disabled>
              Select a reason...
            </option>
            {REPORT_REASONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label htmlFor="report-details" className="sr-only">Report details</label>
          <textarea
            id="report-details"
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value.slice(0, 1000))}
            placeholder="Tell us what happened (optional)..."
            rows={3}
            className="w-full bg-ticket rounded-[6px] border border-[#ddd4c4] px-3 py-2 font-[family-name:var(--font-body)] text-[12px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-ketchup focus:ring-2 focus:ring-ketchup/50 transition-colors resize-none"
          />
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk text-right">
            {reportDetails.length}/1000
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowReportForm(false)}
              className="flex-1 min-h-[40px] py-2 bg-ticket border border-[#ddd4c4] text-sidewalk font-[family-name:var(--font-body)] text-[12px] font-semibold rounded-[6px] transition-colors hover:bg-butcher-paper"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleReport}
              disabled={reporting || !reportReason}
              className="flex-1 min-h-[40px] py-2 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[12px] font-semibold rounded-[6px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reporting ? "Submitting..." : "SUBMIT REPORT"}
            </button>
          </div>
        </div>
      )}

      {/* Trigger buttons — subtle text links */}
      {!showBlockConfirm && !showReportForm && (
        <div className="flex items-center justify-center gap-4 py-1">
          {!blocked && (
            <button
              type="button"
              onClick={() => setShowBlockConfirm(true)}
              className="min-h-[44px] font-[family-name:var(--font-body)] text-[11px] text-sidewalk hover:text-ketchup transition-colors underline underline-offset-2"
            >
              Block this user
            </button>
          )}
          {blocked && (
            <span className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk">
              Blocked
            </span>
          )}
          {!reported && (
            <button
              type="button"
              onClick={() => setShowReportForm(true)}
              className="min-h-[44px] font-[family-name:var(--font-body)] text-[11px] text-sidewalk hover:text-ketchup transition-colors underline underline-offset-2"
            >
              Report
            </button>
          )}
          {reported && (
            <span className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk">
              Reported
            </span>
          )}
        </div>
      )}
    </div>
  );
}
