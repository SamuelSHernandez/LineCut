import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SellerCard from "@/components/buyer/SellerCard";
import { createMockSeller } from "@/test/factories";

describe("SellerCard", () => {
  it("renders seller name", () => {
    const seller = createMockSeller({ firstName: "Marco", lastInitial: "T" });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("Marco T.")).toBeInTheDocument();
  });

  it("renders restaurant fee", () => {
    const seller = createMockSeller({ fee: 5.0 });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("$5.00")).toBeInTheDocument();
    expect(screen.getByText("FEE")).toBeInTheDocument();
  });

  it("renders wait estimate", () => {
    const seller = createMockSeller({ waitEstimate: "~8 min" });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("~8 min")).toBeInTheDocument();
  });

  it("renders completed orders count", () => {
    const seller = createMockSeller({ completedOrders: 47 });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("renders star rating when avgRating is present", () => {
    const seller = createMockSeller({ avgRating: 4.7, ratingCount: 38 });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("4.7 (38)")).toBeInTheDocument();
  });

  it("renders 'New' badge when avgRating is null", () => {
    const seller = createMockSeller({ avgRating: null, ratingCount: 0 });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("shows 'ORDER THROUGH' text when selected", () => {
    const seller = createMockSeller({ firstName: "Marco" });
    render(<SellerCard seller={seller} isSelected={true} onSelect={vi.fn()} />);

    expect(screen.getByText("ORDER THROUGH MARCO")).toBeInTheDocument();
  });

  it("does not show 'ORDER THROUGH' text when not selected", () => {
    const seller = createMockSeller({ firstName: "Marco" });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.queryByText("ORDER THROUGH MARCO")).not.toBeInTheDocument();
  });

  it("calls onSelect when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const seller = createMockSeller();
    render(<SellerCard seller={seller} isSelected={false} onSelect={onSelect} />);

    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("is disabled when seller status is busy", () => {
    const seller = createMockSeller({ status: "busy" });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("BUSY")).toBeInTheDocument();
  });

  it("shows menu flexibility label", () => {
    const seller = createMockSeller({ menuFlexibility: "popular-only" });
    render(<SellerCard seller={seller} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("Popular items only")).toBeInTheDocument();
  });
});
