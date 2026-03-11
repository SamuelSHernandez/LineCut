"use client";

import { useState, useRef, useEffect } from "react";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";

interface ChatPanelProps {
  orderId: string;
  userId: string;
  otherPartyName: string;
}

export default function ChatPanel({ orderId, userId, otherPartyName }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, sending } = useRealtimeChat({
    orderId,
    userId,
    enabled: true,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-scroll on new messages when panel is open
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (open) {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        setTimeout(() => setUnreadCount(0), 0);
      } else {
        // Count unread from other party
        const newMessages = messages.slice(prevCountRef.current);
        const fromOther = newMessages.filter((m) => m.senderId !== userId).length;
        if (fromOther > 0) setTimeout(() => setUnreadCount((c) => c + fromOther), 0);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, open, userId]);

  // Clear unread when opening
  useEffect(() => {
    if (open) setTimeout(() => setUnreadCount(0), 0);
  }, [open]);

  async function handleSend() {
    const body = input.trim();
    if (!body) return;
    setInput("");
    await sendMessage(body);

    // Send push notification via API (fire and forget)
    fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, senderId: userId, body }),
    }).catch(() => {});
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Chat with ${otherPartyName}${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="flex items-center gap-1.5 px-3 min-h-[44px] bg-ticket border border-[#ddd4c4] rounded-full font-[family-name:var(--font-body)] text-[12px] text-chalkboard hover:border-mustard transition-colors focus:outline-none focus:ring-2 focus:ring-mustard/50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Chat
        {unreadCount > 0 && (
          <span className="bg-ketchup text-ticket text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="mt-2 bg-ticket border border-[#ddd4c4] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#eee6d8]">
            <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[1px] text-sidewalk uppercase">
              Chat with {otherPartyName}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center text-sidewalk hover:text-chalkboard text-[16px] leading-none rounded focus:outline-none focus:ring-2 focus:ring-mustard/50"
              aria-label="Close chat"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            className="max-h-[200px] overflow-y-auto px-3 py-2 space-y-2"
          >
            {messages.length === 0 && (
              <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk text-center py-4">
                No messages yet. Say hi!
              </p>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderId === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-1.5 rounded-[8px] font-[family-name:var(--font-body)] text-[13px] ${
                      isMine
                        ? "bg-ketchup text-ticket rounded-br-[2px]"
                        : "bg-butcher-paper text-chalkboard rounded-bl-[2px]"
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-[#eee6d8]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              aria-label={`Message to ${otherPartyName}`}
              className="flex-1 min-h-[36px] bg-butcher-paper rounded-[6px] border border-[#ddd4c4] px-2.5 py-1.5 font-[family-name:var(--font-body)] text-[12px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-mustard focus:ring-1 focus:ring-mustard/50 transition-colors"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="min-w-[48px] min-h-[32px] bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[12px] font-semibold rounded-[6px] disabled:opacity-50 transition-opacity"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
