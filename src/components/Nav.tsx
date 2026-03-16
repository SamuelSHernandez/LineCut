"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "./Logo";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      </div>
    </nav>
  );
}
