import { timingSafeEqual } from "crypto";

/**
 * Timing-safe comparison of two secret strings.
 * Returns false for null/undefined/empty values.
 */
export function verifySecret(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!provided || !expected) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    // Compare against itself to keep constant time, then return false
    timingSafeEqual(a, a);
    return false;
  }

  return timingSafeEqual(a, b);
}
