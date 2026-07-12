import { describe, expect, it } from 'vitest';
import {
  // Arrays & Hashing
  twoSum,
  containsDuplicate,
  isAnagram,
  groupAnagrams,
  topKFrequent,
  productExceptSelf,
  longestConsecutive,
  // Two Pointers
  isPalindrome,
  threeSum,
  maxArea,
  twoSumII,
  // Sliding Window
  lengthOfLongestSubstring,
  maxProfit,
  characterReplacement,
  checkInclusion,
  minWindow,
  // Stack
  isValidParentheses,
  MinStack,
  dailyTemperatures,
  evalRPN,
  // Binary Search
  binarySearch,
  searchRotated,
  findMin,
  minEatingSpeed,
  // Linked List
  reverseList,
  mergeTwoLists,
  hasCycle,
  removeNthFromEnd,
  reorderList,
  addTwoNumbers,
  // Tree
  maxDepth,
  invertTree,
  isSameTree,
  levelOrder,
  isValidBST,
  kthSmallest,
  lowestCommonAncestor,
} from '@src/drills/neetcode';
import { ListNode, arrayToList, listToArray, arrayToTree } from '@src/drills/_types';

/** Return the last node of a list, or null for an empty list. */
const tail = (head: ListNode | null): ListNode | null => {
  if (head === null) return null;
  let node = head;
  while (node.next !== null) node = node.next;
  return node;
};

/** Return the node at 0-based `index`, or null. */
const nodeAt = (head: ListNode | null, index: number): ListNode | null => {
  let node = head;
  let i = index;
  while (node !== null && i > 0) {
    node = node.next;
    i--;
  }
  return node;
};

/** Sort rows and the outer list so anagram/triplet groups compare order-independently. */
const canon = <T>(rows: readonly (readonly T[])[]): T[][] =>
  rows
    .map((row) => [...row].sort())
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

// ─────────────────────────────────────────────
// Arrays & Hashing
// ─────────────────────────────────────────────

describe('NC 1 — twoSum', () => {
  it('finds the pair of indices', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });
  it('pair not at the front', () => {
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
  });
  it('uses each element once (equal values)', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
  });
  it('returns null when no pair sums to target', () => {
    expect(twoSum([1, 2, 3], 100)).toBeNull();
  });
});

describe('NC 2 — containsDuplicate', () => {
  it('detects a duplicate', () => {
    expect(containsDuplicate([1, 2, 3, 1])).toBe(true);
  });
  it('all distinct', () => {
    expect(containsDuplicate([1, 2, 3, 4])).toBe(false);
  });
  it('multiple duplicates', () => {
    expect(containsDuplicate([1, 1, 1, 3, 3, 4, 3, 2, 4, 2])).toBe(true);
  });
  it('empty array has no duplicate', () => {
    expect(containsDuplicate([])).toBe(false);
  });
});

describe('NC 3 — isAnagram', () => {
  it('valid anagram', () => {
    expect(isAnagram('anagram', 'nagaram')).toBe(true);
  });
  it('not an anagram', () => {
    expect(isAnagram('rat', 'car')).toBe(false);
  });
  it('different lengths', () => {
    expect(isAnagram('a', 'ab')).toBe(false);
  });
  it('empty strings are anagrams', () => {
    expect(isAnagram('', '')).toBe(true);
  });
});

