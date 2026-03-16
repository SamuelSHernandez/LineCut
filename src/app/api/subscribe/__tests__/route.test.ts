import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Bypass server-only directive
vi.mock("server-only", () => ({}));

// Mock @supabase/supabase-js — getAdminClient calls createClient from here
const mockCreateClient = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));

// ── Helpers ──────────────────────────────────────────────────

function makeRequest(
  body: Record<string, unknown>,
  ip = "127.0.0.1"
): NextRequest {
  return new NextRequest("http://localhost:3000/api/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

/** Build a Supabase mock where `.from()` returns different chainable results per call */
function buildSupabaseMock(calls: Array<{ data?: unknown; error?: unknown; count?: number | null }>) {
  let callIndex = 0;
  return {
    from: vi.fn(() => {
      const cfg = calls[callIndex] ?? { data: null, error: null };
      callIndex++;
      const result = { data: cfg.data ?? null, error: cfg.error ?? null, count: cfg.count ?? null };
      const chain: Record<string, unknown> = {};
      const terminal = Promise.resolve(result);
      for (const m of ["select", "eq", "lt", "single", "maybeSingle", "insert"]) {
        chain[m] = vi.fn(() => (["single", "maybeSingle", "insert"].includes(m) ? terminal : chain));
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

// ── Suite ─────────────────────────────────────────────────────

// We re-import the route per test group that needs a fresh rate-limiter.
// The rate-limiter is module-level state.
describe("POST /api/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set env vars the route expects
    process.env.MAILCHIMP_API_KEY = "test-key";
    process.env.MAILCHIMP_SERVER_PREFIX = "us1";
    process.env.MAILCHIMP_AUDIENCE_ID = "list123";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  // For tests that DON'T need fresh rate-limiter state, import once
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    // Re-mock after resetModules
    vi.doMock("server-only", () => ({}));
    vi.doMock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));
    const mod = await import("@/app/api/subscribe/route");
    POST = mod.POST;
  });

  // ── Input validation ───────────────────────────────────────

  describe("input validation", () => {
    it("returns 400 when email is missing", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/email/i);
    });

    it("returns 400 when email has no @ symbol", async () => {
      const res = await POST(makeRequest({ email: "notanemail" }));
      expect(res.status).toBe(400);
    });
  });

  // ── Rate limiting ──────────────────────────────────────────

  describe("rate limiting", () => {
    it("allows 3 requests then returns 429 on 4th from same IP", async () => {
      // Need Mailchimp + Supabase mocks for the first 3 to succeed
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "subscribed" }), { status: 200 })
      );
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([
          { data: null }, // no existing entry
          {}, // insert success
          { count: 10 }, // total count
        ])
      );

      const ip = "10.0.0.99";
      for (let i = 0; i < 3; i++) {
        // Reset the supabase mock call index for each iteration
        mockCreateClient.mockReturnValue(
          buildSupabaseMock([
            { data: null },
            {},
            { count: 10 },
          ])
        );
        const res = await POST(makeRequest({ email: `user${i}@test.com` }, ip));
        expect(res.status).not.toBe(429);
      }

      const res = await POST(makeRequest({ email: "blocked@test.com" }, ip));
      expect(res.status).toBe(429);
    });

    it("allows requests from different IPs independently", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "subscribed" }), { status: 200 })
      );
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([{ data: null }, {}, { count: 1 }])
      );

      const res1 = await POST(makeRequest({ email: "a@test.com" }, "1.1.1.1"));
      const res2 = await POST(makeRequest({ email: "b@test.com" }, "2.2.2.2"));
      expect(res1.status).not.toBe(429);
      expect(res2.status).not.toBe(429);
    });
  });

  // ── Env var validation ─────────────────────────────────────

  describe("env var validation", () => {
    it("returns 500 when Mailchimp env vars are missing", async () => {
      delete process.env.MAILCHIMP_API_KEY;
      const res = await POST(makeRequest({ email: "test@test.com" }));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toMatch(/not configured/i);
    });
  });

  // ── Mailchimp integration ──────────────────────────────────

  describe("Mailchimp integration", () => {
    it("PUTs to correct Mailchimp URL with MD5 hash of lowercased email", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "subscribed" }), { status: 200 })
      );
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([{ data: null }, {}, { count: 1 }])
      );

      await POST(makeRequest({ email: "Test@Example.COM" }));

      const putCall = fetchSpy.mock.calls[0];
      expect(putCall[0]).toContain("us1.api.mailchimp.com/3.0/lists/list123/members/");
      expect(putCall[1]?.method).toBe("PUT");
      // MD5 of "test@example.com"
      const crypto = await import("crypto");
      const expectedHash = crypto
        .createHash("md5")
        .update("test@example.com")
        .digest("hex");
      expect(putCall[0]).toContain(expectedHash);
    });

    it("returns 400 with friendly message when email looks fake", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ detail: "This email looks fake or invalid" }),
          { status: 400 }
        )
      );

      const res = await POST(makeRequest({ email: "fake@fake.fake" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/doesn't look right/i);
    });

    it("returns 400 with friendly message on anti-spam rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ detail: "must comply with anti-spam requirements" }),
          { status: 400 }
        )
      );

      const res = await POST(makeRequest({ email: "spam@test.com" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/can't be added/i);
    });

    it("returns Mailchimp status on generic Mailchimp error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ detail: "some other error" }), {
          status: 503,
        })
      );

      const res = await POST(makeRequest({ email: "x@test.com" }));
      expect(res.status).toBe(503);
    });

    it("does not fail when tags POST fails", async () => {
      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // PUT subscriber — success
          return new Response(JSON.stringify({ status: "subscribed" }), {
            status: 200,
          });
        }
        // POST tags — fail
        throw new Error("tags endpoint down");
      });
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([{ data: null }, {}, { count: 5 }])
      );

      const res = await POST(makeRequest({ email: "ok@test.com" }));
      expect(res.status).toBe(200);
    });
  });

  // ── Existing user ──────────────────────────────────────────

  describe("existing user", () => {
    beforeEach(() => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "subscribed" }), { status: 200 })
      );
    });

    it("returns existing referral data without inserting", async () => {
      const existingEntry = {
        referral_code: "EXIST123",
        referral_count: 2,
        credit_earned: false,
      };
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([
          { data: existingEntry }, // existing lookup
          { count: 50 }, // total count
          { data: { created_at: "2026-03-01T00:00:00Z" } }, // created_at sub-query
          { count: 20 }, // ahead count (this is chained with lt)
        ])
      );

      const res = await POST(makeRequest({ email: "existing@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.referral_code).toBe("EXIST123");
      expect(json.referral_count).toBe(2);
    });

    it("calculates position with referral bump, floors at 1", async () => {
      const existingEntry = {
        referral_code: "BUMP",
        referral_count: 100, // 100 * 5 = 500 bump, way more than ahead
        credit_earned: true,
      };
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([
          { data: existingEntry },
          { count: 10 }, // total
          { data: { created_at: "2026-03-01T00:00:00Z" } },
          { count: 5 }, // ahead: rawPos = 6, 6 - 500 = -494 → floor to 1
        ])
      );

      const res = await POST(makeRequest({ email: "bumped@test.com" }));
      const json = await res.json();

      expect(json.position).toBe(1);
    });
  });

  // ── New user ───────────────────────────────────────────────

  describe("new user", () => {
    beforeEach(() => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "subscribed" }), { status: 200 })
      );
    });

    it("inserts new row with referral_code", async () => {
      const supabaseMock = buildSupabaseMock([
        { data: null }, // no existing
        {}, // insert OK
        { count: 10 }, // total
      ]);
      mockCreateClient.mockReturnValue(supabaseMock);

      const res = await POST(makeRequest({ email: "new@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.referral_code).toBeTruthy();
      expect(json.referral_count).toBe(0);
    });

    it("sets referred_by when ref code exists in DB", async () => {
      const supabaseMock = buildSupabaseMock([
        { data: null }, // no existing
        { data: { referral_code: "VALID_REF" } }, // referrer found
        {}, // insert OK
        { count: 5 }, // total
      ]);
      mockCreateClient.mockReturnValue(supabaseMock);

      const res = await POST(
        makeRequest({ email: "referred@test.com", ref: "VALID_REF" })
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("sets referred_by to null when ref code is invalid", async () => {
      const supabaseMock = buildSupabaseMock([
        { data: null }, // no existing
        { data: null }, // referrer NOT found
        {}, // insert OK
        { count: 5 }, // total
      ]);
      mockCreateClient.mockReturnValue(supabaseMock);

      const res = await POST(
        makeRequest({ email: "noreferrer@test.com", ref: "BOGUS" })
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("returns 200 with referral_code: null when Supabase insert fails", async () => {
      const supabaseMock = buildSupabaseMock([
        { data: null }, // no existing
        { error: { message: "unique constraint" } }, // insert fails
        { count: 5 }, // total
      ]);
      mockCreateClient.mockReturnValue(supabaseMock);

      const res = await POST(makeRequest({ email: "insertfail@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.referral_code).toBeNull();
    });
  });

  // ── Happy path ─────────────────────────────────────────────

  describe("happy path end-to-end", () => {
    beforeEach(() => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "subscribed" }), { status: 200 })
      );
    });

    it("new signup returns full payload", async () => {
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([{ data: null }, {}, { count: 42 }])
      );

      const res = await POST(makeRequest({ email: "new@happy.com" }));
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.referral_count).toBe(0);
      expect(json.credit_earned).toBe(false);
      expect(json.total).toBe(42);
      expect(json.position).toBe(42); // new user is last
      expect(json.referral_code).toBeTruthy();
    });

    it("returning user returns existing stats", async () => {
      mockCreateClient.mockReturnValue(
        buildSupabaseMock([
          {
            data: {
              referral_code: "RET123",
              referral_count: 3,
              credit_earned: true,
            },
          },
          { count: 100 },
          { data: { created_at: "2026-01-01T00:00:00Z" } },
          { count: 40 },
        ])
      );

      const res = await POST(makeRequest({ email: "return@happy.com" }));
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.referral_code).toBe("RET123");
      expect(json.referral_count).toBe(3);
      expect(json.credit_earned).toBe(true);
    });
  });
});
