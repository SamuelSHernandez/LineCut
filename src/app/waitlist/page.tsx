import { redirect } from "next/navigation";
import Link from "next/link";
import crypto from "crypto";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/auth/actions";
import WaitlistShare from "./WaitlistShare";

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
    .select("display_name, is_buyer, is_seller, created_at, email")
    .eq("id", user.id)
    .single();

  // Count how many profiles were created before this user
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .lte("created_at", profile?.created_at ?? new Date().toISOString());

  const displayName = profile?.display_name ?? "Friend";
  const firstName = displayName.split(" ")[0];
  const role = profile?.is_seller ? "seller" : "buyer";

  // Look up referral data from waitlist_entries, auto-creating if missing
  const userEmail = (profile?.email ?? user.email ?? "").toLowerCase().trim();
  const admin = getAdminClient();
  let { data: waitlistEntry } = await admin
    .from("waitlist_entries")
    .select("referral_code, referral_count, credit_earned, created_at")
    .eq("email", userEmail)
    .single();

  // Auto-create waitlist entry for signed-in users who don't have one
  if (!waitlistEntry && userEmail) {
    const referralCode = crypto.randomBytes(4).toString("base64url");
    const referredBy = user.user_metadata?.referred_by as string | undefined;

    // Validate the referral code exists before using it
    let validRef: string | null = null;
    if (referredBy) {
      const { data: referrer } = await admin
        .from("waitlist_entries")
        .select("referral_code")
        .eq("referral_code", referredBy)
        .single();
      if (referrer) validRef = referredBy;
    }

    const { data: newEntry } = await admin
      .from("waitlist_entries")
      .insert({ email: userEmail, referral_code: referralCode, referred_by: validRef })
      .select("referral_code, referral_count, credit_earned, created_at")
      .single();
    if (newEntry) {
      waitlistEntry = newEntry;
    }
  }

  // Position = profile order minus referral bumps
  const rawPosition = count ?? 1;
  const referralBump = (waitlistEntry?.referral_count ?? 0) * 5;
  const position = Math.max(1, rawPosition - referralBump);

  // Count total signups for "X people behind you"
  const { count: totalSignups } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const peopleBehind = Math.max(0, (totalSignups ?? 0) - position);

  // Referral card state
  const referralCount = Math.min(waitlistEntry?.referral_count ?? 0, 3);
  const referralsNeeded = 3 - referralCount;

  // Only the first 10 people are eligible for the $5 credit
  const creditEligible = rawPosition <= 10;
  const creditEarned = waitlistEntry?.credit_earned ?? false;

  return (
    <div className="min-h-screen flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="font-[family-name:var(--font-body)] text-[14px] font-medium text-sidewalk hover:text-chalkboard transition-colors cursor-pointer min-h-[44px] flex items-center"
          >
            Log Out
          </button>
        </form>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-8 sm:py-12">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-[#2D6A2D] mb-3">
            You&apos;re in, {firstName}
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-[clamp(48px,10vw,80px)] leading-[0.9] tracking-[2px] mb-2">
            #{position}
          </h1>

          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[3px] uppercase text-sidewalk mb-1">
            Your spot in line
          </p>
          {peopleBehind > 0 && (
            <p className="font-[family-name:var(--font-body)] text-[14px] italic text-sidewalk mb-8">
              {peopleBehind} {peopleBehind === 1 ? "person" : "people"} behind you
            </p>
          )}
          {peopleBehind === 0 && <div className="mb-8" />}

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

            <div className="flex justify-between border-b border-dashed border-[#ddd4c4] pb-4 mb-4">
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                  Position
                </p>
                <p className="font-[family-name:var(--font-display)] text-[22px] text-[#2D6A2D]">
                  #{position}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                  Role
                </p>
                <p className="font-[family-name:var(--font-display)] text-[22px] text-ketchup">
                  {role === "seller" ? "SELLER" : "BUYER"}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                  Referrals
                </p>
                <p className="font-[family-name:var(--font-display)] text-[22px] text-mustard">
                  {waitlistEntry?.referral_count ?? 0}
                </p>
              </div>
            </div>

            {/* Referral card */}
            {waitlistEntry && (
              <div className="mb-4">
                {creditEligible || creditEarned ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase">
                        {creditEarned ? "$5 Credit Earned" : "$5 Credit Card"}
                      </p>
                      <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk">
                        {referralCount}/3
                      </p>
                    </div>

                    {/* Three circles with connecting dashes */}
                    <div className="flex items-center justify-center gap-0 mb-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center">
                          {i > 0 && (
                            <div className={`w-6 border-t-2 border-dashed ${i <= referralCount ? "border-[#2D6A2D]" : "border-[#ddd4c4]"}`} />
                          )}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed transition-all ${
                              i < referralCount
                                ? "border-[#2D6A2D] bg-[#DDEFDD]"
                                : "border-[#ddd4c4] bg-transparent"
                            }`}
                          >
                            {i < referralCount && (
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M5 10l3.5 3.5L15 7" stroke="#2D6A2D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dynamic CTA text */}
                    {creditEarned ? (
                      <div className="text-center">
                        <p className="font-[family-name:var(--font-body)] text-[14px] text-[#2D6A2D] font-semibold">
                          $5 launch credit locked in
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-medium">
                          {referralCount === 0
                            ? "Refer 3 friends, get $5 off your first order"
                            : `${referralsNeeded} more ${referralsNeeded === 1 ? "friend" : "friends"} to unlock your $5 credit`}
                        </p>
                        <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk mt-0.5">
                          Each friend = skip 5 spots + they get in line too
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-medium">
                      Share with friends to skip ahead
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk mt-0.5">
                      Each friend who joins = you jump 5 spots
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk text-center uppercase">
              &#9986; &#8212; &#8212; &#8212; hold this ticket &#8212; &#8212; &#8212; &#9986;
            </p>
          </div>

          {/* Share section */}
          {waitlistEntry?.referral_code && (
            <WaitlistShare referralCode={waitlistEntry.referral_code} />
          )}

          <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk mt-10 max-w-sm leading-relaxed">
            Launching neighborhood by neighborhood.
            <br />
            NYC first &mdash; Spring 2026.
          </p>

          <Link
            href="/"
            className="font-[family-name:var(--font-mono)] text-[13px] tracking-[1px] text-ketchup font-medium hover:underline mt-4 min-h-[44px] flex items-center"
          >
            &larr; Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
