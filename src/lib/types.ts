export interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cuisine: string[];
  activeSellers?: number;
  waitEstimate: string;
}

export interface WaitTimeStats {
  restaurantId: string;
  avgWaitMinutes: number;
  reportCount: number;
  activeSellers: number;
}

export interface SellerSession {
  id: string;
  sellerId: string;
  restaurantId: string;
  startedAt: string;
  endedAt: string | null;
  waitDurationMinutes: number | null;
  status: "active" | "completed" | "cancelled";
}

export interface Seller {
  id: string;
  restaurantId: string;
  firstName: string;
  lastInitial: string;
  positionInLine: number;
  waitEstimate: string;
  trustScore: number;
  completedOrders: number;
  fee: number;
  menuFlexibility: "full" | "popular-only" | "preset";
  status: "available" | "busy";
  joinedAt: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  popular: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "in-progress"
  | "ready"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  restaurantId: string;
  items: OrderItem[];
  specialInstructions: string;
  status: OrderStatus;
  itemsSubtotal: number;
  sellerFee: number;
  platformFee: number;
  total: number;
  stripePaymentIntentId: string | null;
  createdAt: string;
  statusUpdatedAt: string;
  restaurantName: string;
  sellerName: string;
  buyerName: string;
}

export interface PayoutAccount {
  id: string;
  userId: string;
  stripeAccountId: string;
  status: "pending" | "active" | "revoked";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
