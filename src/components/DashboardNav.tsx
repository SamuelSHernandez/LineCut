"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { useProfile } from "@/lib/profile-context";
import { logout } from "@/app/auth/actions";

export default function DashboardNav() {
  const profile = useProfile();
  const pathname = usePathname();
  const isBuyerView = pathname.startsWith("/buyer");
  const isDualRole = profile.isBuyer && profile.isSeller;

  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav aria-label="Main navigation" className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-dashed border-[#ddd4c4]">
      {/* Left: Logo */}
      <Link href={isBuyerView ? "/buyer" : "/seller"}>
        <Logo size="sm" />
      </Link>

      {/* Center: Role switcher (dual-role only) */}
      {isDualRole && (
        <div className="flex gap-0" role="tablist" aria-label="View mode">
          <Link
            href="/buyer"
            role="tab"
            aria-selected={isBuyerView}
            className={`px-4 py-2 min-h-[44px] flex items-center font-[family-name:var(--font-body)] text-[13px] font-${isBuyerView ? "semibold" : "normal"} transition-colors ${
              isBuyerView
                ? "text-chalkboard border-b-2 border-ketchup"
                : "text-sidewalk border-b-2 border-transparent hover:text-chalkboard"
            }`}
          >
            HUNGRY
          </Link>
          <Link
            href="/seller"
            role="tab"
            aria-selected={!isBuyerView}
            className={`px-4 py-2 min-h-[44px] flex items-center font-[family-name:var(--font-body)] text-[13px] font-${!isBuyerView ? "semibold" : "normal"} transition-colors ${
              !isBuyerView
                ? "text-chalkboard border-b-2 border-mustard"
                : "text-sidewalk border-b-2 border-transparent hover:text-chalkboard"
            }`}
          >
            IN LINE
          </Link>
        </div>
      )}

      {/* Right: Avatar + name + logout */}
      <div className="flex items-center gap-3">
        {profile.isSeller && !isBuyerView && (
          <Link
            href="/seller/earnings"
            className={`font-[family-name:var(--font-body)] text-[13px] transition-colors hidden sm:inline ${
              pathname.startsWith("/seller/earnings")
                ? "text-chalkboard font-semibold"
                : "text-sidewalk hover:text-chalkboard"
            }`}
          >
            Earnings
          </Link>
        )}
        <Link
          href="/orders"
          className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors hidden sm:inline-flex sm:items-center sm:min-h-[44px]"
        >
          History
        </Link>
        <Link
          href="/disputes"
          className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors hidden sm:inline-flex sm:items-center sm:min-h-[44px]"
        >
          Disputes
        </Link>
        <Link
          href="/safety"
          className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk hover:text-chalkboard transition-colors hidden sm:inline-flex sm:items-center sm:min-h-[44px]"
        >
          Safety
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-mustard flex items-center justify-center overflow-hidden">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-[family-name:var(--font-display)] text-[14px] text-chalkboard leading-none">
                {initials}
              </span>
            )}
          </div>
          <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard hidden sm:inline">
            {profile.displayName}
          </span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="min-h-[44px] font-[family-name:var(--font-body)] text-[13px] text-ketchup hover:opacity-70 transition-opacity cursor-pointer"
          >
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