describe('NC 4 — groupAnagrams', () => {
  it('groups anagrams together (order-independent)', () => {
    const result = groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']);
    expect(canon(result)).toEqual(
      canon([['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]),
    );
  });
  it('single empty string', () => {
    expect(groupAnagrams([''])).toEqual([['']]);
  });
  it('no shared anagrams', () => {
    const result = groupAnagrams(['abc', 'def']);
    expect(canon(result)).toEqual(canon([['abc'], ['def']]));
  });
  it('single letter', () => {
    expect(groupAnagrams(['a'])).toEqual([['a']]);
  });
});

describe('NC 5 — topKFrequent', () => {
  it('returns the k most frequent (order-independent)', () => {
    expect([...topKFrequent([1, 1, 1, 2, 2, 3], 2)].sort()).toEqual([1, 2]);
  });
  it('single element, k = 1', () => {
    expect(topKFrequent([1], 1)).toEqual([1]);
  });
  it('all elements when k equals distinct count', () => {
    expect([...topKFrequent([4, 4, 5, 5, 6], 3)].sort()).toEqual([4, 5, 6]);
  });
  it('picks the clear winner', () => {
    expect(topKFrequent([7, 7, 7, 8, 9], 1)).toEqual([7]);
  });
});

describe('NC 6 — productExceptSelf', () => {
  it('classic example', () => {
    expect(productExceptSelf([1, 2, 3, 4])).toEqual([24, 12, 8, 6]);
  });
  it('contains a zero', () => {
    expect(productExceptSelf([-1, 1, 0, -3, 3])).toEqual([0, 0, 9, 0, 0]);
  });
  it('two elements', () => {
    expect(productExceptSelf([2, 3])).toEqual([3, 2]);
  });
  it('negatives', () => {
    expect(productExceptSelf([-1, -2, -3])).toEqual([6, 3, 2]);
  });
});

describe('NC 7 — longestConsecutive', () => {
  it('classic example', () => {
    expect(longestConsecutive([100, 4, 200, 1, 3, 2])).toBe(4);
  });
  it('with duplicates', () => {
    expect(longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])).toBe(9);
  });
  it('single element', () => {
    expect(longestConsecutive([5])).toBe(1);
  });
  it('empty array', () => {
    expect(longestConsecutive([])).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Two Pointers
// ─────────────────────────────────────────────

describe('NC 8 — isPalindrome', () => {
  it('alphanumeric palindrome ignoring case/punctuation', () => {
    expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true);
  });
  it('not a palindrome', () => {
    expect(isPalindrome('race a car')).toBe(false);
  });
  it('only non-alphanumeric is a palindrome', () => {
    expect(isPalindrome(' ')).toBe(true);
  });
  it('mixed alphanumerics', () => {
    expect(isPalindrome('0P')).toBe(false);
  });
});

describe('NC 9 — threeSum', () => {
  it('finds unique triplets summing to zero', () => {
    expect(canon(threeSum([-1, 0, 1, 2, -1, -4]))).toEqual(
      canon([[-1, -1, 2], [-1, 0, 1]]),
    );
  });
  it('no triplet sums to zero', () => {
    expect(threeSum([0, 1, 1])).toEqual([]);
  });
  it('all zeros yields one triplet', () => {
    expect(canon(threeSum([0, 0, 0]))).toEqual(canon([[0, 0, 0]]));
  });
  it('empty input', () => {
    expect(threeSum([])).toEqual([]);
  });
});

describe('NC 10 — maxArea', () => {
  it('classic example', () => {
    expect(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])).toBe(49);
  });
  it('two walls', () => {
    expect(maxArea([1, 1])).toBe(1);
  });
  it('increasing heights', () => {
    expect(maxArea([1, 2, 3, 4, 5])).toBe(6);
  });
  it('tall ends', () => {
    expect(maxArea([2, 3, 4, 5, 18, 17, 6])).toBe(17);
  });
});

describe('NC 11 — twoSumII', () => {
  it('returns 1-indexed positions', () => {
    expect(twoSumII([2, 7, 11, 15], 9)).toEqual([1, 2]);
  });
  it('pair in the middle', () => {
    expect(twoSumII([2, 3, 4], 6)).toEqual([1, 3]);
  });
  it('negative numbers', () => {
    expect(twoSumII([-1, 0], -1)).toEqual([1, 2]);
  });
  it('last two elements', () => {
    expect(twoSumII([1, 2, 3, 4], 7)).toEqual([3, 4]);
  });
});

// ─────────────────────────────────────────────
// Sliding Window
// ─────────────────────────────────────────────

describe('NC 12 — lengthOfLongestSubstring', () => {
  it('classic example', () => {
    expect(lengthOfLongestSubstring('abcabcbb')).toBe(3);
  });
  it('all same character', () => {
    expect(lengthOfLongestSubstring('bbbbb')).toBe(1);
  });
  it('window resets past duplicate', () => {
    expect(lengthOfLongestSubstring('pwwkew')).toBe(3);
  });
  it('empty string', () => {
    expect(lengthOfLongestSubstring('')).toBe(0);
  });
});

describe('NC 13 — maxProfit', () => {
  it('classic example', () => {
    expect(maxProfit([7, 1, 5, 3, 6, 4])).toBe(5);
  });
  it('prices only fall', () => {
    expect(maxProfit([7, 6, 4, 3, 1])).toBe(0);
  });
  it('single price', () => {
    expect(maxProfit([5])).toBe(0);
  });
  it('monotonically increasing', () => {
    expect(maxProfit([1, 2, 3, 4, 5])).toBe(4);
  });
});

describe('NC 14 — characterReplacement', () => {
  it('classic example', () => {
    expect(characterReplacement('AABABBA', 1)).toBe(4);
  });
  it('two replacements', () => {
    expect(characterReplacement('ABAB', 2)).toBe(4);
  });
  it('no replacements needed', () => {
    expect(characterReplacement('AAAA', 0)).toBe(4);
  });
  it('single character', () => {
    expect(characterReplacement('A', 0)).toBe(1);
  });
});

describe('NC 15 — checkInclusion', () => {
  it('permutation is present', () => {
    expect(checkInclusion('ab', 'eidbaooo')).toBe(true);
  });
  it('permutation is absent', () => {
    expect(checkInclusion('ab', 'eidboaoo')).toBe(false);
  });
  it('identical strings', () => {
    expect(checkInclusion('abc', 'cba')).toBe(true);
  });
  it('pattern longer than text', () => {
    expect(checkInclusion('abcd', 'abc')).toBe(false);
  });
});

describe('NC 16 — minWindow', () => {
  it('classic example', () => {
    expect(minWindow('ADOBECODEBANC', 'ABC')).toBe('BANC');
  });
  it('no valid window', () => {
    expect(minWindow('a', 'aa')).toBe('');
  });
  it('whole string is the window', () => {
    expect(minWindow('a', 'a')).toBe('a');
  });
  it('empty t yields empty window', () => {
    expect(minWindow('abc', '')).toBe('');
  });
});

// ─────────────────────────────────────────────
// Stack
// ─────────────────────────────────────────────

describe('NC 17 — isValidParentheses', () => {
  it('mixed matched brackets', () => {
    expect(isValidParentheses('()[]{}')).toBe(true);
  });
  it('mismatched pair', () => {
    expect(isValidParentheses('(]')).toBe(false);
  });
  it('nested', () => {
    expect(isValidParentheses('([{}])')).toBe(true);
  });
  it('unclosed', () => {
    expect(isValidParentheses('(')).toBe(false);
  });
});

describe('NC 18 — MinStack', () => {
  it('tracks the minimum across a sequence of operations', () => {
    const stack = new MinStack();
    stack.push(-2);
    stack.push(0);
    stack.push(-3);
    expect(stack.getMin()).toBe(-3);
    stack.pop();
    expect(stack.top()).toBe(0);
    expect(stack.getMin()).toBe(-2);
  });
  it('single element', () => {
    const stack = new MinStack();
    stack.push(42);
    expect(stack.top()).toBe(42);
    expect(stack.getMin()).toBe(42);
  });
  it('min updates after popping the minimum', () => {
    const stack = new MinStack();
    stack.push(5);
    stack.push(3);
    stack.push(7);
    expect(stack.getMin()).toBe(3);
    stack.pop();
    stack.pop();
    expect(stack.getMin()).toBe(5);
  });
});

describe('NC 19 — dailyTemperatures', () => {
  it('classic example', () => {
    expect(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])).toEqual([
      1, 1, 4, 2, 1, 1, 0, 0,
    ]);
  });
  it('monotonically increasing', () => {
    expect(dailyTemperatures([30, 40, 50, 60])).toEqual([1, 1, 1, 0]);
  });
  it('never warmer', () => {
    expect(dailyTemperatures([30, 20, 10])).toEqual([0, 0, 0]);
  });
  it('single day', () => {
    expect(dailyTemperatures([50])).toEqual([0]);
  });
});

