import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Setup ───────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockAdminUpdate = vi.fn();
const mockAdminSelectSingle = vi.fn();

// Mock the user-scoped Supabase client (used by getAuthenticatedUser)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: vi.fn(),
  }),
}));

// Mock the admin Supabase client (used for billing field updates)
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: () => mockAdminSelectSingle(),
        }),
      }),
      update: (...args: unknown[]) => {
        mockAdminUpdate(...args);
        return {
          eq: vi.fn().mockResolvedValue({ error: null, count: 1 }),
        };
      },
    })),
  })),
}));

// Mock Stripe
const mockStripeSetupIntentsCreate = vi.fn();
const mockStripePaymentMethodsList = vi.fn();
const mockStripePaymentMethodsRetrieve = vi.fn();
const mockStripeCustomersCreate = vi.fn();
const mockStripePaymentMethodsDetach = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    setupIntents: {
      create: (...args: unknown[]) => mockStripeSetupIntentsCreate(...args),
    },
    paymentMethods: {
      list: (...args: unknown[]) => mockStripePaymentMethodsList(...args),
      retrieve: (...args: unknown[]) => mockStripePaymentMethodsRetrieve(...args),
      detach: (...args: unknown[]) => mockStripePaymentMethodsDetach(...args),
    },
    customers: {
      create: (...args: unknown[]) => mockStripeCustomersCreate(...args),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));

import {
  createSetupIntent,
  syncPaymentMethod,
  detachPaymentMethod,
} from "@/app/(dashboard)/profile/actions";

// ── Tests ────────────────────────────────────────────────────────

describe("billing actions", () => {
  const userId = "user-abc-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId, email: "buyer@test.com" } },
      error: null,
    });
  });

  // ── createSetupIntent ──────────────────────────────────────────

  describe("createSetupIntent", () => {
    it("creates a SetupIntent for an existing Stripe customer", async () => {
      mockAdminSelectSingle.mockResolvedValue({
        data: { stripe_customer_id: "cus_existing", display_name: "Buyer" },
        error: null,
      });
      mockStripeSetupIntentsCreate.mockResolvedValue({
        client_secret: "seti_secret_123",
      });

      const result = await createSetupIntent();

      expect(result).toEqual({ clientSecret: "seti_secret_123" });
      expect(mockStripeSetupIntentsCreate).toHaveBeenCalledWith({
        customer: "cus_existing",
        payment_method_types: ["card"],
        metadata: { supabase_user_id: userId },
      });
    });

    it("creates a Stripe customer first if none exists", async () => {
      mockAdminSelectSingle.mockResolvedValue({
        data: { stripe_customer_id: null, display_name: "New Buyer" },
        error: null,
      });
      mockStripeCustomersCreate.mockResolvedValue({ id: "cus_new" });
      mockStripeSetupIntentsCreate.mockResolvedValue({
        client_secret: "seti_secret_456",
      });

      const result = await createSetupIntent();

      expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
        email: "buyer@test.com",
        name: "New Buyer",
        metadata: { supabase_user_id: userId },
      });
      expect(result).toEqual({ clientSecret: "seti_secret_456" });
    });

    it("returns error when profile not found", async () => {
      mockAdminSelectSingle.mockResolvedValue({ data: null, error: null });

      const result = await createSetupIntent();

      expect(result).toEqual({ error: "Profile not found." });
    });

    it("redirects when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(createSetupIntent()).rejects.toThrow("REDIRECT:/auth/login");
    });
  });

  // ── syncPaymentMethod ──────────────────────────────────────────

  describe("syncPaymentMethod", () => {
    it("fetches card from Stripe and updates profile via admin client", async () => {
      mockAdminSelectSingle.mockResolvedValue({
        data: { stripe_customer_id: "cus_existing" },
        error: null,
      });
      mockStripePaymentMethodsList.mockResolvedValue({
        data: [
          {
            id: "pm_123",
            card: {
              last4: "4242",
              brand: "visa",
              exp_month: 12,
              exp_year: 2028,
            },
          },
        ],
      });

      const result = await syncPaymentMethod();

      expect(result).toEqual({ success: true });
      expect(mockStripePaymentMethodsList).toHaveBeenCalledWith({
        customer: "cus_existing",
        type: "card",
        limit: 1,
      });
      expect(mockAdminUpdate).toHaveBeenCalledWith({
        payment_method_last4: "4242",
        payment_method_brand: "visa",
        payment_method_exp_month: 12,
        payment_method_exp_year: 2028,
      });
    });

    it("returns error when no Stripe customer exists", async () => {
      mockAdminSelectSingle.mockResolvedValue({
        data: { stripe_customer_id: null },
        error: null,
      });

      const result = await syncPaymentMethod();

      expect(result).toEqual({ error: "No Stripe customer found." });
      expect(mockStripePaymentMethodsList).not.toHaveBeenCalled();
    });

    it("returns error when no card found on Stripe", async () => {
      mockAdminSelectSingle.mockResolvedValue({
        data: { stripe_customer_id: "cus_existing" },
        error: null,
      });
      mockStripePaymentMethodsList.mockResolvedValue({ data: [] });

      const result = await syncPaymentMethod();

      expect(result).toEqual({ error: "No card found on Stripe customer." });
      expect(mockAdminUpdate).not.toHaveBeenCalled();
    });

    it("returns error when profile update fails", async () => {
      mockAdminSelectSingle.mockResolvedValue({
        data: { stripe_customer_id: "cus_existing" },
        error: null,
      });
      mockStripePaymentMethodsList.mockResolvedValue({
        data: [{ id: "pm_123", card: { last4: "4242", brand: "visa", exp_month: 12, exp_year: 2028 } }],
      });

      // Override admin client to return an error on update
      const { getAdminClient } = await import("@/lib/supabase/admin");
      vi.mocked(getAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: () => Promise.resolve({ data: { stripe_customer_id: "cus_existing" }, error: null }),
            }),
          }),
          update: () => ({
            eq: vi.fn().mockResolvedValue({ error: { message: "RLS violation" }, count: 0 }),
          }),
        })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await syncPaymentMethod();

      expect(result).toEqual({ error: "Failed to save card details." });
    });

    it("redirects when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(syncPaymentMethod()).rejects.toThrow("REDIRECT:/auth/login");
    });
  });

  // ── detachPaymentMethod ────────────────────────────────────────

  describe("detachPaymentMethod", () => {
    it("redirects when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(detachPaymentMethod()).rejects.toThrow("REDIRECT:/auth/login");
    });
  });
});
