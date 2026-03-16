import { getAdminClient } from "@/lib/supabase/admin";

export default async function WaitlistCount() {
  let count = 0;
  try {
    const admin = getAdminClient();
    const { count: c } = await admin
      .from("waitlist_entries")
      .select("*", { count: "exact", head: true });
    count = c ?? 0;
  } catch {
    // Silently fail — don't break the page
  }

  if (count < 10) return null;

  return (
    <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] text-ticket/50 mb-6">
      {count} {count === 1 ? "person" : "people"} waiting for launch
    </p>
  );
}
