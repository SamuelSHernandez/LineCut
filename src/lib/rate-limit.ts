/**
 * In-memory sliding window rate limiter.
 * Suitable for MVP single-instance deployment on Vercel (serverless caveats apply:
 * each cold start gets a fresh Map, so this is best-effort, not bulletproof).
 *
 * For production scale, replace with Redis (Upstash) or Vercel KV.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Auto-cleanup stale entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Remove entries where all timestamps are older than 5 minutes
      // (generous window to cover any reasonable rate limit config)
      if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 5 * 60 * 1000) {
        store.delete(key);
      }
    }
    // If store is empty, clear interval to allow GC
    if (store.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 60_000);

  // Don't block process exit
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
}

/**
 * Check and consume a rate limit token.
 *
 * @param key - Unique identifier (e.g., `chat:${userId}`)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Sliding window duration in milliseconds
 * @returns Whether the request is allowed and how many requests remain
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    return {
      success: false,
      remaining: 0,
    };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    remaining: maxRequests - entry.timestamps.length,
  };
}
