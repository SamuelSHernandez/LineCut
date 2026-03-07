"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/lib/use-push-notifications";

const DISMISSED_KEY = "linecut_notif_prompt_dismissed";

export default function NotificationPrompt() {
  const { isSupported, permission, isSubscribed, subscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    // Read localStorage only on client
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    setDismissed(wasDismissed);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  async function handleEnable() {
    await subscribe();
    dismiss();
  }

  // Only show when: supported, not yet decided, not subscribed, not dismissed
  const shouldShow =
    isSupported &&
    permission === "default" &&
    !isSubscribed &&
    !dismissed;

  if (!shouldShow) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-[10px] border border-[#eee6d8] bg-[#FFFDF5] p-4"
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
    >
      {/* Bell icon */}
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3D6] text-[#8B6914]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
      </div>

      <div className="flex-1">
        <p className="text-[15px] font-semibold text-[#1A1A18]">
          Stay in the loop
        </p>
        <p className="mt-0.5 text-[13px] text-[#8C8778]">
          Get notified when your order moves. Works even with the tab closed.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleEnable}
            className="rounded-[6px] bg-[#C4382A] px-4 py-2 text-[13px] font-semibold text-[#FFFDF5] transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            Enable Notifications
          </button>
          <button
            onClick={dismiss}
            className="text-[13px] font-medium text-[#8C8778] transition-colors hover:text-[#1A1A18]"
          >
            Not now
          </button>
        </div>
      </div>

      {/* Dismiss X */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-1 text-[#8C8778] transition-colors hover:text-[#1A1A18]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
