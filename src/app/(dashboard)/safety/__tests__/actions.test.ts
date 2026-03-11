import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Setup ───────────────────────────────────────────────────
// We mock the server-side Supabase client and next/navigation since
// these are server actions that import "server-only" modules.

const mockInsert = vi.fn();
const mockDeleteChain = { eq: vi.fn() };
const mockSelectChain = {
  eq: vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
};

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === "blocked_users") {
    return {
      insert: mockInsert,
      delete: () => ({
        eq: vi.fn().mockReturnValue(mockDeleteChain),
      }),
      select: () => mockSelectChain,
    };
  }
  if (table === "user_reports") {
    return {
      insert: mockInsert,
    };
  }
  return { insert: mockInsert };
});

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Disable "server-only" check in test
vi.mock("server-only", () => ({}));

import { blockUser, unblockUser, reportUser } from "@/app/(dashboard)/safety/actions";

describe("safety actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "current-user-123" } },
      error: null,
    });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockDeleteChain.eq.mockResolvedValue({ data: null, error: null });
  });

  describe("blockUser", () => {
    it("inserts correct data with blocker_id and blocked_id", async () => {
      await blockUser("target-user-456");

      expect(mockFrom).toHaveBeenCalledWith("blocked_users");
      expect(mockInsert).toHaveBeenCalledWith({
        blocker_id: "current-user-123",
        blocked_id: "target-user-456",
        reason: null,
      });
    });

    it("inserts with reason when provided", async () => {
      await blockUser("target-user-456", "Rude behavior");

      expect(mockInsert).toHaveBeenCalledWith({
        blocker_id: "current-user-123",
        blocked_id: "target-user-456",
        reason: "Rude behavior",
      });
    });

    it("returns success on successful insert", async () => {
      const result = await blockUser("target-user-456");
      expect(result).toEqual({ success: true });
    });

    it("returns error when blocking self", async () => {
      const result = await blockUser("current-user-123");
      expect(result).toEqual({ error: "You cannot block yourself." });
    });

    it("returns error for duplicate block", async () => {
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "duplicate" },
      });

      const result = await blockUser("target-user-456");
      expect(result).toEqual({
        error: "You have already blocked this user.",
      });
    });

    it("redirects when not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(blockUser("target-user-456")).rejects.toThrow(
        "REDIRECT:/auth/login"
      );
    });
  });

  describe("unblockUser", () => {
    it("deletes the correct blocked_users row", async () => {
      await unblockUser("target-user-456");

      expect(mockFrom).toHaveBeenCalledWith("blocked_users");
    });

    it("returns success on successful delete", async () => {
      const result = await unblockUser("target-user-456");
      expect(result).toEqual({ success: true });
    });

    it("redirects when not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(unblockUser("target-user-456")).rejects.toThrow(
        "REDIRECT:/auth/login"
      );
    });
  });

  describe("reportUser", () => {
    it("inserts report with correct fields", async () => {
      await reportUser(
        "target-user-456",
        "order-789",
        "harassment",
        "Sent threatening messages"
      );

      expect(mockFrom).toHaveBeenCalledWith("user_reports");
      expect(mockInsert).toHaveBeenCalledWith({
        reporter_id: "current-user-123",
        reported_id: "target-user-456",
        order_id: "order-789",
        reason: "harassment",
        details: "Sent threatening messages",
      });
    });

    it("strips HTML tags from details", async () => {
      await reportUser(
        "target-user-456",
        null,
        "other",
        '<script>alert("xss")</script>Bad user'
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: 'alert("xss")Bad user',
        })
      );
    });

    it("returns error when reporting self", async () => {
      const result = await reportUser(
        "current-user-123",
        null,
        "other",
        "Testing"
      );
      expect(result).toEqual({ error: "You cannot report yourself." });
    });

    it("returns success on valid report", async () => {
      const result = await reportUser(
        "target-user-456",
        null,
        "fraud",
        "Suspicious activity"
      );
      expect(result).toEqual({ success: true });
    });

    it("redirects when not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(
        reportUser("target-user-456", null, "other", "Test")
      ).rejects.toThrow("REDIRECT:/auth/login");
    });
  });
});
