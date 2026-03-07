"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Seller, MenuItem, OrderItem, Order } from "@/lib/types";
import { useProfile } from "@/lib/profile-context";
import { useOrders } from "@/lib/order-context";
import { checkBillingReady } from "@/lib/billing-gate";
import { placeOrder } from "@/app/(dashboard)/buyer/actions";
import { calculatePlatformFee } from "./OrderConfirmation";
import MenuItemPill from "./MenuItemPill";
import OrderConfirmation from "./OrderConfirmation";
import OrderTracker from "./OrderTracker";
import StripePaymentForm from "./StripePaymentForm";

type DrawerStep = "build" | "payment" | "tracking";

interface OrderDrawerProps {
  seller: Seller;
  restaurantName: string;
  menuItems: MenuItem[];
  onClose: () => void;
}

export default function OrderDrawer({
  seller,
  restaurantName,
  menuItems,
  onClose,
}: OrderDrawerProps) {
  const [orderItems, setOrderItems] = useState<Map<string, OrderItem>>(
    new Map()
  );
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [step, setStep] = useState<DrawerStep>("build");
  const [showMore, setShowMore] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const profile = useProfile();
  const { placeOrder: placeOrderContext, cancelOrder, orders } = useOrders();
  const router = useRouter();

  const popularItems = menuItems.filter((m) => m.popular);
  const moreItems = menuItems.filter((m) => !m.popular);

  const orderItemsArray = Array.from(orderItems.values());
  const hasItems = orderItemsArray.length > 0;

  const itemsSubtotal = orderItemsArray.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const platformFee = calculatePlatformFee(itemsSubtotal);
  const total = itemsSubtotal + seller.fee + platformFee;

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

  function toggleItem(item: MenuItem) {
    setOrderItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        });
      }
      return next;
    });
  }

  function incrementItem(itemId: string) {
    setOrderItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing) {
        next.set(itemId, { ...existing, quantity: existing.quantity + 1 });
      }
      return next;
    });
  }

  function decrementItem(itemId: string) {
    setOrderItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing) {
        if (existing.quantity <= 1) {
          next.delete(itemId);
        } else {
          next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
        }
      }
      return next;
    });
  }

  async function handleConfirm() {
    // Check billing gate before placing order
    const billing = checkBillingReady(profile, "buyer");
    if (!billing.ready && billing.redirectUrl) {
      router.push(billing.redirectUrl);
      return;
    }

    setPlacing(true);
    setError(null);

    const result = await placeOrder({
      sellerId: seller.id,
      restaurantId: seller.restaurantId,
      items: orderItemsArray.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      specialInstructions,
      sellerFee: seller.fee,
    });

    setPlacing(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.clientSecret && result.orderId) {
      setClientSecret(result.clientSecret);
      setOrderId(result.orderId);
      setStep("payment");
    }
  }

  function handlePaymentSuccess() {
    // Build full Order object and publish via context/bus
    const now = new Date().toISOString();
    const fullOrder: Order = {
      id: orderId ?? crypto.randomUUID(),
      buyerId: profile.id,
      sellerId: seller.id,
      restaurantId: seller.restaurantId,
      items: orderItemsArray.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      specialInstructions,
      status: "pending",
      itemsSubtotal,
      sellerFee: seller.fee,
      platformFee,
      total,
      stripePaymentIntentId: null,
      createdAt: now,
      statusUpdatedAt: now,
      restaurantName,
      sellerName: `${seller.firstName} ${seller.lastInitial}.`,
      buyerName: profile.displayName,
    };

    placeOrderContext(fullOrder);
    setTrackedOrder(fullOrder);
    setStep("tracking");
  }

  function handlePaymentError(message: string) {
    setError(message);
  }

  function handleCancel() {
    setStep("build");
    setClientSecret(null);
    setOrderId(null);
    setOrderItems(new Map());
    setSpecialInstructions("");
    setError(null);
    onClose();
  }

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
        aria-label={`Order through ${seller.firstName} at ${restaurantName}`}
        className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-[420px] md:h-full z-50 bg-ticket rounded-t-[16px] md:rounded-t-none md:rounded-l-[16px] shadow-[0_-8px_32px_rgba(0,0,0,0.15)] md:shadow-[-8px_0_32px_rgba(0,0,0,0.15)] max-h-[85vh] md:max-h-full overflow-y-auto transition-transform duration-300"
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard">
                {step === "payment"
                  ? "PAYMENT"
                  : step === "tracking"
                    ? "ORDER TRACKER"
                    : "YOUR ORDER"}
              </h3>
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
                Through {seller.firstName} at {restaurantName}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center text-sidewalk hover:text-chalkboard transition-colors rounded-[6px] focus:outline-none focus:ring-2 focus:ring-ketchup/20"
              aria-label="Close order drawer"
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

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-[#FDECEA] rounded-[6px]" role="alert">
              <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
                {error}
              </p>
            </div>
          )}

          {step === "tracking" && trackedOrder ? (
            <OrderTracker
              order={orders.find((o) => o.id === trackedOrder.id) ?? trackedOrder}
              onCancel={() => {
                cancelOrder(trackedOrder.id, "buyer");
                handleCancel();
              }}
            />
          ) : step === "payment" && clientSecret ? (
            <div>
              <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
                Enter your payment details. Your card will be authorized for ${total.toFixed(2)} and charged when your order is ready.
              </p>
              <StripePaymentForm
                clientSecret={clientSecret}
                total={total}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>
          ) : (
            <>
              {/* Popular Items */}
              <div className="mb-4">
                <h4 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-3">
                  POPULAR ITEMS
                </h4>
                <div className="flex flex-wrap gap-2">
                  {popularItems.map((item) => (
                    <MenuItemPill
                      key={item.id}
                      item={item}
                      quantity={orderItems.get(item.id)?.quantity ?? 0}
                      onToggle={() => toggleItem(item)}
                      onIncrement={() => incrementItem(item.id)}
                      onDecrement={() => decrementItem(item.id)}
                    />
                  ))}
                </div>
              </div>

              {/* More Items */}
              {moreItems.length > 0 && (
                <div className="mb-4">
                  {!showMore ? (
                    <button
                      type="button"
                      onClick={() => setShowMore(true)}
                      className="min-h-[44px] font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold hover:text-ketchup/80 transition-colors"
                    >
                      Show more items
                    </button>
                  ) : (
                    <>
                      <h4 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-3">
                        MORE ITEMS
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {moreItems.map((item) => (
                          <MenuItemPill
                            key={item.id}
                            item={item}
                            quantity={orderItems.get(item.id)?.quantity ?? 0}
                            onToggle={() => toggleItem(item)}
                            onIncrement={() => incrementItem(item.id)}
                            onDecrement={() => decrementItem(item.id)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Dashed divider */}
              <div className="border-t border-dashed border-[#ddd4c4] my-4" />

              {/* Special Instructions */}
              <div className="mb-4">
                <h4 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-2">
                  SPECIAL INSTRUCTIONS
                </h4>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Extra mustard, no pickles, etc."
                  rows={2}
                  aria-label="Special instructions for your order"
                  className="w-full bg-butcher-paper rounded-[6px] border border-[#ddd4c4] px-3 py-2 font-[family-name:var(--font-body)] text-[13px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-ketchup focus:ring-2 focus:ring-ketchup/20 transition-colors resize-none"
                />
              </div>

              {/* Dashed divider */}
              <div className="border-t border-dashed border-[#ddd4c4] my-4" />

              {/* Price breakdown and confirm */}
              {hasItems ? (
                <OrderConfirmation
                  items={orderItemsArray}
                  sellerName={seller.firstName}
                  sellerFee={seller.fee}
                  onConfirm={handleConfirm}
                  disabled={placing}
                />
              ) : (
                <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center py-4">
                  Tap items above to build your order.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
