import { describe, expect, it } from 'vitest';
import {
  reverseStringInPlace,
  runningSum,
  plusOne,
  maxConsecutiveOnes,
  findMissingNumber,
  majorityElement,
  maxProfit,
  moveZeroes,
  removeDuplicates,
  sortedSquares,
  searchInsert,
  firstBadVersion,
  singleNumber,
  pivotIndex,
  maxSumSubarrayK,
  rotateArray,
  mergeSortedArray,
  sortColors,
  productExceptSelf,
  maxArea,
} from '@src/drills/arrays';

describe('DRILL 1 — reverseStringInPlace', () => {
  it('reverses a simple array in place', () => {
    const chars = ['h', 'e', 'l', 'l', 'o'];
    reverseStringInPlace(chars);
    expect(chars).toEqual(['o', 'l', 'l', 'e', 'h']);
  });

  it('reverses an even-length array', () => {
    const chars = ['H', 'a', 'n', 'n', 'a', 'h'];
    reverseStringInPlace(chars);
    expect(chars).toEqual(['h', 'a', 'n', 'n', 'a', 'H']);
  });

  it('leaves a single element unchanged', () => {
    const chars = ['x'];
    reverseStringInPlace(chars);
    expect(chars).toEqual(['x']);
  });

  it('handles an empty array', () => {
    const chars: string[] = [];
    reverseStringInPlace(chars);
    expect(chars).toEqual([]);
  });
});

describe('DRILL 2 — runningSum', () => {
  it('accumulates a simple array', () => {
    expect(runningSum([1, 2, 3, 4])).toEqual([1, 3, 6, 10]);
  });

  it('handles negatives', () => {
    expect(runningSum([3, -1, -2, 4])).toEqual([3, 2, 0, 4]);
  });

  it('handles a single element', () => {
    expect(runningSum([5])).toEqual([5]);
  });

  it('returns [] for an empty array', () => {
    expect(runningSum([])).toEqual([]);
  });
});

describe('DRILL 3 — plusOne', () => {
  it('adds one with no carry', () => {
    expect(plusOne([1, 2, 3])).toEqual([1, 2, 4]);
  });

  it('carries through trailing nines', () => {
    expect(plusOne([1, 2, 9])).toEqual([1, 3, 0]);
  });

  it('grows the array when all nines', () => {
    expect(plusOne([9, 9, 9])).toEqual([1, 0, 0, 0]);
  });

  it('handles a single digit', () => {
    expect(plusOne([0])).toEqual([1]);
  });
});

describe('DRILL 4 — maxConsecutiveOnes', () => {
  it('finds the longest run', () => {
    expect(maxConsecutiveOnes([1, 1, 0, 1, 1, 1])).toBe(3);
  });

  it('counts a run that ends the array', () => {
    expect(maxConsecutiveOnes([0, 1, 1])).toBe(2);
  });

  it('returns 0 when there are no ones', () => {
    expect(maxConsecutiveOnes([0, 0, 0])).toBe(0);
  });

  it('handles all ones', () => {
    expect(maxConsecutiveOnes([1, 1, 1, 1])).toBe(4);
  });
});

describe('DRILL 5 — findMissingNumber', () => {
  it('finds a value missing in the middle', () => {
    expect(findMissingNumber([3, 0, 1])).toBe(2);
  });

  it('finds a missing 0', () => {
    expect(findMissingNumber([1])).toBe(0);
  });

  it('finds the missing top of the range', () => {
    expect(findMissingNumber([0, 1, 2])).toBe(3);
  });

  it('handles a larger unordered array', () => {
    expect(findMissingNumber([9, 6, 4, 2, 3, 5, 7, 0, 1])).toBe(8);
  });
});

describe('DRILL 6 — majorityElement', () => {
  it('finds the majority in an odd array', () => {
    expect(majorityElement([3, 2, 3])).toBe(3);
  });

  it('finds the majority when interleaved', () => {
    expect(majorityElement([2, 2, 1, 1, 1, 2, 2])).toBe(2);
  });

  it('handles a single element', () => {
    expect(majorityElement([7])).toBe(7);
  });

  it('handles all-equal elements', () => {
    expect(majorityElement([4, 4, 4, 4])).toBe(4);
  });
});

describe('DRILL 7 — maxProfit', () => {
  it('buys low and sells high later', () => {
    expect(maxProfit([7, 1, 5, 3, 6, 4])).toBe(5);
  });

  it('returns 0 when prices only fall', () => {
    expect(maxProfit([7, 6, 4, 3, 1])).toBe(0);
  });

  it('handles a single price', () => {
    expect(maxProfit([5])).toBe(0);
  });

  it('captures a profit at the very end', () => {
    expect(maxProfit([2, 4, 1, 7])).toBe(6);
  });
});

