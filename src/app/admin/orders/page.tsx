import { createClient } from "@/lib/supabase/server";

const statusColors: Record<string, string> = {
  pending: "bg-mustard/20 text-mustard",
  accepted: "bg-[#DDEFDD] text-[#2D6A2D]",
  "in-progress": "bg-[#D6E8F8] text-[#2A5B8C]",
  ready: "bg-[#DDEFDD] text-[#2D6A2D]",
  completed: "bg-sidewalk/20 text-sidewalk",
  cancelled: "bg-ketchup/20 text-ketchup",
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      buyer_id,
      seller_id,
      restaurant_id,
      status,
      total,
      created_at,
      buyer:profiles!orders_buyer_id_fkey(display_name),
      seller:profiles!orders_seller_id_fkey(display_name),
      restaurant:restaurants!orders_restaurant_id_fkey(name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard mb-6">
        ORDERS
      </h1>

      {(orders ?? []).length === 0 ? (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
          No orders yet.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-6 gap-3 px-4 py-2">
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              ORDER
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              BUYER
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              SELLER
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              RESTAURANT
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
              STATUS
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk text-right">
              TOTAL
            </span>
          </div>

          {(orders ?? []).map((order) => {
            const buyer = order.buyer as
              | { display_name: string }
              | { display_name: string }[]
              | null;
            const buyerName = Array.isArray(buyer)
              ? buyer[0]?.display_name ?? "Unknown"
              : buyer?.display_name ?? "Unknown";
            const seller = order.seller as
              | { display_name: string }
              | { display_name: string }[]
              | null;
            const sellerName = Array.isArray(seller)
              ? seller[0]?.display_name ?? "Unknown"
              : seller?.display_name ?? "Unknown";
            const rest = order.restaurant as
              | { name: string }
              | { name: string }[]
              | null;
            const restaurantName = Array.isArray(rest)
              ? rest[0]?.name ?? "Unknown"
              : rest?.name ?? "Unknown";
            const colorClass =
              statusColors[order.status] ?? "bg-sidewalk/20 text-sidewalk";

            return (
              <div
                key={order.id}
                className="grid grid-cols-6 gap-3 bg-ticket rounded-[10px] border border-[#eee6d8] px-4 py-3 items-center"
              >
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-chalkboard truncate">
                  {order.id.slice(0, 8)}...
                </span>
                <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard truncate">
                  {buyerName}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard truncate">
                  {sellerName}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard truncate">
                  {restaurantName}
                </span>
                <span>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] uppercase ${colorClass}`}
                  >
                    {order.status}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[13px] text-chalkboard text-right">
                  ${(order.total / 100).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
