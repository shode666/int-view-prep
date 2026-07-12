import { describe, expect, it } from 'vitest';
import {
  twoSum,
  isValidParentheses,
  maxProfit,
  lengthOfLongestSubstring,
  productExceptSelf,
  threeSum,
  binarySearch,
  searchRotated,
  reverseList,
  hasCycle,
  mergeTwoLists,
  maxDepth,
  levelOrder,
  numIslands,
  canFinish,
} from '@src/drills/top15';
import { arrayToList, listToArray, arrayToTree, ListNode } from '@src/drills/_types';

/** Sort a list of triplets deterministically for order-independent comparison. */
const sortTriplets = (triplets: number[][]): number[][] =>
  triplets
    .map((t) => [...t].sort((a, b) => a - b))
    .sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!);

describe('TOP 1 — twoSum', () => {
  it('finds the two indices for a basic case', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });
  it('handles a target using later elements', () => {
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
  });
  it('handles duplicate values', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
  });
  it('returns null when no pair sums to target', () => {
    expect(twoSum([1, 2, 3], 100)).toBeNull();
  });
});

describe('TOP 2 — isValidParentheses', () => {
  it('accepts simple matched brackets', () => {
    expect(isValidParentheses('()')).toBe(true);
  });
  it('accepts nested and mixed brackets', () => {
    expect(isValidParentheses('([]{})')).toBe(true);
  });
  it('rejects wrongly ordered brackets', () => {
    expect(isValidParentheses('([)]')).toBe(false);
  });
  it('rejects an unclosed bracket', () => {
    expect(isValidParentheses('(')).toBe(false);
  });
  it('treats the empty string as valid', () => {
    expect(isValidParentheses('')).toBe(true);
  });
});

describe('TOP 3 — maxProfit', () => {
  it('finds the best single buy/sell', () => {
    expect(maxProfit([7, 1, 5, 3, 6, 4])).toBe(5);
  });
  it('returns 0 for a strictly decreasing series', () => {
    expect(maxProfit([7, 6, 4, 3, 1])).toBe(0);
  });
  it('returns 0 for a single price', () => {
    expect(maxProfit([5])).toBe(0);
  });
  it('returns 0 for an empty array', () => {
    expect(maxProfit([])).toBe(0);
  });
});

describe('TOP 4 — lengthOfLongestSubstring', () => {
  it('handles a repeating pattern', () => {
    expect(lengthOfLongestSubstring('abcabcbb')).toBe(3);
  });
  it('handles all identical characters', () => {
    expect(lengthOfLongestSubstring('bbbbb')).toBe(1);
  });
  it('handles a tricky repeat spanning the window', () => {
    expect(lengthOfLongestSubstring('pwwkew')).toBe(3);
  });
  it('returns 0 for the empty string', () => {
    expect(lengthOfLongestSubstring('')).toBe(0);
  });
});

describe('TOP 5 — productExceptSelf', () => {
  it('computes products for a basic case', () => {
    expect(productExceptSelf([1, 2, 3, 4])).toEqual([24, 12, 8, 6]);
  });
  it('handles a zero in the array', () => {
    expect(productExceptSelf([-1, 1, 0, -3, 3])).toEqual([0, 0, 9, 0, 0]);
  });
  it('handles two elements', () => {
    expect(productExceptSelf([2, 3])).toEqual([3, 2]);
  });
});

describe('TOP 6 — threeSum', () => {
  it('finds all unique triplets summing to zero', () => {
    expect(sortTriplets(threeSum([-1, 0, 1, 2, -1, -4]))).toEqual([
      [-1, -1, 2],
      [-1, 0, 1],
    ]);
  });
  it('returns empty when no triplet sums to zero', () => {
    expect(threeSum([0, 1, 1])).toEqual([]);
  });
  it('handles all zeros as a single triplet', () => {
    expect(threeSum([0, 0, 0])).toEqual([[0, 0, 0]]);
  });
  it('returns empty for too-short input', () => {
    expect(threeSum([1, -1])).toEqual([]);
  });
});

describe('TOP 7 — binarySearch', () => {
  it('finds an element in the middle', () => {
    expect(binarySearch([-1, 0, 3, 5, 9, 12], 9)).toBe(4);
  });
  it('returns -1 when absent', () => {
    expect(binarySearch([-1, 0, 3, 5, 9, 12], 2)).toBe(-1);
  });
  it('finds the first element', () => {
    expect(binarySearch([1, 2, 3, 4, 5], 1)).toBe(0);
  });
  it('returns -1 for an empty array', () => {
    expect(binarySearch([], 1)).toBe(-1);
  });
});

