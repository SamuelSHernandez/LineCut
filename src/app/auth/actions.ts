"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error: string | null;
};

const FRIENDLY_ERRORS: Record<string, string> = {
  "User already registered": "An account with this email already exists.",
  "Invalid login credentials": "Incorrect email or password.",
  "Email rate limit exceeded": "Too many attempts. Try again in a few minutes.",
};

function friendlyError(message: string): string {
  if (FRIENDLY_ERRORS[message]) return FRIENDLY_ERRORS[message];
  if (process.env.NODE_ENV === "development") return message;
  return "Something went wrong. Please try again.";
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;
  const role = formData.get("role") as string;

  if (!email || !password || !displayName || !role) {
    return { error: "All fields are required." };
  }

  if (!["buyer", "seller"].includes(role)) {
    return { error: "Please select a valid role." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        is_buyer: role === "buyer",
        is_seller: role === "seller",
      },
    },
  });

  if (error) {
    return { error: friendlyError(error.message) };
  }

  // If no session, email confirmation is required
  if (data.user && !data.session) {
    redirect("/auth/check-email");
  }

  // Session exists — user is logged in, show their waitlist spot
  redirect("/waitlist");
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: friendlyError(error.message) };
  }

  // Redirect to the original destination, or role-based dashboard
  if (next && next.startsWith("/")) {
    redirect(next);
  }

  // Fetch profile to determine role-based redirect
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_buyer, is_seller")
    .single();

  // Default to seller (time-sensitive — already in line)
  if (profile?.is_seller) {
    redirect("/seller");
  }
  redirect("/buyer");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
