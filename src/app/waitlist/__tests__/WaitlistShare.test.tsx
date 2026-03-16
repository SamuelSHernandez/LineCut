import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WaitlistShare from "@/app/waitlist/WaitlistShare";

// Keep a reference to the clipboard mock fn so we can assert on it
let writeTextMock: ReturnType<typeof vi.fn>;

describe("WaitlistShare", () => {
  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    // Default: no native share
    delete (navigator as Record<string, unknown>).share;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders share URL with referral code", () => {
    render(<WaitlistShare referralCode="TEST123" />);
    expect(
      screen.getByText((text) => text.includes("TEST123"))
    ).toBeInTheDocument();
  });

  it("clicking Copy writes to clipboard and shows 'Copied!'", async () => {
    const user = userEvent.setup();
    render(<WaitlistShare referralCode="CLIP1" />);

    await user.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
    // userEvent.setup() replaces navigator.clipboard — read from it directly
    const clipboardText = await navigator.clipboard.readText();
    expect(clipboardText).toContain("CLIP1");
  });

  it("reverts 'Copied!' back to 'Copy' after 2 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<WaitlistShare referralCode="REVERT" />);

    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(screen.getByText("Copied!")).toBeInTheDocument();

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("renders Share button when navigator.share is available", () => {
    Object.defineProperty(navigator, "share", {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });
    render(<WaitlistShare referralCode="SHARE1" />);
    expect(screen.getByRole("button", { name: /^share$/i })).toBeInTheDocument();
  });

  it("hides Share button when navigator.share is unavailable", () => {
    // Ensure share is truly absent (not just undefined) so "share" in navigator is false
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (navigator as Record<string, unknown>).share;
    render(<WaitlistShare referralCode="NOSHARE" />);
    expect(screen.queryByRole("button", { name: /^share$/i })).not.toBeInTheDocument();
  });

  it("clicking Share calls navigator.share with correct params", async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareFn,
      writable: true,
      configurable: true,
    });

    const user = userEvent.setup();
    render(<WaitlistShare referralCode="NATIVE" />);

    await user.click(screen.getByRole("button", { name: /^share$/i }));

    expect(shareFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "LineCut",
        url: expect.stringContaining("NATIVE"),
      })
    );
  });

  it("SMS link has correct sms: href", () => {
    render(<WaitlistShare referralCode="SMS1" />);
    const smsLink = screen.getByText(/text a friend/i);
    expect(smsLink.closest("a")).toHaveAttribute(
      "href",
      expect.stringContaining("sms:")
    );
    expect(smsLink.closest("a")).toHaveAttribute(
      "href",
      expect.stringContaining("SMS1")
    );
  });
});
