"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";

interface ChatMessageRow {
  id: string;
  order_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  image_url?: string | null;
  message_type?: string;
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    imageUrl: row.image_url ?? null,
    messageType: (row.message_type as "text" | "image") ?? "text",
  };
}

interface UseRealtimeChatOptions {
  orderId: string;
  userId: string;
  enabled?: boolean;
}

interface UseRealtimeChatResult {
  messages: ChatMessage[];
  sendMessage: (body: string) => Promise<void>;
  sendImage: (imageUrl: string) => Promise<void>;
  sending: boolean;
  otherTyping: boolean;
  setTyping: () => void;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  reactions: Record<string, { emoji: string; userId: string }[]>;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "✅", "❓"];
export { QUICK_REACTIONS };

export function useRealtimeChat({
  orderId,
  userId,
  enabled = true,
}: UseRealtimeChatOptions): UseRealtimeChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; userId: string }[]>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingBroadcast = useRef(0);

  useEffect(() => {
    if (!orderId || !userId || !enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    async function init() {
      // Fetch existing messages
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, order_id, sender_id, body, created_at, image_url, message_type")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && data) {
        const fetched = (data as ChatMessageRow[]).map(rowToMessage);
        setTimeout(() => setMessages(fetched), 0);

        // Fetch reactions for these messages
        const messageIds = fetched.map((m) => m.id);
        if (messageIds.length > 0) {
          const { data: rxns } = await supabase
            .from("message_reactions")
            .select("id, message_id, user_id, emoji, created_at")
            .in("message_id", messageIds);
          if (rxns) {
            const grouped: Record<string, { emoji: string; userId: string }[]> = {};
            for (const r of rxns) {
              if (!grouped[r.message_id]) grouped[r.message_id] = [];
              grouped[r.message_id].push({ emoji: r.emoji, userId: r.user_id });
            }
            setTimeout(() => setReactions(grouped), 0);
          }
        }
      }

      // Subscribe to new messages + typing presence
      channel = supabase
        .channel(`chat:${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            const msg = rowToMessage(payload.new as ChatMessageRow);
            setTimeout(() => {
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            }, 0);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message_reactions",
          },
          (payload) => {
            const r = payload.new as { message_id: string; user_id: string; emoji: string };
            setTimeout(() => {
              setReactions((prev) => {
                const existing = prev[r.message_id] ?? [];
                if (existing.some((e) => e.emoji === r.emoji && e.userId === r.user_id)) return prev;
                return { ...prev, [r.message_id]: [...existing, { emoji: r.emoji, userId: r.user_id }] };
              });
            }, 0);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "message_reactions",
          },
          (payload) => {
            const r = payload.old as { message_id: string; user_id: string; emoji: string };
            setTimeout(() => {
              setReactions((prev) => {
                const existing = prev[r.message_id];
                if (!existing) return prev;
                return {
                  ...prev,
                  [r.message_id]: existing.filter((e) => !(e.emoji === r.emoji && e.userId === r.user_id)),
                };
              });
            }, 0);
          }
        )
        .on("broadcast", { event: "typing" }, (payload) => {
          if (payload.payload?.userId !== userId) {
            setOtherTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000);
          }
        })
        .subscribe();

      channelRef.current = channel;
    }

    init();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [orderId, userId, enabled]);

  const setTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 1000) return;
    lastTypingBroadcast.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [userId]);

  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim().slice(0, 500);
      if (!trimmed || sending) return;

      setSending(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            order_id: orderId,
            sender_id: userId,
            body: trimmed,
            message_type: "text",
          })
          .select("id, order_id, sender_id, body, created_at, image_url, message_type")
          .single();

        if (!error && data) {
          const msg = rowToMessage(data as ChatMessageRow);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      } finally {
        setSending(false);
      }
    },
    [orderId, userId, sending]
  );

  const sendImage = useCallback(
    async (imageUrl: string) => {
      if (sending) return;
      setSending(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            order_id: orderId,
            sender_id: userId,
            body: "",
            message_type: "image",
            image_url: imageUrl,
          })
          .select("id, order_id, sender_id, body, created_at, image_url, message_type")
          .single();

        if (!error && data) {
          const msg = rowToMessage(data as ChatMessageRow);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      } finally {
        setSending(false);
      }
    },
    [orderId, userId, sending]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const supabase = createClient();
      const existing = reactions[messageId]?.find(
        (r) => r.emoji === emoji && r.userId === userId
      );

      if (existing) {
        // Remove reaction
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", userId)
          .eq("emoji", emoji);

        setReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] ?? []).filter(
            (r) => !(r.emoji === emoji && r.userId === userId)
          ),
        }));
      } else {
        // Add reaction
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: userId,
          emoji,
        });

        setReactions((prev) => ({
          ...prev,
          [messageId]: [...(prev[messageId] ?? []), { emoji, userId }],
        }));
      }
    },
    [reactions, userId]
  );

  return { messages, sendMessage, sendImage, sending, otherTyping, setTyping, toggleReaction, reactions };
}
