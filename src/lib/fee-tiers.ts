export interface WaitTier {
  label: string;
  description: string;
  representativeMinutes: number;
  maxFeeDollars: number;
}

export const WAIT_TIERS: WaitTier[] = [
  { label: "Short", description: "< 15 min", representativeMinutes: 10, maxFeeDollars: 2 },
  { label: "Medium", description: "15\u201330 min", representativeMinutes: 20, maxFeeDollars: 5 },
  { label: "Long", description: "30+ min", representativeMinutes: 40, maxFeeDollars: 10 },
];

/** Valid representative minutes values for server-side validation. */
export const VALID_WAIT_MINUTES = WAIT_TIERS.map((t) => t.representativeMinutes);

/** Returns the max fee in dollars for a given estimated wait in minutes. */
export function getFeeCap(estimatedMinutes: number): number {
  const tier = getTierForMinutes(estimatedMinutes);
  return tier.maxFeeDollars;
}

/** Returns the tier matching the given minutes value. Falls back to the last tier. */
export function getTierForMinutes(minutes: number): WaitTier {
  if (minutes < 15) return WAIT_TIERS[0];
  if (minutes < 30) return WAIT_TIERS[1];
  return WAIT_TIERS[2];
}

// ── Platform fee ──────────────────────────────────────────────

const PLATFORM_FEE_RATE = 0.10;
const PLATFORM_FEE_MIN_CENTS = 50; // $0.50
const PLATFORM_FEE_MAX_CENTS = 500; // $5.00

/** Calculate platform fee in cents from items subtotal in cents. */
export function calculatePlatformFeeCents(itemsSubtotalCents: number): number {
  const fee = Math.round(itemsSubtotalCents * PLATFORM_FEE_RATE);
  return Math.min(Math.max(fee, PLATFORM_FEE_MIN_CENTS), PLATFORM_FEE_MAX_CENTS);
}

/** Calculate platform fee in dollars from items subtotal in dollars. */
export function calculatePlatformFeeDollars(itemsSubtotalDollars: number): number {
  return calculatePlatformFeeCents(Math.round(itemsSubtotalDollars * 100)) / 100;
}
