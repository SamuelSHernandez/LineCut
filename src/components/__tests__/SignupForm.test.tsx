import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupForm from "@/components/SignupForm";

// Mock next/link as a plain anchor
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ── Storage + navigator helpers ──────────────────────────────

const localStorageMock: Record<string, string> = {};
const sessionStorageMock: Record<string, string> = {};
let clipboardWriteTextMock: ReturnType<typeof vi.fn>;

function clearStorageMock(mock: Record<string, string>) {
  for (const key of Object.keys(mock)) delete mock[key];
}

beforeEach(() => {
  clearStorageMock(localStorageMock);
  clearStorageMock(sessionStorageMock);

  vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
    this: Storage,
    key: string
  ) {
    // Differentiate localStorage vs sessionStorage by reference
    if (this === localStorage) return localStorageMock[key] ?? null;
    return sessionStorageMock[key] ?? null;
  });

  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key: string,
    value: string
  ) {
    if (this === localStorage) localStorageMock[key] = value;
    else sessionStorageMock[key] = value;
  });

  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (
    this: Storage,
    key: string
  ) {
    if (this === localStorage) delete localStorageMock[key];
    else delete sessionStorageMock[key];
  });

  // Default: no native share
  Object.defineProperty(navigator, "share", {
    value: undefined,
    writable: true,
    configurable: true,
  });

  // Default clipboard mock
  clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: clipboardWriteTextMock },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset URL
  window.history.pushState({}, "", "/");
});

// ── Tests ────────────────────────────────────────────────────

