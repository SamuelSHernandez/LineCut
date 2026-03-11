import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @supabase/supabase-js before importing analytics
const mockInsert = vi.fn().mockReturnValue(
  Promise.resolve({ data: null, error: null })
);
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Set required env vars before importing
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

import { EVENTS, trackEvent } from "@/lib/analytics";

describe("EVENTS constants", () => {
  it("contains all expected event names", () => {
    expect(EVENTS.ORDER_PLACED).toBe("order.placed");
    expect(EVENTS.ORDER_ACCEPTED).toBe("order.accepted");
    expect(EVENTS.ORDER_COMPLETED).toBe("order.completed");
    expect(EVENTS.ORDER_CANCELLED).toBe("order.cancelled");
    expect(EVENTS.SELLER_WENT_LIVE).toBe("seller.went_live");
    expect(EVENTS.SELLER_ENDED_SESSION).toBe("seller.ended_session");
    expect(EVENTS.TIP_SENT).toBe("tip.sent");
    expect(EVENTS.REVIEW_SUBMITTED).toBe("review.submitted");
    expect(EVENTS.DISPUTE_FILED).toBe("dispute.filed");
    expect(EVENTS.USER_SIGNUP).toBe("user.signup");
    expect(EVENTS.KYC_STARTED).toBe("kyc.started");
    expect(EVENTS.KYC_APPROVED).toBe("kyc.approved");
  });

  it("has 12 event types", () => {
    expect(Object.keys(EVENTS)).toHaveLength(12);
  });
});

describe("trackEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts event into analytics_events table", async () => {
    trackEvent("order.placed", "user-123", { orderId: "abc" });

    // trackEvent is fire-and-forget, wait a tick for the promise to resolve
    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("analytics_events");
    });

    expect(mockInsert).toHaveBeenCalledWith({
      event_name: "order.placed",
      user_id: "user-123",
      properties: { orderId: "abc" },
    });
  });

  it("sets user_id to null when not provided", async () => {
    trackEvent("seller.went_live");

    await vi.waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });

    expect(mockInsert).toHaveBeenCalledWith({
      event_name: "seller.went_live",
      user_id: null,
      properties: {},
    });
  });

  it("sets properties to empty object when not provided", async () => {
    trackEvent("user.signup", "user-456");

    await vi.waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });

    expect(mockInsert).toHaveBeenCalledWith({
      event_name: "user.signup",
      user_id: "user-456",
      properties: {},
    });
  });

  it("logs error to console when insert fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: "RLS violation" } })
    );

    trackEvent("order.completed", "user-789");

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "[analytics] Failed to track event:",
        "order.completed",
        "RLS violation"
      );
    });

    consoleSpy.mockRestore();
  });
});