describe('DRILL 8 — moveZeroes', () => {
  it('moves zeroes to the end keeping order', () => {
    const nums = [0, 1, 0, 3, 12];
    moveZeroes(nums);
    expect(nums).toEqual([1, 3, 12, 0, 0]);
  });

  it('leaves an array with no zeroes unchanged', () => {
    const nums = [1, 2, 3];
    moveZeroes(nums);
    expect(nums).toEqual([1, 2, 3]);
  });

  it('handles all zeroes', () => {
    const nums = [0, 0, 0];
    moveZeroes(nums);
    expect(nums).toEqual([0, 0, 0]);
  });

  it('handles a single zero', () => {
    const nums = [0];
    moveZeroes(nums);
    expect(nums).toEqual([0]);
  });
});

describe('DRILL 9 — removeDuplicates', () => {
  it('returns the unique count and compacts the front', () => {
    const nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];
    const k = removeDuplicates(nums);
    expect(k).toBe(5);
    expect(nums.slice(0, k)).toEqual([0, 1, 2, 3, 4]);
  });

  it('handles a short duplicate run', () => {
    const nums = [1, 1, 2];
    const k = removeDuplicates(nums);
    expect(k).toBe(2);
    expect(nums.slice(0, k)).toEqual([1, 2]);
  });

  it('leaves an already-unique array intact', () => {
    const nums = [1, 2, 3];
    const k = removeDuplicates(nums);
    expect(k).toBe(3);
    expect(nums.slice(0, k)).toEqual([1, 2, 3]);
  });

  it('handles a single element', () => {
    const nums = [9];
    expect(removeDuplicates(nums)).toBe(1);
  });
});

describe('DRILL 10 — sortedSquares', () => {
  it('squares and sorts with negatives', () => {
    expect(sortedSquares([-4, -1, 0, 3, 10])).toEqual([0, 1, 9, 16, 100]);
  });

  it('handles all negatives', () => {
    expect(sortedSquares([-7, -3, -1])).toEqual([1, 9, 49]);
  });

  it('handles all non-negatives', () => {
    expect(sortedSquares([1, 2, 3])).toEqual([1, 4, 9]);
  });

  it('handles a single element', () => {
    expect(sortedSquares([-5])).toEqual([25]);
  });
});

describe('DRILL 11 — searchInsert', () => {
  it('returns the index when found', () => {
    expect(searchInsert([1, 3, 5, 6], 5)).toBe(2);
  });

  it('returns the insertion point in the middle', () => {
    expect(searchInsert([1, 3, 5, 6], 2)).toBe(1);
  });

  it('inserts past the end', () => {
    expect(searchInsert([1, 3, 5, 6], 7)).toBe(4);
  });

  it('inserts before the start', () => {
    expect(searchInsert([1, 3, 5, 6], 0)).toBe(0);
  });
});

describe('DRILL 12 — firstBadVersion', () => {
  it('finds the boundary', () => {
    expect(firstBadVersion(5, (v) => v >= 4)).toBe(4);
  });

  it('handles the first version being bad', () => {
    expect(firstBadVersion(3, (v) => v >= 1)).toBe(1);
  });

  it('handles only the last version being bad', () => {
    expect(firstBadVersion(10, (v) => v >= 10)).toBe(10);
  });

  it('handles a single version', () => {
    expect(firstBadVersion(1, (v) => v >= 1)).toBe(1);
  });
});

describe('DRILL 13 — singleNumber', () => {
  it('finds the unpaired value', () => {
    expect(singleNumber([4, 1, 2, 1, 2])).toBe(4);
  });

  it('finds it when it is first', () => {
    expect(singleNumber([2, 2, 1])).toBe(1);
  });

  it('handles a single-element array', () => {
    expect(singleNumber([7])).toBe(7);
  });

  it('handles negatives and zero', () => {
    expect(singleNumber([-3, 0, -3])).toBe(0);
  });
});

describe('DRILL 14 — pivotIndex', () => {
  it('finds a middle pivot', () => {
    expect(pivotIndex([1, 7, 3, 6, 5, 6])).toBe(3);
  });

  it('treats index 0 as valid when left sum is 0', () => {
    expect(pivotIndex([2, 1, -1])).toBe(0);
  });

  it('returns -1 when no pivot exists', () => {
    expect(pivotIndex([1, 2, 3])).toBe(-1);
  });

  it('handles a single element (empty sides both 0)', () => {
    expect(pivotIndex([5])).toBe(0);
  });
});

