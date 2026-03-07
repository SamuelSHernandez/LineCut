"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { signup, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = { error: null };

function SignupForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const emailParam = searchParams.get("email") ?? "";
  const defaultRole =
    roleParam === "seller" ? "seller" : roleParam === "buyer" ? "buyer" : "";

  const [state, formAction, pending] = useActionState(signup, initialState);

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
        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Name
          </label>
          <input
            type="text"
            name="displayName"
            required
            placeholder="First name + last initial (e.g. Marco R.)"
            className="w-full px-4 py-3 rounded-[6px] bg-ticket border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors"
          />
        </div>

        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            defaultValue={emailParam}
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
            minLength={6}
            placeholder="At least 6 characters"
            className="w-full px-4 py-3 rounded-[6px] bg-ticket border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors"
          />
        </div>

        {/* Role selection */}
        <fieldset>
          <legend className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-2">
            I want to&hellip;
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="role"
                value="buyer"
                defaultChecked={defaultRole === "buyer"}
                required
                className="peer sr-only"
              />
              <div className="border-2 border-[#eee6d8] peer-checked:border-ketchup rounded-[6px] p-4 text-center transition-colors">
                <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] block mb-1">
                  SKIP LINES
                </span>
                <span className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
                  I&apos;m hungry
                </span>
              </div>
            </label>
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="role"
                value="seller"
                defaultChecked={defaultRole === "seller"}
                className="peer sr-only"
              />
              <div className="border-2 border-[#eee6d8] peer-checked:border-mustard rounded-[6px] p-4 text-center transition-colors">
                <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] block mb-1">
                  EARN MONEY
                </span>
                <span className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
                  I&apos;m in line
                </span>
              </div>
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full py-3.5 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center mt-6">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-ketchup font-medium hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  );
}

function PageHeader() {
  const searchParams = useSearchParams();
  const fromWaitlist = !!searchParams.get("email");

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-[36px] tracking-[2px] leading-none text-center mb-2">
        {fromWaitlist ? "FINISH YOUR PROFILE" : "CREATE ACCOUNT"}
      </h1>
      <p className="font-[family-name:var(--font-body)] text-[14px] text-sidewalk text-center mb-8">
        {fromWaitlist
          ? "A few details and you'll see your spot in line."
          : "Join LineCut as a buyer or seller."}
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <Link
          href="/auth/login"
          className="font-[family-name:var(--font-body)] text-[13px] font-medium text-sidewalk hover:text-chalkboard transition-colors"
        >
          Log In
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Suspense>
            <PageHeader />
          </Suspense>

          <Suspense>
            <SignupForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
