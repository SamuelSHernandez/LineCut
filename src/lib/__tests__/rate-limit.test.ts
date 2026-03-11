import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to reset the module-level store between tests.
// Import fresh module each time via dynamic import or vi.resetModules.
let rateLimit: typeof import("@/lib/rate-limit").rateLimit;

beforeEach(async () => {
  vi.resetModules();
  // Clear any lingering timers from ensureCleanup()
  vi.restoreAllMocks();
  const mod = await import("@/lib/rate-limit");
  rateLimit = mod.rateLimit;
});

describe("rateLimit", () => {
  it("allows requests within the limit", () => {
    const result1 = rateLimit("test-key", 3, 60_000);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = rateLimit("test-key", 3, 60_000);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = rateLimit("test-key", 3, 60_000);
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("blocks requests exceeding the limit", () => {
    // Use up all tokens
    rateLimit("block-key", 2, 60_000);
    rateLimit("block-key", 2, 60_000);

    // Third request should be blocked
    const result = rateLimit("block-key", 2, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("allows requests after the window expires", () => {
    // Use a very short window
    rateLimit("expire-key", 1, 50);

    // Should be blocked
    const blocked = rateLimit("expire-key", 1, 50);
    expect(blocked.success).toBe(false);

    // Manually advance time past the window by manipulating Date.now
    const realNow = Date.now;
    vi.spyOn(Date, "now").mockReturnValue(realNow() + 100);

    const allowed = rateLimit("expire-key", 1, 50);
    expect(allowed.success).toBe(true);
    expect(allowed.remaining).toBe(0);

    vi.restoreAllMocks();
  });

  it("treats different keys independently", () => {
    // Exhaust limit for key A
    rateLimit("key-a", 1, 60_000);
    const blockedA = rateLimit("key-a", 1, 60_000);
    expect(blockedA.success).toBe(false);

    // Key B should still work
    const resultB = rateLimit("key-b", 1, 60_000);
    expect(resultB.success).toBe(true);
  });

  it("returns correct remaining count", () => {
    const r1 = rateLimit("count-key", 5, 60_000);
    expect(r1.remaining).toBe(4);

    const r2 = rateLimit("count-key", 5, 60_000);
    expect(r2.remaining).toBe(3);

    const r3 = rateLimit("count-key", 5, 60_000);
    expect(r3.remaining).toBe(2);
  });
});
