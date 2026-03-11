"use client";

import { useEffect, useState, useCallback } from "react";

const DISMISS_KEY = "linecut-install-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptMode = "ios" | "android" | null;

function getPromptMode(): PromptMode {
  if (typeof window === "undefined") return null;

  // Already in standalone mode — no prompt needed
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone)
  ) {
    return null;
  }

  // Check if dismissed recently
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (dismissed) {
    const timestamp = parseInt(dismissed, 10);
    if (Date.now() - timestamp < DISMISS_DURATION_MS) return null;
    localStorage.removeItem(DISMISS_KEY);
  }

  // iOS Safari detection
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  if (isIOS && isSafari) return "ios";

  // Android / Chrome — handled via beforeinstallprompt event (checked in component)
  return null;
}

export default function InstallPrompt() {
  const [mode, setMode] = useState<PromptMode>(getPromptMode);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(() => getPromptMode() !== null);

  // Listen for Android/Chrome install prompt
  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
      requestAnimationFrame(() => setVisible(true));
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Wait for slide-out animation before unmounting
    setTimeout(() => {
      setMode(null);
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }, 300);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setTimeout(() => setMode(null), 300);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!mode) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-4 mb-4 bg-ticket border border-[#eee6d8] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0 w-10 h-10 bg-chalkboard rounded-lg flex items-center justify-center" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="11" cy="10" rx="5" ry="4.5" stroke="#C4382A" strokeWidth="2" fill="none"/>
              <line x1="15" y1="13" x2="23" y2="25" stroke="#C4382A" strokeWidth="2.5" strokeLinecap="round"/>
              <ellipse cx="21" cy="10" rx="5" ry="4.5" stroke="#C4382A" strokeWidth="2" fill="none"/>
              <line x1="17" y1="13" x2="9" y2="25" stroke="#C4382A" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-[family-name:var(--font-body)] text-sm font-semibold text-chalkboard leading-tight">
              Add LineCut to your Home Screen
            </p>

            {mode === "ios" ? (
              <p className="font-[family-name:var(--font-body)] text-xs text-sidewalk mt-1 leading-relaxed">
                Tap{" "}
                <span className="inline-flex items-center align-middle">
                  <ShareIcon />
                </span>{" "}
                then &quot;Add to Home Screen&quot; for the best experience.
              </p>
            ) : (
              <p className="font-[family-name:var(--font-body)] text-xs text-sidewalk mt-1 leading-relaxed">
                Install LineCut for faster access and offline support.
              </p>
            )}

            {/* Android install button */}
            {mode === "android" && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="mt-3 min-h-[44px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ketchup/50"
              >
                Install app
              </button>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="shrink-0 p-1 text-sidewalk hover:text-chalkboard transition-colors"
            aria-label="Dismiss install prompt"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** iOS share icon (box with up arrow) */
function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ketchup"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
