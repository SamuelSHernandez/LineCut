import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import RestaurantEditForm from "./RestaurantEditForm";

interface RestaurantEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function RestaurantEditPage({
  params,
}: RestaurantEditPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();

  if (!restaurant) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/restaurants"
        className="inline-flex items-center gap-1.5 min-h-[44px] py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk hover:text-chalkboard transition-colors mb-4"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 2L4 7L9 12" />
        </svg>
        BACK TO RESTAURANTS
      </Link>

      <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard mb-6">
        EDIT: {restaurant.name}
      </h1>

      <RestaurantEditForm restaurant={restaurant} />
    </div>
  );
}
