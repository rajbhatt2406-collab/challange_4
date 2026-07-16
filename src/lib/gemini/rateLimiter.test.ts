import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBucket, isAllowed } from './rateLimiter';

describe('TokenBucket Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with standard capacity and tokens', () => {
    const bucket = new TokenBucket(5, 2);
    // At initialization, consumes up to capacity
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(4)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(false);
  });

  it('should block requests exceeding the capacity', () => {
    const bucket = new TokenBucket(3, 1);
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(false);
  });

  it('should refill tokens over time deterministically', () => {
    const bucket = new TokenBucket(2, 2); // 2 tokens capacity, refills at 2 tokens/sec (i.e. 1 token per 500ms)
    
    expect(bucket.tryConsume(2)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(false); // empty

    // Advance time by 500ms -> should refill exactly 1 token
    vi.advanceTimersByTime(500);
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(false); // empty again

    // Advance time by 1000ms -> refills 2 tokens (capacity limit)
    vi.advanceTimersByTime(1000);
    expect(bucket.tryConsume(2)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(false);
  });

  it('should not exceed the maximum capacity on refill', () => {
    const bucket = new TokenBucket(2, 1); // 2 capacity, 1 per second
    
    // Advance time by 10 seconds (10 tokens refilled, but capped at capacity of 2)
    vi.advanceTimersByTime(10000);
    
    expect(bucket.tryConsume(2)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(false);
  });
});

describe('isAllowed Helper function', () => {
  it('should track requests per IP separately', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    
    // Default capacity is 10
    for (let i = 0; i < 10; i++) {
      expect(isAllowed(ip1, 10, 2)).toBe(true);
    }
    // 11th request for ip1 should be blocked
    expect(isAllowed(ip1, 10, 2)).toBe(false);

    // ip2 should still be allowed since it has its own separate bucket
    expect(isAllowed(ip2, 10, 2)).toBe(true);
  });
});
