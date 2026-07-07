import { describe, expect, it, vi } from 'vitest';
import { mapLimit, retry, withTimeout } from '@src/async/promiseUtils';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('withTimeout', () => {
  it('resolves when the promise finishes in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
  });

  it('rejects with a Timeout error when too slow', async () => {
    const slow = sleep(200).then(() => 'late');
    await expect(withTimeout(slow, 20)).rejects.toThrow(/timeout/i);
  });

  it('propagates the original rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100)).rejects.toThrow('boom');
  });
});

describe('retry', () => {
  it('resolves on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    await expect(retry(fn, 3)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('finally');
    await expect(retry(fn, 3)).resolves.toBe('finally');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('rejects with the last error after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(retry(fn, 3)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('mapLimit', () => {
  it('maps all items and preserves order', async () => {
    const result = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      await sleep(Math.random() * 20);
      return n * 10;
    });
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await mapLimit([1, 2, 3, 4, 5, 6], 2, async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(10);
      inFlight--;
    });
    expect(maxInFlight).toBe(2);
  });

  it('passes the index to the mapper', async () => {
    const result = await mapLimit(['a', 'b', 'c'], 3, async (item, i) => `${i}:${item}`);
    expect(result).toEqual(['0:a', '1:b', '2:c']);
  });

  it('rejects if any mapper rejects', async () => {
    await expect(
      mapLimit([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('bad item');
        return n;
      }),
    ).rejects.toThrow('bad item');
  });

  it('handles an empty array', async () => {
    await expect(mapLimit([], 2, async (n: number) => n)).resolves.toEqual([]);
  });
});