describe('TOP 8 — searchRotated', () => {
  it('finds a target in the rotated tail', () => {
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 0)).toBe(4);
  });
  it('returns -1 when absent', () => {
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 3)).toBe(-1);
  });
  it('handles a non-rotated array', () => {
    expect(searchRotated([1, 2, 3, 4, 5], 4)).toBe(3);
  });
  it('handles a single element', () => {
    expect(searchRotated([1], 0)).toBe(-1);
  });
});

describe('TOP 9 — reverseList', () => {
  it('reverses a multi-element list', () => {
    expect(listToArray(reverseList(arrayToList([1, 2, 3, 4, 5])))).toEqual([5, 4, 3, 2, 1]);
  });
  it('reverses a single-element list', () => {
    expect(listToArray(reverseList(arrayToList([1])))).toEqual([1]);
  });
  it('handles an empty list', () => {
    expect(reverseList(arrayToList([]))).toBeNull();
  });
});

describe('TOP 10 — hasCycle', () => {
  it('detects a cycle', () => {
    const head = arrayToList([1, 2, 3, 4]) as ListNode;
    // Wire the tail back to the second node to form a cycle.
    let tail = head;
    while (tail.next !== null) tail = tail.next;
    tail.next = head.next;
    expect(hasCycle(head)).toBe(true);
  });
  it('returns false for a linear list', () => {
    expect(hasCycle(arrayToList([1, 2, 3, 4]))).toBe(false);
  });
  it('returns false for an empty list', () => {
    expect(hasCycle(arrayToList([]))).toBe(false);
  });
  it('returns false for a single node without a self-loop', () => {
    expect(hasCycle(arrayToList([1]))).toBe(false);
  });
});

describe('TOP 11 — mergeTwoLists', () => {
  it('merges two sorted lists', () => {
    const merged = mergeTwoLists(arrayToList([1, 2, 4]), arrayToList([1, 3, 4]));
    expect(listToArray(merged)).toEqual([1, 1, 2, 3, 4, 4]);
  });
  it('handles one empty list', () => {
    const merged = mergeTwoLists(arrayToList([]), arrayToList([0]));
    expect(listToArray(merged)).toEqual([0]);
  });
  it('handles both empty lists', () => {
    expect(mergeTwoLists(arrayToList([]), arrayToList([]))).toBeNull();
  });
});

describe('TOP 12 — maxDepth', () => {
  it('computes depth of a balanced-ish tree', () => {
    expect(maxDepth(arrayToTree([3, 9, 20, null, null, 15, 7]))).toBe(3);
  });
  it('handles a skewed tree', () => {
    expect(maxDepth(arrayToTree([1, null, 2]))).toBe(2);
  });
  it('returns 0 for an empty tree', () => {
    expect(maxDepth(arrayToTree([]))).toBe(0);
  });
  it('returns 1 for a single node', () => {
    expect(maxDepth(arrayToTree([42]))).toBe(1);
  });
});

describe('TOP 13 — levelOrder', () => {
  it('groups nodes per level', () => {
    expect(levelOrder(arrayToTree([3, 9, 20, null, null, 15, 7]))).toEqual([
      [3],
      [9, 20],
      [15, 7],
    ]);
  });
  it('handles a single node', () => {
    expect(levelOrder(arrayToTree([1]))).toEqual([[1]]);
  });
  it('returns empty for an empty tree', () => {
    expect(levelOrder(arrayToTree([]))).toEqual([]);
  });
});

describe('TOP 14 — numIslands', () => {
  it('counts separate islands', () => {
    const grid = [
      ['1', '1', '0'],
      ['0', '1', '0'],
      ['0', '0', '1'],
    ];
    expect(numIslands(grid)).toBe(2);
  });
  it('counts one large connected island', () => {
    const grid = [
      ['1', '1', '1'],
      ['1', '0', '1'],
      ['1', '1', '1'],
    ];
    expect(numIslands(grid)).toBe(1);
  });
  it('returns 0 for all water', () => {
    const grid = [
      ['0', '0'],
      ['0', '0'],
    ];
    expect(numIslands(grid)).toBe(0);
  });
  it('handles an empty grid', () => {
    expect(numIslands([])).toBe(0);
  });
});

describe('TOP 15 — canFinish', () => {
  it('returns true for a satisfiable schedule', () => {
    expect(canFinish(2, [[1, 0]])).toBe(true);
  });
  it('returns false when a cycle exists', () => {
    expect(
      canFinish(2, [
        [1, 0],
        [0, 1],
      ]),
    ).toBe(false);
  });
  it('returns true when there are no prerequisites', () => {
    expect(canFinish(3, [])).toBe(true);
  });
  it('returns false for a longer dependency cycle', () => {
    expect(
      canFinish(3, [
        [0, 1],
        [1, 2],
        [2, 0],
      ]),
    ).toBe(false);
  });
});
