import { describe, expect, it } from 'vitest';
import {
  isPalindrome,
  reverseVowels,
  isAnagram,
  firstUniqChar,
  longestCommonPrefix,
  isSubsequence,
  strStr,
  romanToInt,
  reverseWords,
  toTitleCase,
  addBinary,
  compressString,
  countAndSay,
  lengthOfLongestSubstring,
  longestPalindrome,
} from '@src/drills/strings';

describe('DRILL 21 — isPalindrome', () => {
  it('ignores punctuation and case', () => {
    expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true);
  });

  it('rejects a non-palindrome', () => {
    expect(isPalindrome('race a car')).toBe(false);
  });

  it('treats an empty / symbol-only string as a palindrome', () => {
    expect(isPalindrome(' ')).toBe(true);
  });

  it('handles alphanumerics mixing letters and digits', () => {
    expect(isPalindrome('0P')).toBe(false);
  });
});

describe('DRILL 22 — reverseVowels', () => {
  it('swaps the two vowels', () => {
    expect(reverseVowels('hello')).toBe('holle');
  });

  it('reverses several vowels', () => {
    expect(reverseVowels('leetcode')).toBe('leotcede');
  });

  it('handles uppercase vowels', () => {
    expect(reverseVowels('AaeE')).toBe('EeaA');
  });

  it('leaves a string with no vowels unchanged', () => {
    expect(reverseVowels('xyz')).toBe('xyz');
  });
});

describe('DRILL 23 — isAnagram', () => {
  it('accepts a valid anagram', () => {
    expect(isAnagram('anagram', 'nagaram')).toBe(true);
  });

  it('rejects a non-anagram', () => {
    expect(isAnagram('rat', 'car')).toBe(false);
  });

  it('rejects different lengths', () => {
    expect(isAnagram('a', 'ab')).toBe(false);
  });

  it('treats two empty strings as anagrams', () => {
    expect(isAnagram('', '')).toBe(true);
  });
});

describe('DRILL 24 — firstUniqChar', () => {
  it('finds the first unique at the start', () => {
    expect(firstUniqChar('leetcode')).toBe(0);
  });

  it('finds the first unique later on', () => {
    expect(firstUniqChar('loveleetcode')).toBe(2);
  });

  it('returns -1 when every char repeats', () => {
    expect(firstUniqChar('aabb')).toBe(-1);
  });

  it('handles a single character', () => {
    expect(firstUniqChar('z')).toBe(0);
  });
});

describe('DRILL 25 — longestCommonPrefix', () => {
  it('finds a shared prefix', () => {
    expect(longestCommonPrefix(['flower', 'flow', 'flight'])).toBe('fl');
  });

  it('returns "" when there is no common prefix', () => {
    expect(longestCommonPrefix(['dog', 'racecar', 'car'])).toBe('');
  });

  it('handles a single string', () => {
    expect(longestCommonPrefix(['alone'])).toBe('alone');
  });

  it('stops at the shortest string', () => {
    expect(longestCommonPrefix(['ab', 'abc', 'abcd'])).toBe('ab');
  });
});

describe('DRILL 26 — isSubsequence', () => {
  it('accepts a subsequence', () => {
    expect(isSubsequence('abc', 'ahbgdc')).toBe(true);
  });

  it('rejects a non-subsequence', () => {
    expect(isSubsequence('axc', 'ahbgdc')).toBe(false);
  });

  it('treats the empty string as a subsequence of anything', () => {
    expect(isSubsequence('', 'ahbgdc')).toBe(true);
  });

  it('rejects when s is longer than t', () => {
    expect(isSubsequence('abc', 'ab')).toBe(false);
  });
});

describe('DRILL 27 — strStr', () => {
  it('finds the needle at the start', () => {
    expect(strStr('sadbutsad', 'sad')).toBe(0);
  });

  it('finds the needle in the middle', () => {
    expect(strStr('hello', 'll')).toBe(2);
  });

  it('returns -1 when absent', () => {
    expect(strStr('leetcode', 'leeto')).toBe(-1);
  });

  it('returns 0 for an empty needle', () => {
    expect(strStr('abc', '')).toBe(0);
  });
});

