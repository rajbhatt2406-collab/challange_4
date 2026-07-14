/**
 * A thread-safe, in-memory Token Bucket rate limiter.
 * In production, this can be easily swapped for an Upstash or Redis-backed service.
 */
export class TokenBucket {
  private capacity: number;
  private refillRate: number; // tokens per millisecond
  private tokens: number;
  private lastRefill: number;

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSecond / 1000;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  public tryConsume(tokens = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
}

// Global registry for client buckets
const ipBuckets = new Map<string, TokenBucket>();

// Default limit: 10 requests burst, refilling at 2 requests per second
const DEFAULT_CAPACITY = 10;
const DEFAULT_REFILL_RATE = 2;

/**
 * Checks if a request from a specific IP is within the rate limits.
 * Returns true if allowed, false if rate limited.
 */
export function isAllowed(ip: string, capacity = DEFAULT_CAPACITY, refillRate = DEFAULT_REFILL_RATE): boolean {
  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = new TokenBucket(capacity, refillRate);
    ipBuckets.set(ip, bucket);
  }
  return bucket.tryConsume(1);
}
