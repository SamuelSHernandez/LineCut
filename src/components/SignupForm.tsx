"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="animate-scale-in flex flex-col items-center">
        {/* Green success badge */}
        <div className="w-16 h-16 rounded-full bg-[#2D6A2D] flex items-center justify-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFDF5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p className="font-[family-name:var(--font-display)] text-[28px] md:text-[36px] tracking-[2px] text-ticket">
          YOU&apos;RE ON THE LIST
        </p>
        <p className="font-[family-name:var(--font-body)] text-[15px] text-[#DDEFDD] mt-2 mb-8">
          We saved your spot. Now let&apos;s make it official.
        </p>

        {/* CTA to continue profile */}
        <Link
          href={`/auth/signup?email=${encodeURIComponent(email)}`}
          className="px-8 py-4 bg-[#2D6A2D] text-ticket font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:bg-[#245A24] transition-colors text-center"
        >
          Want to see your spot in line? Finish your profile.
        </Link>
        <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-ticket/40 mt-4 uppercase">
          Just a name, password &amp; you&apos;re in
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 px-4 py-3.5 rounded-[6px] bg-ticket text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk"
      />
      <button
        type="submit"
        className="px-6 py-3.5 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
      >
        Count Me In
      </button>
    </form>
  );
}
