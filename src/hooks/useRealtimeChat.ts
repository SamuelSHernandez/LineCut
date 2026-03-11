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
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
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
  sending: boolean;
}

/**
 * Real-time chat for an order. Fetches existing messages on mount,
 * subscribes to new INSERTs via Supabase Realtime, and exposes sendMessage.
 */
export function useRealtimeChat({
  orderId,
  userId,
  enabled = true,
}: UseRealtimeChatOptions): UseRealtimeChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Fetch existing messages + subscribe to new ones
  useEffect(() => {
    if (!orderId || !userId || !enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    async function init() {
      // Fetch existing messages
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, order_id, sender_id, body, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && data) {
        const fetched = (data as ChatMessageRow[]).map(rowToMessage);
        setTimeout(() => setMessages(fetched), 0);
      }

      // Subscribe to new messages
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
        .subscribe();
    }

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [orderId, userId, enabled]);

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
          })
          .select("id, order_id, sender_id, body, created_at")
          .single();

        if (!error && data) {
          const msg = rowToMessage(data as ChatMessageRow);
          // Optimistic: add immediately (Realtime will dedupe)
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

  return { messages, sendMessage, sending };
}
