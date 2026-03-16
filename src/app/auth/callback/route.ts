import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  try {
    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // If explicit next param, use it
        if (next && next.startsWith("/") && !next.startsWith("//")) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        // Otherwise, route based on role
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.redirect(`${origin}/auth/login`);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_buyer, is_seller")
          .eq("id", user.id)
          .single();

        const destination = profile?.is_seller ? "/seller" : "/buyer";
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  } catch (error) {
    console.error("[Auth Callback] Failed:", error);
  }

  // Auth error — redirect to login with error hint
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}
