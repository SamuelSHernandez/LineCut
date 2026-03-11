"use client";

import { useProfile } from "@/lib/profile-context";

export default function VerificationBadges() {
  const profile = useProfile();

  const badges: { label: string; active: boolean }[] = [
    { label: "PHONE", active: profile.phoneVerified },
    { label: "PAYMENT", active: !!profile.paymentMethodLast4 },
    {
      label: "PAYOUTS",
      active: profile.stripeConnectStatus === "active",
    },
  ];

  // Only show relevant badges
  const visibleBadges = badges.filter((b) => {
    if (b.label === "PAYOUTS" && !profile.isSeller) return false;
    if (b.label === "PAYMENT" && !profile.isBuyer) return false;
    return true;
  });

  if (visibleBadges.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {visibleBadges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] uppercase ${
            badge.active
              ? "bg-[#DDEFDD] text-[#2D6A2D]"
              : "bg-[#E8E8E8] text-[#4D4D4D]"
          }`}
        >
          {badge.active ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5L4 7L8 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="3" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
          {badge.label}
        </span>
      ))}
    </div>
  );
}