describe('DRILL 28 — romanToInt', () => {
  it('converts a simple additive numeral', () => {
    expect(romanToInt('III')).toBe(3);
  });

  it('converts one with a subtractive pair', () => {
    expect(romanToInt('LVIII')).toBe(58);
  });

  it('handles multiple subtractive pairs', () => {
    expect(romanToInt('MCMXCIV')).toBe(1994);
  });

  it('converts IV and IX', () => {
    expect(romanToInt('IV')).toBe(4);
    expect(romanToInt('IX')).toBe(9);
  });
});

describe('DRILL 29 — reverseWords', () => {
  it('reverses word order and trims extra spaces', () => {
    expect(reverseWords('  the sky  is blue ')).toBe('blue is sky the');
  });

  it('handles a single word', () => {
    expect(reverseWords('hello')).toBe('hello');
  });

  it('collapses internal whitespace', () => {
    expect(reverseWords('a good   example')).toBe('example good a');
  });

  it('trims leading and trailing spaces to a clean two words', () => {
    expect(reverseWords('  bob   loves  alice ')).toBe('alice loves bob');
  });
});

describe('DRILL 30 — toTitleCase', () => {
  it('capitalizes each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });

  it('lowercases the rest of each word', () => {
    expect(toTitleCase('jON SNoW')).toBe('Jon Snow');
  });

  it('handles a single word', () => {
    expect(toTitleCase('typescript')).toBe('Typescript');
  });

  it('handles an empty string', () => {
    expect(toTitleCase('')).toBe('');
  });
});

describe('DRILL 31 — addBinary', () => {
  it('adds with a carry', () => {
    expect(addBinary('11', '1')).toBe('100');
  });

  it('adds two multi-bit numbers', () => {
    expect(addBinary('1010', '1011')).toBe('10101');
  });

  it('handles zeros', () => {
    expect(addBinary('0', '0')).toBe('0');
  });

  it('handles different lengths', () => {
    expect(addBinary('1', '111')).toBe('1000');
  });

  it('handles values beyond Number.MAX_SAFE_INTEGER', () => {
    const big = '1'.repeat(64);
    expect(addBinary(big, '0')).toBe(big);
  });
});

describe('DRILL 32 — compressString', () => {
  it('compresses runs with counts', () => {
    expect(compressString('aaabbc')).toBe('a3b2c1');
  });

  it('writes count 1 for singletons', () => {
    expect(compressString('abc')).toBe('a1b1c1');
  });

  it('handles a single long run', () => {
    expect(compressString('aaaa')).toBe('a4');
  });

  it('returns "" for an empty string', () => {
    expect(compressString('')).toBe('');
  });
});

describe('DRILL 33 — countAndSay', () => {
  it('starts at "1"', () => {
    expect(countAndSay(1)).toBe('1');
  });

  it('reads out the second term', () => {
    expect(countAndSay(2)).toBe('11');
  });

  it('produces the fourth term', () => {
    expect(countAndSay(4)).toBe('1211');
  });

  it('produces the fifth term', () => {
    expect(countAndSay(5)).toBe('111221');
  });
});

describe('DRILL 34 — lengthOfLongestSubstring', () => {
  it('finds a window of distinct chars', () => {
    expect(lengthOfLongestSubstring('abcabcbb')).toBe(3);
  });

  it('handles all-same characters', () => {
    expect(lengthOfLongestSubstring('bbbbb')).toBe(1);
  });

  it('handles a repeat that resets the window', () => {
    expect(lengthOfLongestSubstring('pwwkew')).toBe(3);
  });

  it('returns 0 for an empty string', () => {
    expect(lengthOfLongestSubstring('')).toBe(0);
  });
});

describe('DRILL 35 — longestPalindrome', () => {
  it('returns one of the valid longest palindromes', () => {
    expect(['bab', 'aba']).toContain(longestPalindrome('babad'));
  });

  it('finds an even-length palindrome', () => {
    expect(longestPalindrome('cbbd')).toBe('bb');
  });

  it('handles a single character', () => {
    expect(longestPalindrome('a')).toBe('a');
  });

  it('finds a fully palindromic string', () => {
    expect(longestPalindrome('racecar')).toBe('racecar');
  });
});
