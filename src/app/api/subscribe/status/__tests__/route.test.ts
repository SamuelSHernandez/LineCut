import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Bypass server-only directive
vi.mock("server-only", () => ({}));

// Mock @supabase/supabase-js — use inline factory to avoid hoisting issues
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Import after mocks
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/subscribe/status/route";

const mockCreateClient = vi.mocked(createClient);

function makeRequest(code?: string): NextRequest {
  const url = code
    ? `http://localhost:3000/api/subscribe/status?code=${code}`
    : "http://localhost:3000/api/subscribe/status";
  return new NextRequest(url);
}

/** Build a Supabase mock with sequential .from() call results */
function buildSupabaseMock(
  calls: Array<{ data?: unknown; error?: unknown; count?: number | null }>
) {
  let callIndex = 0;
  return {
    from: vi.fn(() => {
      const cfg = calls[callIndex] ?? { data: null, error: null };
      callIndex++;
      const result = {
        data: cfg.data ?? null,
        error: cfg.error ?? null,
        count: cfg.count ?? null,
      };
      const chain: Record<string, unknown> = {};
      const terminal = Promise.resolve(result);
      for (const m of ["select", "eq", "lt", "single", "maybeSingle"]) {
        chain[m] = vi.fn(() =>
          ["single", "maybeSingle"].includes(m) ? terminal : chain
        );
      }
      // Make chain thenable so `await supabase.from(...).select(...)` works
      chain.then = (
        onFulfilled?: ((v: unknown) => unknown) | null,
        onRejected?: ((e: unknown) => unknown) | null
      ) => terminal.then(onFulfilled, onRejected);
      return chain;
    }),
  };
}

describe("GET /api/subscribe/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  it("returns 400 when code param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing/i);
  });

  it("returns 404 when code not found", async () => {
    mockCreateClient.mockReturnValue(
      buildSupabaseMock([{ data: null }]) as never
    );

    const res = await GET(makeRequest("DOESNOTEXIST"));
    expect(res.status).toBe(404);
  });

  it("returns correct payload for valid code", async () => {
    mockCreateClient.mockReturnValue(
      buildSupabaseMock([
        {
          data: {
            email: "user@test.com",
            referral_code: "VALID1",
            referral_count: 2,
            credit_earned: false,
            created_at: "2026-03-01T00:00:00Z",
          },
        },
        { count: 15 }, // ahead count
        { count: 50 }, // total count
      ]) as never
    );

    const res = await GET(makeRequest("VALID1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.referral_code).toBe("VALID1");
    expect(json.referral_count).toBe(2);
    expect(json.credit_earned).toBe(false);
    expect(json.total).toBe(50);
  });

  it("calculates position with referral bump", async () => {
    mockCreateClient.mockReturnValue(
      buildSupabaseMock([
        {
          data: {
            email: "u@t.com",
            referral_code: "BUMP",
            referral_count: 3,
            credit_earned: false,
            created_at: "2026-03-01T00:00:00Z",
          },
        },
        { count: 20 }, // ahead: rawPos = 21
        { count: 50 },
      ]) as never
    );

    const res = await GET(makeRequest("BUMP"));
    const json = await res.json();

    // rawPos = 21, bump = 3*5=15, position = 21-15 = 6
    expect(json.position).toBe(6);
  });

  it("floors position at 1", async () => {
    mockCreateClient.mockReturnValue(
      buildSupabaseMock([
        {
          data: {
            email: "u@t.com",
            referral_code: "MEGA",
            referral_count: 100,
            credit_earned: true,
            created_at: "2026-03-01T00:00:00Z",
          },
        },
        { count: 5 }, // rawPos = 6, bump = 500 → 6-500 = -494 → 1
        { count: 50 },
      ]) as never
    );

    const res = await GET(makeRequest("MEGA"));
    const json = await res.json();

    expect(json.position).toBe(1);
  });

  it("returns correct total count", async () => {
    mockCreateClient.mockReturnValue(
      buildSupabaseMock([
        {
          data: {
            email: "u@t.com",
            referral_code: "X",
            referral_count: 0,
            credit_earned: false,
            created_at: "2026-03-01T00:00:00Z",
          },
        },
        { count: 0 },
        { count: 123 },
      ]) as never
    );

    const res = await GET(makeRequest("X"));
    const json = await res.json();

    expect(json.total).toBe(123);
  });
});
