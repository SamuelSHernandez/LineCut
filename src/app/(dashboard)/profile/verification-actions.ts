"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendPhoneOtp(phone: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  if (!phone?.trim()) {
    return { error: "Phone number is required." };
  }

  const { error } = await supabase.auth.updateUser({ phone: phone.trim() });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  if (!code?.trim() || code.trim().length !== 6) {
    return { error: "Please enter a 6-digit code." };
  }

  const { error } = await supabase.auth.verifyOtp({
    phone: phone.trim(),
    token: code.trim(),
    type: "phone_change",
  });

  if (error) {
    return { error: error.message };
  }

  // Mark phone as verified in profiles
  await supabase
    .from("profiles")
    .update({ phone_verified: true })
    .eq("id", user.id);

  revalidatePath("/profile", "layout");
  return { success: true };
}

export async function sendEmailOtp(email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  if (!email?.trim()) {
    return { error: "Email is required." };
  }

  const { error } = await supabase.auth.updateUser({ email: email.trim() });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function verifyEmailOtp(email: string, code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  if (!code?.trim() || code.trim().length !== 6) {
    return { error: "Please enter a 6-digit code." };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: "email_change",
  });

  if (error) {
    return { error: error.message };
  }

  // Mark email as verified in profiles
  await supabase
    .from("profiles")
    .update({ email_verified: true })
    .eq("id", user.id);

  revalidatePath("/profile", "layout");
  return { success: true };
}