describe('DRILL 15 — maxSumSubarrayK', () => {
  it('finds the best window', () => {
    expect(maxSumSubarrayK([2, 1, 5, 1, 3, 2], 3)).toBe(9);
  });

  it('handles k equal to the length', () => {
    expect(maxSumSubarrayK([1, 2, 3], 3)).toBe(6);
  });

  it('handles window of size 1', () => {
    expect(maxSumSubarrayK([-1, -2, -3, -4], 1)).toBe(-1);
  });

  it('handles negatives across the window', () => {
    expect(maxSumSubarrayK([4, -1, 2, 1, 6], 2)).toBe(7);
  });
});

describe('DRILL 16 — rotateArray', () => {
  it('rotates right by k', () => {
    const nums = [1, 2, 3, 4, 5, 6, 7];
    rotateArray(nums, 3);
    expect(nums).toEqual([5, 6, 7, 1, 2, 3, 4]);
  });

  it('wraps k larger than the length', () => {
    const nums = [1, 2, 3];
    rotateArray(nums, 4);
    expect(nums).toEqual([3, 1, 2]);
  });

  it('is a no-op when k is 0', () => {
    const nums = [1, 2, 3];
    rotateArray(nums, 0);
    expect(nums).toEqual([1, 2, 3]);
  });

  it('is a no-op when k equals the length', () => {
    const nums = [1, 2];
    rotateArray(nums, 2);
    expect(nums).toEqual([1, 2]);
  });
});

describe('DRILL 17 — mergeSortedArray', () => {
  it('merges two sorted arrays in place', () => {
    const nums1 = [1, 2, 3, 0, 0, 0];
    mergeSortedArray(nums1, 3, [2, 5, 6], 3);
    expect(nums1).toEqual([1, 2, 2, 3, 5, 6]);
  });

  it('handles an empty second array', () => {
    const nums1 = [1, 2, 3];
    mergeSortedArray(nums1, 3, [], 0);
    expect(nums1).toEqual([1, 2, 3]);
  });

  it('handles an empty first array', () => {
    const nums1 = [0, 0];
    mergeSortedArray(nums1, 0, [4, 5], 2);
    expect(nums1).toEqual([4, 5]);
  });

  it('interleaves correctly', () => {
    const nums1 = [4, 5, 6, 0, 0, 0];
    mergeSortedArray(nums1, 3, [1, 2, 3], 3);
    expect(nums1).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('DRILL 18 — sortColors', () => {
  it('sorts a mixed array in place', () => {
    const nums = [2, 0, 2, 1, 1, 0];
    sortColors(nums);
    expect(nums).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('sorts a two-element array', () => {
    const nums = [2, 0];
    sortColors(nums);
    expect(nums).toEqual([0, 2]);
  });

  it('leaves an already-sorted array untouched', () => {
    const nums = [0, 1, 2];
    sortColors(nums);
    expect(nums).toEqual([0, 1, 2]);
  });

  it('handles all-same values and empty input', () => {
    const same = [1, 1, 1];
    sortColors(same);
    expect(same).toEqual([1, 1, 1]);

    const empty: number[] = [];
    sortColors(empty);
    expect(empty).toEqual([]);
  });
});

describe('DRILL 19 — productExceptSelf', () => {
  it('computes products without division', () => {
    expect(productExceptSelf([1, 2, 3, 4])).toEqual([24, 12, 8, 6]);
  });

  it('handles a zero in the array', () => {
    expect(productExceptSelf([0, 4, 2])).toEqual([8, 0, 0]);
  });

  it('handles two zeroes (all products 0)', () => {
    expect(productExceptSelf([0, 2, 0])).toEqual([0, 0, 0]);
  });

  it('handles negatives', () => {
    expect(productExceptSelf([-1, 1, 0, -3, 3])).toEqual([0, 0, 9, 0, 0]);
  });
});

describe('DRILL 20 — maxArea', () => {
  it('finds the max container area', () => {
    expect(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])).toBe(49);
  });

  it('handles two lines', () => {
    expect(maxArea([1, 1])).toBe(1);
  });

  it('handles a strictly increasing profile', () => {
    expect(maxArea([1, 2, 3, 4, 5])).toBe(6);
  });

  it('handles a tall pair far apart', () => {
    expect(maxArea([2, 3, 4, 5, 18, 17, 6])).toBe(17);
  });
});
