"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateReportStatus(
  reportId: string,
  newStatus: "reviewed" | "dismissed" | "actioned",
  adminNotes: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Unauthorized." };
  }

  const { error } = await supabase
    .from("user_reports")
    .update({
      status: newStatus,
      admin_notes: adminNotes.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("Update report status error:", error);
    return { error: "Failed to update report." };
  }

  return { success: true };
}
