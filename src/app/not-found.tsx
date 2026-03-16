import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-butcher-paper flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <svg width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <ellipse cx="8" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
          <line x1="12" y1="9" x2="22" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="20" cy="6" rx="5.5" ry="5" stroke="#8C8778" strokeWidth="1.5" fill="none" />
          <line x1="16" y1="9" x2="6" y2="22" stroke="#8C8778" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h1 className="font-[family-name:var(--font-display)] text-[32px] text-chalkboard uppercase">
          Wrong turn
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[15px] text-sidewalk">
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-2 font-[family-name:var(--font-body)] text-[14px] text-ketchup font-semibold hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
