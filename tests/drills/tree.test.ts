import { describe, expect, it } from 'vitest';
import {
  maxDepth,
  minDepth,
  invertTree,
  isSameTree,
  isSymmetric,
  hasPathSum,
  diameterOfBinaryTree,
  inorderTraversal,
  preorderTraversal,
  postorderTraversal,
  levelOrder,
  zigzagLevelOrder,
  isValidBST,
  lowestCommonAncestor,
} from '@src/drills/tree';
import { TreeNode, arrayToTree, treeToArray } from '@src/drills/_types';

/** Find the first node whose value equals `val` (BFS), or null. */
const findNode = (root: TreeNode | null, val: number): TreeNode | null => {
  const queue: TreeNode[] = root ? [root] : [];
  while (queue.length > 0) {
    const node = queue.shift() as TreeNode;
    if (node.val === val) return node;
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  return null;
};

describe('DRILL 75 — maxDepth', () => {
  it('classic example', () => {
    expect(maxDepth(arrayToTree([3, 9, 20, null, null, 15, 7]))).toBe(3);
  });
  it('single node', () => {
    expect(maxDepth(arrayToTree([1]))).toBe(1);
  });
  it('left-leaning chain', () => {
    expect(maxDepth(arrayToTree([1, 2, null, 3]))).toBe(3);
  });
  it('empty tree', () => {
    expect(maxDepth(null)).toBe(0);
  });
});

describe('DRILL 76 — minDepth', () => {
  it('classic example', () => {
    expect(minDepth(arrayToTree([3, 9, 20, null, null, 15, 7]))).toBe(2);
  });
  it('single-child node is not a leaf', () => {
    expect(minDepth(arrayToTree([1, 2]))).toBe(2);
  });
  it('single node', () => {
    expect(minDepth(arrayToTree([1]))).toBe(1);
  });
  it('empty tree', () => {
    expect(minDepth(null)).toBe(0);
  });
});

describe('DRILL 77 — invertTree', () => {
  it('mirrors the tree', () => {
    expect(treeToArray(invertTree(arrayToTree([4, 2, 7, 1, 3, 6, 9])))).toEqual([
      4, 7, 2, 9, 6, 3, 1,
    ]);
  });
  it('small tree', () => {
    expect(treeToArray(invertTree(arrayToTree([2, 1, 3])))).toEqual([2, 3, 1]);
  });
  it('single node', () => {
    expect(treeToArray(invertTree(arrayToTree([1])))).toEqual([1]);
  });
  it('empty tree', () => {
    expect(invertTree(null)).toBeNull();
  });
});

describe('DRILL 78 — isSameTree', () => {
  it('identical trees', () => {
    expect(isSameTree(arrayToTree([1, 2, 3]), arrayToTree([1, 2, 3]))).toBe(true);
  });
  it('different structure', () => {
    expect(
      isSameTree(arrayToTree([1, 2]), arrayToTree([1, null, 2])),
    ).toBe(false);
  });
  it('different values', () => {
    expect(isSameTree(arrayToTree([1, 2, 1]), arrayToTree([1, 1, 2]))).toBe(
      false,
    );
  });
  it('both empty', () => {
    expect(isSameTree(null, null)).toBe(true);
  });
});

describe('DRILL 79 — isSymmetric', () => {
  it('symmetric tree', () => {
    expect(isSymmetric(arrayToTree([1, 2, 2, 3, 4, 4, 3]))).toBe(true);
  });
  it('asymmetric tree', () => {
    expect(isSymmetric(arrayToTree([1, 2, 2, null, 3, null, 3]))).toBe(false);
  });
  it('single node is symmetric', () => {
    expect(isSymmetric(arrayToTree([1]))).toBe(true);
  });
  it('empty tree is symmetric', () => {
    expect(isSymmetric(null)).toBe(true);
  });
});

describe('DRILL 80 — hasPathSum', () => {
  it('finds a root-to-leaf path', () => {
    const root = arrayToTree([
      5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1,
    ]);
    expect(hasPathSum(root, 22)).toBe(true);
  });
  it('no path matches', () => {
    expect(hasPathSum(arrayToTree([1, 2, 3]), 5)).toBe(false);
  });
  it('single node equal to target', () => {
    expect(hasPathSum(arrayToTree([7]), 7)).toBe(true);
  });
  it('empty tree is never a path', () => {
    expect(hasPathSum(null, 0)).toBe(false);
  });
});

describe('DRILL 81 — diameterOfBinaryTree', () => {
  it('path through the root', () => {
    expect(diameterOfBinaryTree(arrayToTree([1, 2, 3, 4, 5]))).toBe(3);
  });
  it('single node has diameter 0', () => {
    expect(diameterOfBinaryTree(arrayToTree([1]))).toBe(0);
  });
  it('two nodes has diameter 1', () => {
    expect(diameterOfBinaryTree(arrayToTree([1, 2]))).toBe(1);
  });
  it('empty tree has diameter 0', () => {
    expect(diameterOfBinaryTree(null)).toBe(0);
  });
});

describe('DRILL 82 — inorderTraversal', () => {
  it('classic example', () => {
    expect(inorderTraversal(arrayToTree([1, null, 2, 3]))).toEqual([1, 3, 2]);
  });
  it('BST yields sorted order', () => {
    expect(inorderTraversal(arrayToTree([2, 1, 3]))).toEqual([1, 2, 3]);
  });
  it('single node', () => {
    expect(inorderTraversal(arrayToTree([1]))).toEqual([1]);
  });
  it('empty tree', () => {
    expect(inorderTraversal(null)).toEqual([]);
  });
});

describe('DRILL 83 — preorderTraversal', () => {
  it('classic example', () => {
    expect(preorderTraversal(arrayToTree([1, null, 2, 3]))).toEqual([1, 2, 3]);
  });
  it('full tree', () => {
    expect(preorderTraversal(arrayToTree([1, 2, 3, 4, 5]))).toEqual([
      1, 2, 4, 5, 3,
    ]);
  });
  it('single node', () => {
    expect(preorderTraversal(arrayToTree([1]))).toEqual([1]);
  });
  it('empty tree', () => {
    expect(preorderTraversal(null)).toEqual([]);
  });
});

describe('DRILL 84 — postorderTraversal', () => {
  it('classic example', () => {
    expect(postorderTraversal(arrayToTree([1, null, 2, 3]))).toEqual([3, 2, 1]);
  });
  it('full tree', () => {
    expect(postorderTraversal(arrayToTree([1, 2, 3, 4, 5]))).toEqual([
      4, 5, 2, 3, 1,
    ]);
  });
  it('single node', () => {
    expect(postorderTraversal(arrayToTree([1]))).toEqual([1]);
  });
  it('empty tree', () => {
    expect(postorderTraversal(null)).toEqual([]);
  });
});

describe('DRILL 85 — levelOrder', () => {
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
  it('left chain', () => {
    expect(levelOrder(arrayToTree([1, 2, null, 3]))).toEqual([[1], [2], [3]]);
  });
  it('empty tree', () => {
    expect(levelOrder(null)).toEqual([]);
  });
});

describe('DRILL 86 — zigzagLevelOrder', () => {
  it('classic example', () => {
    expect(
      zigzagLevelOrder(arrayToTree([3, 9, 20, null, null, 15, 7])),
    ).toEqual([[3], [20, 9], [15, 7]]);
  });
  it('four levels alternate direction', () => {
    expect(
      zigzagLevelOrder(arrayToTree([1, 2, 3, 4, null, null, 5])),
    ).toEqual([[1], [3, 2], [4, 5]]);
  });
  it('single node', () => {
    expect(zigzagLevelOrder(arrayToTree([1]))).toEqual([[1]]);
  });
  it('empty tree', () => {
    expect(zigzagLevelOrder(null)).toEqual([]);
  });
});

describe('DRILL 87 — isValidBST', () => {
  it('valid BST', () => {
    expect(isValidBST(arrayToTree([2, 1, 3]))).toBe(true);
  });
  it('invalid: right subtree has a smaller value', () => {
    expect(isValidBST(arrayToTree([5, 1, 4, null, null, 3, 6]))).toBe(false);
  });
  it('equal values are not valid (strict)', () => {
    expect(isValidBST(arrayToTree([2, 2, 2]))).toBe(false);
  });
  it('single node is a valid BST', () => {
    expect(isValidBST(arrayToTree([1]))).toBe(true);
  });
});

describe('DRILL 88 — lowestCommonAncestor', () => {
  const root = arrayToTree([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]);

  it('split point on opposite sides', () => {
    const p = findNode(root, 2);
    const q = findNode(root, 8);
    expect(lowestCommonAncestor(root, p, q)?.val).toBe(6);
  });
  it('a node is its own ancestor', () => {
    const p = findNode(root, 2);
    const q = findNode(root, 4);
    expect(lowestCommonAncestor(root, p, q)?.val).toBe(2);
  });
  it('both in the same subtree', () => {
    const p = findNode(root, 3);
    const q = findNode(root, 5);
    expect(lowestCommonAncestor(root, p, q)?.val).toBe(4);
  });
  it('root is the LCA of the deepest leaves', () => {
    const p = findNode(root, 0);
    const q = findNode(root, 9);
    expect(lowestCommonAncestor(root, p, q)?.val).toBe(6);
  });
});
