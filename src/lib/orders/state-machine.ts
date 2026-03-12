/**
 * Order state machine — source of truth for valid transitions,
 * allowed actors, and side effects.
 *
 * The SQL RPC `transition_order` enforces these rules at the database level.
 * This TypeScript layer lets the frontend know which buttons to render.
 */

export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "in-progress",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ActorRole = "buyer" | "seller" | "system";

export interface TransitionConfig {
  allowedActors: readonly ActorRole[];
  sideEffects: readonly string[];
  label: string;
  /** Description shown to the actor */
  description: string;
}

/**
 * Every legal transition in the order lifecycle.
 * Keyed by `fromStatus` then `toStatus`.
 */
export const TRANSITION_MAP: Readonly<
  Partial<Record<OrderStatus, Partial<Record<OrderStatus, TransitionConfig>>>>
> = {
  pending: {
    accepted: {
      allowedActors: ["seller"],
      sideEffects: ["notify_buyer_accepted"],
      label: "ACCEPT",
      description: "Accept this order and start working on it.",
    },
    cancelled: {
      allowedActors: ["seller", "buyer", "system"],
      sideEffects: ["void_payment", "notify_other_party"],
      label: "DECLINE",
      description: "Decline this order and release the payment hold.",
    },
  },
  accepted: {
    "in-progress": {
      allowedActors: ["seller"],
      sideEffects: ["notify_buyer_in_progress"],
      label: "STARTED ORDERING",
      description: "You've placed their order at the counter.",
    },
    cancelled: {
      allowedActors: ["seller", "system"],
      sideEffects: ["void_payment", "notify_buyer_cancelled"],
      label: "CANCEL",
      description: "Cancel the accepted order and release the payment hold.",
    },
  },
  "in-progress": {
    ready: {
      allowedActors: ["seller"],
      sideEffects: ["capture_payment", "notify_buyer_ready"],
      label: "ORDER'S READY",
      description: "You've got the food in hand. Payment will be captured.",
    },
    cancelled: {
      allowedActors: ["seller", "system"],
      sideEffects: ["void_payment", "notify_buyer_cancelled"],
      label: "CANCEL",
      description: "Cancel the in-progress order and release the payment hold.",
    },
  },
  ready: {
    completed: {
      allowedActors: ["seller", "buyer"],
      sideEffects: ["release_payout", "prompt_review"],
      label: "HANDED OFF",
      description: "The buyer has their food.",
    },
    cancelled: {
      allowedActors: ["system"],
      sideEffects: ["notify_both_parties"],
      label: "CANCEL",
      description: "System-initiated cancellation after ready. Seller keeps payment (buyer no-show).",
    },
  },
} as const;

/**
 * Check whether a transition from `from` to `to` is valid for the given actor role.
 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actorRole: ActorRole
): boolean {
  const fromTransitions = TRANSITION_MAP[from];
  if (!fromTransitions) return false;

  const config = fromTransitions[to];
  if (!config) return false;

  return config.allowedActors.includes(actorRole);
}

/**
 * Get the transition config for a given from->to pair, or null if invalid.
 */
export function getTransitionConfig(
  from: OrderStatus,
  to: OrderStatus
): TransitionConfig | null {
  const fromTransitions = TRANSITION_MAP[from];
  if (!fromTransitions) return null;
  return fromTransitions[to] ?? null;
}

/**
 * Get all valid next statuses for a given current status and actor role.
 */
export function getAvailableTransitions(
  currentStatus: OrderStatus,
  actorRole: ActorRole
): Array<{ toStatus: OrderStatus; config: TransitionConfig }> {
  const fromTransitions = TRANSITION_MAP[currentStatus];
  if (!fromTransitions) return [];

  const results: Array<{ toStatus: OrderStatus; config: TransitionConfig }> = [];

  for (const [toStatus, config] of Object.entries(fromTransitions)) {
    if (config && config.allowedActors.includes(actorRole)) {
      results.push({ toStatus: toStatus as OrderStatus, config });
    }
  }

  return results;
}

/** Auto-cancel timeout for pending orders (ms) */
export const PENDING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Ready-state timeout: default buyer pickup window (ms). Per-seller override via profile. */
export const READY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (default)

/** Ready-state reminder: nudge buyer at 7 min (ms) */
export const READY_REMINDER_MS = 7 * 60 * 1000; // 7 minutes

/** Seller cancellation fee in cents when cancelling after accepting */
export const SELLER_CANCEL_FEE_CENTS = 500; // $5.00

/** Auto-complete after single-party confirmation (ms) */
export const HANDOFF_AUTO_COMPLETE_MS = 5 * 60 * 1000; // 5 minutes

/** System actor UUID — used for auto-cancel and scheduled jobs */
export const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";