describe('NC 20 — evalRPN', () => {
  it('classic example', () => {
    expect(evalRPN(['2', '1', '+', '3', '*'])).toBe(9);
  });
  it('division truncates toward zero', () => {
    expect(evalRPN(['4', '13', '5', '/', '+'])).toBe(6);
  });
  it('single number', () => {
    expect(evalRPN(['42'])).toBe(42);
  });
  it('negative results', () => {
    expect(evalRPN(['3', '4', '-'])).toBe(-1);
  });
});

// ─────────────────────────────────────────────
// Binary Search
// ─────────────────────────────────────────────

describe('NC 21 — binarySearch', () => {
  it('finds an element', () => {
    expect(binarySearch([-1, 0, 3, 5, 9, 12], 9)).toBe(4);
  });
  it('element absent', () => {
    expect(binarySearch([-1, 0, 3, 5, 9, 12], 2)).toBe(-1);
  });
  it('first element', () => {
    expect(binarySearch([1, 2, 3], 1)).toBe(0);
  });
  it('empty array', () => {
    expect(binarySearch([], 1)).toBe(-1);
  });
});

describe('NC 22 — searchRotated', () => {
  it('finds a value in the rotated tail', () => {
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 0)).toBe(4);
  });
  it('value absent', () => {
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 3)).toBe(-1);
  });
  it('single element found', () => {
    expect(searchRotated([1], 1)).toBe(0);
  });
  it('value in the rotated head', () => {
    expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 5)).toBe(1);
  });
});

