import { describe, expect, it } from 'vitest';
import {
  containsDuplicate,
  isIsomorphic,
  wordPattern,
  intersectionOfArrays,
  isHappy,
  canConstruct,
  characterFrequency,
  twoSumSorted,
  subarraySum,
  topKFrequent,
  findDuplicates,
  findAnagrams,
  longestConsecutive,
  isValidSudoku,
  firstMissingPositive,
} from '@src/drills/hashmap';

describe('DRILL 36 — containsDuplicate', () => {
  it('returns true when a duplicate exists', () => {
    expect(containsDuplicate([1, 2, 3, 1])).toBe(true);
  });
  it('returns false when all elements are distinct', () => {
    expect(containsDuplicate([1, 2, 3, 4])).toBe(false);
  });
  it('returns false for an empty array', () => {
    expect(containsDuplicate([])).toBe(false);
  });
  it('handles negatives and repeated zeros', () => {
    expect(containsDuplicate([0, -1, -1])).toBe(true);
  });
});

describe('DRILL 37 — isIsomorphic', () => {
  it('maps egg → add', () => {
    expect(isIsomorphic('egg', 'add')).toBe(true);
  });
  it('rejects foo → bar', () => {
    expect(isIsomorphic('foo', 'bar')).toBe(false);
  });
  it('rejects a non-injective mapping (badc → baba)', () => {
    expect(isIsomorphic('badc', 'baba')).toBe(false);
  });
  it('treats empty strings as isomorphic', () => {
    expect(isIsomorphic('', '')).toBe(true);
  });
});

describe('DRILL 38 — wordPattern', () => {
  it('matches abba → dog cat cat dog', () => {
    expect(wordPattern('abba', 'dog cat cat dog')).toBe(true);
  });
  it('rejects abba → dog cat cat fish', () => {
    expect(wordPattern('abba', 'dog cat cat fish')).toBe(false);
  });
  it('rejects when two letters map to the same word (aaaa → dog cat cat dog)', () => {
    expect(wordPattern('aaaa', 'dog cat cat dog')).toBe(false);
  });
  it('rejects on length mismatch', () => {
    expect(wordPattern('abc', 'dog cat')).toBe(false);
  });
});

describe('DRILL 39 — intersectionOfArrays', () => {
  it('returns the shared unique value', () => {
    expect(intersectionOfArrays([1, 2, 2, 1], [2, 2]).sort()).toEqual([2]);
  });
  it('dedupes the intersection', () => {
    expect(intersectionOfArrays([4, 9, 5], [9, 4, 9, 8, 4]).sort()).toEqual([4, 9]);
  });
  it('returns empty when there is no overlap', () => {
    expect(intersectionOfArrays([1, 2], [3, 4])).toEqual([]);
  });
  it('returns empty when one side is empty', () => {
    expect(intersectionOfArrays([], [1, 2])).toEqual([]);
  });
});

describe('DRILL 40 — isHappy', () => {
  it('returns true for 19', () => {
    expect(isHappy(19)).toBe(true);
  });
  it('returns true for 1', () => {
    expect(isHappy(1)).toBe(true);
  });
  it('returns false for 2 (enters a cycle)', () => {
    expect(isHappy(2)).toBe(false);
  });
  it('returns true for 7', () => {
    expect(isHappy(7)).toBe(true);
  });
});

describe('DRILL 41 — canConstruct', () => {
  it('builds aa from aab', () => {
    expect(canConstruct('aa', 'aab')).toBe(true);
  });
  it('cannot build aa from ab', () => {
    expect(canConstruct('aa', 'ab')).toBe(false);
  });
  it('cannot build a from empty magazine', () => {
    expect(canConstruct('a', '')).toBe(false);
  });
  it('empty note is always constructible', () => {
    expect(canConstruct('', 'anything')).toBe(true);
  });
});

describe('DRILL 42 — characterFrequency', () => {
  it('counts repeated characters', () => {
    const freq = characterFrequency('aabbc');
    expect(freq.get('a')).toBe(2);
    expect(freq.get('b')).toBe(2);
    expect(freq.get('c')).toBe(1);
  });
  it('returns an empty map for an empty string', () => {
    expect(characterFrequency('').size).toBe(0);
  });
  it('has no entry for an absent character', () => {
    expect(characterFrequency('abc').get('z')).toBeUndefined();
  });
  it('counts spaces as characters', () => {
    expect(characterFrequency('a a').get(' ')).toBe(1);
  });
});

describe('DRILL 43 — twoSumSorted', () => {
  it('returns 1-based indices for [2,7,11,15] target 9', () => {
    expect(twoSumSorted([2, 7, 11, 15], 9)).toEqual([1, 2]);
  });
  it('handles the outer pair [2,3,4] target 6', () => {
    expect(twoSumSorted([2, 3, 4], 6)).toEqual([1, 3]);
  });
  it('handles negatives [-1,0] target -1', () => {
    expect(twoSumSorted([-1, 0], -1)).toEqual([1, 2]);
  });
  it('handles adjacent pair at the end', () => {
    expect(twoSumSorted([1, 2, 5, 9], 14)).toEqual([3, 4]);
  });
});

