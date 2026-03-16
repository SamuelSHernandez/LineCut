"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface WaitlistData {
  referral_code: string | null;
  referral_count: number;
  credit_earned: boolean;
  position: number;
  total: number;
}

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<WaitlistData | null>(null);
  const [canShare, setCanShare] = useState(false);

  // Read referral code from URL on mount, store in sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("linecut_ref", ref);
    }
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  // Check if user already signed up (stored referral code in localStorage)
  useEffect(() => {
    const savedCode = localStorage.getItem("linecut_referral_code");
    if (savedCode) {
      fetch(`/api/subscribe/status?code=${savedCode}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setData(d);
            setSubmitted(true);
          } else {
            localStorage.removeItem("linecut_referral_code");
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const ref = sessionStorage.getItem("linecut_ref") || undefined;
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ref }),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(resData.error || "Something went wrong. Try again.");
        return;
      }

      if (resData.referral_code) {
        localStorage.setItem("linecut_referral_code", resData.referral_code);
      }
      setData(resData);
      setSubmitted(true);
    } catch {
      setError("Couldn't connect. Check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = data?.referral_code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${data.referral_code}`
    : null;

  const shareText = "I just cut the line at LineCut — skip ahead of me:";

  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl, shareText]);

  const handleNativeShare = useCallback(() => {
    if (!shareUrl || !navigator.share) return;
    navigator.share({ title: "LineCut", text: shareText, url: shareUrl }).catch(() => {});
  }, [shareUrl, shareText]);

  if (submitted && data) {
    const spotsJumped = data.referral_count * 5;
    const creditsLeft = 10; // UI only — server enforces the real cap
    const progressToCredit = Math.min(data.referral_count, 3);

    return (
      <div className="animate-scale-in flex flex-col items-center w-full max-w-md">
        {/* Position badge */}
        <div className="w-20 h-20 rounded-full bg-[#2D6A2D] flex items-center justify-center mb-4">
          <span className="font-[family-name:var(--font-display)] text-[32px] text-ticket leading-none">
            #{data.position}
          </span>
        </div>

        <p className="font-[family-name:var(--font-display)] text-[28px] md:text-[36px] tracking-[2px] text-ticket">
          YOU&apos;RE ON THE LIST
        </p>
        <p className="font-[family-name:var(--font-body)] text-[14px] text-ticket/60 mt-1">
          {data.total} {data.total === 1 ? "person" : "people"} in line
        </p>

        {/* Referral stats */}
        {data.referral_count > 0 && (
          <div className="mt-4 bg-ticket/10 rounded-[6px] px-4 py-2">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[#DDEFDD] text-center">
              {data.referral_count} {data.referral_count === 1 ? "friend" : "friends"} signed up.
              {spotsJumped > 0 && <> You jumped <strong>{spotsJumped} spots</strong>.</>}
            </p>
          </div>
        )}

        {/* $5 credit progress */}
        {!data.credit_earned ? (
          <div className="mt-5 w-full">
            <div className="flex items-center justify-between mb-2">
              <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-ticket/50 uppercase">
                $5 launch credit
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-ticket/50">
                {progressToCredit}/3 friends
              </p>
            </div>
            <div className="w-full h-2 bg-ticket/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2D6A2D] rounded-full transition-all duration-500"
                style={{ width: `${(progressToCredit / 3) * 100}%` }}
              />
            </div>
            <p className="font-[family-name:var(--font-body)] text-[11px] text-ticket/40 mt-1.5 text-center">
              Refer 3 friends to earn $5 off your first order
              {creditsLeft <= 5 && <> &middot; {creditsLeft} credits left</>}
            </p>
          </div>
        ) : (
          <div className="mt-5 bg-[#2D6A2D] rounded-[6px] px-4 py-3 w-full text-center">
            <p className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ticket">
              $5 CREDIT LOCKED IN
            </p>
            <p className="font-[family-name:var(--font-body)] text-[12px] text-[#DDEFDD] mt-0.5">
              Applied to your first order on launch day.
            </p>
          </div>
        )}

        {/* Share section */}
        <div className="mt-6 w-full">
          <p className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ticket text-center mb-3">
            SHARE TO SKIP AHEAD
          </p>

          {shareUrl && (
            <>
              {/* Share link */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-ticket/10 rounded-[6px] px-3 py-3 overflow-hidden min-w-0">
                  <p className="font-[family-name:var(--font-mono)] text-[12px] text-ticket/70 truncate">
                    {shareUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[44px] px-5 bg-ticket text-ketchup font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] active:scale-95 transition-transform shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Native share / SMS buttons */}
              <div className="flex gap-3 mt-3">
                {canShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex-1 min-h-[48px] bg-ticket text-chalkboard font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] active:scale-95 transition-transform"
                  >
                    Share
                  </button>
                )}
                <a
                  href={`sms:?&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                  className="flex-1 min-h-[48px] flex items-center justify-center bg-[#2D6A2D] text-ticket font-[family-name:var(--font-body)] text-[15px] font-semibold rounded-[6px] active:scale-95 transition-transform text-center"
                >
                  Text a Friend
                </a>
              </div>
            </>
          )}
        </div>

        {/* Continue to signup */}
        <div className="mt-6 pt-5 border-t border-dashed border-ticket/20 w-full text-center">
          <Link
            href={`/auth/signup?email=${encodeURIComponent(email)}`}
            className="inline-flex items-center min-h-[44px] font-[family-name:var(--font-body)] text-[14px] text-ticket/60 hover:text-ticket transition-colors"
          >
            Want to see your spot? Create an account &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 w-full max-w-md"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={submitting}
          className="flex-1 px-4 py-3.5 rounded-[6px] bg-ticket text-chalkboard font-[family-name:var(--font-body)] text-[16px] outline-none placeholder:text-sidewalk disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[48px] px-6 bg-mustard text-chalkboard font-[family-name:var(--font-body)] text-[16px] font-semibold rounded-[6px] active:scale-95 transition-transform cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : "Count Me In"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="font-[family-name:var(--font-body)] text-[13px] text-ticket/90 text-center"
        >
          {error}
        </p>
      )}
    </form>
  );
}
