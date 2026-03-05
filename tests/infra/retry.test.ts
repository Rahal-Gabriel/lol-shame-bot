import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/infra/retry';

describe('withRetry', () => {
  it('returns the result when the function succeeds on the first try', async () => {
    const fn = vi.fn().mockResolvedValueOnce('ok');
    expect(await withRetry(fn, 3, 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and returns when the function succeeds on the second try', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');
    expect(await withRetry(fn, 3, 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after all retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, 3, 0)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
