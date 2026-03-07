"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { login, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <>
      {state.error && (
        <div className="bg-[#FFF3D6] border border-ketchup rounded-[6px] px-4 py-3 mb-6">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-medium">
            {state.error}
          </p>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-[6px] bg-ticket border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors"
          />
        </div>

        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            placeholder="Your password"
            className="w-full px-4 py-3 rounded-[6px] bg-ticket border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full py-3.5 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/signup"
          className="text-ketchup font-medium hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <Link
          href="/auth/signup"
          className="font-[family-name:var(--font-body)] text-[13px] font-medium text-sidewalk hover:text-chalkboard transition-colors"
        >
          Sign Up
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-[36px] tracking-[2px] leading-none text-center mb-2">
            WELCOME BACK
          </h1>
          <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk text-center mb-8">
            Log in to your LineCut account.
          </p>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
