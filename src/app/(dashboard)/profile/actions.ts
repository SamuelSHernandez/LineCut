"use server";

import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";

export type ProfileActionState = {
  error: string | null;
  success?: boolean;
};

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const { supabase, user } = await getAuthenticatedUser();

  const displayName = formData.get("displayName") as string;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const bio = formData.get("bio") as string | null;
  const neighborhood = formData.get("neighborhood") as string | null;

  if (!displayName?.trim()) {
    return { error: "Display name is required." };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    return { error: "Please enter a valid email address." };
  }

  if (bio && bio.length > 160) {
    return { error: "Bio must be 160 characters or less." };
  }

  // Fetch current profile to detect phone/email changes
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("phone, email")
    .eq("id", user.id)
    .single();

  const updateData: Record<string, unknown> = {
    display_name: displayName.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    bio: bio?.trim() || null,
    neighborhood: neighborhood?.trim() || null,
  };

  // Reset verification flags when phone/email changes
  if (currentProfile) {
    if ((phone?.trim() || null) !== (currentProfile.phone || null)) {
      updateData.phone_verified = false;
    }
    if ((email?.trim() || null) !== (currentProfile.email || null)) {
      updateData.email_verified = false;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    console.error("[updateProfile] Supabase error:", error.message, error.code, error.details);
    return { error: "Failed to update profile. Please try again." };
  }

  revalidatePath("/profile", "layout");
  return { error: null, success: true };
}

export async function toggleRole(role: "buyer" | "seller", enable: boolean) {
  const { supabase, user } = await getAuthenticatedUser();

  // Fetch current profile to enforce at-least-one-role
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_buyer, is_seller")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found." };
  }

  // Prevent removing the last role
  if (!enable) {
    const otherRole = role === "buyer" ? profile.is_seller : profile.is_buyer;
    if (!otherRole) {
      return { error: "You must have at least one role." };
    }
  }

  const update =
    role === "buyer" ? { is_buyer: enable } : { is_seller: enable };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return { error: "Failed to update role. Please try again." };
  }

  revalidatePath("/profile", "layout");
  return { success: true };
}

export async function createSetupIntent() {
  const { user } = await getAuthenticatedUser();
  const admin = getAdminClient();

  // Get or create Stripe customer
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, display_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found." };
  }

  let customerId = profile.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.display_name,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { supabase_user_id: user.id },
  });

  return { clientSecret: setupIntent.client_secret };
}

export async function syncPaymentMethod() {
  const { user } = await getAuthenticatedUser();
  const admin = getAdminClient();

  console.log("[syncPaymentMethod] userId:", user.id);
  console.log("[syncPaymentMethod] SERVICE_ROLE_KEY set:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile, error: selectError } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  console.log("[syncPaymentMethod] profile select:", { profile, selectError });

  if (!profile?.stripe_customer_id) {
    return { error: "No Stripe customer found." };
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: profile.stripe_customer_id,
    type: "card",
    limit: 1,
  });

  console.log("[syncPaymentMethod] Stripe PMs found:", paymentMethods.data.length, paymentMethods.data[0]?.card?.last4);

  const pm = paymentMethods.data[0];
  if (!pm?.card) {
    return { error: "No card found on Stripe customer." };
  }

  const updatePayload = {
    payment_method_last4: pm.card.last4,
    payment_method_brand: pm.card.brand,
    payment_method_exp_month: pm.card.exp_month,
    payment_method_exp_year: pm.card.exp_year,
  };
  console.log("[syncPaymentMethod] Updating profile with:", updatePayload);

  const { error: updateError, count } = await admin
    .from("profiles")
    .update(updatePayload, { count: "exact" })
    .eq("id", user.id);

  console.log("[syncPaymentMethod] Update result — error:", updateError, "count:", count);

  if (updateError) {
    console.error("[syncPaymentMethod] Profile update failed:", updateError);
    return { error: "Failed to save card details." };
  }

  revalidatePath("/profile", "layout");
  return { success: true };
}

export async function detachPaymentMethod() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return { error: "No payment method on file." };
  }

  // List and detach all payment methods
  const paymentMethods = await stripe.paymentMethods.list({
    customer: profile.stripe_customer_id,
    type: "card",
  });

  for (const pm of paymentMethods.data) {
    await stripe.paymentMethods.detach(pm.id);
  }

  await supabase
    .from("profiles")
    .update({
      payment_method_last4: null,
      payment_method_brand: null,
      payment_method_exp_month: null,
      payment_method_exp_year: null,
    })
    .eq("id", user.id);

  revalidatePath("/profile", "layout");
  return { success: true };
}

export async function createConnectAccount() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, display_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found." };
  }

  let accountId = profile.stripe_connect_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: { supabase_user_id: user.id },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;

    await supabase
      .from("profiles")
      .update({
        stripe_connect_account_id: accountId,
        stripe_connect_status: "pending",
      })
      .eq("id", user.id);
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appOrigin}/api/stripe/connect/refresh`,
    return_url: `${appOrigin}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  return { url: accountLink.url };
}

export async function createConnectLoginLink() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_connect_account_id) {
    return { error: "No connected account found." };
  }

  const loginLink = await stripe.accounts.createLoginLink(
    profile.stripe_connect_account_id
  );

  return { url: loginLink.url };
}

export async function updateMaxOrderCap(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  const capDollars = Number(formData.get("maxOrderCap"));
  if (isNaN(capDollars) || capDollars < 10 || capDollars > 200) {
    return { error: "Max order cap must be between $10 and $200." };
  }

  const capCents = Math.round(capDollars * 100);

  const { error } = await supabase
    .from("profiles")
    .update({ max_order_cap: capCents })
    .eq("id", user.id);

  if (error) {
    return { error: "Failed to update. Please try again." };
  }

  revalidatePath("/profile", "layout");
  return { error: null, success: true };
}

export async function uploadAvatar(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) {
    return { error: "No file provided." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "File must be under 2MB." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: "Failed to upload avatar. Please try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  // Add cache-bust query param
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  revalidatePath("/profile", "layout");
  return { success: true, avatarUrl };
}
