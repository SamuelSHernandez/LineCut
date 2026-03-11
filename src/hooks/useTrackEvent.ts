"use client";

import { useCallback, useRef } from "react";

/**
 * Client-side analytics hook. Returns a `track` function that sends events
 * to /api/analytics/track. Deduplicates identical events within 1 second.
 */
export function useTrackEvent() {
  const recentRef = useRef<Map<string, number>>(new Map());

  const track = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      const key = JSON.stringify({ eventName, properties });
      const now = Date.now();
      const lastSent = recentRef.current.get(key);

      // Deduplicate: skip if same event+properties sent within 1 second
      if (lastSent && now - lastSent < 1000) {
        return;
      }
      recentRef.current.set(key, now);

      // Clean up old entries periodically (keep map from growing unbounded)
      if (recentRef.current.size > 50) {
        const cutoff = now - 2000;
        for (const [k, ts] of recentRef.current) {
          if (ts < cutoff) recentRef.current.delete(k);
        }
      }

      // Fire and forget
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: eventName, properties }),
      }).catch(() => {
        // Silently ignore — analytics should never interrupt UX
      });
    },
    []
  );

  return track;
}
