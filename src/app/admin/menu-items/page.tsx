import { createClient } from "@/lib/supabase/server";
import MenuItemRow from "./MenuItemRow";
import MenuItemCreateForm from "./MenuItemCreateForm";

interface DbMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  popular: boolean;
  available: boolean;
  sort_order: number;
}

export default async function AdminMenuItemsPage() {
  const supabase = await createClient();

  const [{ data: menuItems }, { data: restaurants }] = await Promise.all([
    supabase
      .from("menu_items")
      .select("*")
      .order("restaurant_id", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("restaurants").select("id, name").order("name"),
  ]);

  // Group by restaurant
  const grouped: Record<string, { name: string; items: DbMenuItem[] }> = {};
  for (const r of restaurants ?? []) {
    grouped[r.id] = { name: r.name, items: [] };
  }
  for (const item of (menuItems ?? []) as DbMenuItem[]) {
    if (!grouped[item.restaurant_id]) {
      grouped[item.restaurant_id] = { name: item.restaurant_id, items: [] };
    }
    grouped[item.restaurant_id].items.push(item);
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard mb-6">
        MENU ITEMS
      </h1>

      {Object.entries(grouped).map(([restaurantId, { name, items }]) => (
        <div key={restaurantId} className="mb-8">
          <h2 className="font-[family-name:var(--font-display)] text-[20px] tracking-[1px] text-chalkboard mb-3">
            {name}
          </h2>

          {items.length > 0 ? (
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <MenuItemRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
              No menu items yet.
            </p>
          )}

          <MenuItemCreateForm restaurantId={restaurantId} />
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
          No restaurants found. Add restaurants first.
        </p>
      )}
    </div>
  );
}
