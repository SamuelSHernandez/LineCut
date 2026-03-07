import type { Order, OrderStatus, Seller } from "./types";

// ── Order channel messages ──────────────────────────────────────────

export type OrderMessage =
  | { type: "order-placed"; order: Order }
  | { type: "order-status-changed"; orderId: string; newStatus: OrderStatus; updatedAt: string }
  | { type: "order-cancelled"; orderId: string; cancelledBy: "buyer" | "seller" };

// ── Seller presence channel messages ────────────────────────────────

export type SellerPresenceMessage =
  | { type: "seller-online"; seller: Seller; restaurantId: string; sessionId: string }
  | { type: "seller-offline"; sellerId: string; restaurantId: string }
  | { type: "seller-roll-call" }
  | { type: "seller-busy"; sellerId: string }
  | { type: "seller-available"; sellerId: string };

// ── Message buffer for replay ───────────────────────────────────────

interface BufferedMessage<T> {
  message: T;
  timestamp: number;
}

const BUFFER_WINDOW_MS = 5000;

// ── Channel wrapper ─────────────────────────────────────────────────

function createBus<T>(channelName: string) {
  let channel: BroadcastChannel | null = null;
  const buffer: BufferedMessage<T>[] = [];

  function getChannel(): BroadcastChannel | null {
    if (typeof window === "undefined") return null;
    if (typeof BroadcastChannel === "undefined") {
      console.warn(`[order-bus] BroadcastChannel not supported in this browser. Cross-tab sync disabled for "${channelName}".`);
      return null;
    }
    if (!channel) {
      channel = new BroadcastChannel(channelName);
    }
    return channel;
  }

  function pruneBuffer() {
    const cutoff = Date.now() - BUFFER_WINDOW_MS;
    while (buffer.length > 0 && buffer[0].timestamp < cutoff) {
      buffer.shift();
    }
  }

  function publish(message: T) {
    const ch = getChannel();
    if (!ch) return;

    pruneBuffer();
    buffer.push({ message, timestamp: Date.now() });

    ch.postMessage(message);
  }

  function subscribe(handler: (message: T) => void): () => void {
    const ch = getChannel();
    if (!ch) return () => {};

    // Replay buffered messages from last 5 seconds
    pruneBuffer();
    for (const entry of buffer) {
      handler(entry.message);
    }

    function onMessage(event: MessageEvent<T>) {
      pruneBuffer();
      buffer.push({ message: event.data, timestamp: Date.now() });
      handler(event.data);
    }

    ch.addEventListener("message", onMessage);

    return () => {
      ch.removeEventListener("message", onMessage);
    };
  }

  return { publish, subscribe };
}

// ── Exported buses ──────────────────────────────────────────────────

export const orderBus = createBus<OrderMessage>("linecut-orders");
export const sellerBus = createBus<SellerPresenceMessage>("linecut-sellers");
