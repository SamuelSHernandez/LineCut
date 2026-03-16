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

  const shareUrl = origin ? `${origin}/?ref=${referralCode}` : "";
  const shareText = "I just cut the line at LineCut — skip ahead of me:";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl, shareText]);

  const handleNativeShare = useCallback(() => {
    if (!navigator.share) return;
    navigator.share({ title: "LineCut", text: shareText, url: shareUrl }).catch(() => {});
  }, [shareUrl, shareText]);

  return (
    <div className="mt-6 w-full">
      <p className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] text-center mb-3">
        SHARE TO SKIP AHEAD
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-butcher-paper rounded-[6px] border border-[#eee6d8] px-3 py-3 overflow-hidden min-w-0">
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-sidewalk truncate">
            {shareUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-[44px] px-5 bg-chalkboard text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] active:scale-95 transition-transform shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="flex gap-3 mt-3">
        {canShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 min-h-[48px] bg-chalkboard text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] active:scale-95 transition-transform"
          >
            Share
          </button>
        )}
        <a
          href={`sms:?&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
          className="flex-1 min-h-[48px] flex items-center justify-center bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] active:scale-95 transition-transform text-center"
        >
          Text a Friend
        </a>
      </div>

      <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk text-center mt-2">
        Each friend who joins = you skip 5 spots
      </p>
    </div>
  );
}
