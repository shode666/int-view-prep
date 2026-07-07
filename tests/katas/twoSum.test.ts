import { describe, expect, it } from 'vitest';
import { twoSum } from '@src/katas/twoSum';

describe('twoSum', () => {
  it('finds a simple pair', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });

  it('finds a pair not at the start', () => {
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
  });

  it('handles duplicate values', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
  });

  it('handles negative numbers', () => {
    expect(twoSum([-1, -2, -3, -4, -5], -8)).toEqual([2, 4]);
  });

  it('does not reuse the same element twice', () => {
    expect(twoSum([5], 10)).toBeNull();
  });

  it('returns null when no pair exists', () => {
    expect(twoSum([1, 2, 3], 100)).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(twoSum([], 0)).toBeNull();
  });
});
