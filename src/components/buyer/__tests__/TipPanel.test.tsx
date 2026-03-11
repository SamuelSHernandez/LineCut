import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TipPanel from "@/components/buyer/TipPanel";

// Mock the sendTip server action
vi.mock("@/app/(dashboard)/buyer/tip-actions", () => ({
  sendTip: vi.fn().mockResolvedValue({ success: true }),
}));

describe("TipPanel", () => {
  const defaultProps = {
    orderId: "order-123",
    sellerName: "Marco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders preset amount buttons ($1, $2, $5, Other)", () => {
    render(<TipPanel {...defaultProps} />);

    expect(screen.getByRole("button", { name: "$1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
  });

  it("renders tip heading with seller name", () => {
    render(<TipPanel {...defaultProps} />);

    expect(screen.getByRole("heading", { name: "TIP MARCO" })).toBeInTheDocument();
  });

  it("selecting an amount updates the CTA button text", async () => {
    const user = userEvent.setup();
    render(<TipPanel {...defaultProps} />);

    // Initially just shows "TIP MARCO" (no amount)
    const submitButton = screen.getByRole("button", { name: /^TIP MARCO/i });
    expect(submitButton).toHaveTextContent("TIP MARCO");

    // Select $2 preset
    await user.click(screen.getByRole("button", { name: "$2" }));

    // CTA should now show the amount
    expect(
      screen.getByRole("button", { name: /TIP MARCO \$2\.00/i })
    ).toBeInTheDocument();
  });

  it("shows confirmation when existingTip is provided", () => {
    render(
      <TipPanel
        {...defaultProps}
        existingTip={{ amount: 200, status: "succeeded" }}
      />
    );

    expect(screen.getByText(/You tipped Marco/)).toBeInTheDocument();
    expect(screen.getByText("$2.00")).toBeInTheDocument();
    // Preset buttons should not be visible
    expect(screen.queryByRole("button", { name: "$1" })).not.toBeInTheDocument();
  });

  it("clicking Other shows custom amount input", async () => {
    const user = userEvent.setup();
    render(<TipPanel {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Other" }));

    const input = screen.getByPlaceholderText("0.00");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "number");
  });

  it("custom amount input accepts valid values and updates CTA", async () => {
    const user = userEvent.setup();
    render(<TipPanel {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Other" }));

    const input = screen.getByPlaceholderText("0.00");
    await user.type(input, "3.50");

    expect(
      screen.getByRole("button", { name: /TIP MARCO \$3\.50/i })
    ).toBeInTheDocument();
  });

  it("submit button is disabled when no amount is selected", () => {
    render(<TipPanel {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /^TIP MARCO/i });
    expect(submitButton).toBeDisabled();
  });

  it("submit button is enabled after selecting a preset", async () => {
    const user = userEvent.setup();
    render(<TipPanel {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "$5" }));

    const submitButton = screen.getByRole("button", { name: /TIP MARCO \$5\.00/i });
    expect(submitButton).not.toBeDisabled();
  });
});
