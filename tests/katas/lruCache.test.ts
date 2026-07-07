import { describe, expect, it } from 'vitest';
import { LruCache } from '@src/katas/lruCache';

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    const cache = new LruCache<string, number>(2);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts the least recently used entry when over capacity', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('get() refreshes recency', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' is now most recent
    cache.set('c', 3); // evicts 'b'
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('set() on an existing key updates value and refreshes recency', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // 'a' most recent, no eviction (same key)
    cache.set('c', 3); // evicts 'b'
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it('reports its size', () => {
    const cache = new LruCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
  });

  it('rejects capacity < 1', () => {
    expect(() => new LruCache<string, number>(0)).toThrow();
  });
});
