"use client";

import { useState } from "react";

interface KycVerificationSectionProps {
  kycStatus: "none" | "pending" | "approved" | "declined";
}

export default function KycVerificationSection({
  kycStatus,
}: KycVerificationSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartVerification() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/kyc/create-session", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start verification");
        return;
      }

      // Redirect to Didit verification flow
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5">
      <h3 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-chalkboard mb-1">
        IDENTITY VERIFICATION
      </h3>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
        Verify your identity to start accepting orders. Required for all sellers.
      </p>

      {kycStatus === "approved" && (
        <div className="flex items-center gap-2 bg-[#DDEFDD] rounded-[6px] px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="8" fill="#2D6A2D" />
            <path d="M4.5 8L7 10.5L11.5 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] font-semibold">
            Identity verified
          </span>
        </div>
      )}

      {kycStatus === "pending" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-[#FFF3D6] rounded-[6px] px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-[#8B6914] animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            <span className="font-[family-name:var(--font-body)] text-[13px] text-[#8B6914] font-semibold">
              Verification in progress
            </span>
          </div>
          <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
            We&apos;re reviewing your documents. This usually takes a few minutes.
          </p>
          <button
            type="button"
            onClick={handleStartVerification}
            disabled={loading}
            className="min-h-[44px] py-2.5 px-6 bg-butcher-paper border border-[#ddd4c4] text-chalkboard font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-colors hover:border-mustard disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-chalkboard/30"
          >
            {loading ? "..." : "Restart verification"}
          </button>
        </div>
      )}

      {kycStatus === "declined" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-[#FDECEA] rounded-[6px] px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="8" fill="#C4382A" />
              <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold">
              Verification declined
            </span>
          </div>
          <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
            Your verification was not approved. Please try again with a valid government ID.
          </p>
          <button
            type="button"
            onClick={handleStartVerification}
            disabled={loading}
            className="min-h-[44px] py-2.5 px-6 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-colors hover:bg-ketchup/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ketchup/50"
          >
            {loading ? "..." : "Try again"}
          </button>
        </div>
      )}

      {kycStatus === "none" && (
        <div className="space-y-3">
          <div className="bg-butcher-paper rounded-[6px] px-4 py-3">
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk mb-2">
              WHAT YOU&apos;LL NEED
            </p>
            <ul className="space-y-1 font-[family-name:var(--font-body)] text-[12px] text-chalkboard">
              <li>A valid government-issued photo ID</li>
              <li>A working camera for a selfie</li>
              <li>About 2 minutes</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={handleStartVerification}
            disabled={loading}
            className="w-full min-h-[48px] py-3 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] tracking-[1px] transition-colors hover:bg-ketchup/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ketchup/50"
          >
            {loading ? "Starting..." : "VERIFY MY IDENTITY"}
          </button>
        </div>
      )}

      {error && (
        <p className="font-[family-name:var(--font-body)] text-[12px] text-ketchup mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
