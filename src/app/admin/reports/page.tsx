import { createClient } from "@/lib/supabase/server";
import ReportsClient from "./ReportsClient";
import type { UserReport } from "./types";

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("user_reports")
    .select(
      `
      id,
      reporter_id,
      reported_id,
      order_id,
      reason,
      details,
      status,
      created_at,
      reviewed_at,
      admin_notes,
      reporter:profiles!user_reports_reporter_id_fkey(display_name),
      reported:profiles!user_reports_reported_id_fkey(display_name)
    `
    )
    .order("created_at", { ascending: false });

  const mappedReports: UserReport[] = (reports ?? []).map((r) => {
    const reporter = r.reporter as unknown as { display_name: string } | null;
    const reported = r.reported as unknown as { display_name: string } | null;
    return {
      id: r.id,
      reporterId: r.reporter_id,
      reportedId: r.reported_id,
      reporterName: reporter?.display_name ?? "Unknown",
      reportedName: reported?.display_name ?? "Unknown",
      orderId: r.order_id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      adminNotes: r.admin_notes,
    };
  });

  return <ReportsClient reports={mappedReports} />;
}
