"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Seller, MenuItem, OrderItem, Order } from "@/lib/types";
import { useProfile } from "@/lib/profile-context";
import { useOrders } from "@/lib/order-context";
import { checkBillingReady } from "@/lib/billing-gate";
import { placeOrder, modifyOrder as modifyOrderAction } from "@/app/(dashboard)/buyer/actions";
import { calculatePlatformFeeDollars } from "@/lib/fee-tiers";
import FullScreenSheet from "./FullScreenSheet";
import MenuItemPill from "./MenuItemPill";
import OrderConfirmation from "./OrderConfirmation";
import OrderTracker from "./OrderTracker";
import StripePaymentForm from "./StripePaymentForm";

type DrawerStep = "build" | "payment" | "tracking";

interface OrderSheetProps {
  seller: Seller;
  restaurantName: string;
  menuItems: MenuItem[];
  onClose: () => void;
  editOrder?: Order;
}

export default function OrderSheet({
  seller,
  restaurantName,
  menuItems,
  onClose,
  editOrder,
}: OrderSheetProps) {
  const [orderItems, setOrderItems] = useState<Map<string, OrderItem>>(() => {
    if (editOrder) {
      const map = new Map<string, OrderItem>();
      for (const item of editOrder.items) {
        map.set(item.menuItemId, item);
      }
      return map;
    }
    return new Map();
  });
  const [specialInstructions, setSpecialInstructions] = useState(
    editOrder?.specialInstructions ?? ""
  );
  const [step, setStep] = useState<DrawerStep>("build");
  const [showMore, setShowMore] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const profile = useProfile();
  const { placeOrder: placeOrderContext, cancelOrder, modifyOrder: modifyOrderContext, orders } = useOrders();
  const router = useRouter();

  const popularItems = menuItems.filter((m) => m.popular);
  const moreItems = menuItems.filter((m) => !m.popular);

  const orderItemsArray = Array.from(orderItems.values());
  const hasItems = orderItemsArray.length > 0;

  const itemsSubtotal = orderItemsArray.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const platformFee = calculatePlatformFeeDollars(itemsSubtotal);
  const total = itemsSubtotal + seller.fee + platformFee;

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

    if (result.orderId) {
      setOrderId(result.orderId);

      if (result.savedCardUsed) {
        // Saved card was auto-confirmed server-side — skip to tracking
        handlePaymentSuccessWithOrderId(result.orderId);
      } else if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setStep("payment");
      }
    }
  }

  async function handleModify() {
    if (!editOrder) return;
    setPlacing(true);
    setError(null);

    const result = await modifyOrderAction({
      orderId: editOrder.id,
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

    modifyOrderContext(editOrder.id, {
      items: orderItemsArray,
      specialInstructions,
      itemsSubtotal: result.itemsSubtotal ?? itemsSubtotal,
      platformFee: result.platformFee ?? platformFee,
      total: result.total ?? total,
    });

    onClose();
  }

  function handlePaymentSuccessWithOrderId(resolvedOrderId: string) {
    const now = new Date().toISOString();
    const fullOrder: Order = {
      id: resolvedOrderId,
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
      sellerName: seller.lastInitial ? `${seller.firstName} ${seller.lastInitial}.` : seller.firstName,
      buyerName: profile.displayName,
    };

    placeOrderContext(fullOrder);
    setTrackedOrder(fullOrder);
    setStep("tracking");
  }

  function handlePaymentSuccess() {
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
      sellerName: seller.lastInitial ? `${seller.firstName} ${seller.lastInitial}.` : seller.firstName,
      buyerName: profile.displayName,
    };

    placeOrderContext(fullOrder);
    setTrackedOrder(fullOrder);
    setStep("tracking");
  }

  function handlePaymentError(message: string) {
    setError(message);
  }

  const handleCancel = useCallback(() => {
    setStep("build");
    setClientSecret(null);
    setOrderId(null);
    setOrderItems(new Map());
    setSpecialInstructions("");
    setError(null);
    onClose();
  }, [onClose]);

  // Sheet title/subtitle per step
  const sheetTitle =
    step === "payment"
      ? "PAYMENT"
      : step === "tracking"
        ? "ORDER TRACKER"
        : editOrder
          ? "MODIFY ORDER"
          : "YOUR ORDER";

  const sheetSubtitle = `Through ${seller.firstName} at ${restaurantName}`;

  // Back handler: only on payment step
  const handleBack = step === "payment" ? () => setStep("build") : undefined;

  // Footer: only on build step when items are selected
  const footer =
    step === "build" && hasItems ? (
      <div>
        <button
          type="button"
          onClick={editOrder ? handleModify : handleConfirm}
          disabled={placing}
          className="w-full min-h-[48px] py-3 px-6 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] transition-all duration-200 hover:bg-ketchup/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ketchup/50"
        >
          {editOrder ? "UPDATE ORDER" : "PLACE ORDER"} &mdash; ${total.toFixed(2)}
        </button>
        <p className="text-center font-[family-name:var(--font-body)] text-[11px] text-sidewalk mt-2">
          Your card will be authorized now and charged when your order is ready.
        </p>
      </div>
    ) : undefined;

  return (
    <FullScreenSheet
      title={sheetTitle}
      subtitle={sheetSubtitle}
      onClose={onClose}
      onBack={handleBack}
      footer={footer}
      ariaLabel={`Order through ${seller.firstName} at ${restaurantName}`}
    >
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
              className="w-full bg-butcher-paper rounded-[6px] border border-[#ddd4c4] px-3 py-2 font-[family-name:var(--font-body)] text-[13px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-ketchup focus:ring-2 focus:ring-ketchup/50 transition-colors resize-none"
            />
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-[#ddd4c4] my-4" />

          {/* Price breakdown (button rendered in sticky footer) */}
          {hasItems ? (
            <OrderConfirmation
              items={orderItemsArray}
              sellerName={seller.firstName}
              sellerFee={seller.fee}
              sellerMaxCap={seller.maxOrderCap}
              onConfirm={editOrder ? handleModify : handleConfirm}
              disabled={placing}
              confirmLabel={editOrder ? "UPDATE ORDER" : undefined}
              hideButton
            />
          ) : (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk text-center py-4">
              Tap items above to build your order.
            </p>
          )}
        </>
      )}
    </FullScreenSheet>
  );
}
