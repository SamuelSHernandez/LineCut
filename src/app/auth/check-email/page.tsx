import Link from "next/link";
import Logo from "@/components/Logo";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          {/* Mail icon */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-ticket border border-[#eee6d8] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="6" width="24" height="16" rx="3" stroke="#1A1A18" strokeWidth="2" fill="none" />
              <path d="M2 9l12 7 12-7" stroke="#C4382A" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-[36px] tracking-[2px] leading-none mb-3">
            CHECK YOUR EMAIL
          </h1>
          <p className="font-[family-name:var(--font-body)] text-[15px] text-sidewalk leading-relaxed mb-8">
            We sent you a confirmation link. Click it to activate your account
            and get in line.
          </p>

          <div className="border-t border-dashed border-[#ddd4c4] pt-6">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
              Didn&apos;t get it? Check spam, or{" "}
              <Link
                href="/auth/signup"
                className="text-ketchup font-medium hover:underline"
              >
                try again
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
