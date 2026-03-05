export class RateLimiter {
  private queue = Promise.resolve();
  private lastCallTime = 0;

  constructor(private minIntervalMs: number) {}

  throttle<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(async (): Promise<T> => {
      const wait = this.minIntervalMs - (Date.now() - this.lastCallTime);
      if (wait > 0) await sleep(wait);
      this.lastCallTime = Date.now();
      return fn();
    });
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
