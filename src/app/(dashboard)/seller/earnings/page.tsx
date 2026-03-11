import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EarningsClient from "./EarningsClient";

export interface EarningsTransaction {
  id: string;
  restaurantName: string;
  buyerName: string;
  sellerFee: number; // cents
  tipAmount: number; // cents (0 if no tip)
  completedAt: string;
  status: string;
}

export interface DailyEarnings {
  date: string; // YYYY-MM-DD
  total: number; // cents
}

export interface EarningsData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  tipsAllTime: number;
  recentTransactions: EarningsTransaction[];
  dailyBreakdown: DailyEarnings[];
  stripeConnectStatus: string;
  stripeConnectAccountId: string | null;
}

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "is_buyer, is_seller, stripe_connect_status, stripe_connect_account_id"
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  if (!profile.is_seller) {
    if (profile.is_buyer) redirect("/buyer");
    redirect("/auth/login");
  }

  // Fetch all completed orders for this seller
  const { data: completedOrders } = await supabase
    .from("orders")
    .select(
      "id, seller_fee, status, created_at, updated_at, restaurant_id, buyer_id"
    )
    .eq("seller_id", user.id)
    .eq("status", "completed")
    .order("updated_at", { ascending: false });

  const orders = completedOrders ?? [];

  // Fetch all succeeded tips for this seller
  const { data: sellerTips } = await supabase
    .from("tips")
    .select("order_id, amount, created_at")
    .eq("seller_id", user.id)
    .eq("status", "succeeded");

  const tips = sellerTips ?? [];

  // Build a map of order_id -> tip amount for quick lookup
  const tipsByOrderId = new Map(
    tips.map((t) => [t.order_id, t.amount])
  );

  // Calculate time-period earnings
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // Monday of this week
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysToMonday
  );

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  let allTime = 0;
  let tipsAllTime = 0;

  for (const order of orders) {
    const completedAt = new Date(order.updated_at);
    const fee = order.seller_fee;
    const tip = tipsByOrderId.get(order.id) ?? 0;
    const total = fee + tip;

    allTime += total;
    tipsAllTime += tip;

    if (completedAt >= startOfMonth) {
      thisMonth += total;
    }
    if (completedAt >= startOfWeek) {
      thisWeek += total;
    }
    if (completedAt >= startOfToday) {
      today += total;
    }
  }

  // Build last 7 days breakdown
  const dailyBreakdown: DailyEarnings[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i
    );
    const dateStr = date.toISOString().split("T")[0];
    const dayStart = date.getTime();
    const dayEnd = dayStart + 86400000;

    let dayTotal = 0;
    for (const order of orders) {
      const completedAt = new Date(order.updated_at).getTime();
      if (completedAt >= dayStart && completedAt < dayEnd) {
        dayTotal += order.seller_fee + (tipsByOrderId.get(order.id) ?? 0);
      }
    }

    dailyBreakdown.push({ date: dateStr, total: dayTotal });
  }

  // Fetch last 20 transactions with restaurant and buyer names
  const recentOrderIds = orders.slice(0, 20).map((o) => o.id);

  let recentTransactions: EarningsTransaction[] = [];

  if (recentOrderIds.length > 0) {
    // Fetch restaurant names
    const restaurantIds = [
      ...new Set(orders.slice(0, 20).map((o) => o.restaurant_id)),
    ];
    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("id, name")
      .in("id", restaurantIds);

    const restaurantMap = new Map(
      (restaurants ?? []).map((r) => [r.id, r.name])
    );

    // Fetch buyer names
    const buyerIds = [
      ...new Set(orders.slice(0, 20).map((o) => o.buyer_id)),
    ];
    const { data: buyers } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", buyerIds);

    const buyerMap = new Map(
      (buyers ?? []).map((b) => [b.id, b.display_name])
    );

    recentTransactions = orders.slice(0, 20).map((order) => ({
      id: order.id,
      restaurantName: restaurantMap.get(order.restaurant_id) ?? "Unknown",
      buyerName: buyerMap.get(order.buyer_id) ?? "Unknown",
      sellerFee: order.seller_fee,
      tipAmount: tipsByOrderId.get(order.id) ?? 0,
      completedAt: order.updated_at,
      status: order.status,
    }));
  }

  const earningsData: EarningsData = {
    today,
    thisWeek,
    thisMonth,
    allTime,
    tipsAllTime,
    recentTransactions,
    dailyBreakdown,
    stripeConnectStatus: profile.stripe_connect_status ?? "not_connected",
    stripeConnectAccountId: profile.stripe_connect_account_id ?? null,
  };

  return <EarningsClient data={earningsData} />;
}
