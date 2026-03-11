"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Order } from "@/lib/types";
import OrderTracker from "./OrderTracker";

interface OrderTrackerDrawerProps {
  order: Order;
  onClose: () => void;
  onCancel: () => void;
}

export default function OrderTrackerDrawer({
  order,
  onClose,
  onCancel,
}: OrderTrackerDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-chalkboard/50 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tracking order at ${order.restaurantName}`}
        className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-[420px] md:h-full z-50 bg-ticket rounded-t-[16px] md:rounded-t-none md:rounded-l-[16px] shadow-[0_-8px_32px_rgba(0,0,0,0.15)] md:shadow-[-8px_0_32px_rgba(0,0,0,0.15)] max-h-[85vh] md:max-h-full overflow-y-auto transition-transform duration-300"
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard">
                YOUR ORDER
              </h3>
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Through {order.sellerName} at {order.restaurantName}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center text-sidewalk hover:text-chalkboard transition-colors rounded-[6px] focus:outline-none focus:ring-2 focus:ring-ketchup/50"
              aria-label="Close order tracker"
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

          <OrderTracker order={order} onCancel={onCancel} />
        </div>
      </div>
    </>
  );
}
