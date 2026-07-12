/**
 * Shared types + helpers for the 100 drills.
 *
 * These are GIVEN (already implemented) — they are not exercises.
 * Use them to build inputs and assert outputs in your solutions/tests.
 */

// ── Linked list ────────────────────────────────────────────────────────────

export class ListNode<T = number> {
  constructor(
    public val: T,
    public next: ListNode<T> | null = null,
  ) {}
}

/** [1,2,3] → 1 → 2 → 3 → null */
export const arrayToList = <T>(items: readonly T[]): ListNode<T> | null => {
  let head: ListNode<T> | null = null;
  for (let i = items.length - 1; i >= 0; i--) {
    head = new ListNode(items[i] as T, head);
  }
  return head;
};

/** 1 → 2 → 3 → null → [1,2,3] (stops after `limit` nodes to survive cycles) */
export const listToArray = <T>(head: ListNode<T> | null, limit = 10_000): T[] => {
  const out: T[] = [];
  let node = head;
  while (node !== null && out.length < limit) {
    out.push(node.val);
    node = node.next;
  }
  return out;
};

// ── Binary tree ────────────────────────────────────────────────────────────

export class TreeNode {
  constructor(
    public val: number,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null,
  ) {}
}

/**
 * Level-order array (LeetCode style) → tree. `null` marks a missing child.
 * [3,9,20,null,null,15,7] →
 *        3
 *       / \
 *      9  20
 *        /  \
 *       15   7
 */
export const arrayToTree = (items: readonly (number | null)[]): TreeNode | null => {
  if (items.length === 0 || items[0] === null || items[0] === undefined) return null;

  const root = new TreeNode(items[0]);
  const queue: TreeNode[] = [root];
  let i = 1;

  while (queue.length > 0 && i < items.length) {
    const node = queue.shift() as TreeNode;

    const leftVal = items[i++];
    if (leftVal !== null && leftVal !== undefined) {
      node.left = new TreeNode(leftVal);
      queue.push(node.left);
    }

    const rightVal = items[i++];
    if (rightVal !== null && rightVal !== undefined) {
      node.right = new TreeNode(rightVal);
      queue.push(node.right);
    }
  }
  return root;
};

/** Tree → level-order array with trailing nulls trimmed (inverse of arrayToTree). */
export const treeToArray = (root: TreeNode | null): (number | null)[] => {
  if (root === null) return [];
  const out: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];

  while (queue.length > 0) {
    const node = queue.shift() as TreeNode | null;
    if (node === null) {
      out.push(null);
      continue;
    }
    out.push(node.val);
    queue.push(node.left, node.right);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
};

// ── Misc ───────────────────────────────────────────────────────────────────

/** Thrown by every unimplemented drill. Delete it and write your solution. */
export const todo = (): never => {
  throw new Error('not implemented');
};
