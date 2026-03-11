import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrderHistoryClient from "./OrderHistoryClient";

export interface OrderHistoryItem {
  id: string;
  buyerId: string;
  sellerId: string;
  restaurantName: string;
  otherPartyName: string;
  status: string;
  items: { name: string; quantity: number; price: number }[];
  itemsSubtotal: number;
  sellerFee: number;
  platformFee: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch orders where user is buyer or seller, with restaurant name
  // RLS ensures we only get orders the user is party to
  const { data: rows } = await supabase
    .from("orders")
    .select(
      `
      id,
      buyer_id,
      seller_id,
      restaurant_id,
      status,
      items,
      items_subtotal,
      seller_fee,
      platform_fee,
      total,
      created_at,
      updated_at,
      restaurants ( name ),
      buyer:profiles!orders_buyer_id_fkey ( display_name ),
      seller:profiles!orders_seller_id_fkey ( display_name )
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const orders: OrderHistoryItem[] = (rows ?? []).map((row) => {
    const isBuyer = row.buyer_id === user.id;
    // Supabase returns joined single row as object (not array)
    const restaurant = row.restaurants as unknown as { name: string } | null;
    const buyer = row.buyer as unknown as { display_name: string } | null;
    const seller = row.seller as unknown as { display_name: string } | null;

    return {
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      restaurantName: restaurant?.name ?? "Unknown restaurant",
      otherPartyName: isBuyer
        ? seller?.display_name ?? "Seller"
        : buyer?.display_name ?? "Buyer",
      status: row.status,
      items: (row.items as { name: string; quantity: number; price: number }[]) ?? [],
      itemsSubtotal: row.items_subtotal,
      sellerFee: row.seller_fee,
      platformFee: row.platform_fee,
      total: row.total,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return <OrderHistoryClient orders={orders} userId={user.id} />;
}
