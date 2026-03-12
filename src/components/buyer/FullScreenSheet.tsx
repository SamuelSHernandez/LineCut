"use client";

import { useEffect, useRef, useCallback } from "react";

interface FullScreenSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  ariaLabel?: string;
}

export default function FullScreenSheet({
  title,
  subtitle,
  onClose,
  onBack,
  footer,
  children,
  ariaLabel,
}: FullScreenSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-chalkboard/50 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className="fixed inset-0 z-50 flex flex-col bg-ticket h-[100dvh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[520px] md:w-full md:h-auto md:max-h-[90dvh] md:rounded-[16px] md:shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
      >
        {/* Sticky header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-[#eee6d8] shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center text-sidewalk hover:text-chalkboard transition-colors rounded-[6px] focus:outline-none focus:ring-2 focus:ring-ketchup/50 -ml-2"
              aria-label="Go back"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="12 4 6 10 12 16" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard">
              {title}
            </h3>
            {subtitle && (
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-sidewalk hover:text-chalkboard transition-colors rounded-[6px] focus:outline-none focus:ring-2 focus:ring-ketchup/50 -mr-2 shrink-0"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4" style={!footer ? { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" } : undefined}>
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="px-5 pt-3 border-t border-[#eee6d8] shrink-0" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
