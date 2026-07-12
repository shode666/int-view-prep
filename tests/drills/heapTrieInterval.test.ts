import { describe, expect, it } from 'vitest';

import {
  findKthLargest,
  insertInterval,
  MinHeap,
  mergeIntervals,
  topKFrequentWords,
  Trie,
} from '@src/drills/heapTrieInterval';

describe('DRILL 95 — findKthLargest', () => {
  it('finds the 2nd largest', () => {
    expect(findKthLargest([3, 2, 1, 5, 6, 4], 2)).toBe(5);
  });

  it('counts duplicates by position', () => {
    expect(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)).toBe(4);
  });

  it('returns the max when k is 1', () => {
    expect(findKthLargest([7, 1, 9, 3], 1)).toBe(9);
  });

  it('handles a single element', () => {
    expect(findKthLargest([42], 1)).toBe(42);
  });

  it('handles negatives', () => {
    expect(findKthLargest([-1, -3, -2], 2)).toBe(-2);
  });
});

describe('DRILL 96 — topKFrequentWords', () => {
  it('orders by frequency', () => {
    expect(topKFrequentWords(['i', 'love', 'leetcode', 'i', 'love', 'coding'], 2)).toEqual([
      'i',
      'love',
    ]);
  });

  it('breaks frequency ties alphabetically', () => {
    expect(
      topKFrequentWords(
        ['the', 'day', 'is', 'sunny', 'the', 'the', 'the', 'sunny', 'is', 'is'],
        4,
      ),
    ).toEqual(['the', 'is', 'sunny', 'day']);
  });

  it('returns all words when k covers the vocabulary', () => {
    expect(topKFrequentWords(['b', 'a'], 2)).toEqual(['a', 'b']);
  });

  it('handles k = 1', () => {
    expect(topKFrequentWords(['apple', 'apple', 'banana'], 1)).toEqual(['apple']);
  });
});

describe('DRILL 97 — mergeIntervals', () => {
  it('merges overlapping intervals', () => {
    expect(
      mergeIntervals([
        [1, 3],
        [2, 6],
        [8, 10],
        [15, 18],
      ]),
    ).toEqual([
      [1, 6],
      [8, 10],
      [15, 18],
    ]);
  });

  it('merges touching intervals', () => {
    expect(
      mergeIntervals([
        [1, 4],
        [4, 5],
      ]),
    ).toEqual([[1, 5]]);
  });

  it('sorts unsorted input before merging', () => {
    expect(
      mergeIntervals([
        [8, 10],
        [1, 3],
        [2, 6],
      ]),
    ).toEqual([
      [1, 6],
      [8, 10],
    ]);
  });

  it('handles a single interval', () => {
    expect(mergeIntervals([[5, 7]])).toEqual([[5, 7]]);
  });
});

describe('DRILL 98 — insertInterval', () => {
  it('merges the new interval into overlapping ones', () => {
    expect(
      insertInterval(
        [
          [1, 3],
          [6, 9],
        ],
        [2, 5],
      ),
    ).toEqual([
      [1, 5],
      [6, 9],
    ]);
  });

  it('absorbs multiple overlapped intervals', () => {
    expect(
      insertInterval(
        [
          [1, 2],
          [3, 5],
          [6, 7],
          [8, 10],
          [12, 16],
        ],
        [4, 8],
      ),
    ).toEqual([
      [1, 2],
      [3, 10],
      [12, 16],
    ]);
  });

  it('inserts into an empty list', () => {
    expect(insertInterval([], [4, 8])).toEqual([[4, 8]]);
  });

  it('appends a non-overlapping interval at the end', () => {
    expect(insertInterval([[1, 2]], [5, 6])).toEqual([
      [1, 2],
      [5, 6],
    ]);
  });
});

describe('DRILL 99 — MinHeap', () => {
  it('peeks and pops in ascending order', () => {
    const heap = new MinHeap();
    heap.push(5);
    heap.push(3);
    heap.push(8);
    expect(heap.peek()).toBe(3);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(5);
    expect(heap.size()).toBe(1);
  });

  it('returns undefined when empty', () => {
    const heap = new MinHeap();
    expect(heap.peek()).toBeUndefined();
    expect(heap.pop()).toBeUndefined();
    expect(heap.size()).toBe(0);
  });

  it('maintains order across interleaved pushes and pops', () => {
    const heap = new MinHeap();
    heap.push(4);
    heap.push(1);
    expect(heap.pop()).toBe(1);
    heap.push(2);
    heap.push(0);
    expect(heap.pop()).toBe(0);
    expect(heap.pop()).toBe(2);
    expect(heap.pop()).toBe(4);
    expect(heap.pop()).toBeUndefined();
  });

  it('handles duplicate values', () => {
    const heap = new MinHeap();
    heap.push(2);
    heap.push(2);
    heap.push(1);
    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(2);
    expect(heap.pop()).toBe(2);
    expect(heap.size()).toBe(0);
  });
});

describe('DRILL 100 — Trie', () => {
  it('searches exact words and prefixes', () => {
    const trie = new Trie();
    trie.insert('apple');
    expect(trie.search('apple')).toBe(true);
    expect(trie.search('app')).toBe(false);
    expect(trie.startsWith('app')).toBe(true);
    trie.insert('app');
    expect(trie.search('app')).toBe(true);
  });

  it('returns false on an empty trie', () => {
    const trie = new Trie();
    expect(trie.search('a')).toBe(false);
    expect(trie.startsWith('a')).toBe(false);
  });

  it('does not match a longer query than any inserted word', () => {
    const trie = new Trie();
    trie.insert('car');
    expect(trie.search('cars')).toBe(false);
    expect(trie.startsWith('care')).toBe(false);
    expect(trie.startsWith('car')).toBe(true);
  });

  it('stores multiple words sharing a prefix', () => {
    const trie = new Trie();
    trie.insert('cat');
    trie.insert('cap');
    expect(trie.search('cat')).toBe(true);
    expect(trie.search('cap')).toBe(true);
    expect(trie.search('ca')).toBe(false);
    expect(trie.startsWith('ca')).toBe(true);
  });
});
