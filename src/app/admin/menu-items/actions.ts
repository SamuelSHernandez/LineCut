"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/buyer");
    // redirect() throws, but this satisfies TypeScript + makes intent explicit
    throw new Error("Unauthorized");
  }

  return supabase;
}

export async function createMenuItem(formData: FormData) {
  const supabase = await requireAdmin();

  const id = (formData.get("id") as string).trim();
  const restaurantId = (formData.get("restaurant_id") as string).trim();
  const name = (formData.get("name") as string).trim();
  const priceStr = formData.get("price") as string;
  const price = Math.round(parseFloat(priceStr) * 100); // dollars to cents
  const popular = formData.get("popular") === "on";
  const available = formData.get("available") !== "off";
  const sortOrder = parseInt(formData.get("sort_order") as string) || 0;
  const imageUrl = (formData.get("image_url") as string)?.trim() || null;

  if (!id || !restaurantId || !name || isNaN(price)) {
    return { error: "All fields are required." };
  }

  const { error } = await supabase.from("menu_items").insert({
    id,
    restaurant_id: restaurantId,
    name,
    price,
    popular,
    available,
    sort_order: sortOrder,
    image_url: imageUrl,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/menu-items");
  redirect("/admin/menu-items");
}

export async function updateMenuItem(id: string, formData: FormData) {
  const supabase = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const priceStr = formData.get("price") as string;
  const price = Math.round(parseFloat(priceStr) * 100); // dollars to cents
  const popular = formData.get("popular") === "on";
  const available = formData.get("available") === "on";
  const sortOrder = parseInt(formData.get("sort_order") as string) || 0;
  const imageUrl = (formData.get("image_url") as string)?.trim() || null;

  if (!name || isNaN(price)) {
    return { error: "Name and price are required." };
  }

  const { error } = await supabase
    .from("menu_items")
    .update({
      name,
      price,
      popular,
      available,
      sort_order: sortOrder,
      image_url: imageUrl,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/menu-items");
  return { success: true };
}

export async function deleteMenuItem(id: string) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/menu-items");
  redirect("/admin/menu-items");
}
