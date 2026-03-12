export interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cuisine: string[];
  activeSellers?: number;
  waitEstimate: string;
  googlePlaceId?: string | null;
  imageUrl?: string | null;
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
  estimatedWaitMinutes: number | null;
  sellerFeeCents: number | null;
  status: "active" | "winding_down" | "completed" | "cancelled";
  pickupInstructions?: string | null;
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
  avgRating: number | null;
  ratingCount: number;
  maxOrderCap: number;
  kycVerified?: boolean;
  pickupInstructions?: string | null;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  popular: boolean;
  imageUrl?: string | null;
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
  readyAt?: string;
  restaurantName: string;
  sellerName: string;
  buyerName: string;
  pickupInstructions?: string | null;
  cancellationReason?: string | null;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  body: string;
  createdAt: string;
  imageUrl?: string | null;
  messageType: "text" | "image";
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  role: "buyer" | "seller";
  stars: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
}

export type DisputeReason =
  | "wrong_items"
  | "missing_items"
  | "food_quality"
  | "no_show"
  | "rude_behavior"
  | "payment_issue"
  | "other";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_refund"
  | "resolved_no_action"
  | "resolved_warning";

export interface Dispute {
  id: string;
  orderId: string;
  reporterId: string;
  reporterRole: "buyer" | "seller";
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
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
