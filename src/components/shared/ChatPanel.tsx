"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRealtimeChat, QUICK_REACTIONS } from "@/hooks/useRealtimeChat";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/shared/Avatar";

interface ChatPanelProps {
  orderId: string;
  userId: string;
  otherPartyName: string;
}

export default function ChatPanel({ orderId, userId, otherPartyName }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { messages, sendMessage, sendImage, sending, otherTyping, setTyping, toggleReaction, reactions } = useRealtimeChat({
    orderId,
    userId,
    enabled: true,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages when panel is open
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (open) {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        setTimeout(() => setUnreadCount(0), 0);
      } else {
        const newMessages = messages.slice(prevCountRef.current);
        const fromOther = newMessages.filter((m) => m.senderId !== userId).length;
        if (fromOther > 0) setTimeout(() => setUnreadCount((c) => c + fromOther), 0);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, open, userId]);

  useEffect(() => {
    if (open) setTimeout(() => setUnreadCount(0), 0);
  }, [open]);

  async function handleSend() {
    const body = input.trim();
    if (!body) return;
    setInput("");
    setUploadError(null);
    await sendMessage(body);

    fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, senderId: userId, body }),
    }).catch((err) => {
      console.error("[ChatPanel] Push notification failed:", err);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      setUploadError("Only images are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${orderId}/${crypto.randomUUID()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { contentType: file.type });

      if (storageError) {
        console.error("[ChatPanel] Upload failed:", storageError);
        setUploadError("Upload failed. Try again.");
        return;
      }

      setUploadError(null);

      const { data: urlData } = supabase.storage
        .from("chat-images")
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        await sendImage(urlData.publicUrl);
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Chat with ${otherPartyName}${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="flex items-center gap-1.5 px-3 min-h-[44px] bg-ticket border border-card-border rounded-full font-[family-name:var(--font-body)] text-[12px] text-chalkboard hover:border-mustard transition-colors focus:outline-none focus:ring-2 focus:ring-mustard/50"
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
        <div className="mt-2 bg-ticket border border-card-border rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-card-border">
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
              const msgReactions = reactions[msg.id] ?? [];

              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    {!isMine && (
                      <div className="mb-0.5 ml-1">
                        <Avatar src={null} fallback={otherPartyName} size="sm" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                      className={`text-left px-3 py-1.5 rounded-[8px] font-[family-name:var(--font-body)] text-[13px] ${
                        isMine
                          ? "bg-ketchup text-ticket rounded-br-[2px]"
                          : "bg-butcher-paper text-chalkboard rounded-bl-[2px]"
                      }`}
                    >
                      {msg.messageType === "image" && msg.imageUrl ? (
                        <Image
                          src={msg.imageUrl}
                          alt="Shared image"
                          width={200}
                          height={150}
                          className="rounded-[6px] max-w-full h-auto"
                        />
                      ) : (
                        msg.body
                      )}
                    </button>

                    {/* Reactions display */}
                    {msgReactions.length > 0 && (
                      <div className="flex gap-1 mt-0.5 ml-1">
                        {Object.entries(
                          msgReactions.reduce<Record<string, number>>((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={`text-[12px] px-1 py-0.5 rounded-full border ${
                              msgReactions.some((r) => r.emoji === emoji && r.userId === userId)
                                ? "border-ketchup bg-ketchup/10"
                                : "border-divider bg-ticket"
                            }`}
                          >
                            {emoji}{count > 1 ? count : ""}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reaction picker */}
                    {reactingTo === msg.id && (
                      <div className="flex gap-1 mt-1 ml-1">
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              toggleReaction(msg.id, emoji);
                              setReactingTo(null);
                            }}
                            className="text-[16px] w-7 h-7 flex items-center justify-center rounded-full hover:bg-butcher-paper transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {otherTyping && (
              <div className="flex justify-start">
                <span className="px-3 py-1.5 rounded-[8px] bg-butcher-paper text-sidewalk font-[family-name:var(--font-body)] text-[12px] italic">
                  {otherPartyName} is typing...
                </span>
              </div>
            )}
          </div>

          {/* Upload error */}
          {uploadError && (
            <div
              role="alert"
              className="mx-3 mt-2 px-3 py-1.5 bg-[#FFF3D6] border border-ketchup rounded-[6px] font-[family-name:var(--font-body)] text-[12px] text-ketchup"
            >
              {uploadError}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-card-border">
            {/* Image upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-8 h-8 flex items-center justify-center text-sidewalk hover:text-chalkboard rounded transition-colors disabled:opacity-50"
              aria-label="Send photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              aria-hidden="true"
            />

            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value.slice(0, 500));
                setTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              aria-label={`Message to ${otherPartyName}`}
              className="flex-1 min-h-[36px] bg-butcher-paper rounded-[6px] border border-divider px-2.5 py-1.5 font-[family-name:var(--font-body)] text-[12px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-mustard focus:ring-1 focus:ring-mustard/50 transition-colors"
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
