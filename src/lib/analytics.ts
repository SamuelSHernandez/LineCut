import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Canonical event names for analytics tracking.
 */
export const EVENTS = {
  ORDER_PLACED: "order.placed",
  ORDER_ACCEPTED: "order.accepted",
  ORDER_COMPLETED: "order.completed",
  ORDER_CANCELLED: "order.cancelled",
  SELLER_WENT_LIVE: "seller.went_live",
  SELLER_ENDED_SESSION: "seller.ended_session",
  TIP_SENT: "tip.sent",
  REVIEW_SUBMITTED: "review.submitted",
  DISPUTE_FILED: "dispute.filed",
  USER_SIGNUP: "user.signup",
  KYC_STARTED: "kyc.started",
  KYC_APPROVED: "kyc.approved",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Track an analytics event. Fire-and-forget — never blocks the caller.
 *
 * @param eventName - One of the EVENTS constants
 * @param userId    - Optional user ID (null for anonymous events)
 * @param properties - Optional JSON-serializable metadata
 */
export function trackEvent(
  eventName: string,
  userId?: string,
  properties?: Record<string, unknown>
): void {
  // Fire and forget — deliberately not awaited.
  // Wrap in Promise.resolve to get a real Promise with .catch support,
  // since Supabase's PromiseLike doesn't expose .catch directly.
  Promise.resolve(
    getAdminClient()
      .from("analytics_events")
      .insert({
        event_name: eventName,
        user_id: userId ?? null,
        properties: properties ?? {},
      })
  )
    .then(({ error }) => {
      if (error) {
        console.error("[analytics] Failed to track event:", eventName, error.message);
      }
    })
    .catch((err: unknown) => {
      console.error("[analytics] Unexpected error tracking event:", eventName, err);
    });
}
