import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RestaurantCreateForm from "./RestaurantCreateForm";

export default async function AdminRestaurantsPage() {
  const supabase = await createClient();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard">
          RESTAURANTS
        </h1>
      </div>

      {/* Restaurant list */}
      <div className="space-y-3 mb-8">
        {(restaurants ?? []).map((r) => (
          <div
            key={r.id}
            className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <h2 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard">
                {r.name}
              </h2>
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mt-0.5">
                {r.address}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {(r.cuisine ?? []).map((c: string) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-full bg-butcher-paper border border-[#ddd4c4] font-[family-name:var(--font-body)] text-[11px] text-sidewalk"
                  >
                    {c}
                  </span>
                ))}
                <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] text-sidewalk">
                  {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                </span>
              </div>
            </div>
            <Link
              href={`/admin/restaurants/${r.id}`}
              className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-butcher-paper border border-[#ddd4c4] text-chalkboard hover:border-sidewalk transition-colors inline-flex items-center"
            >
              Edit
            </Link>
          </div>
        ))}

        {(!restaurants || restaurants.length === 0) && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
            No restaurants found.
          </p>
        )}
      </div>

      {/* Add restaurant form */}
      <div className="border-t border-dashed border-[#ddd4c4] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-[20px] tracking-[1px] text-chalkboard mb-4">
          ADD RESTAURANT
        </h2>
        <RestaurantCreateForm />
      </div>
    </div>
  );
}
