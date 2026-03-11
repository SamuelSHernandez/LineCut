import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const statusColors: Record<string, string> = {
  open: "bg-ketchup/20 text-ketchup",
  under_review: "bg-mustard/20 text-mustard",
  resolved_refund: "bg-[#DDEFDD] text-[#2D6A2D]",
  resolved_no_action: "bg-sidewalk/20 text-sidewalk",
  resolved_warning: "bg-[#D6E8F8] text-[#2A5B8C]",
};

const statusLabels: Record<string, string> = {
  open: "OPEN",
  under_review: "UNDER REVIEW",
  resolved_refund: "REFUND",
  resolved_no_action: "NO ACTION",
  resolved_warning: "WARNING",
};

export default async function AdminDisputesPage() {
  const supabase = await createClient();

  const { data: disputes } = await supabase
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
      created_at,
      reporter:profiles!disputes_reporter_id_fkey(display_name)
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard mb-6">
        DISPUTES
      </h1>

      {(disputes ?? []).length === 0 ? (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
          No disputes yet.
        </p>
      ) : (
        <div className="space-y-3">
          {(disputes ?? []).map((d) => {
            const reporter = d.reporter as
              | { display_name: string }
              | { display_name: string }[]
              | null;
            const reporterName = Array.isArray(reporter)
              ? reporter[0]?.display_name ?? "Unknown"
              : reporter?.display_name ?? "Unknown";
            const colorClass =
              statusColors[d.status] ?? "bg-sidewalk/20 text-sidewalk";
            const statusLabel = statusLabels[d.status] ?? d.status;
            const isOpen =
              d.status === "open" || d.status === "under_review";

            return (
              <div
                key={d.id}
                className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk">
                        Order: {String(d.order_id).slice(0, 8)}...
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] ${colorClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-medium">
                      {d.reason.replace(/_/g, " ").toUpperCase()}
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mt-1">
                      Reported by {reporterName} ({d.reporter_role})
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk mt-1 line-clamp-2">
                      {d.description}
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk mt-2">
                      {new Date(d.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isOpen && (
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-ketchup text-ticket inline-flex items-center shrink-0"
                    >
                      Resolve
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
