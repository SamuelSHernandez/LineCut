"use client";

import { useState, useEffect, useCallback } from "react";

type OtpVerifyInlineProps = {
  channel: "phone" | "email";
  isVerified: boolean;
  value: string | null;
  onSendCode: () => Promise<{ error?: string; success?: boolean }>;
  onVerifyCode: (code: string) => Promise<{ error?: string; success?: boolean }>;
};

type OtpState = "idle" | "code_sent" | "verifying" | "verified";

export default function OtpVerifyInline({
  channel,
  isVerified,
  value,
  onSendCode,
  onVerifyCode,
}: OtpVerifyInlineProps) {
  const [otpState, setOtpState] = useState<OtpState>(
    isVerified ? "verified" : "idle"
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Derive verified state directly from prop — no need to sync via effect
  const effectiveOtpState = isVerified ? "verified" : otpState;

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    setSending(true);
    setError(null);
    const result = await onSendCode();
    setSending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOtpState("code_sent");
      setCountdown(60);
    }
  }, [onSendCode]);

  const handleVerify = useCallback(async () => {
    setOtpState("verifying");
    setError(null);
    const result = await onVerifyCode(code);

    if (result.error) {
      setError(result.error);
      setOtpState("code_sent");
    } else {
      setOtpState("verified");
      setCode("");
    }
  }, [code, onVerifyCode]);

  // Don't render if no value to verify
  if (!value?.trim()) return null;

  // Already verified
  if (effectiveOtpState === "verified") {
    return (
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-[#2D6A2D] mt-1 flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {channel === "phone" ? "Phone" : "Email"} verified
      </p>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      {error && (
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-ketchup">
          {error}
        </p>
      )}

      {effectiveOtpState === "idle" && (
        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending}
          className="font-[family-name:var(--font-body)] text-[12px] font-medium text-ketchup hover:text-ketchup/80 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sending ? "Sending..." : `Verify ${channel === "phone" ? "phone" : "email"}`}
        </button>
      )}

      {(effectiveOtpState === "code_sent" || effectiveOtpState === "verifying") && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="w-[120px] px-3 py-2 rounded-[6px] bg-butcher-paper border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-mono)] text-[14px] text-center tracking-[3px] outline-none focus:border-chalkboard focus:ring-2 focus:ring-chalkboard/20 transition-colors"
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={code.length !== 6 || effectiveOtpState === "verifying"}
            className="px-3 py-2 bg-chalkboard text-ticket font-[family-name:var(--font-body)] text-[12px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {effectiveOtpState === "verifying" ? "..." : "Confirm"}
          </button>
        </div>
      )}

      {effectiveOtpState === "code_sent" && (
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk">
          Code sent to {value}.{" "}
          {countdown > 0 ? (
            <span>Resend in {countdown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="text-ketchup hover:text-ketchup/80 cursor-pointer disabled:opacity-60"
            >
              Resend code
            </button>
          )}
        </p>
      )}
    </div>
  );
}
