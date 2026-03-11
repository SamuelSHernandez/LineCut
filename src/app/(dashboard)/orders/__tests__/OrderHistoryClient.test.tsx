import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileProvider, type Profile } from "@/lib/profile-context";

// Mock server-only and supabase server client so page.tsx type import resolves
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import OrderHistoryClient from "@/app/(dashboard)/orders/OrderHistoryClient";
import type { OrderHistoryItem } from "@/app/(dashboard)/orders/page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function createProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "user-123",
    displayName: "Test User",
    isBuyer: true,
    isSeller: false,
    avatarUrl: null,
    trustScore: 50,
    email: "test@example.com",
    phone: null,
    bio: null,
    neighborhood: null,
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

function createOrderItem(
  overrides?: Partial<OrderHistoryItem>
): OrderHistoryItem {
  return {
    id: `order-${Math.random().toString(36).slice(2, 10)}`,
    buyerId: "user-123",
    sellerId: "seller-001",
    restaurantName: "Katz's Delicatessen",
    otherPartyName: "Marco T.",
    status: "completed",
    items: [
      { name: "Pastrami on Rye", quantity: 1, price: 24.99 },
      { name: "Dr. Brown's Cream Soda", quantity: 2, price: 3.5 },
    ],
    itemsSubtotal: 3199,
    sellerFee: 800,
    platformFee: 200,
    total: 4199,
    createdAt: "2026-03-10T12:00:00Z",
    updatedAt: "2026-03-10T12:30:00Z",
    ...overrides,
  };
}

function renderWithProfile(
  ui: React.ReactElement,
  profileOverrides?: Partial<Profile>
) {
  const profile = createProfile(profileOverrides);
  return render(
    <ProfileProvider profile={profile}>{ui}</ProfileProvider>
  );
}

describe("OrderHistoryClient", () => {
  it("renders ORDER HISTORY heading", () => {
    renderWithProfile(
      <OrderHistoryClient orders={[]} userId="user-123" />
    );

    expect(screen.getByText("ORDER HISTORY")).toBeInTheDocument();
  });

  it("renders tab switcher for dual-role users", () => {
    renderWithProfile(
      <OrderHistoryClient orders={[createOrderItem()]} userId="user-123" />,
      { isBuyer: true, isSeller: true }
    );

    expect(
      screen.getByRole("tab", { name: "As Buyer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "As Seller" })
    ).toBeInTheDocument();
  });

  it("does NOT render tabs for single-role users", () => {
    renderWithProfile(
      <OrderHistoryClient orders={[createOrderItem()]} userId="user-123" />,
      { isBuyer: true, isSeller: false }
    );

    expect(
      screen.queryByRole("tab", { name: "As Buyer" })
    ).not.toBeInTheDocument();
  });

  it("renders order cards with correct data", () => {
    const order = createOrderItem({
      restaurantName: "Katz's Delicatessen",
      otherPartyName: "Marco T.",
      status: "completed",
      total: 4199,
    });

    renderWithProfile(
      <OrderHistoryClient orders={[order]} userId="user-123" />
    );

    expect(screen.getByText("KATZ'S DELICATESSEN")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("Seller: Marco T.")).toBeInTheDocument();
    expect(screen.getByText("$41.99")).toBeInTheDocument();
  });

  it("renders items summary on order card", () => {
    const order = createOrderItem({
      items: [
        { name: "Pastrami on Rye", quantity: 1, price: 24.99 },
        { name: "Dr. Brown's Cream Soda", quantity: 2, price: 3.5 },
      ],
    });

    renderWithProfile(
      <OrderHistoryClient orders={[order]} userId="user-123" />
    );

    expect(
      screen.getByText("Pastrami on Rye, 2x Dr. Brown's Cream Soda")
    ).toBeInTheDocument();
  });

  it("expanding an order shows fee breakdown", async () => {
    const user = userEvent.setup();
    const order = createOrderItem({
      itemsSubtotal: 3199,
      sellerFee: 800,
      platformFee: 200,
      total: 4199,
    });

    renderWithProfile(
      <OrderHistoryClient orders={[order]} userId="user-123" />
    );

    // Click to expand
    await user.click(screen.getByText("DETAILS"));

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("$31.99")).toBeInTheDocument();
    expect(screen.getByText("Line-skip tip")).toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
    expect(screen.getByText("Service fee")).toBeInTheDocument();
    expect(screen.getByText("$2.00")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("shows empty state when no orders as buyer", () => {
    renderWithProfile(
      <OrderHistoryClient orders={[]} userId="user-123" />,
      { isBuyer: true, isSeller: false }
    );

    expect(
      screen.getByText(
        "No orders yet. Find someone in line and skip the wait."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse restaurants" })
    ).toBeInTheDocument();
  });

  it("shows empty state when no orders as seller", () => {
    renderWithProfile(
      <OrderHistoryClient orders={[]} userId="user-123" />,
      { isBuyer: false, isSeller: true }
    );

    expect(
      screen.getByText(
        "No orders yet. Go live at a restaurant to start earning."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go live" })
    ).toBeInTheDocument();
  });

  it("switches between buyer and seller tabs", async () => {
    const user = userEvent.setup();
    const buyerOrder = createOrderItem({
      buyerId: "user-123",
      sellerId: "seller-001",
      otherPartyName: "Marco T.",
      restaurantName: "Katz's",
    });
    const sellerOrder = createOrderItem({
      buyerId: "buyer-001",
      sellerId: "user-123",
      otherPartyName: "Jane B.",
      restaurantName: "Joe's Pizza",
    });

    renderWithProfile(
      <OrderHistoryClient
        orders={[buyerOrder, sellerOrder]}
        userId="user-123"
      />,
      { isBuyer: true, isSeller: true }
    );

    // Default to buyer tab
    expect(screen.getByText("Seller: Marco T.")).toBeInTheDocument();
    expect(screen.queryByText("Buyer: Jane B.")).not.toBeInTheDocument();

    // Switch to seller tab
    await user.click(screen.getByRole("tab", { name: "As Seller" }));

    expect(screen.getByText("Buyer: Jane B.")).toBeInTheDocument();
    expect(screen.queryByText("Seller: Marco T.")).not.toBeInTheDocument();
  });
});
