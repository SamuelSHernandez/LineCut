import { vi } from "vitest";
import type { Profile } from "@/lib/profile-context";

// ── Mock Supabase Client ─────────────────────────────────────────

export interface MockSupabaseQuery {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock Supabase client where every method returns `this`
 * for chaining, and terminal methods resolve with configurable data.
 */
export function createMockSupabaseClient(overrides?: {
  data?: unknown;
  error?: unknown;
  user?: { id: string } | null;
}): MockSupabaseClient {
  const resolvedData = overrides?.data ?? null;
  const resolvedError = overrides?.error ?? null;
  const user = overrides?.user ?? null;

  const terminalResult = Promise.resolve({ data: resolvedData, error: resolvedError });

  const query: MockSupabaseQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue(terminalResult),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(terminalResult),
    maybeSingle: vi.fn().mockReturnValue(terminalResult),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(terminalResult),
    then: vi.fn((cb: (val: { data: unknown; error: unknown }) => void) =>
      cb({ data: resolvedData, error: resolvedError })
    ),
  };

  // Make all methods chainable by returning the query object
  for (const key of Object.keys(query) as (keyof MockSupabaseQuery)[]) {
    if (!["single", "maybeSingle", "limit", "insert", "then"].includes(key)) {
      query[key].mockReturnValue(query);
    }
  }

  // single/maybeSingle/limit still chain for select calls
  query.single.mockReturnValue(terminalResult);
  query.maybeSingle.mockReturnValue(terminalResult);
  query.limit.mockReturnValue(terminalResult);

  return {
    from: vi.fn().mockReturnValue(query),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  };
}

// ── Mock Profile ─────────────────────────────────────────────────

export function createMockProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "user-123",
    displayName: "Test User",
    isBuyer: true,
    isSeller: false,
    avatarUrl: null,
    trustScore: 50,
    email: "test@example.com",
    phone: "+15551234567",
    bio: null,
    neighborhood: null,
    emailVerified: false,
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

// ── Mock next/navigation ─────────────────────────────────────────

export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  };
}

// ── Mock fetch ───────────────────────────────────────────────────

export function mockFetchResponse(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}
