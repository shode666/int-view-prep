import { describe, expect, it } from 'vitest';
import {
  reverseList,
  middleNode,
  mergeTwoLists,
  deleteDuplicates,
  hasCycle,
  getIntersectionNode,
  isPalindrome,
  removeNthFromEnd,
  detectCycle,
  addTwoNumbers,
  oddEvenList,
  reorderList,
} from '@src/drills/linkedList';
import { ListNode, arrayToList, listToArray } from '@src/drills/_types';

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

/** Return the last node of a list, or null for an empty list. */
const tail = (head: ListNode | null): ListNode | null => {
  if (head === null) return null;
  let node = head;
  while (node.next !== null) node = node.next;
  return node;
};

describe('DRILL 63 — reverseList', () => {
  it('reverses a 3-node list', () => {
    expect(listToArray(reverseList(arrayToList([1, 2, 3])))).toEqual([3, 2, 1]);
  });
  it('reverses a longer list', () => {
    expect(listToArray(reverseList(arrayToList([1, 2, 3, 4, 5])))).toEqual([
      5, 4, 3, 2, 1,
    ]);
  });
  it('single node is unchanged', () => {
    expect(listToArray(reverseList(arrayToList([42])))).toEqual([42]);
  });
  it('handles empty list', () => {
    expect(reverseList(null)).toBeNull();
  });
});

describe('DRILL 64 — middleNode', () => {
  it('odd length returns the exact middle', () => {
    expect(middleNode(arrayToList([1, 2, 3, 4, 5]))?.val).toBe(3);
  });
  it('even length returns the second middle', () => {
    expect(middleNode(arrayToList([1, 2, 3, 4, 5, 6]))?.val).toBe(4);
  });
  it('two nodes returns the second', () => {
    expect(middleNode(arrayToList([1, 2]))?.val).toBe(2);
  });
  it('single node returns itself', () => {
    expect(middleNode(arrayToList([1]))?.val).toBe(1);
  });
});

describe('DRILL 65 — mergeTwoLists', () => {
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
  it('disjoint ranges concatenate in order', () => {
    const merged = mergeTwoLists(arrayToList([1, 2, 3]), arrayToList([4, 5, 6]));
    expect(listToArray(merged)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('DRILL 66 — deleteDuplicates', () => {
  it('removes adjacent duplicates', () => {
    expect(listToArray(deleteDuplicates(arrayToList([1, 1, 2])))).toEqual([1, 2]);
  });
  it('collapses multiple runs', () => {
    expect(
      listToArray(deleteDuplicates(arrayToList([1, 1, 2, 3, 3]))),
    ).toEqual([1, 2, 3]);
  });
  it('all-same collapses to one', () => {
    expect(listToArray(deleteDuplicates(arrayToList([7, 7, 7])))).toEqual([7]);
  });
  it('handles empty list', () => {
    expect(deleteDuplicates(null)).toBeNull();
  });
});

describe('DRILL 67 — hasCycle', () => {
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
  it('empty list has no cycle', () => {
    expect(hasCycle(null)).toBe(false);
  });
});

describe('DRILL 68 — getIntersectionNode', () => {
  it('returns the shared node', () => {
    const shared = arrayToList([8, 4, 5]);
    const headA = arrayToList([4, 1]);
    const headB = arrayToList([5, 6, 1]);
    tail(headA)!.next = shared;
    tail(headB)!.next = shared;
    expect(getIntersectionNode(headA, headB)).toBe(shared);
  });
  it('returns null when lists never meet', () => {
    const headA = arrayToList([2, 6, 4]);
    const headB = arrayToList([1, 5]);
    expect(getIntersectionNode(headA, headB)).toBeNull();
  });
  it('intersection at the very first node', () => {
    const shared = arrayToList([9, 9]);
    expect(getIntersectionNode(shared, shared)).toBe(shared);
  });
  it('one list empty returns null', () => {
    expect(getIntersectionNode(null, arrayToList([1]))).toBeNull();
  });
});

describe('DRILL 69 — isPalindrome', () => {
  it('even-length palindrome', () => {
    expect(isPalindrome(arrayToList([1, 2, 2, 1]))).toBe(true);
  });
  it('odd-length palindrome', () => {
    expect(isPalindrome(arrayToList([1, 2, 3, 2, 1]))).toBe(true);
  });
  it('not a palindrome', () => {
    expect(isPalindrome(arrayToList([1, 2]))).toBe(false);
  });
  it('single node is a palindrome', () => {
    expect(isPalindrome(arrayToList([1]))).toBe(true);
  });
});

describe('DRILL 70 — removeNthFromEnd', () => {
  it('removes the 2nd from the end', () => {
    expect(
      listToArray(removeNthFromEnd(arrayToList([1, 2, 3, 4, 5]), 2)),
    ).toEqual([1, 2, 3, 5]);
  });
  it('removes the last node', () => {
    expect(listToArray(removeNthFromEnd(arrayToList([1, 2, 3]), 1))).toEqual([
      1, 2,
    ]);
  });
  it('removes the head', () => {
    expect(listToArray(removeNthFromEnd(arrayToList([1, 2, 3]), 3))).toEqual([
      2, 3,
    ]);
  });
  it('single node removed yields empty', () => {
    expect(removeNthFromEnd(arrayToList([1]), 1)).toBeNull();
  });
});

describe('DRILL 71 — detectCycle', () => {
  it('returns the cycle entry node', () => {
    const head = arrayToList([3, 2, 0, -4]);
    const entry = nodeAt(head, 1); // value 2
    tail(head)!.next = entry;
    expect(detectCycle(head)).toBe(entry);
  });
  it('entry is the head itself', () => {
    const head = arrayToList([1, 2]);
    tail(head)!.next = head;
    expect(detectCycle(head)).toBe(head);
  });
  it('no cycle returns null', () => {
    expect(detectCycle(arrayToList([1, 2, 3]))).toBeNull();
  });
  it('empty list returns null', () => {
    expect(detectCycle(null)).toBeNull();
  });
});

describe('DRILL 72 — addTwoNumbers', () => {
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
  it('adding zero', () => {
    const sum = addTwoNumbers(arrayToList([0]), arrayToList([0]));
    expect(listToArray(sum)).toEqual([0]);
  });
});

describe('DRILL 73 — oddEvenList', () => {
  it('groups odd positions then even positions', () => {
    expect(listToArray(oddEvenList(arrayToList([1, 2, 3, 4, 5])))).toEqual([
      1, 3, 5, 2, 4,
    ]);
  });
  it('even-length list', () => {
    expect(
      listToArray(oddEvenList(arrayToList([2, 1, 3, 5, 6, 4, 7]))),
    ).toEqual([2, 3, 6, 7, 1, 5, 4]);
  });
  it('two nodes stay put', () => {
    expect(listToArray(oddEvenList(arrayToList([1, 2])))).toEqual([1, 2]);
  });
  it('empty list', () => {
    expect(oddEvenList(null)).toBeNull();
  });
});

describe('DRILL 74 — reorderList', () => {
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
  it('single node unchanged', () => {
    const head = arrayToList([1]);
    reorderList(head);
    expect(listToArray(head)).toEqual([1]);
  });
});
