/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single-node deployment (the default for this project). Each
 * bucket holds at most `limit` hits per `windowMs`, keyed by client IP +
 * route (and user id where available). Buckets are pruned lazily.
 */

interface Bucket {
  hits: number[];
}

const store = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export interface RateLimitSpec {
  /** Maximum number of requests inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 60_000 },
  register: { limit: 5, windowMs: 10 * 60_000 },
  comment: { limit: 10, windowMs: 60_000 },
  rating: { limit: 30, windowMs: 60_000 },
  submit: { limit: 5, windowMs: 60 * 60_000 },
  search: { limit: 120, windowMs: 60_000 },
  mutation: { limit: 60, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitSpec>;

export function rateLimit(key: string, spec: RateLimitSpec): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key) ?? { hits: [] };

  // Drop expired hits.
  bucket.hits = bucket.hits.filter((t) => now - t < spec.windowMs);

  if (bucket.hits.length >= spec.limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + spec.windowMs - now) / 1000)
    );
    store.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push(now);
  store.set(key, bucket);

  // Opportunistic cleanup to keep memory bounded.
  if (store.size > MAX_BUCKETS) {
    for (const [k, b] of store) {
      if (b.hits.every((t) => now - t >= spec.windowMs)) store.delete(k);
      if (store.size <= MAX_BUCKETS / 2) break;
    }
  }

  return {
    ok: true,
    remaining: spec.limit - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

/** Extract the best-effort client IP for rate-limit keying. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
