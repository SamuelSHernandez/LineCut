import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function WaitlistPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/waitlist");
  }

  // Get this user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_buyer, is_seller, created_at")
    .eq("id", user.id)
    .single();

  // Count how many profiles were created before this user
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .lte("created_at", profile?.created_at ?? new Date().toISOString());

  const position = count ?? 1;
  const displayName = profile?.display_name ?? "Friend";
  const firstName = displayName.split(" ")[0];
  const role = profile?.is_seller ? "seller" : "buyer";

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="font-[family-name:var(--font-body)] text-[13px] font-medium text-sidewalk hover:text-chalkboard transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </form>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          {/* Green success indicator */}
          <div className="w-20 h-20 rounded-full bg-[#DDEFDD] flex items-center justify-center mb-6">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2D6A2D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-[#2D6A2D] mb-3">
            You&apos;re in, {firstName}
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-[clamp(48px,10vw,80px)] leading-[0.9] tracking-[2px] mb-2">
            #{position}
          </h1>

          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-sidewalk mb-8">
            Your spot in line
          </p>

          {/* Deli ticket card */}
          <div className="bg-ticket rounded-[10px] border border-[#eee6d8] shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 w-full text-left">
            <div className="border-b border-dashed border-[#ddd4c4] pb-4 mb-4">
              <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                Waitlist Ticket
              </p>
              <p className="font-[family-name:var(--font-display)] text-[24px] tracking-[2px] mt-1">
                {displayName.toUpperCase()}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-dashed border-[#ddd4c4] pb-4 mb-4">
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                  Position
                </p>
                <p className="font-[family-name:var(--font-display)] text-[22px] text-[#2D6A2D]">
                  #{position}
                </p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                  Role
                </p>
                <p className="font-[family-name:var(--font-display)] text-[22px] text-ketchup">
                  {role === "seller" ? "EARNER" : "EATER"}
                </p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                  Status
                </p>
                <div className="mt-1">
                  <span className="inline-block bg-[#DDEFDD] text-[#2D6A2D] font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] px-3 py-1 rounded-full">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>

            <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk text-center uppercase">
              &#9986; &#8212; &#8212; &#8212; hold this ticket &#8212; &#8212; &#8212; &#9986;
            </p>
          </div>

          <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk mt-8 max-w-sm leading-relaxed">
            We&apos;re launching at Katz&apos;s Deli first. We&apos;ll let you know when it&apos;s go time.
          </p>

          <Link
            href="/"
            className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-medium hover:underline mt-4"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