describe('NC 23 — findMin', () => {
  it('rotated array', () => {
    expect(findMin([3, 4, 5, 1, 2])).toBe(1);
  });
  it('larger rotation', () => {
    expect(findMin([4, 5, 6, 7, 0, 1, 2])).toBe(0);
  });
  it('not rotated', () => {
    expect(findMin([1, 2, 3, 4, 5])).toBe(1);
  });
  it('single element', () => {
    expect(findMin([7])).toBe(7);
  });
});

describe('NC 24 — minEatingSpeed', () => {
  it('classic example', () => {
    expect(minEatingSpeed([3, 6, 7, 11], 8)).toBe(4);
  });
  it('lots of time, fewer piles', () => {
    expect(minEatingSpeed([30, 11, 23, 4, 20], 5)).toBe(30);
  });
  it('tight schedule', () => {
    expect(minEatingSpeed([30, 11, 23, 4, 20], 6)).toBe(23);
  });
  it('single pile', () => {
    expect(minEatingSpeed([312], 312)).toBe(1);
  });
});

// ─────────────────────────────────────────────
// Linked List
// ─────────────────────────────────────────────

describe('NC 25 — reverseList', () => {
  it('reverses a 3-node list', () => {
    expect(listToArray(reverseList(arrayToList([1, 2, 3])))).toEqual([3, 2, 1]);
  });
  it('single node', () => {
    expect(listToArray(reverseList(arrayToList([42])))).toEqual([42]);
  });
  it('empty list', () => {
    expect(reverseList(null)).toBeNull();
  });
});

describe('NC 26 — mergeTwoLists', () => {
  it('merges two sorted lists', () => {
    const merged = mergeTwoLists(arrayToList([1, 2, 4]), arrayToList([1, 3, 4]));
    expect(listToArray(merged)).toEqual([1, 1, 2, 3, 4, 4]);
  });
  it('one list empty returns the other', () => {
    expect(listToArray(mergeTwoLists(null, arrayToList([0])))).toEqual([0]);
  });
  it('both empty returns null', () => {
    expect(mergeTwoLists(null, null)).toBeNull();
  });
});

describe('NC 27 — hasCycle', () => {
  it('detects a cycle', () => {
    const head = arrayToList([3, 2, 0, -4]);
    tail(head)!.next = nodeAt(head, 1); // -4 → node with value 2
    expect(hasCycle(head)).toBe(true);
  });
  it('two-node self loop', () => {
    const head = arrayToList([1, 2]);
    tail(head)!.next = head;
    expect(hasCycle(head)).toBe(true);
  });
  it('no cycle', () => {
    expect(hasCycle(arrayToList([1, 2, 3, 4]))).toBe(false);
  });
  it('empty list', () => {
    expect(hasCycle(null)).toBe(false);
  });
});

describe('NC 28 — removeNthFromEnd', () => {
  it('removes the 2nd from the end', () => {
    expect(listToArray(removeNthFromEnd(arrayToList([1, 2, 3, 4, 5]), 2))).toEqual([
      1, 2, 3, 5,
    ]);
  });
  it('removes the head', () => {
    expect(listToArray(removeNthFromEnd(arrayToList([1, 2, 3]), 3))).toEqual([2, 3]);
  });
  it('single node removed yields empty', () => {
    expect(removeNthFromEnd(arrayToList([1]), 1)).toBeNull();
  });
});

describe('NC 29 — reorderList', () => {
  it('reorders even length in place', () => {
    const head = arrayToList([1, 2, 3, 4]);
    reorderList(head);
    expect(listToArray(head)).toEqual([1, 4, 2, 3]);
  });
  it('reorders odd length in place', () => {
    const head = arrayToList([1, 2, 3, 4, 5]);
    reorderList(head);
    expect(listToArray(head)).toEqual([1, 5, 2, 4, 3]);
  });
  it('two nodes unchanged', () => {
    const head = arrayToList([1, 2]);
    reorderList(head);
    expect(listToArray(head)).toEqual([1, 2]);
  });
});

