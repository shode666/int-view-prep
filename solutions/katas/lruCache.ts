// O(1) get/set using Map's insertion-order guarantee:
// delete + re-insert moves a key to the "most recent" end;
// the first key in iteration order is the least recently used.
export class LruCache<K, V> {
  private readonly store = new Map<K, V>();

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new Error('capacity must be >= 1');
  }

  get(key: K): V | undefined {
    if (!this.store.has(key)) return undefined;
    const value = this.store.get(key) as V;
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.capacity) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, value);
  }

  get size(): number {
    return this.store.size;
  }
}
