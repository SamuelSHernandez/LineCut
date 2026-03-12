"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  isSeller: boolean;
  isBuyer: boolean;
}

export default function BottomNav({ isSeller, isBuyer }: BottomNavProps) {
  const pathname = usePathname();
  const isSellerView = pathname.startsWith("/seller");

  const tabs = isSellerView
    ? [
        { href: "/seller", label: "Home", icon: HomeIcon, match: (p: string) => p === "/seller" },
        { href: "/orders", label: "Orders", icon: OrdersIcon, match: (p: string) => p.startsWith("/orders") },
        { href: "/seller/earnings", label: "Earnings", icon: EarningsIcon, match: (p: string) => p.startsWith("/seller/earnings") },
        { href: "/profile", label: "Profile", icon: ProfileIcon, match: (p: string) => p.startsWith("/profile") },
      ]
    : [
        { href: "/buyer", label: "Home", icon: HomeIcon, match: (p: string) => p === "/buyer" },
        { href: "/orders", label: "Orders", icon: OrdersIcon, match: (p: string) => p.startsWith("/orders") },
        { href: "/disputes", label: "Disputes", icon: DisputesIcon, match: (p: string) => p.startsWith("/disputes") },
        { href: "/profile", label: "Profile", icon: ProfileIcon, match: (p: string) => p.startsWith("/profile") },
      ];

  // Don't render if user has neither role
  if (!isSeller && !isBuyer) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-ticket border-t border-divider sm:hidden"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px] transition-colors ${
                active ? "text-ketchup" : "text-sidewalk"
              }`}
            >
              <Icon active={active} />
              <span className="font-[family-name:var(--font-body)] text-[10px] font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function EarningsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function DisputesIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
