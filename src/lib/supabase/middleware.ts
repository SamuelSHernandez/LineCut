import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { features } from "@/lib/features";

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh the auth session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    if (user) {
      if (features.waitlistMode) {
        // In waitlist mode, lock authenticated users to /waitlist (allow /, /auth/*, /waitlist*)
        const isAllowed =
          path === "/" ||
          path === "/waitlist" ||
          path.startsWith("/waitlist/") ||
          path.startsWith("/auth");
        if (!isAllowed) {
          const url = request.nextUrl.clone();
          url.pathname = "/waitlist";
          return NextResponse.redirect(url);
        }
      } else {
        // Waitlist mode off: redirect /waitlist to dashboard
        if (path === "/waitlist" || path.startsWith("/waitlist/")) {
          const url = request.nextUrl.clone();
          url.pathname = "/buyer";
          return NextResponse.redirect(url);
        }
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("[Middleware] Session refresh failed:", error);
    return NextResponse.next({ request });
  }
}