describe('NC 30 — addTwoNumbers', () => {
  it('342 + 465 = 807 (reversed digits)', () => {
    const sum = addTwoNumbers(arrayToList([2, 4, 3]), arrayToList([5, 6, 4]));
    expect(listToArray(sum)).toEqual([7, 0, 8]);
  });
  it('carries into a new leading digit', () => {
    const sum = addTwoNumbers(arrayToList([5]), arrayToList([5]));
    expect(listToArray(sum)).toEqual([0, 1]);
  });
  it('different lengths', () => {
    const sum = addTwoNumbers(arrayToList([9, 9]), arrayToList([1]));
    expect(listToArray(sum)).toEqual([0, 0, 1]);
  });
});

// ─────────────────────────────────────────────
// Tree
// ─────────────────────────────────────────────

describe('NC 31 — maxDepth', () => {
  it('classic example', () => {
    expect(maxDepth(arrayToTree([3, 9, 20, null, null, 15, 7]))).toBe(3);
  });
  it('single node', () => {
    expect(maxDepth(arrayToTree([1]))).toBe(1);
  });
  it('empty tree', () => {
    expect(maxDepth(null)).toBe(0);
  });
});

describe('NC 32 — invertTree', () => {
  it('mirrors the tree', () => {
    expect(levelOrder(invertTree(arrayToTree([4, 2, 7, 1, 3, 6, 9])))).toEqual([
      [4],
      [7, 2],
      [9, 6, 3, 1],
    ]);
  });
  it('small tree', () => {
    expect(levelOrder(invertTree(arrayToTree([2, 1, 3])))).toEqual([[2], [3, 1]]);
  });
  it('empty tree', () => {
    expect(invertTree(null)).toBeNull();
  });
});

describe('NC 33 — isSameTree', () => {
  it('identical trees', () => {
    expect(isSameTree(arrayToTree([1, 2, 3]), arrayToTree([1, 2, 3]))).toBe(true);
  });
  it('different structure', () => {
    expect(isSameTree(arrayToTree([1, 2]), arrayToTree([1, null, 2]))).toBe(false);
  });
  it('different values', () => {
    expect(isSameTree(arrayToTree([1, 2, 1]), arrayToTree([1, 1, 2]))).toBe(false);
  });
  it('both empty', () => {
    expect(isSameTree(null, null)).toBe(true);
  });
});

describe('NC 34 — levelOrder', () => {
  it('classic example', () => {
    expect(levelOrder(arrayToTree([3, 9, 20, null, null, 15, 7]))).toEqual([
      [3],
      [9, 20],
      [15, 7],
    ]);
  });
  it('single node', () => {
    expect(levelOrder(arrayToTree([1]))).toEqual([[1]]);
  });
  it('empty tree', () => {
    expect(levelOrder(null)).toEqual([]);
  });
});

describe('NC 35 — isValidBST', () => {
  it('valid BST', () => {
    expect(isValidBST(arrayToTree([2, 1, 3]))).toBe(true);
  });
  it('invalid: right subtree has a smaller value', () => {
    expect(isValidBST(arrayToTree([5, 1, 4, null, null, 3, 6]))).toBe(false);
  });
  it('single node is a valid BST', () => {
    expect(isValidBST(arrayToTree([1]))).toBe(true);
  });
});

describe('NC 36 — kthSmallest', () => {
  it('smallest element', () => {
    expect(kthSmallest(arrayToTree([3, 1, 4, null, 2]), 1)).toBe(1);
  });
  it('kth in the middle', () => {
    expect(kthSmallest(arrayToTree([5, 3, 6, 2, 4, null, null, 1]), 3)).toBe(3);
  });
  it('largest element', () => {
    expect(kthSmallest(arrayToTree([3, 1, 4, null, 2]), 4)).toBe(4);
  });
});

describe('NC 37 — lowestCommonAncestor', () => {
  const root = arrayToTree([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]);

  it('split point on opposite sides', () => {
    expect(lowestCommonAncestor(root, 5, 1)?.val).toBe(3);
  });
  it('a node is its own ancestor', () => {
    expect(lowestCommonAncestor(root, 5, 4)?.val).toBe(5);
  });
  it('both in the same subtree', () => {
    expect(lowestCommonAncestor(root, 7, 4)?.val).toBe(2);
  });
  it('deep leaves across the root', () => {
    expect(lowestCommonAncestor(root, 6, 8)?.val).toBe(3);
  });
});