describe("SignupForm", () => {
  describe("initial render", () => {
    it("renders email input and 'Count Me In' button", () => {
      render(<SignupForm />);
      expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /count me in/i })
      ).toBeInTheDocument();
    });
  });

  describe("referral capture", () => {
    it("stores ref from URL into sessionStorage on mount", () => {
      window.history.pushState({}, "", "/?ref=abc123");
      render(<SignupForm />);
      expect(sessionStorageMock["linecut_ref"]).toBe("abc123");
    });

    it("does not write to sessionStorage when no ref in URL", () => {
      window.history.pushState({}, "", "/");
      render(<SignupForm />);
      expect(sessionStorageMock["linecut_ref"]).toBeUndefined();
    });
  });

  describe("returning user", () => {
    it("fetches status and shows submitted state when localStorage has referral code", async () => {
      localStorageMock["linecut_referral_code"] = "SAVED_CODE";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            referral_code: "SAVED_CODE",
            referral_count: 1,
            credit_earned: false,
            position: 5,
            total: 100,
          }),
          { status: 200 }
        )
      );

      render(<SignupForm />);

      await waitFor(() => {
        expect(screen.getByText("#5")).toBeInTheDocument();
      });
      expect(screen.getByText(/you're on the list/i)).toBeInTheDocument();
    });

    it("clears localStorage and shows form when status returns 404", async () => {
      localStorageMock["linecut_referral_code"] = "STALE_CODE";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
      );

      render(<SignupForm />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
      });
      expect(localStorageMock["linecut_referral_code"]).toBeUndefined();
    });

    it("shows form when no saved referral code", () => {
      render(<SignupForm />);
      expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls /api/subscribe with email and ref from sessionStorage", async () => {
      sessionStorageMock["linecut_ref"] = "REF_FROM_URL";
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            referral_code: "NEW_CODE",
            referral_count: 0,
            credit_earned: false,
            position: 42,
            total: 42,
          }),
          { status: 200 }
        )
      );

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByPlaceholderText("your@email.com"), "me@test.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith("/api/subscribe", expect.objectContaining({
          method: "POST",
        }));
      });

      // Verify the body sent
      const callBody = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.email).toBe("me@test.com");
      expect(callBody.ref).toBe("REF_FROM_URL");
    });

    it("shows 'Saving...' while submitting", async () => {
      let resolveFetch: (value: Response) => void;
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByPlaceholderText("your@email.com"), "a@b.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      expect(screen.getByText("Saving...")).toBeInTheDocument();

      // Resolve to clean up
      resolveFetch!(
        new Response(
          JSON.stringify({
            success: true,
            referral_code: "X",
            referral_count: 0,
            credit_earned: false,
            position: 1,
            total: 1,
          }),
          { status: 200 }
        )
      );
    });

    it("saves referral_code to localStorage on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            referral_code: "SAVED_NEW",
            referral_count: 0,
            credit_earned: false,
            position: 1,
            total: 1,
          }),
          { status: 200 }
        )
      );

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByPlaceholderText("your@email.com"), "save@test.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      await waitFor(() => {
        expect(localStorageMock["linecut_referral_code"]).toBe("SAVED_NEW");
      });
    });

    it("shows position badge on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            referral_code: "POS",
            referral_count: 0,
            credit_earned: false,
            position: 7,
            total: 50,
          }),
          { status: 200 }
        )
      );

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByPlaceholderText("your@email.com"), "pos@test.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      await waitFor(() => {
        expect(screen.getByText("#7")).toBeInTheDocument();
      });
    });

    it("shows inline error on API failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ error: "That email doesn't look right." }),
          { status: 400 }
        )
      );

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByPlaceholderText("your@email.com"), "bad@test.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "That email doesn't look right."
        );
      });
    });

    it("shows network error when fetch throws", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network fail"));

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByPlaceholderText("your@email.com"), "net@test.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          /couldn't connect/i
        );
      });
    });
  });

  describe("success state", () => {
    async function renderSubmitted(overrides: Partial<{
      referral_code: string;
      referral_count: number;
      credit_earned: boolean;
      position: number;
      total: number;
    }> = {}) {
      const data = {
        success: true,
        referral_code: "REF1",
        referral_count: 0,
        credit_earned: false,
        position: 10,
        total: 100,
        ...overrides,
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(data), { status: 200 })
      );

      const user = userEvent.setup();
      render(<SignupForm />);
      await user.type(screen.getByPlaceholderText("your@email.com"), "a@b.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      await waitFor(() => {
        expect(screen.getByText(/you're on the list/i)).toBeInTheDocument();
      });
    }

    it("shows referral stats when referral_count > 0", async () => {
      await renderSubmitted({ referral_count: 3 });
      expect(screen.getByText(/3 friends signed up/i)).toBeInTheDocument();
      expect(screen.getByText(/15 spots/i)).toBeInTheDocument();
    });

    it("hides referral stats when referral_count is 0", async () => {
      await renderSubmitted({ referral_count: 0 });
      expect(screen.queryByText(/friends signed up/i)).not.toBeInTheDocument();
    });

    it("shows credit progress bar when not earned", async () => {
      await renderSubmitted({ credit_earned: false, referral_count: 1 });
      expect(screen.getByText(/\$5 launch credit/i)).toBeInTheDocument();
      expect(screen.getByText("1/3 friends")).toBeInTheDocument();
    });

    it("shows 'CREDIT LOCKED IN' when earned", async () => {
      await renderSubmitted({ credit_earned: true });
      expect(screen.getByText(/credit locked in/i)).toBeInTheDocument();
    });

    it("'Create an account' link includes email in href", async () => {
      await renderSubmitted();
      const link = screen.getByText(/create an account/i);
      expect(link.closest("a")).toHaveAttribute(
        "href",
        expect.stringContaining(encodeURIComponent("a@b.com"))
      );
    });
  });

  describe("share", () => {
    it("copy writes share text to clipboard and shows 'Copied!'", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            referral_code: "COPY_ME",
            referral_count: 0,
            credit_earned: false,
            position: 1,
            total: 1,
          }),
          { status: 200 }
        )
      );

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByPlaceholderText("your@email.com"), "c@t.com");
      await user.click(screen.getByRole("button", { name: /count me in/i }));

      await waitFor(() => {
        expect(screen.getByText(/you're on the list/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /copy/i }));

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
      // userEvent.setup() replaces navigator.clipboard — read from it directly
      const clipboardText = await navigator.clipboard.readText();
      expect(clipboardText).toContain("COPY_ME");
    });
  });
});
