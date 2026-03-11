import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPanel from "@/components/shared/ChatPanel";
import { createMockChatMessage } from "@/test/factories";

// Mock the useRealtimeChat hook
const mockSendMessage = vi.fn();
const mockMessages: ReturnType<typeof createMockChatMessage>[] = [];

vi.mock("@/hooks/useRealtimeChat", () => ({
  useRealtimeChat: () => ({
    messages: mockMessages,
    sendMessage: mockSendMessage,
    sending: false,
  }),
}));

// Mock fetch (used for push notification fire-and-forget)
global.fetch = vi.fn().mockResolvedValue({ ok: true });

describe("ChatPanel", () => {
  const defaultProps = {
    orderId: "order-123",
    userId: "user-001",
    otherPartyName: "Marco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages.length = 0;
  });

  it("renders the Chat toggle button", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Chat/i })).toBeInTheDocument();
  });

  it("shows empty state when panel is open and no messages", async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} />);

    await user.click(screen.getByText("Chat"));

    expect(screen.getByText("No messages yet. Say hi!")).toBeInTheDocument();
  });

  it("shows message list when panel is open", async () => {
    const user = userEvent.setup();
    mockMessages.push(
      createMockChatMessage({
        senderId: "other-user",
        body: "Hey there!",
      }),
      createMockChatMessage({
        senderId: "user-001",
        body: "On my way!",
      })
    );

    render(<ChatPanel {...defaultProps} />);
    await user.click(screen.getByText("Chat"));

    expect(screen.getByText("Hey there!")).toBeInTheDocument();
    expect(screen.getByText("On my way!")).toBeInTheDocument();
  });

  it("has input field and send button when open", async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} />);

    await user.click(screen.getByText("Chat"));

    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} />);

    await user.click(screen.getByText("Chat"));

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("send button becomes enabled when input has text", async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} />);

    await user.click(screen.getByText("Chat"));

    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "Hello!");

    expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled();
  });

  it("shows header with other party name", async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} />);

    await user.click(screen.getByText("Chat"));

    expect(screen.getByText("Chat with Marco")).toBeInTheDocument();
  });

  it("has a close button that hides the panel", async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} />);

    await user.click(screen.getByText("Chat"));
    expect(screen.getByText("Chat with Marco")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Close chat"));
    expect(screen.queryByText("Chat with Marco")).not.toBeInTheDocument();
  });
});