describe('DRILL 44 — subarraySum', () => {
  it('counts two subarrays in [1,1,1] k 2', () => {
    expect(subarraySum([1, 1, 1], 2)).toBe(2);
  });
  it('counts [1,2,3] k 3', () => {
    expect(subarraySum([1, 2, 3], 3)).toBe(2);
  });
  it('handles zero-sum subarrays with negatives', () => {
    expect(subarraySum([1, -1, 0], 0)).toBe(3);
  });
  it('returns 0 when no subarray matches', () => {
    expect(subarraySum([1, 2, 3], 7)).toBe(0);
  });
});

describe('DRILL 45 — topKFrequent', () => {
  it('returns the two most frequent (any order)', () => {
    expect(topKFrequent([1, 1, 1, 2, 2, 3], 2).sort()).toEqual([1, 2]);
  });
  it('returns the single element for k=1', () => {
    expect(topKFrequent([1], 1)).toEqual([1]);
  });
  it('returns all elements when k equals the distinct count', () => {
    expect(topKFrequent([1, 2, 3], 3).sort()).toEqual([1, 2, 3]);
  });
  it('picks the higher-frequency value', () => {
    expect(topKFrequent([4, 4, 4, 5, 5, 6], 1)).toEqual([4]);
  });
});

describe('DRILL 46 — findDuplicates', () => {
  it('finds values appearing twice', () => {
    expect(findDuplicates([4, 3, 2, 7, 8, 2, 3, 1]).sort((x, y) => x - y)).toEqual([2, 3]);
  });
  it('finds a single duplicate', () => {
    expect(findDuplicates([1, 1, 2])).toEqual([1]);
  });
  it('returns empty when all are unique', () => {
    expect(findDuplicates([1, 2, 3])).toEqual([]);
  });
  it('returns empty for an empty array', () => {
    expect(findDuplicates([])).toEqual([]);
  });
});

describe('DRILL 47 — findAnagrams', () => {
  it('finds anagram start indices in cbaebabacd', () => {
    expect(findAnagrams('cbaebabacd', 'abc')).toEqual([0, 6]);
  });
  it('finds overlapping windows in abab', () => {
    expect(findAnagrams('abab', 'ab')).toEqual([0, 1, 2]);
  });
  it('returns empty when no anagram exists', () => {
    expect(findAnagrams('abcd', 'xy')).toEqual([]);
  });
  it('returns empty when p is longer than s', () => {
    expect(findAnagrams('a', 'aa')).toEqual([]);
  });
});

describe('DRILL 48 — longestConsecutive', () => {
  it('finds the run 1..4', () => {
    expect(longestConsecutive([100, 4, 200, 1, 3, 2])).toBe(4);
  });
  it('returns 0 for an empty array', () => {
    expect(longestConsecutive([])).toBe(0);
  });
  it('ignores duplicates', () => {
    expect(longestConsecutive([1, 2, 0, 1])).toBe(3);
  });
  it('returns 1 when nothing is consecutive', () => {
    expect(longestConsecutive([10, 30, 20])).toBe(1);
  });
});

describe('DRILL 49 — isValidSudoku', () => {
  const validBoard: string[][] = [
    ['5', '3', '.', '.', '7', '.', '.', '.', '.'],
    ['6', '.', '.', '1', '9', '5', '.', '.', '.'],
    ['.', '9', '8', '.', '.', '.', '.', '6', '.'],
    ['8', '.', '.', '.', '6', '.', '.', '.', '3'],
    ['4', '.', '.', '8', '.', '3', '.', '.', '1'],
    ['7', '.', '.', '.', '2', '.', '.', '.', '6'],
    ['.', '6', '.', '.', '.', '.', '2', '8', '.'],
    ['.', '.', '.', '4', '1', '9', '.', '.', '5'],
    ['.', '.', '.', '.', '8', '.', '.', '7', '9'],
  ];

  it('accepts a valid partial board', () => {
    expect(isValidSudoku(validBoard)).toBe(true);
  });
  it('rejects a duplicate within a column', () => {
    const board = validBoard.map((row) => [...row]);
    board[3]![0] = '5'; // second 5 in column 0
    expect(isValidSudoku(board)).toBe(false);
  });
  it('rejects a duplicate within a 3x3 box', () => {
    const board = validBoard.map((row) => [...row]);
    board[1]![1] = '3'; // duplicate 3 in the top-left box
    expect(isValidSudoku(board)).toBe(false);
  });
  it('accepts a fully empty board', () => {
    const empty = Array.from({ length: 9 }, () => Array<string>(9).fill('.'));
    expect(isValidSudoku(empty)).toBe(true);
  });
});

describe('DRILL 50 — firstMissingPositive', () => {
  it('returns 3 for [1,2,0]', () => {
    expect(firstMissingPositive([1, 2, 0])).toBe(3);
  });
  it('returns 2 for [3,4,-1,1]', () => {
    expect(firstMissingPositive([3, 4, -1, 1])).toBe(2);
  });
  it('returns 1 when 1 is absent', () => {
    expect(firstMissingPositive([7, 8, 9, 11, 12])).toBe(1);
  });
  it('returns 1 for an empty array', () => {
    expect(firstMissingPositive([])).toBe(1);
  });
});
