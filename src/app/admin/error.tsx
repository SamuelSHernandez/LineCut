"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <svg width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <ellipse cx="8" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
        <line x1="12" y1="9" x2="22" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="20" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
        <line x1="16" y1="9" x2="6" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h1 className="font-[family-name:var(--font-display)] text-[32px] text-chalkboard uppercase">
        Something went wrong
      </h1>
      <p className="font-[family-name:var(--font-body)] text-[15px] text-sidewalk">
        Hit a snag. Give it another shot.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-[200px] mt-2">
        <button
          onClick={reset}
          className="w-full min-h-[44px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-all duration-200 hover:opacity-90"
        >
          Try again
        </button>
        <a
          href="/admin"
          className="font-[family-name:var(--font-body)] text-[14px] text-ketchup hover:underline"
        >
          Go back
        </a>
      </div>
    </div>
  );
}
