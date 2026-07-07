/**
 * KATA 4 — Medium: LRU Cache (very common in Node.js interviews)
 *
 * Fixed-capacity cache. When full, inserting a new key evicts the
 * least-recently-used entry. Both get() and set() count as "use".
 *
 * Target: O(1) get and set. Hint: JS Map preserves insertion order.
 */
export class LruCache<K, V> {
  private readonly store = new Map<K, V>();
  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new Error('capacity must be >= 1');
  }

  get(key: K): V | undefined {

    const val = this.store.get(key)
    if(val === undefined) return undefined
    this.store.delete(key);
    this.store.set(key, val);
    return val
  }

  set(key: K, value: V): void {
    if(this.store.has(key)){
      this.store.delete(key)
    }else if(this.store.size >= this.capacity){
      const delKey = this.store.keys().next().value;
      if(delKey !== undefined){
        this.store.delete(delKey);
      }
    }
    this.store.set(key,value);
  }

  get size(): number {
    return this.store.size;
  }
}
