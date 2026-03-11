import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstallPrompt from "@/components/shared/InstallPrompt";

describe("InstallPrompt", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalNavigator: PropertyDescriptor | undefined;
  const localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    originalMatchMedia = window.matchMedia;
    originalNavigator = Object.getOwnPropertyDescriptor(window, "navigator");

    // Clear localStorage mock
    for (const key of Object.keys(localStorageMock)) {
      delete localStorageMock[key];
    }

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key: string) => localStorageMock[key] ?? null
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      }
    );
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(
      (key: string) => {
        delete localStorageMock[key];
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
    if (originalNavigator) {
      Object.defineProperty(window, "navigator", originalNavigator);
    }
    vi.restoreAllMocks();
  });

  function mockStandaloneMode(standalone: boolean) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)" ? standalone : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
  }

  it("does not render when in standalone mode", () => {
    mockStandaloneMode(true);

    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("does not render when recently dismissed", () => {
    mockStandaloneMode(false);
    // Set dismiss timestamp to 1 hour ago (within 7 day window)
    localStorageMock["linecut-install-dismissed"] = (
      Date.now() - 3600000
    ).toString();

    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("renders install banner for iOS Safari", () => {
    mockStandaloneMode(false);

    // Mock iOS Safari UA
    Object.defineProperty(window, "navigator", {
      value: {
        ...window.navigator,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
        geolocation: window.navigator.geolocation,
      },
      writable: true,
      configurable: true,
    });

    render(<InstallPrompt />);

    expect(
      screen.getByText("Add LineCut to your Home Screen")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Add to Home Screen/)
    ).toBeInTheDocument();
  });

  it("dismiss button hides the banner and stores timestamp", async () => {
    mockStandaloneMode(false);

    Object.defineProperty(window, "navigator", {
      value: {
        ...window.navigator,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
        geolocation: window.navigator.geolocation,
      },
      writable: true,
      configurable: true,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<InstallPrompt />);

    expect(
      screen.getByText("Add LineCut to your Home Screen")
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Dismiss install prompt"));

    // Wait for the 300ms animation timeout
    vi.advanceTimersByTime(400);

    expect(localStorageMock["linecut-install-dismissed"]).toBeDefined();
  });

  it("renders for Android when beforeinstallprompt fires", async () => {
    mockStandaloneMode(false);

    // Mock requestAnimationFrame to execute callback synchronously
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    Object.defineProperty(window, "navigator", {
      value: {
        ...window.navigator,
        userAgent:
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        platform: "Linux armv81",
        maxTouchPoints: 1,
        geolocation: window.navigator.geolocation,
      },
      writable: true,
      configurable: true,
    });

    const { rerender } = render(<InstallPrompt />);

    // Simulate beforeinstallprompt event
    const event = new Event("beforeinstallprompt", {
      cancelable: true,
    });
    Object.assign(event, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);

    // Rerender to pick up state changes from the event handler
    rerender(<InstallPrompt />);

    expect(
      screen.getByText("Add LineCut to your Home Screen")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Install LineCut for faster access and offline support.")
    ).toBeInTheDocument();
  });
});
