import { describe, it, expect, vi } from 'vitest';
import { TimeoutError, withTimeout } from '../utils/timeout';

describe('withTimeout', () => {
  it('returns the promise result when resolved before timeout', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 1000);
    expect(result).toBe('ok');
  });

  it('rejects with TimeoutError when the promise does not resolve in time', async () => {
    vi.useFakeTimers();

    const promise = withTimeout(new Promise(() => {}), 1000);
    vi.advanceTimersByTime(1000);

    await expect(promise).rejects.toBeInstanceOf(TimeoutError);

    vi.useRealTimers();
  });
});
