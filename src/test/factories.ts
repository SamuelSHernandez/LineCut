import type { Profile } from "@/lib/profile-context";
import type {
  Order,
  OrderItem,
  Seller,
  SellerSession,
  Restaurant,
  ChatMessage,
} from "@/lib/types";

let counter = 0;
function nextId(): string {
  counter++;
  return `test-${counter.toString().padStart(6, "0")}`;
}

// ── Profile ──────────────────────────────────────────────────────

export function createMockProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: nextId(),
    displayName: "Test User",
    isBuyer: true,
    isSeller: false,
    avatarUrl: null,
    trustScore: 50,
    email: "test@example.com",
    phone: "+15551234567",
    bio: null,
    neighborhood: null,
    emailVerified: false,
    phoneVerified: true,
    stripeCustomerId: null,
    stripeConnectAccountId: null,
    stripeConnectStatus: "not_connected",
    maxOrderCap: 5000,
    avgRating: null,
    ratingCount: 0,
    paymentMethodLast4: null,
    paymentMethodBrand: null,
    paymentMethodExpMonth: null,
    paymentMethodExpYear: null,
    kycStatus: "none",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Order ────────────────────────────────────────────────────────

export function createMockOrderItem(
  overrides?: Partial<OrderItem>
): OrderItem {
  return {
    menuItemId: nextId(),
    name: "Pastrami on Rye",
    price: 24.99,
    quantity: 1,
    ...overrides,
  };
}

export function createMockOrder(overrides?: Partial<Order>): Order {
  const items = overrides?.items ?? [createMockOrderItem()];
  const itemsSubtotal =
    overrides?.itemsSubtotal ??
    items.reduce((sum, i) => sum + i.price * i.quantity * 100, 0);

  return {
    id: nextId(),
    buyerId: "buyer-001",
    sellerId: "seller-001",
    restaurantId: "katzs",
    items,
    specialInstructions: "",
    status: "pending",
    itemsSubtotal,
    sellerFee: 800,
    platformFee: 200,
    total: itemsSubtotal + 800 + 200,
    stripePaymentIntentId: `pi_${nextId()}`,
    createdAt: "2026-03-10T12:00:00Z",
    statusUpdatedAt: "2026-03-10T12:00:00Z",
    restaurantName: "Katz's Delicatessen",
    sellerName: "Marco T.",
    buyerName: "Test Buyer",
    ...overrides,
  };
}

// ── Seller Session ───────────────────────────────────────────────

export function createMockSellerSession(
  overrides?: Partial<SellerSession>
): SellerSession {
  return {
    id: nextId(),
    sellerId: "seller-001",
    restaurantId: "katzs",
    startedAt: "2026-03-10T11:00:00Z",
    endedAt: null,
    waitDurationMinutes: 15,
    estimatedWaitMinutes: null,
    sellerFeeCents: null,
    status: "active",
    ...overrides,
  };
}

// ── Restaurant ───────────────────────────────────────────────────

export function createMockRestaurant(
  overrides?: Partial<Restaurant>
): Restaurant {
  return {
    id: "katzs",
    name: "Katz's Delicatessen",
    address: "205 E Houston St, New York, NY 10002",
    lat: 40.72232,
    lng: -73.98738,
    cuisine: ["deli", "sandwiches"],
    activeSellers: 2,
    waitEstimate: "~15 min",
    ...overrides,
  };
}

// ── Seller ───────────────────────────────────────────────────────

export function createMockSeller(overrides?: Partial<Seller>): Seller {
  return {
    id: nextId(),
    restaurantId: "katzs",
    firstName: "Marco",
    lastInitial: "T",
    positionInLine: 3,
    waitEstimate: "~8 min",
    trustScore: 92,
    completedOrders: 47,
    fee: 5.0,
    menuFlexibility: "full",
    status: "available",
    joinedAt: "2026-03-07T11:22:00Z",
    avgRating: 4.7,
    ratingCount: 38,
    maxOrderCap: 5000,
    ...overrides,
  };
}

// ── Chat Message ─────────────────────────────────────────────────

export function createMockChatMessage(
  overrides?: Partial<ChatMessage>
): ChatMessage {
  return {
    id: nextId(),
    orderId: "order-001",
    senderId: "user-001",
    body: "Hey, I'm at the counter now!",
    createdAt: "2026-03-10T12:05:00Z",
    ...overrides,
  };
}
