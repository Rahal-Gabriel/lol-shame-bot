import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../src/rateLimit';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('RateLimiter', () => {
  it('returns the result of the function', async () => {
    const limiter = new RateLimiter(100);
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await limiter.throttle(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls the function immediately on first use', async () => {
    const limiter = new RateLimiter(1000);
    const fn = vi.fn().mockResolvedValue('ok');

    const promise = limiter.throttle(fn);
    await vi.runAllTimersAsync();
    await promise;

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('waits before the second call when called too fast', async () => {
    const limiter = new RateLimiter(500);
    const order: number[] = [];

    const p1 = limiter.throttle(async () => { order.push(1); });
    const p2 = limiter.throttle(async () => { order.push(2); });

    await vi.runAllTimersAsync();
    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
  });

  it('does not break the queue when a function throws', async () => {
    const limiter = new RateLimiter(0);
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    const succeeding = vi.fn().mockResolvedValue('ok');

    await expect(limiter.throttle(failing)).rejects.toThrow('boom');
    await vi.runAllTimersAsync();
    const result = await limiter.throttle(succeeding);

    expect(result).toBe('ok');
  });
});
