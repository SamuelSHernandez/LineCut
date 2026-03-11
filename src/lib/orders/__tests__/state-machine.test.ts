import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  TRANSITION_MAP,
  canTransition,
  getTransitionConfig,
  getAvailableTransitions,
  PENDING_TIMEOUT_MS,
  READY_TIMEOUT_MS,
  READY_REMINDER_MS,
  HANDOFF_AUTO_COMPLETE_MS,
  SYSTEM_ACTOR_ID,
} from "@/lib/orders/state-machine";

describe("ORDER_STATUSES", () => {
  it("contains all expected statuses", () => {
    expect(ORDER_STATUSES).toEqual([
      "pending",
      "accepted",
      "in-progress",
      "ready",
      "completed",
      "cancelled",
    ]);
  });
});

describe("constants", () => {
  it("PENDING_TIMEOUT_MS is 5 minutes", () => {
    expect(PENDING_TIMEOUT_MS).toBe(5 * 60 * 1000);
  });

  it("READY_TIMEOUT_MS is 15 minutes", () => {
    expect(READY_TIMEOUT_MS).toBe(15 * 60 * 1000);
  });

  it("READY_REMINDER_MS is 10 minutes", () => {
    expect(READY_REMINDER_MS).toBe(10 * 60 * 1000);
  });

  it("HANDOFF_AUTO_COMPLETE_MS is 5 minutes", () => {
    expect(HANDOFF_AUTO_COMPLETE_MS).toBe(5 * 60 * 1000);
  });

  it("SYSTEM_ACTOR_ID is a zero UUID", () => {
    expect(SYSTEM_ACTOR_ID).toBe("00000000-0000-0000-0000-000000000000");
  });
});

describe("canTransition", () => {
  it("allows seller to accept pending order", () => {
    expect(canTransition("pending", "accepted", "seller")).toBe(true);
  });

  it("allows seller to cancel pending order", () => {
    expect(canTransition("pending", "cancelled", "seller")).toBe(true);
  });

  it("allows buyer to cancel pending order", () => {
    expect(canTransition("pending", "cancelled", "buyer")).toBe(true);
  });

  it("does NOT allow buyer to accept pending order", () => {
    expect(canTransition("pending", "accepted", "buyer")).toBe(false);
  });

  it("allows seller to mark in-progress from accepted", () => {
    expect(canTransition("accepted", "in-progress", "seller")).toBe(true);
  });

  it("allows seller to mark ready from in-progress", () => {
    expect(canTransition("in-progress", "ready", "seller")).toBe(true);
  });

  it("allows seller or buyer to mark completed from ready", () => {
    expect(canTransition("ready", "completed", "seller")).toBe(true);
    expect(canTransition("ready", "completed", "buyer")).toBe(true);
  });

  it("does NOT allow buyer to cancel after ready (only system)", () => {
    expect(canTransition("ready", "cancelled", "buyer")).toBe(false);
    expect(canTransition("ready", "cancelled", "seller")).toBe(false);
    expect(canTransition("ready", "cancelled", "system")).toBe(true);
  });

  it("returns false for completed -> anything", () => {
    expect(canTransition("completed", "cancelled", "system")).toBe(false);
    expect(canTransition("completed", "pending", "seller")).toBe(false);
  });

  it("returns false for cancelled -> anything", () => {
    expect(canTransition("cancelled", "pending", "system")).toBe(false);
  });

  it("returns false for skipping states (pending -> ready)", () => {
    expect(canTransition("pending", "ready", "seller")).toBe(false);
  });
});

describe("getTransitionConfig", () => {
  it("returns config for valid transition", () => {
    const config = getTransitionConfig("pending", "accepted");
    expect(config).not.toBeNull();
    expect(config!.label).toBe("ACCEPT");
    expect(config!.allowedActors).toContain("seller");
  });

  it("returns null for invalid transition", () => {
    expect(getTransitionConfig("completed", "pending")).toBeNull();
  });

  it("includes side effects for payment-related transitions", () => {
    const config = getTransitionConfig("in-progress", "ready");
    expect(config!.sideEffects).toContain("capture_payment");
  });
});

describe("getAvailableTransitions", () => {
  it("returns accept and decline for seller on pending", () => {
    const transitions = getAvailableTransitions("pending", "seller");
    const statuses = transitions.map((t) => t.toStatus);
    expect(statuses).toContain("accepted");
    expect(statuses).toContain("cancelled");
  });

  it("returns cancel for buyer on pending", () => {
    const transitions = getAvailableTransitions("pending", "buyer");
    const statuses = transitions.map((t) => t.toStatus);
    expect(statuses).toEqual(["cancelled"]);
  });

  it("returns empty for completed status", () => {
    const transitions = getAvailableTransitions("completed", "seller");
    expect(transitions).toEqual([]);
  });

  it("returns empty for cancelled status", () => {
    const transitions = getAvailableTransitions("cancelled", "buyer");
    expect(transitions).toEqual([]);
  });
});

describe("TRANSITION_MAP structure", () => {
  it("every transition has a non-empty label", () => {
    for (const [, toMap] of Object.entries(TRANSITION_MAP)) {
      if (!toMap) continue;
      for (const [, config] of Object.entries(toMap)) {
        if (!config) continue;
        expect(config.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("every transition has at least one allowed actor", () => {
    for (const [, toMap] of Object.entries(TRANSITION_MAP)) {
      if (!toMap) continue;
      for (const [, config] of Object.entries(toMap)) {
        if (!config) continue;
        expect(config.allowedActors.length).toBeGreaterThan(0);
      }
    }
  });
});
