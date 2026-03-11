import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DisputeForm from "@/components/shared/DisputeForm";

// Mock Supabase client (used in useEffect to check existing disputes)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

describe("DisputeForm", () => {
  const defaultProps = {
    orderId: "order-123",
    otherPartyName: "Marco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Report an issue' trigger button", () => {
    render(<DisputeForm {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /Report an issue with this order/i })
    ).toBeInTheDocument();
  });

  it("expands form on clicking the trigger", async () => {
    const user = userEvent.setup();
    render(<DisputeForm {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /Report an issue/i })
    );

    // Should show reason header with other party name
    expect(screen.getByText("REPORT ISSUE WITH MARCO")).toBeInTheDocument();
  });

  it("shows reason dropdown after expanding", async () => {
    const user = userEvent.setup();
    render(<DisputeForm {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /Report an issue/i })
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    // Check some reason options exist
    expect(screen.getByText("Select a reason...")).toBeInTheDocument();
    expect(screen.getByText("Wrong items received")).toBeInTheDocument();
    expect(screen.getByText("Missing items")).toBeInTheDocument();
    expect(screen.getByText("Food quality issue")).toBeInTheDocument();
  });

  it("shows details textarea after expanding", async () => {
    const user = userEvent.setup();
    render(<DisputeForm {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /Report an issue/i })
    );

    expect(
      screen.getByPlaceholderText("Describe the issue...")
    ).toBeInTheDocument();
  });

  it("shows submit and cancel buttons", async () => {
    const user = userEvent.setup();
    render(<DisputeForm {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /Report an issue/i })
    );

    expect(
      screen.getByRole("button", { name: /SUBMIT DISPUTE/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /CANCEL/i })
    ).toBeInTheDocument();
  });

  it("submit button is disabled when reason and description are empty", async () => {
    const user = userEvent.setup();
    render(<DisputeForm {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /Report an issue/i })
    );

    expect(
      screen.getByRole("button", { name: /SUBMIT DISPUTE/i })
    ).toBeDisabled();
  });

  it("cancel button collapses back to trigger", async () => {
    const user = userEvent.setup();
    render(<DisputeForm {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /Report an issue/i })
    );
    expect(screen.getByText("REPORT ISSUE WITH MARCO")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /CANCEL/i }));
    expect(
      screen.getByRole("button", { name: /Report an issue/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("REPORT ISSUE WITH MARCO")
    ).not.toBeInTheDocument();
  });

  it("shows character count for description", async () => {
    const user = userEvent.setup();
    render(<DisputeForm {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /Report an issue/i })
    );

    expect(screen.getByText("0/500")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("Describe the issue...");
    await user.type(textarea, "Bad food");

    expect(screen.getByText("8/500")).toBeInTheDocument();
  });
});
