import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
  }),
}));

// Mock analytics trackEvent
const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

// Disable "server-only" check in test
vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/analytics/track/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/analytics/track", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/analytics/track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 on valid POST with event name", async () => {
    const req = makeRequest({ event: "order.placed", properties: { orderId: "abc" } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it("calls trackEvent with correct params", async () => {
    const req = makeRequest({
      event: "seller.went_live",
      properties: { restaurantId: "katzs" },
    });
    await POST(req);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "seller.went_live",
      "user-123",
      { restaurantId: "katzs" }
    );
  });

  it("returns 400 on missing event name", async () => {
    const req = makeRequest({ properties: { foo: "bar" } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Missing event name" });
  });

  it("returns 400 on empty event name", async () => {
    const req = makeRequest({ event: "" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 on non-string event", async () => {
    const req = makeRequest({ event: 123 });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics/track", {
      method: "POST",
      body: "not valid json{{{",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Invalid JSON" });
  });

  it("handles unauthenticated requests gracefully", async () => {
    // Override to simulate no auth session
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error("No session")),
      },
    } as never);

    const req = makeRequest({ event: "order.placed" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    // Should still call trackEvent, just without userId
    expect(mockTrackEvent).toHaveBeenCalledWith("order.placed", undefined, undefined);
  });
});
