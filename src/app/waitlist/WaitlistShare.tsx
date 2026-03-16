"use client";

import { useState, useCallback, useEffect } from "react";

export default function WaitlistShare({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare("share" in navigator);
  }, []);

  const shareUrl = origin ? `${origin}/auth/signup?ref=${referralCode}` : "";
  const shareText = "I just cut the line at LineCut — skip ahead of me:";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  const handleNativeShare = useCallback(() => {
    if (!navigator.share) return;
    navigator.share({ title: "LineCut", text: shareText, url: shareUrl }).catch(() => {});
  }, [shareUrl, shareText]);

  return (
    <div className="mt-8 w-full">
      <p className="font-[family-name:var(--font-display)] text-[20px] tracking-[1px] text-center mb-4">
        Share to skip ahead
      </p>

      {/* Primary CTA: Text a Friend */}
      <div className="flex flex-col gap-3">
        {canShare ? (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full min-h-[52px] bg-ketchup text-ticket font-[family-name:var(--font-mono)] text-[14px] font-semibold tracking-[2px] uppercase rounded-[6px] active:scale-[0.98] transition-transform"
          >
            Text a Friend
          </button>
        ) : (
          <a
            href={`sms:?&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
            className="w-full min-h-[52px] flex items-center justify-center bg-ketchup text-ticket font-[family-name:var(--font-mono)] text-[14px] font-semibold tracking-[2px] uppercase rounded-[6px] active:scale-[0.98] transition-transform text-center"
          >
            Text a Friend
          </a>
        )}
      </div>

      {/* Secondary: Copy link */}
      <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk uppercase text-center mt-5 mb-2">
        Or copy your link
      </p>
      <div className="flex items-center gap-0 rounded-[6px] overflow-hidden border border-[#eee6d8]">
        <div className="flex-1 bg-butcher-paper px-3 py-3 overflow-hidden min-w-0">
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk truncate">
            {shareUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-[44px] px-5 bg-chalkboard text-ticket font-[family-name:var(--font-mono)] text-[12px] font-semibold tracking-[1px] uppercase shrink-0 active:scale-95 transition-transform"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
