import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DisputeResolveForm from "./DisputeResolveForm";

interface DisputeResolvePageProps {
  params: Promise<{ id: string }>;
}

export default async function DisputeResolvePage({
  params,
}: DisputeResolvePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dispute } = await supabase
    .from("disputes")
    .select(
      `
      id,
      order_id,
      reporter_id,
      reporter_role,
      reason,
      description,
      status,
      resolution_notes,
      resolved_at,
      created_at,
      reporter:profiles!disputes_reporter_id_fkey(display_name)
    `
    )
    .eq("id", id)
    .single();

  if (!dispute) {
    notFound();
  }

  const reporter = dispute.reporter as
    | { display_name: string }
    | { display_name: string }[]
    | null;
  const reporterName = Array.isArray(reporter)
    ? reporter[0]?.display_name ?? "Unknown"
    : reporter?.display_name ?? "Unknown";

  const isResolvable =
    dispute.status === "open" || dispute.status === "under_review";

  return (
    <div>
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1.5 min-h-[44px] py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk hover:text-chalkboard transition-colors mb-4"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 2L4 7L9 12" />
        </svg>
        BACK TO DISPUTES
      </Link>

      <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard mb-6">
        DISPUTE DETAILS
      </h1>

      <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              ORDER ID
            </span>
            <p className="font-[family-name:var(--font-mono)] text-[13px] text-chalkboard mt-0.5">
              {String(dispute.order_id).slice(0, 8)}...
            </p>
          </div>
          <div>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              STATUS
            </span>
            <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard mt-0.5 capitalize">
              {dispute.status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              REPORTER
            </span>
            <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard mt-0.5">
              {reporterName} ({dispute.reporter_role})
            </p>
          </div>
          <div>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              REASON
            </span>
            <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard mt-0.5 capitalize">
              {dispute.reason.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <div className="border-t border-dashed border-[#ddd4c4] pt-3">
          <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
            DESCRIPTION
          </span>
          <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard mt-1">
            {dispute.description}
          </p>
        </div>

        <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk">
          Filed{" "}
          {new Date(dispute.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      {isResolvable ? (
        <DisputeResolveForm disputeId={dispute.id} />
      ) : (
        <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5">
          <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-medium mb-1">
            This dispute has already been resolved.
          </p>
          {dispute.resolution_notes && (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
              Notes: {dispute.resolution_notes}
            </p>
          )}
          {dispute.resolved_at && (
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk mt-2">
              Resolved{" "}
              {new Date(dispute.resolved_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
