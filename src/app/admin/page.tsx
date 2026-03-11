import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoISO = monthAgo.toISOString();

  // ── Core stats (parallel) ──────────────────────────────────
  const [
    { count: totalOrders },
    { count: todayOrders },
    { count: weekOrders },
    { count: monthOrders },
    { count: activeSellers },
    { count: openDisputes },
    { data: revenueDataAll },
    { data: revenueDataToday },
    { data: revenueDataWeek },
    { data: revenueDataMonth },
    { count: completedMonth },
    { count: totalMonth },
    { data: avgOrderData },
    { count: newSignupsWeek },
  ] = await Promise.all([
    // Order counts
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgoISO),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthAgoISO),
    // Active sellers
    supabase
      .from("seller_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Open disputes
    supabase
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    // Revenue (all time)
    supabase.from("orders").select("platform_fee").eq("status", "completed"),
    // Revenue (today)
    supabase
      .from("orders")
      .select("platform_fee")
      .eq("status", "completed")
      .gte("created_at", todayISO),
    // Revenue (week)
    supabase
      .from("orders")
      .select("platform_fee")
      .eq("status", "completed")
      .gte("created_at", weekAgoISO),
    // Revenue (month)
    supabase
      .from("orders")
      .select("platform_fee")
      .eq("status", "completed")
      .gte("created_at", monthAgoISO),
    // Completion rate numerator (last 30 days)
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", monthAgoISO),
    // Completion rate denominator (last 30 days)
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthAgoISO),
    // Average order value (last 30 days, completed only)
    supabase
      .from("orders")
      .select("total")
      .eq("status", "completed")
      .gte("created_at", monthAgoISO),
    // New signups this week
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgoISO),
  ]);

  // ── Activity feed: last 10 significant events from source tables ──
  const [
    { data: recentOrders },
    { data: recentDisputes },
    { data: recentSessions },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, status, created_at, updated_at, total, buyer:profiles!orders_buyer_id_fkey ( display_name )"
      )
      .in("status", ["completed", "cancelled"])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("disputes")
      .select("id, reason, created_at, order_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("seller_sessions")
      .select(
        "id, status, created_at, seller:profiles!seller_sessions_seller_id_fkey ( display_name ), restaurant:restaurants!seller_sessions_restaurant_id_fkey ( name )"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // ── Computed values ──
  const sumFees = (rows: { platform_fee: number }[] | null) =>
    ((rows ?? []).reduce((s, o) => s + (o.platform_fee || 0), 0) / 100).toFixed(
      2
    );

  const totalRevenue = sumFees(revenueDataAll);
  const todayRevenue = sumFees(revenueDataToday);
  const weekRevenue = sumFees(revenueDataWeek);
  const monthRevenue = sumFees(revenueDataMonth);

  const completionRate =
    totalMonth && totalMonth > 0
      ? Math.round(((completedMonth ?? 0) / totalMonth) * 100)
      : 0;

  const avgOrderValue =
    avgOrderData && avgOrderData.length > 0
      ? (
          avgOrderData.reduce((s, o) => s + (o.total || 0), 0) /
          avgOrderData.length /
          100
        ).toFixed(2)
      : "0.00";

  // ── Build activity feed ──
  type FeedItem = { time: string; label: string };
  const feedItems: FeedItem[] = [];

  for (const o of recentOrders ?? []) {
    const buyer = o.buyer as unknown as { display_name: string } | null;
    const name = buyer?.display_name ?? "Someone";
    const dollars = ((o.total ?? 0) / 100).toFixed(2);
    feedItems.push({
      time: o.updated_at,
      label:
        o.status === "completed"
          ? `Order completed - ${name} ($${dollars})`
          : `Order cancelled - ${name} ($${dollars})`,
    });
  }

  for (const d of recentDisputes ?? []) {
    feedItems.push({
      time: d.created_at,
      label: `Dispute filed on order ${(d.order_id as string).slice(0, 8)}...`,
    });
  }

  for (const s of recentSessions ?? []) {
    const seller = s.seller as unknown as { display_name: string } | null;
    const restaurant = s.restaurant as unknown as { name: string } | null;
    feedItems.push({
      time: s.created_at,
      label: `${seller?.display_name ?? "Seller"} went live at ${restaurant?.name ?? "a restaurant"}`,
    });
  }

  feedItems.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );
  const feed = feedItems.slice(0, 10);

  // ── Stat card definition ──
  const overviewStats = [
    { label: "TOTAL ORDERS", value: totalOrders ?? 0 },
    { label: "TODAY", value: todayOrders ?? 0 },
    { label: "THIS WEEK", value: weekOrders ?? 0 },
    { label: "THIS MONTH", value: monthOrders ?? 0 },
    { label: "ACTIVE SELLERS", value: activeSellers ?? 0 },
    { label: "OPEN DISPUTES", value: openDisputes ?? 0 },
  ];

  const funnelStats = [
    { label: "COMPLETION RATE (30D)", value: `${completionRate}%` },
    { label: "AVG ORDER VALUE (30D)", value: `$${avgOrderValue}` },
    { label: "NEW SIGNUPS (7D)", value: newSignupsWeek ?? 0 },
  ];

  const revenueStats = [
    { label: "REVENUE TODAY", value: `$${todayRevenue}` },
    { label: "REVENUE THIS WEEK", value: `$${weekRevenue}` },
    { label: "REVENUE THIS MONTH", value: `$${monthRevenue}` },
    { label: "REVENUE ALL TIME", value: `$${totalRevenue}` },
  ];

  return (
    <div className="space-y-10">
      {/* ── Overview ── */}
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard mb-6">
          DASHBOARD
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {overviewStats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </section>

      {/* ── Funnel Metrics ── */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[2px] text-chalkboard mb-4">
          FUNNEL METRICS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {funnelStats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </section>

      {/* ── Revenue ── */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[2px] text-chalkboard mb-4">
          PLATFORM REVENUE
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {revenueStats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </section>

      {/* ── Activity Feed ── */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[2px] text-chalkboard mb-4">
          RECENT ACTIVITY
        </h2>
        {feed.length === 0 ? (
          <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk">
            No recent activity.
          </p>
        ) : (
          <div className="bg-ticket rounded-[10px] border border-[#eee6d8] divide-y divide-dashed divide-[#ddd4c4]">
            {feed.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk shrink-0 pt-0.5">
                  {formatRelative(item.time)}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Helpers ──

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5">
      <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-[28px] tracking-[1px] text-chalkboard">
        {value}
      </p>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
