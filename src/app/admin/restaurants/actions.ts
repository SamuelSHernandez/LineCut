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
    throw new Error("Unauthorized");
  }

  return supabase;
}

export async function createRestaurant(formData: FormData) {
  const supabase = await requireAdmin();

  const id = (formData.get("id") as string).trim();
  const name = (formData.get("name") as string).trim();
  const address = (formData.get("address") as string).trim();
  const lat = parseFloat(formData.get("lat") as string);
  const lng = parseFloat(formData.get("lng") as string);
  const cuisineRaw = (formData.get("cuisine") as string).trim();
  const cuisine = cuisineRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const defaultWaitEstimate =
    (formData.get("default_wait_estimate") as string)?.trim() || "~15 min";

  if (!id || !name || !address || isNaN(lat) || isNaN(lng)) {
    return { error: "All fields are required." };
  }

  const { error } = await supabase.from("restaurants").insert({
    id,
    name,
    address,
    lat,
    lng,
    cuisine,
    default_wait_estimate: defaultWaitEstimate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/restaurants");
  redirect("/admin/restaurants");
}

export async function updateRestaurant(id: string, formData: FormData) {
  const supabase = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const address = (formData.get("address") as string).trim();
  const lat = parseFloat(formData.get("lat") as string);
  const lng = parseFloat(formData.get("lng") as string);
  const cuisineRaw = (formData.get("cuisine") as string).trim();
  const cuisine = cuisineRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const defaultWaitEstimate =
    (formData.get("default_wait_estimate") as string)?.trim() || "~15 min";

  if (!name || !address || isNaN(lat) || isNaN(lng)) {
    return { error: "All fields are required." };
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      address,
      lat,
      lng,
      cuisine,
      default_wait_estimate: defaultWaitEstimate,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${id}`);
  redirect("/admin/restaurants");
}

export async function deleteRestaurant(id: string) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("restaurants").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/restaurants");
  redirect("/admin/restaurants");
}
