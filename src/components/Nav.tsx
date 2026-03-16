"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { createBrowserClient } from "@supabase/ssr";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({
          displayName: u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "User",
        });
      }
    });
  }, []);

  const initials = user
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 pt-[max(1rem,env(safe-area-inset-top))] pb-4 transition-all duration-300 ${
        scrolled
          ? "bg-butcher-paper/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.06)]"
          : "bg-transparent"
      }`}
    >
      <Logo size="sm" variant={scrolled ? "default" : "light"} />
      <div className="flex items-center gap-6">
        <a
          href="#how"
          className={`hidden sm:block font-[family-name:var(--font-body)] text-[13px] font-medium transition-colors ${
            scrolled
              ? "text-sidewalk hover:text-chalkboard"
              : "text-butcher-paper/70 hover:text-butcher-paper"
          }`}
        >
          How It Works
        </a>
        {user ? (
          <Link
            href="/waitlist"
            className={`flex items-center gap-2.5 group ${
              scrolled ? "" : ""
            }`}
          >
            <span
              className={`font-[family-name:var(--font-body)] text-[13px] font-medium transition-colors hidden sm:block ${
                scrolled
                  ? "text-sidewalk group-hover:text-chalkboard"
                  : "text-butcher-paper/70 group-hover:text-butcher-paper"
              }`}
            >
              My Spot
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[1px] transition-colors ${
                scrolled
                  ? "bg-chalkboard text-butcher-paper"
                  : "bg-butcher-paper/20 text-butcher-paper border border-butcher-paper/30"
              }`}
            >
              {initials}
            </span>
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              className={`hidden sm:block font-[family-name:var(--font-body)] text-[13px] font-medium transition-colors ${
                scrolled
                  ? "text-sidewalk hover:text-chalkboard"
                  : "text-butcher-paper/70 hover:text-butcher-paper"
              }`}
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2.5 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
