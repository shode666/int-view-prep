import { describe, expect, it } from 'vitest';
import { groupAnagrams } from '@src/katas/groupAnagrams';

describe('groupAnagrams', () => {
  it('groups the classic example', () => {
    expect(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat'])).toEqual([
      ['eat', 'tea', 'ate'],
      ['tan', 'nat'],
      ['bat'],
    ]);
  });

  it('handles an empty list', () => {
    expect(groupAnagrams([])).toEqual([]);
  });

  it('handles empty strings', () => {
    expect(groupAnagrams(['', ''])).toEqual([['', '']]);
  });

  it('handles single-word input', () => {
    expect(groupAnagrams(['solo'])).toEqual([['solo']]);
  });

  it('treats identical words as anagrams', () => {
    expect(groupAnagrams(['abc', 'abc', 'cab'])).toEqual([['abc', 'abc', 'cab']]);
  });

  it('is case sensitive', () => {
    expect(groupAnagrams(['abc', 'Abc'])).toEqual([['abc'], ['Abc']]);
  });
});
